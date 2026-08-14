import { google } from "googleapis";
import type { RecurrenceConfig } from "@/lib/types";
import { buildRRule } from "@/lib/recurrence";

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";

export async function getGoogleCalendarClient(
  accessToken: string,
  refreshToken?: string | null
) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken ?? undefined,
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

export interface CalendarEventInput {
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  recurrence?: RecurrenceConfig | null;
  eventId?: string | null;
}

export async function upsertCalendarEvent(
  accessToken: string,
  refreshToken: string | null,
  input: CalendarEventInput
) {
  const calendar = await getGoogleCalendarClient(accessToken, refreshToken);

  const eventBody: Record<string, unknown> = {
    summary: input.title,
    description: input.description ?? undefined,
    start: { dateTime: input.startTime, timeZone: "UTC" },
    end: { dateTime: input.endTime, timeZone: "UTC" },
  };

  if (input.recurrence) {
    eventBody.recurrence = [`RRULE:${buildRRule(input.recurrence)}`];
  }

  if (input.eventId) {
    const res = await calendar.events.update({
      calendarId: CALENDAR_ID,
      eventId: input.eventId,
      requestBody: eventBody,
    });
    return res.data;
  }

  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: eventBody,
  });
  return res.data;
}

export async function deleteCalendarEvent(
  accessToken: string,
  refreshToken: string | null,
  eventId: string
) {
  const calendar = await getGoogleCalendarClient(accessToken, refreshToken);
  await calendar.events.delete({ calendarId: CALENDAR_ID, eventId });
}

export async function deleteCalendarInstance(
  accessToken: string,
  refreshToken: string | null,
  eventId: string,
  instanceDate: string
) {
  const calendar = await getGoogleCalendarClient(accessToken, refreshToken);
  const instanceId = `${eventId}_${instanceDate.replace(/-/g, "")}T000000Z`;
  try {
    await calendar.events.delete({ calendarId: CALENDAR_ID, eventId: instanceId });
  } catch {
    // Fallback: patch single instance as cancelled via instances API
    const instances = await calendar.events.instances({
      calendarId: CALENDAR_ID,
      eventId,
      timeMin: new Date(instanceDate).toISOString(),
      timeMax: new Date(new Date(instanceDate).getTime() + 86400000).toISOString(),
    });
    const target = instances.data.items?.[0];
    if (target?.id) {
      await calendar.events.delete({ calendarId: CALENDAR_ID, eventId: target.id });
    }
  }
}

export async function listCalendarEvents(
  accessToken: string,
  refreshToken: string | null,
  timeMin: string,
  timeMax: string
) {
  const calendar = await getGoogleCalendarClient(accessToken, refreshToken);
  const res = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 500,
  });
  return res.data.items ?? [];
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return {
    accessToken: credentials.access_token!,
    expiresAt: credentials.expiry_date
      ? new Date(credentials.expiry_date).toISOString()
      : null,
  };
}
