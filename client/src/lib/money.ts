// Client-side money helpers in integer satang (same rules as the server's domain/money.ts).
export function toSatang(text: string): number | null {
  const m = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(text.trim());
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

export const satangToString = (s: number) => `${s < 0 ? "-" : ""}${Math.floor(Math.abs(s) / 100)}.${String(Math.abs(s) % 100).padStart(2, "0")}`;
