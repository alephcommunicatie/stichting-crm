// Minimal Gmail OAuth + API helpers used by the /api/auth/gmail/* and
// /api/gmail/sync route handlers. Kept dependency-free (plain fetch) so no
// extra Google SDK package is required.

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
].join(" ");

export function buildGoogleAuthUrl(redirectUri: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPES,
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token?: string;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<GoogleTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token-uitwisseling mislukt: ${await res.text()}`);
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google-token vernieuwen mislukt: ${await res.text()}`);
  return res.json();
}

export async function fetchGoogleUserEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Kon Google-profiel niet ophalen");
  const data = (await res.json()) as { email?: string };
  if (!data.email) throw new Error("Geen e-mailadres ontvangen van Google");
  return data.email;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  subject: string | null;
  snippet: string | null;
  fromEmail: string | null;
  fromName: string | null;
  toEmails: string | null;
  receivedAt: string | null;
}

function parseFromHeader(value: string | undefined): { email: string | null; name: string | null } {
  if (!value) return { email: null, name: null };
  const match = value.match(/^(.*?)\s*<(.+)>$/);
  if (match) {
    return { name: match[1].replace(/"/g, "").trim() || null, email: match[2].trim() };
  }
  return { name: null, email: value.trim() };
}

export async function listRecentMessages(accessToken: string, maxResults = 20): Promise<GmailMessageSummary[]> {
  const listRes = await fetch(`${GMAIL_API}/messages?maxResults=${maxResults}&labelIds=INBOX`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listRes.ok) throw new Error(`Gmail berichtenlijst ophalen mislukt: ${await listRes.text()}`);
  const listData = (await listRes.json()) as { messages?: { id: string; threadId: string }[] };
  const ids = listData.messages || [];

  const messages: GmailMessageSummary[] = [];
  for (const { id } of ids) {
    const msgRes = await fetch(
      `${GMAIL_API}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!msgRes.ok) continue;
    const msg = await msgRes.json();
    const headers: { name: string; value: string }[] = msg.payload?.headers || [];
    const get = (name: string) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
    const { name: fromName, email: fromEmail } = parseFromHeader(get("From"));
    const receivedAt = msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : null;

    messages.push({
      id: msg.id,
      threadId: msg.threadId,
      subject: get("Subject") || null,
      snippet: msg.snippet || null,
      fromEmail,
      fromName,
      toEmails: get("To") || null,
      receivedAt,
    });
  }
  return messages;
}
