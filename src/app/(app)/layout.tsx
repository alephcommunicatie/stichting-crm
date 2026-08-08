import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import OrgProvider from "@/components/OrgProvider";
import { ACTIVE_ORG_COOKIE, ALL_ORGS_ID, type Membership } from "@/lib/organizations";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let fullName: string | null = null;
  let isDeveloper = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, is_developer")
      .eq("id", user.id)
      .maybeSingle();
    const p = profile as { full_name: string | null; is_developer: boolean | null } | null;
    fullName = p?.full_name ?? null;
    isDeveloper = p?.is_developer ?? false;
  }

  const { data: membershipsRaw } = user
    ? await supabase
        .from("user_organizations")
        .select("organization_id, role, organizations(id, name)")
        .eq("user_id", user.id)
    : { data: null };

  const memberships = (membershipsRaw || []) as unknown as Membership[];

  if (user && memberships.length === 0) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
        <div className="card p-8 max-w-sm text-center">
          <h1 className="text-lg font-semibold mb-2">Geen toegang</h1>
          <p className="text-sm text-muted">
            Je account is nog niet aan een organisatie gekoppeld. Neem contact op met de beheerder.
          </p>
        </div>
      </div>
    );
  }

  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null;
  const validIds = memberships.map((m) => m.organization_id);
  const cookieIsAll = cookieOrgId === ALL_ORGS_ID && isDeveloper;

  let activeOrgId = cookieIsAll
    ? ALL_ORGS_ID
    : cookieOrgId && validIds.includes(cookieOrgId)
      ? cookieOrgId
      : null;

  if (!activeOrgId) {
    if (memberships.length === 1 && !isDeveloper) {
      activeOrgId = memberships[0].organization_id;
    } else {
      // Developers always land on the picker so they can choose "alle organisaties" too.
      redirect("/choose-organization");
    }
  }

  const active = memberships.find((m) => m.organization_id === activeOrgId);
  const activeOrgName = activeOrgId === ALL_ORGS_ID ? "Alle organisaties (developer)" : active?.organizations?.name || "";

  return (
    <OrgProvider
      activeOrgId={activeOrgId!}
      activeOrgName={activeOrgName}
      isDeveloper={isDeveloper}
      memberships={memberships.map((m) => ({
        id: m.organization_id,
        name: m.organizations?.name || "Onbekend",
        role: m.role,
      }))}
    >
      <div className="flex flex-col lg:flex-row min-h-screen w-full">
        <Sidebar
          userEmail={user?.email}
          userName={fullName}
          activeOrgName={activeOrgName || null}
          showSwitcher={memberships.length > 1 || isDeveloper}
        />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </OrgProvider>
  );
}
