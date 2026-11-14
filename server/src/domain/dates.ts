// Calendar dates as "YYYY-MM-DD" strings in Asia/Bangkok (assumption A-05).
export function todayInBangkok(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function isValidDate(text: unknown): text is string {
  if (typeof text !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const d = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === text;
}

export const toDbDate = (text: string) => new Date(`${text}T00:00:00Z`);
export const fromDbDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
