import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ACTIVE_ORG_COOKIE, ALL_ORGS_ID } from "@/lib/organizations";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Force an organization choice before letting a logged-in user reach any
  // CRM page. The dashboard itself renders the picker when nothing is
  // chosen yet, so it (and a handful of infra routes) are exempt.
  if (user && !isAuthRoute) {
    const pathname = request.nextUrl.pathname;
    const exempt =
      pathname === "/dashboard" ||
      pathname.startsWith("/choose-organization") ||
      pathname.startsWith("/api/");

    if (!exempt) {
      const [{ data: memberships }, { data: profile }] = await Promise.all([
        supabase.from("user_organizations").select("organization_id"),
        supabase.from("profiles").select("is_developer").eq("id", user.id).maybeSingle(),
      ]);
      const orgIds = (memberships || []).map((m) => m.organization_id as string);
      const isDeveloper = Boolean(
        (profile as { is_developer: boolean | null } | null)?.is_developer
      );
      const activeOrgCookie = request.cookies.get(ACTIVE_ORG_COOKIE)?.value;
      const hasValidCookie =
        (activeOrgCookie === ALL_ORGS_ID && isDeveloper) ||
        (!!activeOrgCookie && orgIds.includes(activeOrgCookie));
      // A single non-developer membership needs no explicit choice — the
      // app layout auto-selects it, so no cookie is ever written for it.
      const autoSelectable = orgIds.length === 1 && !isDeveloper;

      if (!hasValidCookie && !autoSelectable) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}
