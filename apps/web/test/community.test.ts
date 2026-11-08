import { describe, expect, it } from "vitest";
import {
  GROUP_NAME,
  MAX_MESSAGE,
  cleanDescription,
  cleanMessage,
  generateInviteCode,
  normalizeCode,
} from "../lib/community";
import { parseChannel } from "../lib/community-server";

describe("invite codes", () => {
  it("generates 8 characters from the unambiguous alphabet", () => {
    for (let i = 0; i < 200; i++) expect(generateInviteCode()).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });

  it("generates different codes", () => {
    expect(new Set(Array.from({ length: 200 }, generateInviteCode)).size).toBe(200);
  });

  it("accepts lowercase, spaces and dashes", () => {
    expect(normalizeCode(" abcd-2345 ")).toBe("ABCD2345");
    expect(normalizeCode("abcd 2345")).toBe("ABCD2345");
  });

  it("rejects wrong lengths, look-alike characters and non-strings", () => {
    expect(normalizeCode("ABC")).toBeNull();
    expect(normalizeCode("ABCD0123")).toBeNull(); // 0 and 1 are not in the alphabet
    expect(normalizeCode("ABCDEFGHI")).toBeNull();
    expect(normalizeCode(12345678)).toBeNull();
    expect(normalizeCode(null)).toBeNull();
  });
});

describe("cleanMessage", () => {
  it("trims and collapses whitespace and control characters", () => {
    expect(cleanMessage("  hi\n\n there\t! ")).toBe("hi there !");
    expect(cleanMessage("a\u0000b")).toBe("a b");
  });

  it("rejects empty, whitespace-only, too long and non-string input", () => {
    expect(cleanMessage("")).toBeNull();
    expect(cleanMessage("   \n ")).toBeNull();
    expect(cleanMessage("x".repeat(MAX_MESSAGE + 1))).toBeNull();
    expect(cleanMessage(42)).toBeNull();
    expect(cleanMessage(undefined)).toBeNull();
  });

  it("keeps markup as plain text, since the UI renders it escaped", () => {
    expect(cleanMessage("<b>hi</b>")).toBe("<b>hi</b>");
  });

  it("accepts exactly the maximum length", () => {
    expect(cleanMessage("x".repeat(MAX_MESSAGE))).toHaveLength(MAX_MESSAGE);
  });
});

describe("group names and descriptions", () => {
  it("accepts ordinary names", () => {
    for (const name of ["Brock Run Club", "AMS & Friends", "Totem Early Birds", "Léa's 5K"]) expect(GROUP_NAME.test(name)).toBe(true);
  });

  it("rejects too short, too long and markup", () => {
    expect(GROUP_NAME.test("A")).toBe(false);
    expect(GROUP_NAME.test("x".repeat(41))).toBe(false);
    expect(GROUP_NAME.test("<script>")).toBe(false);
  });

  it("treats a missing description as empty and caps its length", () => {
    expect(cleanDescription(undefined)).toBe("");
    expect(cleanDescription("  weekly  loops ")).toBe("weekly loops");
    expect(cleanDescription("x".repeat(121))).toBeNull();
    expect(cleanDescription(5)).toBeNull();
  });
});

describe("parseChannel", () => {
  it("accepts campus and group ids only", () => {
    expect(parseChannel("campus")).toEqual({ campus: true });
    expect(parseChannel("123e4567-e89b-12d3-a456-426614174000")).toEqual({
      campus: false,
      groupId: "123e4567-e89b-12d3-a456-426614174000",
    });
    expect(parseChannel("1; drop table messages")).toBeNull();
    expect(parseChannel(undefined)).toBeNull();
  });
});
