import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSettings } from "@/lib/localDb";
import { buildSamlAuthorizeUrl, getSamlBaseUrl, isSamlConfigured } from "@/lib/auth/saml.js";
import { shouldUseSecureCookie } from "@/lib/auth/dashboardSession";

// getSettings() reads SQLite, and `next build` prerenders every GET route it can.
// Rendering this one at build time made the build itself a database writer
// competing with the prerender workers: "SqliteError: database is locked" came
// back as a failed export and the build died, intermittently. Nothing here can
// be prerendered anyway - it reads the request cookies and redirects.
export const dynamic = "force-dynamic";

export async function GET(request) {
  const settings = await getSettings();
  const origin = getSamlBaseUrl(request, settings);
  try {
    if (!isSamlConfigured(settings)) {
      return NextResponse.redirect(new URL("/login?error=saml_not_configured", origin));
    }

    const { authorizeUrl, requestId } = await buildSamlAuthorizeUrl(request, settings);

    const cookieStore = await cookies();
    cookieStore.set("saml_state", requestId, {
      httpOnly: true,
      secure: shouldUseSecureCookie(request),
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });

    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message || "saml_start_failed")}`, origin)
    );
  }
}
