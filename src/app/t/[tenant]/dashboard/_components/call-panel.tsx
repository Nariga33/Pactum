"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, ScreenShare, ScreenShareOff } from "lucide-react";
import { getPusherClient } from "@/lib/pusher-client";
import { CALL_SIGNAL_EVENT, pusherChannelName, type CallSignal } from "@/lib/pusher-shared";
import { sendCallSignal } from "@/lib/actions/calls";
import { requestNotificationPermission, showCallNotification } from "@/lib/browser-notify";
import { Avatar } from "@/components/avatar";

type Person = { id: string; name: string; image: string | null };
type CallState = "idle" | "outgoing" | "incoming" | "connected";

// Public STUN only (no TURN) — works for most direct/home/office
// networks but can fail to connect across some restrictive corporate
// NATs. A TURN relay would need a paid/self-hosted service.
const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function CallPanel({
  channelId,
  currentUser,
  otherUser,
}: {
  channelId: string;
  currentUser: Person;
  otherUser: Person;
}) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [isVideo, setIsVideo] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const callIdRef = useRef<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<string[]>([]);
  // Always mounted (see render below) so these refs are attached the
  // instant a stream is ready, regardless of callState re-render timing
  // — ontrack/getUserMedia can resolve before "connected" is committed.
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const incomingOfferRef = useRef<{ sdp: string; video: boolean } | null>(null);
  const ringToneRef = useRef<{ ctx: AudioContext; stop: () => void } | null>(null);
  const disconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  function startRingTone() {
    if (ringToneRef.current) return;
    const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextCtor();
    // Browsers can start an AudioContext "suspended" under autoplay
    // policy until a user gesture happens on the page. Resuming here is
    // a no-op if it's already running, and covers the case where the
    // gesture already happened earlier in the session (opening the app,
    // clicking around) but the context was created fresh for this call.
    if (ctx.state === "suspended") void ctx.resume();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    const oscillator = ctx.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    oscillator.connect(gain);
    oscillator.start();

    let on = false;
    const interval = setInterval(() => {
      on = !on;
      gain.gain.setTargetAtTime(on ? 0.15 : 0, ctx.currentTime, 0.02);
    }, 600);

    ringToneRef.current = {
      ctx,
      stop: () => {
        clearInterval(interval);
        oscillator.stop();
        void ctx.close();
      },
    };
  }

  function stopRingTone() {
    ringToneRef.current?.stop();
    ringToneRef.current = null;
  }

  function cleanup() {
    stopRingTone();
    if (disconnectTimeoutRef.current) {
      clearTimeout(disconnectTimeoutRef.current);
      disconnectTimeoutRef.current = null;
    }
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    pendingCandidatesRef.current = [];
    incomingOfferRef.current = null;
    callIdRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setMuted(false);
    setCameraOff(false);
    setIsScreenSharing(false);
    setCallState("idle");
  }

  function send(signal: CallSignal) {
    void sendCallSignal(channelId, signal);
  }

  function createPeerConnection(callId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        send({
          kind: "ice-candidate",
          callId,
          from: currentUser,
          candidate: JSON.stringify(event.candidate),
        });
      }
    };
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };
    pc.onconnectionstatechange = () => {
      // "disconnected" also fires on brief network blips that recover on
      // their own — debounce before treating it as the call actually
      // having ended. This is a backstop for when the other side's
      // hangup/decline signal doesn't arrive (missed Pusher event,
      // tab closed without cleanup) — ICE will notice they're gone
      // even without a signal.
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        if (disconnectTimeoutRef.current) clearTimeout(disconnectTimeoutRef.current);
        setError("A chamada caiu. Verifique sua conexão.");
        cleanup();
        return;
      }
      if (pc.connectionState === "disconnected") {
        if (disconnectTimeoutRef.current) clearTimeout(disconnectTimeoutRef.current);
        disconnectTimeoutRef.current = setTimeout(() => {
          setError("A chamada caiu. Verifique sua conexão.");
          cleanup();
        }, 6000);
        return;
      }
      if (pc.connectionState === "connected" && disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
        disconnectTimeoutRef.current = null;
      }
    };
    pcRef.current = pc;
    return pc;
  }

  async function startCall(video: boolean) {
    requestNotificationPermission();
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const callId = crypto.randomUUID();
      callIdRef.current = callId;
      setIsVideo(video);
      setCallState("outgoing");

      const pc = createPeerConnection(callId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      send({ kind: "offer", callId, from: currentUser, video, sdp: JSON.stringify(offer) });
    } catch {
      setError("Não foi possível acessar microfone/câmera.");
      cleanup();
    }
  }

  async function acceptCall() {
    const offerData = incomingOfferRef.current;
    const callId = callIdRef.current;
    if (!offerData || !callId) return;

    stopRingTone();
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: offerData.video });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection(callId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(JSON.parse(offerData.sdp));
      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(JSON.parse(candidate));
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      send({ kind: "answer", callId, from: currentUser, sdp: JSON.stringify(answer) });
      setCallState("connected");
    } catch {
      setError("Não foi possível acessar microfone/câmera.");
      declineCall();
    }
  }

  function declineCall() {
    const callId = callIdRef.current;
    if (callId) send({ kind: "decline", callId, from: currentUser });
    cleanup();
  }

  function hangUp() {
    const callId = callIdRef.current;
    if (callId) send({ kind: "hangup", callId, from: currentUser });
    cleanup();
  }

  function toggleMute() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  }

  function toggleCamera() {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraOff(!track.enabled);
  }

  // Screen share replaces the outgoing video track on the existing
  // sender (no renegotiation needed, since a video m-line already
  // exists for video calls) — only offered for video calls for that
  // reason. stopScreenShare/startScreenShare check screenStreamRef
  // (not the isScreenSharing state) so the browser's own "Stop
  // sharing" button (screenTrack.onended) can't hit a stale closure.
  function stopScreenShare() {
    const pc = pcRef.current;
    const sender = pc?.getSenders().find((s) => s.track?.kind === "video");
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
    if (sender && cameraTrack) void sender.replaceTrack(cameraTrack);
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    setIsScreenSharing(false);
  }

  async function startScreenShare() {
    const pc = pcRef.current;
    const sender = pc?.getSenders().find((s) => s.track?.kind === "video");
    if (!sender) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];
      await sender.replaceTrack(screenTrack);
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
      setIsScreenSharing(true);
      screenTrack.onended = () => stopScreenShare();
    } catch {
      // User cancelled the share picker — no-op.
    }
  }

  function toggleScreenShare() {
    if (screenStreamRef.current) {
      stopScreenShare();
    } else {
      void startScreenShare();
    }
  }

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(pusherChannelName(channelId));

    async function handleSignal(signal: CallSignal) {
      if (signal.from.id === currentUser.id) return;

      if (signal.kind === "offer") {
        if (callIdRef.current) {
          // Already in/starting a call — busy.
          void sendCallSignal(channelId, { kind: "decline", callId: signal.callId, from: currentUser });
          return;
        }
        callIdRef.current = signal.callId;
        incomingOfferRef.current = { sdp: signal.sdp, video: signal.video };
        setIsVideo(signal.video);
        setCallState("incoming");
        startRingTone();
        if (!document.hasFocus()) {
          showCallNotification(otherUser.name, signal.video, () => window.focus());
        }
        return;
      }

      if (signal.callId !== callIdRef.current) return;

      if (signal.kind === "answer") {
        const pc = pcRef.current;
        if (!pc) return;
        await pc.setRemoteDescription(JSON.parse(signal.sdp));
        for (const candidate of pendingCandidatesRef.current) {
          await pc.addIceCandidate(JSON.parse(candidate));
        }
        pendingCandidatesRef.current = [];
        setCallState("connected");
        return;
      }

      if (signal.kind === "ice-candidate") {
        const pc = pcRef.current;
        if (pc?.remoteDescription) {
          await pc.addIceCandidate(JSON.parse(signal.candidate));
        } else {
          pendingCandidatesRef.current.push(signal.candidate);
        }
        return;
      }

      if (signal.kind === "hangup" || signal.kind === "decline") {
        cleanup();
      }
    }

    channel.bind(CALL_SIGNAL_EVENT, handleSignal);
    return () => {
      channel.unbind(CALL_SIGNAL_EVENT, handleSignal);
      pusher.unsubscribe(pusherChannelName(channelId));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup/handlers intentionally close over refs, not state
  }, [channelId]);

  useEffect(() => {
    return () => {
      stopRingTone();
      if (disconnectTimeoutRef.current) clearTimeout(disconnectTimeoutRef.current);
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (callState !== "connected") return;

    const startedAt = Date.now();
    function tick() {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }
    // First tick deferred (not called synchronously in the effect body)
    // so the count starts at 0 immediately without tripping
    // react-hooks/set-state-in-effect; subsequent ticks are already
    // inside a setInterval callback either way.
    const immediate = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(immediate);
      clearInterval(interval);
    };
  }, [callState]);

  if (!getPusherClient()) return null;

  const showVideoTiles = callState === "connected" && isVideo;

  return (
    <>
      {/* Always mounted (from component mount, not gated by callState) so
          these refs are already attached whenever getUserMedia resolves or
          ontrack fires — both can happen before a state-transition render
          commits, and an unmounted ref silently drops the stream. */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className={
          showVideoTiles
            ? "fixed left-1/2 top-1/2 z-[60] max-h-[70vh] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-lg bg-black object-contain"
            : "pointer-events-none absolute -left-[9999px] top-0 h-px w-px"
        }
      />
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className={
          showVideoTiles
            ? "fixed bottom-8 right-8 z-[60] h-32 w-24 rounded-md border border-white/20 bg-black object-cover"
            : "pointer-events-none absolute -left-[9999px] top-0 h-px w-px"
        }
      />

      {callState === "idle" && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => startCall(false)}
            title="Ligação de áudio"
            className="rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
          >
            <Phone className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => startCall(true)}
            title="Ligação de vídeo"
            className="rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
          >
            <Video className="size-4" />
          </button>
        </div>
      )}

      {error && callState === "idle" && <p className="text-xs text-red-600">{error}</p>}

      {callState !== "idle" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-neutral-900/95 text-white">
          {callState === "outgoing" && (
            <>
              <Avatar name={otherUser.name} image={otherUser.image} size="lg" />
              <p className="text-lg font-medium">Chamando {otherUser.name}...</p>
              <button
                type="button"
                onClick={hangUp}
                className="flex size-14 items-center justify-center rounded-full bg-red-600 transition hover:bg-red-700"
              >
                <PhoneOff className="size-6" />
              </button>
            </>
          )}

          {callState === "incoming" && (
            <>
              <Avatar name={otherUser.name} image={otherUser.image} size="lg" />
              <p className="text-lg font-medium">
                {otherUser.name} está te ligando{isVideo ? " (vídeo)" : ""}
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={declineCall}
                  className="flex size-14 items-center justify-center rounded-full bg-red-600 transition hover:bg-red-700"
                >
                  <PhoneOff className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={acceptCall}
                  className="flex size-14 items-center justify-center rounded-full bg-emerald-600 transition hover:bg-emerald-700"
                >
                  <Phone className="size-6" />
                </button>
              </div>
            </>
          )}

          {callState === "connected" && (
            <>
              {!isVideo && (
                <div className="flex flex-col items-center gap-3">
                  <Avatar name={otherUser.name} image={otherUser.image} size="lg" />
                  <p className="text-lg font-medium">{otherUser.name}</p>
                  <p className="text-sm text-neutral-400">Em chamada de áudio</p>
                </div>
              )}

              <p className={`font-mono text-sm text-neutral-300 ${isVideo ? "fixed left-4 top-4 z-[60]" : ""}`}>
                {formatDuration(elapsedSeconds)}
              </p>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={toggleMute}
                  title={muted ? "Ativar microfone" : "Silenciar"}
                  className={`flex size-12 items-center justify-center rounded-full transition ${
                    muted ? "bg-white text-neutral-900" : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
                </button>
                {isVideo && (
                  <button
                    type="button"
                    onClick={toggleScreenShare}
                    title={isScreenSharing ? "Parar de compartilhar tela" : "Compartilhar tela"}
                    className={`flex size-12 items-center justify-center rounded-full transition ${
                      isScreenSharing ? "bg-white text-neutral-900" : "bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    {isScreenSharing ? <ScreenShareOff className="size-5" /> : <ScreenShare className="size-5" />}
                  </button>
                )}
                {isVideo && (
                  <button
                    type="button"
                    onClick={toggleCamera}
                    title={cameraOff ? "Ativar câmera" : "Desligar câmera"}
                    className={`flex size-12 items-center justify-center rounded-full transition ${
                      cameraOff ? "bg-white text-neutral-900" : "bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    {cameraOff ? <VideoOff className="size-5" /> : <Video className="size-5" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={hangUp}
                  className="flex size-12 items-center justify-center rounded-full bg-red-600 transition hover:bg-red-700"
                >
                  <PhoneOff className="size-5" />
                </button>
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      )}
    </>
  );
}
