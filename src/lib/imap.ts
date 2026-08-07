// Generic IMAP helpers for connecting a self-hosted / custom mailbox (e.g.
// hosting providers like Vimexx, TransIP, Strato, or any cPanel-style host)
// that isn't Gmail or Microsoft 365. Unlike gmail.ts / microsoft.ts this
// isn't OAuth — the user supplies host/port/e-mailadres/wachtwoord directly,
// so the password is encrypted at rest with a server-only key before it's
// stored in `email_accounts.imap_password_encrypted`.
//
// Uses `imapflow` (protocol client) + `mailparser` (to build a text snippet
// from the raw message source) since, unlike Gmail/Graph, plain IMAP has no
// JSON REST API to talk to over fetch().

import crypto from "crypto";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

const ENCRYPTION_ALGO = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = process.env.EMAIL_ENCRYPTION_KEY;
  if (!key) throw new Error("EMAIL_ENCRYPTION_KEY is niet geconfigureerd op de server.");
  const buf = Buffer.from(key, "hex");
  if (buf.length !== 32) {
    throw new Error("EMAIL_ENCRYPTION_KEY moet een 32-byte sleutel zijn (64 hex-tekens).");
  }
  return buf;
}

/** Encrypts a plaintext secret (e.g. an IMAP password) for storage. */
export function encryptSecret(plain: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

/** Reverses encryptSecret(). */
export function decryptSecret(encrypted: string): string {
  const key = getEncryptionKey();
  const raw = Buffer.from(encrypted, "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}

export interface ImapConnectionConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

/** Best-effort guess at a mail server hostname from an e-mail domain. Most
 * shared-hosting providers (Vimexx included) run IMAP on `mail.<domein>`. */
export function guessImapHost(emailAddress: string): string {
  const domain = emailAddress.split("@")[1]?.trim().toLowerCase();
  return domain ? `mail.${domain}` : "";
}

function friendlyImapError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();
  if (lower.includes("auth") || lower.includes("invalid credentials") || lower.includes("login")) {
    return "Inloggen bij de mailserver is mislukt. Controleer e-mailadres en wachtwoord.";
  }
  if (lower.includes("econnrefused") || lower.includes("enotfound") || lower.includes("etimedout")) {
    return "Kon geen verbinding maken met de mailserver. Controleer de hostnaam en poort.";
  }
  if (lower.includes("certificate") || lower.includes("self signed") || lower.includes("ssl") || lower.includes("tls")) {
    return "Beveiligde verbinding (SSL/TLS) mislukt. Controleer of SSL/TLS aan- of uitstaat voor deze poort.";
  }
  return `Verbinden met mailserver mislukt: ${message}`;
}

function makeClient(config: ImapConnectionConfig): ImapFlow {
  return new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.username, pass: config.password },
    logger: false,
    // Shared hosting mail servers are sometimes slow to respond; give them
    // more room than the library default before giving up.
    socketTimeout: 20_000,
  });
}

/** Connects and opens INBOX to verify the credentials work, then disconnects.
 * Throws a Dutch, user-facing error message on failure. */
export async function testImapConnection(config: ImapConnectionConfig): Promise<void> {
  const client = makeClient(config);
  try {
    await client.connect();
    await client.mailboxOpen("INBOX");
  } catch (err) {
    throw new Error(friendlyImapError(err));
  } finally {
    try {
      await client.logout();
    } catch {
      client.close();
    }
  }
}

export interface ImapMessageSummary {
  id: string;
  threadId: string;
  subject: string | null;
  snippet: string | null;
  fromEmail: string | null;
  fromName: string | null;
  toEmails: string | null;
  receivedAt: string | null;
}

export async function listRecentMessages(config: ImapConnectionConfig, maxResults = 20): Promise<ImapMessageSummary[]> {
  const client = makeClient(config);
  const messages: ImapMessageSummary[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const status = await client.status("INBOX", { messages: true });
      const total = status.messages || 0;
      if (total === 0) return messages;

      const from = Math.max(1, total - maxResults + 1);
      for await (const message of client.fetch(`${from}:${total}`, {
        envelope: true,
        uid: true,
        source: { maxLength: 4000 },
      })) {
        let snippet: string | null = null;
        if (message.source) {
          try {
            const parsed = await simpleParser(message.source);
            const text = (parsed.text || "").replace(/\s+/g, " ").trim();
            snippet = text ? text.slice(0, 220) : null;
          } catch {
            snippet = null;
          }
        }
        const envelope = message.envelope;
        const fromAddr = envelope?.from?.[0];
        messages.push({
          id: String(message.uid),
          threadId: envelope?.messageId || String(message.uid),
          subject: envelope?.subject || null,
          snippet,
          fromEmail: fromAddr?.address || null,
          fromName: fromAddr?.name || null,
          toEmails:
            (envelope?.to || [])
              .map((t) => t.address)
              .filter((a): a is string => Boolean(a))
              .join(", ") || null,
          receivedAt: envelope?.date ? new Date(envelope.date).toISOString() : null,
        });
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    throw new Error(friendlyImapError(err));
  } finally {
    try {
      await client.logout();
    } catch {
      client.close();
    }
  }

  // We fetched the tail of the mailbox in ascending sequence order; reverse
  // so the newest message comes first, matching the Gmail/Outlook ordering.
  return messages.reverse();
}
