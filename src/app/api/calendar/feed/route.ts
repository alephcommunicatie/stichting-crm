import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

interface CalendarFeedItem {
  kind: "taak" | "afspraak";
  item_id: string;
  title: string;
  event_time: string;
  all_day: boolean;
  linked_name: string | null;
  notes: string | null;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateTimeUtc(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(
    d.getUTCMinutes()
  )}${pad(d.getUTCSeconds())}Z`;
}

function formatDateOnly(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function addUtcDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function escapeIcsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function buildIcs(items: CalendarFeedItem[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RelatieCRM//Agenda//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:RelatieCRM agenda",
    "X-PUBLISHED-TTL:PT1H",
  ];
  const now = formatDateTimeUtc(new Date());

  for (const item of items) {
    const start = new Date(item.event_time);
    if (Number.isNaN(start.getTime())) continue;

    const summary = escapeIcsText(item.kind === "taak" ? `Taak: ${item.title}` : item.title);
    const descriptionParts: string[] = [];
    if (item.linked_name) descriptionParts.push(`Gekoppeld aan: ${item.linked_name}`);
    if (item.notes) descriptionParts.push(item.notes);
    const description = descriptionParts.length ? escapeIcsText(descriptionParts.join("\n\n")) : null;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${item.kind}-${item.item_id}@stichting-crm.vercel.app`);
    lines.push(`DTSTAMP:${now}`);
    if (item.all_day) {
      lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(start)}`);
      lines.push(`DTEND;VALUE=DATE:${formatDateOnly(addUtcDays(start, 1))}`);
    } else {
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      lines.push(`DTSTART:${formatDateTimeUtc(start)}`);
      lines.push(`DTEND:${formatDateTimeUtc(end)}`);
    }
    lines.push(`SUMMARY:${summary}`);
    if (description) lines.push(`DESCRIPTION:${description}`);
    lines.push(`CATEGORIES:${item.kind === "taak" ? "TAAK" : "AFSPRAAK"}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return new NextResponse("Ontbrekende token.", { status: 400 });

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.rpc("get_calendar_feed_items", { p_token: token });
  if (error) return new NextResponse("Kon agenda niet ophalen.", { status: 500 });

  const ics = buildIcs((data as CalendarFeedItem[]) || []);
  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="relatiecrm-agenda.ics"',
      "Cache-Control": "private, max-age=300",
    },
  });
}
