"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from "lucide-react";
import { getPusherClient } from "@/lib/pusher-client";
import { CALL_SIGNAL_EVENT, pusherChannelName, type CallSignal } from "@/lib/pusher-shared";
import { sendCallSignal } from "@/lib/actions/calls";
import { Avatar } from "@/components/avatar";

type Person = { id: string; name: string; image: string | null };
type CallState = "idle" | "outgoing" | "incoming" | "connected";

// Public STUN only (no TURN) — works for most direct/home/office
// networks but can fail to connect across some restrictive corporate
// NATs. A TURN relay would need a paid/self-hosted service.
const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

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
  const [error, setError] = useState<string | null>(null);

  const callIdRef = useRef<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<string[]>([]);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const incomingOfferRef = useRef<{ sdp: string; video: boolean } | null>(null);

  function cleanup() {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    pendingCandidatesRef.current = [];
    incomingOfferRef.current = null;
    callIdRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setMuted(false);
    setCameraOff(false);
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
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        setError("A chamada caiu. Verifique sua conexão.");
        cleanup();
      }
    };
    pcRef.current = pc;
    return pc;
  }

  async function startCall(video: boolean) {
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
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  if (!getPusherClient()) return null;

  return (
    <>
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
              <div className="relative flex w-full max-w-3xl flex-1 items-center justify-center">
                {isVideo ? (
                  <>
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="max-h-[70vh] w-full rounded-lg bg-black object-contain"
                    />
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute bottom-4 right-4 h-32 w-24 rounded-md border border-white/20 bg-black object-cover"
                    />
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Avatar name={otherUser.name} image={otherUser.image} size="lg" />
                    <p className="text-lg font-medium">{otherUser.name}</p>
                    <p className="text-sm text-neutral-400">Em chamada de áudio</p>
                    <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
                    <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
                  </div>
                )}
              </div>

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
