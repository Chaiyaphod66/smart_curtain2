import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const username = process.env.CLOUD_DASHBOARD_USER;
  const password = process.env.CLOUD_DASHBOARD_PASSWORD;

  if (!username || !password) return NextResponse.next();

  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Basic ")) {
    try {
      const decoded = atob(authorization.slice(6));
      const separator = decoded.indexOf(":");
      const providedUsername = decoded.slice(0, separator);
      const providedPassword = decoded.slice(separator + 1);

      if (
        separator >= 0 &&
        providedUsername === username &&
        providedPassword === password
      ) {
        return NextResponse.next();
      }
    } catch {
      // Invalid Base64 falls through to the authentication challenge.
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Smart Curtain"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
