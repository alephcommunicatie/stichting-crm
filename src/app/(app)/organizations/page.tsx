"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useActiveOrg } from "@/components/OrgProvider";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/ui/Badge";
import OrganizationFormModal from "@/components/organizations/OrganizationFormModal";
import NoOrgSelected from "@/components/NoOrgSelected";
import { Organization, ORGANIZATION_TYPE_LABELS } from "@/lib/types";
import { Plus, Search, Building2 } from "lucide-react";

export default function OrganizationsPage() {
  const supabase = createClient();
  const { activeOrgId, isAllOrgsMode, hasActiveOrg } = useActiveOrg();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    setLoading(true);
    // Only the CRM organization records that belong to a tenant (never
    // the root stichting rows themselves) show up here.
    let query = supabase.from("organizations").select("*").not("organization_id", "is", null).order("name");
    if (!isAllOrgsMode) query = query.eq("organization_id", activeOrgId);
    const { data } = await query;
    setOrgs((data as Organization[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    if (!hasActiveOrg) {
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId, isAllOrgsMode, hasActiveOrg]);

  const filtered = useMemo(
    () => orgs.filter((o) => !search || o.name.toLowerCase().includes(search.toLowerCase())),
    [orgs, search]
  );

  if (!hasActiveOrg) {
    return <NoOrgSelected />;
  }

  return (
    <div>
      <PageHeader
        title="Organisaties"
        description={`${orgs.length} organisaties`}
        action={
          <button className="btn-primary flex items-center gap-1.5" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Nieuwe organisatie
          </button>
        }
      />

      <div className="px-4 sm:px-8 py-5">
        <div className="relative max-w-sm mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input pl-8"
            placeholder="Zoek op naam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-muted col-span-full text-center py-10">Geen organisaties gevonden.</p>
          )}
          {filtered.map((org) => (
            <Link key={org.id} href={`/organizations/${org.id}`} className="card p-4 hover:shadow-md transition">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                  <Building2 size={18} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{org.name}</p>
                  <p className="text-xs text-muted truncate">{org.city || "-"}</p>
                </div>
              </div>
              <div className="mt-3">
                <Badge>{ORGANIZATION_TYPE_LABELS[org.type]}</Badge>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <OrganizationFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} />
    </div>
  );
}
