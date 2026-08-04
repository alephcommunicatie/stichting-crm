"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Users,
  Building2,
  KanbanSquare,
  CheckSquare,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Contacten", icon: Users },
  { href: "/organizations", label: "Organisaties", icon: Building2 },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/tasks", label: "Taken", icon: CheckSquare },
];

export default function Sidebar({
  userEmail,
  userName,
}: {
  userEmail?: string | null;
  userName?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Building2 className="text-white" size={16} />
        </div>
        <span className="font-semibold text-sm">RelatieCRM</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition",
                active
                  ? "bg-primary-soft text-primary"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-primary-soft text-primary flex items-center justify-center text-xs font-semibold shrink-0">
            {(userName || userEmail || "?")[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate">{userName || "Gebruiker"}</p>
            <p className="text-[11px] text-muted truncate">{userEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            title="Uitloggen"
            className="text-muted hover:text-danger transition p-1.5 rounded-md hover:bg-gray-100"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
