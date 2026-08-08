import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ORG_COOKIE, ALL_ORGS_ID } from "@/lib/organizations";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  let body: { organization_id?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag" }, { status: 400 });
  }

  const organizationId = body?.organization_id;
  if (!organizationId) {
    return NextResponse.json({ error: "organization_id ontbreekt" }, { status: 400 });
  }

  if (organizationId === ALL_ORGS_ID) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_developer")
      .eq("id", user.id)
      .maybeSingle();
    if (!(profile as { is_developer: boolean } | null)?.is_developer) {
      return NextResponse.json({ error: "Alleen developers kunnen alle organisaties tegelijk bekijken" }, { status: 403 });
    }
  } else {
    const { data: membership } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Geen toegang tot deze organisatie" }, { status: 403 });
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACTIVE_ORG_COOKIE, organizationId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}
