import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";

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

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar userEmail={user?.email} userName={fullName} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
