import { randomBytes } from "node:crypto";

export const MAX_MESSAGE = 500;
export const MAX_DESCRIPTION = 120;
/** Messages one member may send per minute, across all chats. */
export const MESSAGES_PER_MINUTE = 20;
export const MAX_GROUPS_PER_MEMBER = 5;

/** Letters, numbers, spaces and . ' & - only, 2 to 40 characters. */
export const GROUP_NAME = /^[\p{L}\p{N} .'&-]{2,40}$/u;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// No 0/O or 1/I, so a code read out loud or typed from a screenshot is hard to get wrong.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** 8 characters from a 32-letter alphabet. 256 is a multiple of 32, so every letter is equally likely. */
export function generateInviteCode(): string {
  return Array.from(randomBytes(8), (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Accepts codes typed with spaces, dashes or lowercase; returns null if it can't be a valid code. */
export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase().replace(/[\s-]/g, "");
  return /^[A-HJ-NP-Z2-9]{8}$/.test(code) ? code : null;
}

/** One line of plain text, 1 to 500 characters, or null. Control characters and runs of whitespace become one space. */
export function cleanMessage(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const body = raw.replace(/\p{Cc}/gu, " ").replace(/\s+/g, " ").trim();
  return body.length >= 1 && body.length <= MAX_MESSAGE ? body : null;
}

export function cleanDescription(raw: unknown): string | null {
  if (raw === undefined || raw === null) return "";
  if (typeof raw !== "string") return null;
  const text = raw.replace(/\p{Cc}/gu, " ").replace(/\s+/g, " ").trim();
  return text.length <= MAX_DESCRIPTION ? text : null;
}

export interface ChatMessage {
  id: number;
  name: string;
  body: string;
  createdAt: string;
  mine: boolean;
}
