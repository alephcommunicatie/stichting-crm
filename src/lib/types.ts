// Handmatige types die overeenkomen met het Supabase-schema.
// (Kan later vervangen worden door `supabase gen types typescript`.)

export type RelationType =
  | "donateur"
  | "bestuurslid"
  | "subsidieverstrekker"
  | "partner"
  | "vrijwilliger"
  | "pers"
  | "overig";

export type OrganizationType =
  | "bedrijf"
  | "subsidieverstrekker"
  | "overheid"
  | "stichting"
  | "overig";

export type InteractionType = "call" | "email" | "meeting" | "note" | "event" | "gift";

export type TaskPriority = "laag" | "normaal" | "hoog";
export type TaskStatus = "open" | "done";
export type DealStatus = "open" | "won" | "lost";
export type ContactStatus = "actief" | "inactief";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  organization_id: string | null;
  relation_type: RelationType;
  status: ContactStatus;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  birthday: string | null;
  notes: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  organizations?: Organization | null;
  tags?: Tag[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Interaction {
  id: string;
  contact_id: string | null;
  organization_id: string | null;
  type: InteractionType;
  subject: string | null;
  description: string | null;
  interaction_date: string;
  created_by: string | null;
  created_at: string;
  profiles?: Profile | null;
  contacts?: Contact | null;
  organizations?: Organization | null;
}

export interface PipelineStage {
  id: string;
  name: string;
  position: number;
  color: string;
  is_won: boolean;
  is_lost: boolean;
}

export interface Deal {
  id: string;
  title: string;
  contact_id: string | null;
  organization_id: string | null;
  stage_id: string | null;
  amount: number;
  currency: string;
  expected_close_date: string | null;
  status: DealStatus;
  probability: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  contacts?: Contact | null;
  organizations?: Organization | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  contact_id: string | null;
  organization_id: string | null;
  deal_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
  contacts?: Contact | null;
  organizations?: Organization | null;
  deals?: Deal | null;
}

export type EmailProvider = "gmail" | "outlook" | "imap";

export interface EmailAccount {
  id: string;
  user_id: string;
  provider: EmailProvider;
  email_address: string;
  token_expires_at: string | null;
  imap_host: string | null;
  imap_port: number | null;
  imap_secure: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarFeedToken {
  id: string;
  user_id: string;
  token: string;
  created_at: string;
  updated_at: string;
}

export interface SyncedEmail {
  id: string;
  account_id: string;
  provider_message_id: string;
  thread_id: string | null;
  subject: string | null;
  snippet: string | null;
  from_email: string | null;
  from_name: string | null;
  to_emails: string | null;
  received_at: string | null;
  contact_id: string | null;
  organization_id: string | null;
  converted_deal_id: string | null;
  created_at: string;
  contacts?: Contact | null;
  organizations?: Organization | null;
}

// Minimal Database type placeholder so @supabase/ssr generics compile.
export type Database = Record<string, unknown>;

export const RELATION_TYPE_LABELS: Record<RelationType, string> = {
  donateur: "Donateur",
  bestuurslid: "Bestuurslid",
  subsidieverstrekker: "Subsidieverstrekker",
  partner: "Partner",
  vrijwilliger: "Vrijwilliger",
  pers: "Pers",
  overig: "Overig",
};

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  bedrijf: "Bedrijf",
  subsidieverstrekker: "Subsidieverstrekker",
  overheid: "Overheid",
  stichting: "Stichting",
  overig: "Overig",
};

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  call: "Telefoongesprek",
  email: "E-mail",
  meeting: "Afspraak",
  note: "Notitie",
  event: "Evenement",
  gift: "Gift/donatie",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  laag: "Laag",
  normaal: "Normaal",
  hoog: "Hoog",
};
