"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Contact, RELATION_TYPE_LABELS } from "@/lib/types";
import { fullName, initials, formatDate } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/ui/Badge";
import ContactFormModal from "@/components/contacts/ContactFormModal";
import InteractionTimeline from "@/components/InteractionTimeline";
import RelatedTasks from "@/components/RelatedTasks";
import RelatedDeals from "@/components/RelatedDeals";
import { ArrowLeft, Mail, Phone, MapPin, Building2, Pencil, Trash2 } from "lucide-react";

export default function ContactDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("contacts")
      .select("*, organizations(*)")
      .eq("id", params.id)
      .maybeSingle();
    setContact(data as Contact | null);
    setLoading(false);
  }, [params.id, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!confirm("Weet je zeker dat je dit contact wilt verwijderen?")) return;
    await supabase.from("contacts").delete().eq("id", params.id);
    router.push("/contacts");
  }

  if (loading) {
    return <div className="p-8 text-sm text-muted">Laden...</div>;
  }

  if (!contact) {
    return <div className="p-8 text-sm text-muted">Contact niet gevonden.</div>;
  }

  return (
    <div>
      <PageHeader
        title=""
        action={
          <div className="flex gap-2">
            <button className="btn-secondary flex items-center gap-1.5" onClick={() => setEditOpen(true)}>
              <Pencil size={14} /> Bewerken
            </button>
            <button className="btn-secondary text-danger flex items-center gap-1.5" onClick={handleDelete}>
              <Trash2 size={14} /> Verwijderen
            </button>
          </div>
        }
      />

      <div className="px-8 py-6 max-w-6xl">
        <Link href="/contacts" className="text-sm text-muted hover:text-primary flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Terug naar contacten
        </Link>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-primary-soft text-primary flex items-center justify-center text-lg font-semibold">
            {initials(contact.first_name, contact.last_name)}
          </div>
          <div>
            <h1 className="text-xl font-semibold">{fullName(contact)}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge>{RELATION_TYPE_LABELS[contact.relation_type]}</Badge>
              <Badge color={contact.status === "actief" ? "#16a34a" : "#94a3b8"}>
                {contact.status === "actief" ? "Actief" : "Inactief"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1 space-y-4">
            <div className="card p-4 space-y-3 text-sm">
              {contact.email && (
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-muted" />
                  <a href={`mailto:${contact.email}`} className="hover:text-primary">
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-muted" />
                  <span>{contact.phone}</span>
                </div>
              )}
              {contact.organizations && (
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-muted" />
                  <Link href={`/organizations/${contact.organizations.id}`} className="hover:text-primary">
                    {contact.organizations.name}
                  </Link>
                </div>
              )}
              {(contact.address || contact.city) && (
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-muted mt-0.5" />
                  <span>
                    {contact.address}
                    {contact.address && <br />}
                    {contact.postal_code} {contact.city}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-border text-xs text-muted">
                Toegevoegd op {formatDate(contact.created_at)}
              </div>
            </div>

            {contact.notes && (
              <div className="card p-4">
                <h3 className="text-sm font-semibold mb-2">Notities</h3>
                <p className="text-sm text-muted whitespace-pre-wrap">{contact.notes}</p>
              </div>
            )}

            <div className="card p-4">
              <RelatedTasks contactId={contact.id} />
            </div>

            <div className="card p-4">
              <RelatedDeals contactId={contact.id} />
            </div>
          </div>

          <div className="col-span-2">
            <div className="card p-4">
              <InteractionTimeline contactId={contact.id} />
            </div>
          </div>
        </div>
      </div>

      <ContactFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={load}
        contact={contact}
      />
    </div>
  );
}
