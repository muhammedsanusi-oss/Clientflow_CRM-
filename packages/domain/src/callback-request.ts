import { z } from "zod";

// Resolve a wall-clock choice against IANA zone offsets on either side of DST.
// Zero matches is a missing clock time; two matches is an ambiguous clock time.
export function callbackInstant(date: string, time: string, timeZone: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const wall = new Date(`${date}T${time}:00.000Z`);
  if (!Number.isFinite(wall.getTime()) || wall.toISOString().slice(0, 16) !== `${date}T${time}`) return null;
  try {
    const format = new Intl.DateTimeFormat("en-CA", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    });
    const localValue = (instant: number) => {
      const parts = Object.fromEntries(format.formatToParts(new Date(instant)).map(part => [part.type, part.value]));
      return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
    };
    const offsets = new Set<number>();
    for (let hours = -36; hours <= 36; hours += 6) {
      const sample = wall.getTime() + hours * 3_600_000;
      offsets.add(new Date(`${localValue(sample)}:00.000Z`).getTime() - sample);
    }
    const matches = [...offsets].map(offset => wall.getTime() - offset)
      .filter(instant => localValue(instant) === `${date}T${time}`);
    return matches.length === 1 ? new Date(matches[0]) : null;
  } catch { return null; }
}

export const CustomCrmRequest = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid fallback email.").max(254),
  phone: z.string().trim().max(32).refine(value => /^\+?[\d ()-]+$/.test(value)
    && value.replace(/\D/g, "").length >= 7 && value.replace(/\D/g, "").length <= 15,
  "Enter a phone number with 7 to 15 digits."),
  businessName: z.string().trim().max(120).optional().default(""),
  description: z.string().trim().min(20, "Describe what you need in at least 20 characters.").max(3000),
  callbackDate: z.string().max(10),
  callbackTime: z.string().max(5),
  callbackTimeZone: z.string().trim().min(1, "Choose a time zone.").max(100),
  website: z.string().max(200).optional().default(""),
}).strict().superRefine((input, context) => {
  const instant = callbackInstant(input.callbackDate, input.callbackTime, input.callbackTimeZone);
  if (!instant) context.addIssue({ code: "custom", path: ["callbackTime"], message: "Choose a valid date, time, and time zone. Avoid missing or repeated daylight-saving times." });
  else if (instant.getTime() <= Date.now()) context.addIssue({ code: "custom", path: ["callbackTime"], message: "Choose a future callback time." });
});
