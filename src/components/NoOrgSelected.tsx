"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";

export default function NoOrgSelected() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="card p-8 max-w-sm text-center">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
          <Building2 size={18} />
        </div>
        <h1 className="text-lg font-semibold mb-2">Kies eerst een organisatie</h1>
        <p className="text-sm text-muted mb-4">
          Ga naar het dashboard om een organisatie te kiezen voordat je verder gaat.
        </p>
        <Link href="/dashboard" className="btn-primary inline-flex">
          Naar dashboard
        </Link>
      </div>
    </div>
  );
}
