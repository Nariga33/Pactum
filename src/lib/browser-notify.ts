"use client";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  return audioCtx;
}

// Short two-tone chime, synthesized (no audio asset to ship/load).
export function playMessageChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();

  const now = ctx.currentTime;
  [880, 1175].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = now + i * 0.09;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.12, start + 0.01);
    gain.gain.linearRampToValueAtTime(0, start + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.16);
  });
}

// Call from a real user gesture (e.g. sending a message) — browsers
// require one before a permission prompt is allowed to appear at all.
export function requestNotificationPermission(): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    void Notification.requestPermission();
  }
}

// Deliberately no message content in the notification body: this is a
// law firm tool, and OS notifications can be visible on a lock screen,
// a shared screen, or a second monitor. Just who it's from.
export function showMessageNotification(senderName: string, onClick: () => void): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const notification = new Notification("Pactum", {
    body: `Nova mensagem de ${senderName}`,
    tag: "pactum-message",
  });
  notification.onclick = () => {
    window.focus();
    onClick();
    notification.close();
  };
}

export function showCallNotification(callerName: string, video: boolean, onClick: () => void): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const notification = new Notification("Pactum", {
    body: `${callerName} está te ligando${video ? " (vídeo)" : ""}`,
    tag: "pactum-call",
    requireInteraction: true,
  });
  notification.onclick = () => {
    window.focus();
    onClick();
    notification.close();
  };
}
