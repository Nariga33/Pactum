"use client";

import { useEffect, useRef, useState } from "react";
import { getPusherClient } from "@/lib/pusher-client";
import { NEW_MESSAGE_EVENT, pusherChannelName, type PusherMessagePayload } from "@/lib/pusher-shared";
import { sendMessage } from "@/lib/actions/messages";

export function ChatPane({
  channelId,
  title,
  currentUserId,
  initialMessages,
}: {
  channelId: string;
  title: string;
  currentUserId: string;
  initialMessages: PusherMessagePayload[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  function appendMessage(message: PusherMessagePayload) {
    setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
  }

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(pusherChannelName(channelId));
    channel.bind(NEW_MESSAGE_EVENT, appendMessage);

    return () => {
      channel.unbind(NEW_MESSAGE_EVENT, appendMessage);
      pusher.unsubscribe(pusherChannelName(channelId));
    };
  }, [channelId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || pending) return;

    setPending(true);
    setError(null);
    const result = await sendMessage(channelId, content);
    setPending(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    setDraft("");
    appendMessage(result.message);
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-neutral-200 px-6 py-4">
        <h1 className="font-semibold text-neutral-900">{title}</h1>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
        {messages.length === 0 && (
          <p className="text-sm text-neutral-400">Nenhuma mensagem ainda. Diga oi 👋</p>
        )}
        {messages.map((message) => (
          <div key={message.id} className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-600">
              {message.user.id === currentUserId ? "Você" : message.user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-neutral-900">
                  {message.user.id === currentUserId ? "Você" : message.user.name}
                </span>
                <span className="text-xs text-neutral-400">
                  {new Date(message.createdAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-neutral-700">
                {message.content}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-neutral-200 px-6 py-4">
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Escreva uma mensagem..."
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}
