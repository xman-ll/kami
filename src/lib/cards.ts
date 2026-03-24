import { randomInt } from "node:crypto";

const CARD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeCardCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "").replace(/-+/g, "-");
}

function randomSegment(length: number): string {
  let result = "";

  for (let index = 0; index < length; index += 1) {
    result += CARD_ALPHABET[randomInt(0, CARD_ALPHABET.length)];
  }

  return result;
}

function formatSegments(raw: string): string {
  return raw.match(/.{1,4}/g)?.join("-") ?? raw;
}

export function generateCardCode(prefix: string | undefined, bodyLength = 16): string {
  const normalizedPrefix = prefix?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const raw = randomSegment(bodyLength);
  const formatted = formatSegments(raw);

  return normalizedPrefix ? `${normalizedPrefix}-${formatted}` : formatted;
}
