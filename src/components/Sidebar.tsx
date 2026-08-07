"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Users,
  Building2,
  KanbanSquare,
  CheckSquare,
  CalendarDays,
  Mail,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Contacten", icon: Users },
  { href: "/organizations", label: "Organisaties", icon: Building2 },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/tasks", label: "Taken", icon: CheckSquare },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/email", label: "E-mail", icon: Mail },
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
  const [open, setOpen] = useState(false);

  // Close the mobile drawer on every navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent background scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navLinks = (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 lg:py-2 rounded-lg text-sm font-medium transition",
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
  );

  const userFooter = (
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
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center gap-2 px-4 h-14 border-b border-border bg-card">
        <button
          onClick={() => setOpen(true)}
          aria-label="Menu openen"
          className="p-2 -ml-2 rounded-md text-gray-600 hover:bg-gray-100"
        >
          <Menu size={20} />
        </button>
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <Building2 className="text-white" size={14} />
        </div>
        <span className="font-semibold text-sm">RelatieCRM</span>
      </div>

      {/* Mobile drawer backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: static column on desktop, sliding drawer on mobile */}
      <aside
        className={cn(
          "w-64 lg:w-60 shrink-0 flex flex-col border-r border-border bg-card",
          "fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-out",
          "lg:static lg:h-screen lg:sticky lg:top-0 lg:translate-x-0 lg:transition-none",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 h-16 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="text-white" size={16} />
            </div>
            <span className="font-semibold text-sm">RelatieCRM</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Menu sluiten"
            className="lg:hidden p-1.5 rounded-md text-muted hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {navLinks}
        {userFooter}
      </aside>
    </>
  );
}
