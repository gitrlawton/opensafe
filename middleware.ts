import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "./lib/auth0";

export async function middleware(request: NextRequest) {
  try {
    return await auth0.middleware(request);
  } catch (error) {
    console.error("Auth middleware error:", error);

    // Only handle session errors, not auth flow errors
    if (error instanceof Error && error.message.includes("JWE")) {
      // If there's an invalid session cookie, clear it and continue
      const response = NextResponse.next();
      response.cookies.delete("appSession");
      return response;
    }

    // Re-throw other errors (like auth flow errors)
    throw error;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
