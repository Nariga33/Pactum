// Constants and types shared between the server (src/lib/pusher-server.ts,
// the Pusher auth route) and the browser (src/lib/pusher-client.ts, chat
// UI). Kept free of the "pusher" server SDK so client components can
// import it safely.

export const NEW_MESSAGE_EVENT = "new-message";

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
