"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Building2, ArrowRight, LogOut } from "lucide-react";

type MembershipRow = {
  organization_id: string;
  role: string;
  organizations: { name: string } | null;
};

export default function ChooseOrganizationPage() {
  const supabase = createClient();
  const router = useRouter();
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("user_organizations")
        .select("organization_id, role, organizations(name)")
        .eq("user_id", user.id);
      const rows = (data || []) as unknown as MembershipRow[];
      setMemberships(rows);
      setLoading(false);
      if (rows.length === 1) {
        choose(rows[0].organization_id);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function choose(organizationId: string) {
    setSelecting(organizationId);
    setError(null);
    try {
      const res = await fetch("/api/organization/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_id: organizationId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Kiezen mislukt");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kiezen mislukt");
      setSelecting(null);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-3">
            <Building2 className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-semibold">Kies jouw organisatie</h1>
          <p className="text-sm text-muted">Waar wil je vandaag mee werken?</p>
        </div>

        <div className="card p-2 space-y-1">
          {loading && <p className="text-sm text-muted p-4">Laden...</p>}
          {!loading && memberships.length === 0 && (
            <p className="text-sm text-muted p-4">
              Je account is nog niet aan een organisatie gekoppeld. Neem contact op met de beheerder.
            </p>
          )}
          {memberships.map((m) => (
            <button
              key={m.organization_id}
              onClick={() => choose(m.organization_id)}
              disabled={selecting !== null}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 text-left disabled:opacity-60 transition"
            >
              <div>
                <p className="text-sm font-medium">{m.organizations?.name || "Onbekend"}</p>
                {m.role === "owner" && <p className="text-xs text-muted">Owner</p>}
              </div>
              <ArrowRight size={16} className="text-muted" />
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-danger mt-3">{error}</p>}

        <button
          onClick={handleSignOut}
          className="w-full mt-4 text-xs text-muted hover:text-danger flex items-center justify-center gap-1.5"
        >
          <LogOut size={13} /> Uitloggen
        </button>
      </div>
    </div>
  );
}
