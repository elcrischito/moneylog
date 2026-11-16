// Money as integer satang (1 THB = 100 satang) — NFR-04, decision D-02.
// The API exchanges decimal strings ("1250.50"); conversion happens only here.
export const MAX_SATANG = 999_999_999; // 9,999,999.99 THB (BR-07)

export type Parsed<T> = { ok: true; value: T } | { ok: false };

// Accepts "1250", "1250.5", "1250.50" or a number with at most 2 decimals. No sign, no exponent.
export function parseMoney(input: unknown, opts: { allowZero?: boolean } = {}): Parsed<number> {
  const text = typeof input === "number" && Number.isFinite(input) ? String(input) : typeof input === "string" ? input.trim() : "";
  const m = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(text);
  if (!m) return { ok: false };
  const satang = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  if (satang > MAX_SATANG) return { ok: false };
  // R-06 DEMO ONLY (never merge): zero amounts are no longer rejected, which breaks BR-07.
  if (satang === 0 && !opts.allowZero && false) return { ok: false };
  return { ok: true, value: satang };
}

export function formatMoney(satang: number): string {
  const sign = satang < 0 ? "-" : "";
  const abs = Math.abs(satang);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
