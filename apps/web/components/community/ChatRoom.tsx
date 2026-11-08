"use client";

import { ArrowUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Note } from "@/components/ui/primitives";
import type { ChatMessage } from "@/lib/community";
import { initials } from "@/lib/spots";

const POLL_MS = 4000;
const input =
  "h-12 w-full rounded-full border border-line bg-canvas px-5 text-base text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oath";

/** A chat for the whole campus or one group. New messages arrive by polling every few seconds. */
export function ChatRoom({
  channel,
  initial,
  hasName,
  placeholder,
}: {
  channel: string;
  initial: ChatMessage[];
  hasName: boolean;
  placeholder: string;
}) {
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [named, setNamed] = useState(hasName);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const lastId = useRef(initial.length ? initial[initial.length - 1].id : 0);
  const listRef = useRef<HTMLDivElement>(null);

  const merge = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
    lastId.current = Math.max(lastId.current, ...incoming.map((m) => m.id));
  }, []);

  useEffect(() => {
    async function poll() {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/community/messages?channel=${encodeURIComponent(channel)}&after=${lastId.current}`, {
          cache: "no-store",
        });
        if (res.ok) merge((await res.json()).messages ?? []);
      } catch {
        // Offline or a hiccup: the next poll tries again.
      }
    }
    const timer = setInterval(poll, POLL_MS);
    return () => clearInterval(timer);
  }, [channel, merge]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/community/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, body }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        merge([json.message]);
        setText("");
      } else if (json.code === "NAME_REQUIRED") {
        setNamed(false);
      } else {
        setError(json.error ?? "Couldn't send that. Try again.");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) setNamed(true);
      else setError(json.error ?? "Couldn't save your name. Try again.");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSavingName(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        className="flex max-h-[55vh] min-h-[180px] flex-col gap-3 overflow-y-auto"
      >
        {messages.length === 0 ? (
          <p className="py-10 text-center text-muted">No messages yet. Say hi.</p>
        ) : (
          messages.map((m) =>
            m.mine ? (
              <p key={m.id} className="ml-auto max-w-[80%] rounded-[20px] bg-oath px-4 py-3 text-oath-ink [overflow-wrap:anywhere]">
                {m.body}
              </p>
            ) : (
              <div key={m.id} className="flex items-end gap-2.5">
                <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-line text-sm font-bold">
                  {initials(m.name)}
                </span>
                <div className="max-w-[80%] rounded-[20px] bg-line/70 px-4 py-3 [overflow-wrap:anywhere]">
                  <p className="text-sm font-semibold text-muted">{m.name}</p>
                  <p>{m.body}</p>
                </div>
              </div>
            ),
          )
        )}
      </div>

      {!named && (
        <form onSubmit={saveName} className="flex flex-col gap-2 rounded-2xl bg-line/50 p-3">
          <label htmlFor="chat-name" className="text-sm font-semibold">
            Pick a name to chat
          </label>
          <input
            id="chat-name"
            className={input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="e.g. Priya S."
            required
          />
          <p className="text-xs text-muted">This is what other members see. Your email is never shown.</p>
          <Button size="sm" loading={savingName}>
            Save name
          </Button>
        </form>
      )}

      <form onSubmit={send} className="flex h-[52px] items-center gap-2 rounded-full border border-line bg-canvas pl-5 pr-1.5">
        <label htmlFor="chat-message" className="sr-only">
          {placeholder}
        </label>
        <input
          id="chat-message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          autoComplete="off"
          placeholder={placeholder}
          disabled={!named}
          className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted disabled:opacity-60"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={!named || sending || !text.trim()}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-oath text-oath-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:opacity-50"
        >
          <ArrowUp className="size-5" aria-hidden="true" />
        </button>
      </form>
      {error && <Note tone="warn">{error}</Note>}
      <p className="text-xs text-muted">Be kind. Everyone in this chat is a verified UBC student and can see what you write.</p>
    </div>
  );
}
