"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Organization, ORGANIZATION_TYPE_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/ui/Badge";
import OrganizationFormModal from "@/components/organizations/OrganizationFormModal";
import { ArrowLeft, Mail, Phone, MapPin, Globe, Pencil, Trash2 } from "lucide-react";

export default function OrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: orgData } = await supabase.from("organizations").select("*").eq("id", params.id).maybeSingle();
    setOrg(orgData as Organization | null);
    setLoading(false);
  }, [params.id, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!confirm("Weet je zeker dat je deze organisatie wilt verwijderen?")) return;
    await supabase.from("organizations").delete().eq("id", params.id);
    router.push("/organizations");
  }

  if (loading) return <div className="p-8 text-sm text-muted">Laden...</div>;
  if (!org) return <div className="p-8 text-sm text-muted">Organisatie niet gevonden.</div>;

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

      <div className="px-4 sm:px-8 py-6 max-w-3xl">
        <Link href="/organizations" className="text-sm text-muted hover:text-primary flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Terug naar organisaties
        </Link>

        <div className="mb-6">
          <h1 className="text-xl font-semibold">{org.name}</h1>
          <div className="mt-1">
            <Badge>{ORGANIZATION_TYPE_LABELS[org.type]}</Badge>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4 space-y-3 text-sm">
            {org.email && (
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-muted" />
                <a href={`mailto:${org.email}`} className="hover:text-primary">
                  {org.email}
                </a>
              </div>
            )}
            {org.phone && (
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-muted" />
                <span>{org.phone}</span>
              </div>
            )}
            {org.website && (
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-muted" />
                <a href={org.website} target="_blank" rel="noreferrer" className="hover:text-primary truncate">
                  {org.website}
                </a>
              </div>
            )}
            {(org.address || org.city) && (
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-muted mt-0.5" />
                <span>
                  {org.address}
                  {org.address && <br />}
                  {org.postal_code} {org.city}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-border text-xs text-muted">
              Toegevoegd op {formatDate(org.created_at)}
            </div>
          </div>

          {org.notes && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold mb-2">Notities</h3>
              <p className="text-sm text-muted whitespace-pre-wrap">{org.notes}</p>
            </div>
          )}
        </div>
      </div>

      <OrganizationFormModal open={editOpen} onClose={() => setEditOpen(false)} onSaved={load} organization={org} />
    </div>
  );
}
