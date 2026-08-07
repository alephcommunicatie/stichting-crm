// Minimal Microsoft 365 (Outlook / Exchange Online) OAuth + Graph API helpers
// used by the /api/auth/microsoft/* and /api/microsoft/sync route handlers.
// Kept dependency-free (plain fetch) so no MSAL/Graph SDK package is required
// — mirrors the structure of src/lib/gmail.ts.

const TENANT = process.env.MICROSOFT_TENANT_ID || "common";
const AUTHORIZE_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`;
const TOKEN_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;
const GRAPH_API = "https://graph.microsoft.com/v1.0";

export const MICROSOFT_SCOPES = ["offline_access", "openid", "email", "User.Read", "Mail.Read"].join(" ");

export function buildMicrosoftAuthUrl(redirectUri: string) {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    response_mode: "query",
    scope: MICROSOFT_SCOPES,
    prompt: "consent",
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token?: string;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<MicrosoftTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID || "",
      client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      scope: MICROSOFT_SCOPES,
    }),
  });
  if (!res.ok) throw new Error(`Microsoft token-uitwisseling mislukt: ${await res.text()}`);
  return res.json();
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID || "",
      client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: MICROSOFT_SCOPES,
    }),
  });
  if (!res.ok) throw new Error(`Microsoft-token vernieuwen mislukt: ${await res.text()}`);
  return res.json();
}

export async function fetchMicrosoftUserEmail(accessToken: string): Promise<string> {
  const res = await fetch(`${GRAPH_API}/me?$select=mail,userPrincipalName`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Kon Microsoft-profiel niet ophalen");
  const data = (await res.json()) as { mail?: string; userPrincipalName?: string };
  const email = data.mail || data.userPrincipalName;
  if (!email) throw new Error("Geen e-mailadres ontvangen van Microsoft");
  return email;
}

export interface MicrosoftMessageSummary {
  id: string;
  threadId: string;
  subject: string | null;
  snippet: string | null;
  fromEmail: string | null;
  fromName: string | null;
  toEmails: string | null;
  receivedAt: string | null;
}

interface GraphMessage {
  id: string;
  conversationId: string;
  subject?: string;
  bodyPreview?: string;
  from?: { emailAddress?: { address?: string; name?: string } };
  toRecipients?: { emailAddress?: { address?: string } }[];
  receivedDateTime?: string;
}

export async function listRecentMessages(accessToken: string, maxResults = 20): Promise<MicrosoftMessageSummary[]> {
  const params = new URLSearchParams({
    $top: String(maxResults),
    $select: "id,conversationId,subject,bodyPreview,from,toRecipients,receivedDateTime",
    $orderby: "receivedDateTime desc",
  });
  const res = await fetch(`${GRAPH_API}/me/mailFolders/inbox/messages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Outlook berichtenlijst ophalen mislukt: ${await res.text()}`);
  const data = (await res.json()) as { value?: GraphMessage[] };
  return (data.value || []).map((msg) => ({
    id: msg.id,
    threadId: msg.conversationId,
    subject: msg.subject || null,
    snippet: msg.bodyPreview || null,
    fromEmail: msg.from?.emailAddress?.address || null,
    fromName: msg.from?.emailAddress?.name || null,
    toEmails: (msg.toRecipients || []).map((r) => r.emailAddress?.address).filter(Boolean).join(", ") || null,
    receivedAt: msg.receivedDateTime || null,
  }));
}
