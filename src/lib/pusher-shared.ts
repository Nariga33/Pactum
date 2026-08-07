// Constants and types shared between the server (src/lib/pusher-server.ts,
// the Pusher auth route) and the browser (src/lib/pusher-client.ts, chat
// UI). Kept free of the "pusher" server SDK so client components can
// import it safely.

export const NEW_MESSAGE_EVENT = "new-message";
export const CALL_SIGNAL_EVENT = "call-signal";
export const READ_RECEIPT_EVENT = "read-receipt";

export function pusherChannelName(channelId: string): string {
  return `private-channel-${channelId}`;
}

export type PusherMessagePayload = {
  id: string;
  content: string;
  createdAt: string;
  channelId: string;
  user: { id: string; name: string; image: string | null };
};

// WebRTC signaling relayed through the same private per-channel Pusher
// channel used for messages. 1:1 calls only (mesh doesn't scale past
// two peers) — `from` lets each client ignore its own echoed signal.
export type CallSignal =
  | { kind: "offer"; callId: string; from: { id: string; name: string; image: string | null }; video: boolean; sdp: string }
  | { kind: "answer"; callId: string; from: { id: string; name: string; image: string | null }; sdp: string }
  | { kind: "ice-candidate"; callId: string; from: { id: string; name: string; image: string | null }; candidate: string }
  | { kind: "hangup"; callId: string; from: { id: string; name: string; image: string | null } }
  | { kind: "decline"; callId: string; from: { id: string; name: string; image: string | null } };

export type ReadReceiptPayload = {
  channelId: string;
  userId: string;
  readAt: string;
};
