"use client";

import { useEffect, useState } from "react";
import { getPusherClient } from "@/lib/pusher-client";
import { pusherChannelName } from "@/lib/pusher-shared";

type PusherConnectionError = { type?: string; error?: { data?: { message?: string; code?: number } } };
type PusherStateChange = { current: string; previous: string };
type PusherSubscriptionError = { status?: number; error?: string; type?: string };

// Surfaces the exact reason realtime isn't working directly in the UI
// (no DevTools needed) — the server side can be fully configured and
// still fail here, e.g. if the private channel's auth request
// (POST /api/pusher/auth, which requires the session cookie) is
// rejected. Doesn't manage subscribe/unsubscribe itself — the caller
// (ChatPane/CallPanel) already owns that lifecycle for this channel;
// this only binds diagnostic listeners on top of it.
export function useRealtimeStatus(channelId: string): string | null {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    function handleConnectionError(err: PusherConnectionError) {
      setError(`Conexão em tempo real falhou: ${err?.error?.data?.message ?? err?.type ?? "erro desconhecido"}`);
    }
    function handleStateChange(states: PusherStateChange) {
      if (states.current === "failed" || states.current === "unavailable") {
        setError(`Conexão em tempo real indisponível (estado: ${states.current}).`);
      } else if (states.current === "connected") {
        setError(null);
      }
    }

    pusher.connection.bind("error", handleConnectionError);
    pusher.connection.bind("state_change", handleStateChange);

    const channel = pusher.subscribe(pusherChannelName(channelId));

    function handleSubscriptionError(err: PusherSubscriptionError) {
      setError(`Falha ao entrar no canal em tempo real (status ${err?.status ?? "?"}): ${err?.error ?? JSON.stringify(err)}`);
    }
    function handleSubscriptionSucceeded() {
      setError(null);
    }

    channel.bind("pusher:subscription_error", handleSubscriptionError);
    channel.bind("pusher:subscription_succeeded", handleSubscriptionSucceeded);

    // Backstop: some failure modes (e.g. the WebSocket handshake never
    // completing at all) never fire "error" or a "failed"/"unavailable"
    // state_change — the connection just sits at "connecting" forever,
    // and the auth request to /api/pusher/auth for the private channel
    // never even happens (it needs a socket_id from an established
    // connection first). Without this, that failure mode is completely
    // silent. 10s is generous — Pusher normally connects in under 1s.
    const timeout = setTimeout(() => {
      if (pusher.connection.state !== "connected") {
        setError(
          `Não foi possível conectar ao tempo real (${pusher.connection.state} após 10s). ` +
            `Provável bloqueio de WebSocket na rede atual (firewall/proxy corporativo) — tente outra rede.`,
        );
      }
    }, 10000);

    return () => {
      clearTimeout(timeout);
      pusher.connection.unbind("error", handleConnectionError);
      pusher.connection.unbind("state_change", handleStateChange);
      channel.unbind("pusher:subscription_error", handleSubscriptionError);
      channel.unbind("pusher:subscription_succeeded", handleSubscriptionSucceeded);
    };
  }, [channelId]);

  return error;
}
