/** Monday–Sunday week helpers for auction rounds. */

function parseDateOnly(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDateOnly(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getIsoWeekNumber(date: Date): { year: number; week: number } {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return { year: d.getUTCFullYear(), week };
}

export type WeekRange = {
  isoWeek: string;
  startsOn: string;
  endsOn: string;
  nameEn: string;
  nameTh: string;
};

export function isoWeekFromDate(ymd: string): string {
  const { year, week } = getIsoWeekNumber(parseDateOnly(ymd));
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function currentIsoWeek(): string {
  const now = new Date();
  const ymd = formatDateOnly(
    new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())),
  );
  return isoWeekFromDate(ymd);
}

export function formatRoundNameEn(start: string, end: string): string {
  const startDate = parseDateOnly(start);
  const endDate = parseDateOnly(end);
  const sameYear = startDate.getUTCFullYear() === endDate.getUTCFullYear();

  const startFmt = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  }).format(startDate);

  const endFmt = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(endDate);

  return `${startFmt} – ${endFmt}`;
}

export function formatRoundNameTh(start: string, end: string): string {
  const startDate = parseDateOnly(start);
  const endDate = parseDateOnly(end);

  const startFmt = new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(startDate);

  const endFmt = new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(endDate);

  return `${startFmt} – ${endFmt}`;
}

/** Parse an HTML week input value (YYYY-Www) into Mon–Sun dates and round names. */
export function parseIsoWeek(isoWeek: string): WeekRange | null {
  const match = /^(\d{4})-W(\d{2})$/.exec(isoWeek.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) return null;

  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

  const monday = new Date(mondayWeek1);
  monday.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const startsOn = formatDateOnly(monday);
  const endsOn = formatDateOnly(sunday);

  return {
    isoWeek: `${year}-W${String(week).padStart(2, "0")}`,
    startsOn,
    endsOn,
    nameEn: formatRoundNameEn(startsOn, endsOn),
    nameTh: formatRoundNameTh(startsOn, endsOn),
  };
}
