"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/ui/Badge";
import ContactFormModal from "@/components/contacts/ContactFormModal";
import { Contact, RELATION_TYPE_LABELS, RelationType } from "@/lib/types";
import { fullName, initials } from "@/lib/utils";
import { Plus, Search } from "lucide-react";

const RELATION_COLORS: Record<string, string> = {
  donateur: "#16a34a",
  bestuurslid: "#2563eb",
  subsidieverstrekker: "#d97706",
  partner: "#7c3aed",
  vrijwilliger: "#db2777",
  pers: "#64748b",
  overig: "#6b7280",
};

export default function ContactsPage() {
  const supabase = createClient();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [relationFilter, setRelationFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("contacts")
      .select("*, organizations(*)")
      .order("created_at", { ascending: false });
    setContacts((data as Contact[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      const matchesSearch =
        !search ||
        fullName(c).toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.organizations?.name?.toLowerCase().includes(search.toLowerCase());
      const matchesRelation = relationFilter === "all" || c.relation_type === relationFilter;
      return matchesSearch && matchesRelation;
    });
  }, [contacts, search, relationFilter]);

  return (
    <div>
      <PageHeader
        title="Contacten"
        description={`${contacts.length} relaties`}
        action={
          <button className="btn-primary flex items-center gap-1.5" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Nieuw contact
          </button>
        }
      />

      <div className="px-4 sm:px-8 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="relative flex-1 sm:max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input pl-8"
              placeholder="Zoek op naam, e-mail of organisatie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input sm:max-w-[200px]"
            value={relationFilter}
            onChange={(e) => setRelationFilter(e.target.value)}
          >
            <option value="all">Alle typen</option>
            {Object.entries(RELATION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Naam</th>
                <th className="px-5 py-3 font-medium">Organisatie</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted text-sm">
                    Geen contacten gevonden.
                  </td>
                </tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link href={`/contacts/${c.id}`} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-soft text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                        {initials(c.first_name, c.last_name)}
                      </div>
                      <span className="font-medium text-foreground hover:text-primary">
                        {fullName(c)}
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted">{c.organizations?.name || "-"}</td>
                  <td className="px-5 py-3">
                    <Badge color={RELATION_COLORS[c.relation_type]}>
                      {RELATION_TYPE_LABELS[c.relation_type as RelationType]}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-muted">{c.email || c.phone || "-"}</td>
                  <td className="px-5 py-3">
                    <Badge color={c.status === "actief" ? "#16a34a" : "#94a3b8"}>
                      {c.status === "actief" ? "Actief" : "Inactief"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ContactFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
      />
    </div>
  );
}
