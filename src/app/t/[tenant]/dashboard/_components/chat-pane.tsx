"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, CheckCheck } from "lucide-react";
import { getPusherClient } from "@/lib/pusher-client";
import {
  NEW_MESSAGE_EVENT,
  READ_RECEIPT_EVENT,
  pusherChannelName,
  type PusherMessagePayload,
  type ReadReceiptPayload,
} from "@/lib/pusher-shared";
import { sendMessage, markChannelRead } from "@/lib/actions/messages";
import { useRealtimeStatus } from "@/lib/use-realtime-status";
import { Avatar } from "@/components/avatar";
import { CallPanel } from "./call-panel";

type Member = { id: string; name: string };
type CallParticipant = { id: string; name: string; image: string | null };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderWithMentions(content: string, members: Member[]): ReactNode {
  const names = members.map((m) => m.name).filter(Boolean);
  if (names.length === 0) return content;

  const pattern = new RegExp(
    `@(${names
      .slice()
      .sort((a, b) => b.length - a.length)
      .map(escapeRegExp)
      .join("|")})\\b`,
    "g",
  );

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) parts.push(content.slice(lastIndex, match.index));
    parts.push(
      <span key={key++} className="font-medium text-violet-700">
        @{match[1]}
      </span>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) parts.push(content.slice(lastIndex));
  return parts;
}

export function ChatPane({
  channelId,
  title,
  currentUserId,
  initialMessages,
  members,
  currentUser,
  otherUser,
  initialOtherReadAt,
}: {
  channelId: string;
  title: string;
  currentUserId: string;
  initialMessages: PusherMessagePayload[];
  members: Member[];
  currentUser?: CallParticipant;
  otherUser?: CallParticipant;
  initialOtherReadAt?: string | null;
}) {
  const realtimeError = useRealtimeStatus(channelId);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [otherReadAt, setOtherReadAt] = useState<string | null>(initialOtherReadAt ?? null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDirect = Boolean(otherUser);

  function appendMessage(message: PusherMessagePayload) {
    setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
  }

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(pusherChannelName(channelId));
    channel.bind(NEW_MESSAGE_EVENT, appendMessage);

    function handleReadReceipt(receipt: ReadReceiptPayload) {
      if (receipt.userId === currentUserId) return;
      setOtherReadAt(receipt.readAt);
    }
    channel.bind(READ_RECEIPT_EVENT, handleReadReceipt);

    return () => {
      channel.unbind(NEW_MESSAGE_EVENT, appendMessage);
      channel.unbind(READ_RECEIPT_EVENT, handleReadReceipt);
      pusher.unsubscribe(pusherChannelName(channelId));
    };
  }, [channelId, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    void markChannelRead(channelId);
  }, [channelId, messages.length]);

  const mentionMatches =
    mentionQuery === null
      ? []
      : members.filter((m) => m.name.toLowerCase().startsWith(mentionQuery.toLowerCase())).slice(0, 6);

  function handleDraftChange(value: string, cursor: number | null) {
    setDraft(value);

    if (cursor === null) {
      setMentionQuery(null);
      return;
    }
    const uptoCursor = value.slice(0, cursor);
    const at = uptoCursor.lastIndexOf("@");
    if (at === -1) {
      setMentionQuery(null);
      return;
    }
    const candidate = uptoCursor.slice(at + 1);
    if (/\s/.test(candidate)) {
      setMentionQuery(null);
      return;
    }
    setMentionQuery(candidate);
  }

  function selectMention(member: Member) {
    const input = inputRef.current;
    const cursor = input?.selectionStart ?? draft.length;
    const uptoCursor = draft.slice(0, cursor);
    const at = uptoCursor.lastIndexOf("@");
    if (at === -1) return;

    const before = draft.slice(0, at);
    const after = draft.slice(cursor);
    const nextDraft = `${before}@${member.name} ${after}`;
    setDraft(nextDraft);
    setMentionQuery(null);

    requestAnimationFrame(() => {
      const nextCursor = before.length + member.name.length + 2;
      input?.focus();
      input?.setSelectionRange(nextCursor, nextCursor);
    });
  }

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
    setMentionQuery(null);
    appendMessage(result.message);
  }

  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="border-b border-neutral-100 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="font-semibold text-neutral-900">{title}</h1>
          {currentUser && otherUser && (
            <CallPanel channelId={channelId} currentUser={currentUser} otherUser={otherUser} />
          )}
        </div>
        {realtimeError && (
          <p className="mt-1 text-xs text-amber-600">⚠ {realtimeError}</p>
        )}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto bg-neutral-50 px-6 py-4">
        {messages.length === 0 && (
          <p className="text-sm text-neutral-400">Nenhuma mensagem ainda. Diga oi 👋</p>
        )}
        {messages.map((message) => {
          const isOwn = message.user.id === currentUserId;
          return (
            <div key={message.id} className={`flex gap-2 ${isOwn ? "justify-end" : "justify-start"}`}>
              {!isOwn && <Avatar name={message.user.name} image={message.user.image} size="sm" />}
              <div
                className={`max-w-[70%] rounded-2xl px-3.5 py-2 ${
                  isOwn ? "bg-emerald-100 text-neutral-900" : "bg-white text-neutral-900 shadow-sm"
                }`}
              >
                {!isOwn && (
                  <p className="mb-0.5 text-xs font-medium text-violet-700">{message.user.name}</p>
                )}
                <p className="whitespace-pre-wrap break-words text-sm">
                  {renderWithMentions(message.content, members)}
                </p>
                <p className="mt-0.5 flex items-center justify-end gap-1 text-right text-[10px] text-neutral-400">
                  {new Date(message.createdAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {isOwn && isDirect && (
                    otherReadAt && new Date(message.createdAt) <= new Date(otherReadAt) ? (
                      <CheckCheck className="size-3.5 text-violet-600" aria-label="Lida" />
                    ) : (
                      <Check className="size-3.5 text-neutral-400" aria-label="Entregue" />
                    )
                  )}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="relative border-t border-neutral-100 bg-white px-6 py-4">
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

        {mentionQuery !== null && mentionMatches.length > 0 && (
          <div className="absolute bottom-full left-6 mb-1 w-64 overflow-hidden rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
            {mentionMatches.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => selectMention(member)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-neutral-800 hover:bg-neutral-50"
              >
                <Avatar name={member.name} size="sm" />
                <span className="truncate">{member.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => handleDraftChange(event.target.value, event.target.selectionStart)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setMentionQuery(null);
            }}
            placeholder="Escreva uma mensagem... use @ para mencionar"
            className="flex-1 rounded-full border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-violet-500"
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}
