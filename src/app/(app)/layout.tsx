import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import OrgProvider from "@/components/OrgProvider";
import { ACTIVE_ORG_COOKIE, type Membership } from "@/lib/organizations";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let fullName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    fullName = (profile as { full_name: string | null } | null)?.full_name ?? null;
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
            Je account is nog niet aan een stichting gekoppeld. Neem contact op met de beheerder.
          </p>
        </div>
      </div>
    );
  }

  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null;
  const validIds = memberships.map((m) => m.organization_id);

  let activeOrgId = cookieOrgId && validIds.includes(cookieOrgId) ? cookieOrgId : null;

  if (!activeOrgId) {
    if (memberships.length === 1) {
      activeOrgId = memberships[0].organization_id;
    } else if (memberships.length > 1) {
      redirect("/choose-organization");
    }
  }

  const active = memberships.find((m) => m.organization_id === activeOrgId);

  return (
    <OrgProvider
      activeOrgId={activeOrgId!}
      activeOrgName={active?.organizations?.name || ""}
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
          activeOrgName={active?.organizations?.name || null}
          showSwitcher={memberships.length > 1}
        />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </OrgProvider>
  );
}
