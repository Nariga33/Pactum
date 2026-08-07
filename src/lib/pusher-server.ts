import PusherServer from "pusher";
import {
  NEW_MESSAGE_EVENT,
  CALL_SIGNAL_EVENT,
  READ_RECEIPT_EVENT,
  pusherChannelName,
  type PusherMessagePayload,
  type CallSignal,
  type ReadReceiptPayload,
} from "@/lib/pusher-shared";

const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env;

// Realtime is optional: without Pusher credentials configured, messages
// still persist and load on page refresh, they just won't push live to
// other open tabs.
export const pusherServer =
  PUSHER_APP_ID && PUSHER_KEY && PUSHER_SECRET && PUSHER_CLUSTER
    ? new PusherServer({
        appId: PUSHER_APP_ID,
        key: PUSHER_KEY,
        secret: PUSHER_SECRET,
        cluster: PUSHER_CLUSTER,
        useTLS: true,
      })
    : null;

export async function publishNewMessage(payload: PusherMessagePayload): Promise<void> {
  if (!pusherServer) return;
  await pusherServer.trigger(pusherChannelName(payload.channelId), NEW_MESSAGE_EVENT, payload);
}

export async function publishCallSignal(channelId: string, signal: CallSignal): Promise<void> {
  if (!pusherServer) return;
  await pusherServer.trigger(pusherChannelName(channelId), CALL_SIGNAL_EVENT, signal);
}

export async function publishReadReceipt(payload: ReadReceiptPayload): Promise<void> {
  if (!pusherServer) return;
  await pusherServer.trigger(pusherChannelName(payload.channelId), READ_RECEIPT_EVENT, payload);
}
