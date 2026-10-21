import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { isMcpEnabled } from "@/lib/mcp/kill-switch";

// Paths reachable without being logged in.
const PUBLIC_PATHS = ["/login"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

// Seconds the client is told to wait before retrying a 429 — matches the
// rate limiter's window (30 requests / 60 s, see lib/rate-limit.ts).
const RETRY_AFTER_SECONDS = "60";

// Someone flooded /api/mcp with junk requests; each one cost a serverless
// invocation even though the bearer-token check rejected it. This reads the
// caller's IP and asks the rate limiter BEFORE the route (and its DB lookup)
// run, so an abusive burst is rejected at the edge for near-zero cost.
//
// The client IP is the first hop of X-Forwarded-For (Vercel sets this
// header). If it's missing (e.g. local dev without a proxy in front), we
// can't identify the caller, so we fail open and let the request through —
// same fail-open contract as checkRateLimit itself.
function clientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!forwardedFor) return null;
  const first = forwardedFor.split(",")[0]?.trim();
  return first || null;
}

// 429 response for /api/mcp, shaped like the JSON-RPC error body that
// app/api/mcp/route.ts's `unauthorized()` helper returns, so MCP clients get
// a response they already know how to parse.
function mcpRateLimited(): NextResponse {
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      error: { code: -32002, message: "Příliš mnoho požadavků." },
      id: null,
    },
    { status: 429, headers: { "Retry-After": RETRY_AFTER_SECONDS } },
  );
}

// 429 response for /login — plain JSON is enough, this isn't a JSON-RPC
// endpoint.
function loginRateLimited(): NextResponse {
  return NextResponse.json(
    { error: "Příliš mnoho pokusů o přihlášení. Zkuste to za chvíli." },
    { status: 429, headers: { "Retry-After": RETRY_AFTER_SECONDS } },
  );
}

// Copies any refreshed session cookies from `from` onto a redirect response so
// a token refresh isn't lost when we redirect.
function redirectWith(from: NextResponse, url: URL) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}

// Refreshes the Supabase session cookie and gates routes: unauthenticated users
// are redirected to /login; a logged-in user visiting /login goes to home.
export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isMcp = pathname.startsWith("/api/mcp");
  const isLogin = pathname === "/login";

  // Kill-switch gate — admin can turn MCP off from /mcp-tokeny with no
  // redeploy (lib/mcp/kill-switch.ts). Runs FIRST, before the rate limiter
  // and before anything else: when off, a request to /api/mcp must look
  // like the route doesn't exist — bare 404, no auth, no DB, no MCP logic.
  // Fails CLOSED (the opposite of the rate limiter below), so it never
  // throws into this path.
  if (isMcp) {
    const enabled = await isMcpEnabled();
    if (!enabled) {
      return new NextResponse(null, { status: 404 });
    }
  }

  // Rate-limit gate — runs before anything else (bearer check, DB, Supabase
  // auth) so a flood is rejected at the edge for near-zero cost. Separate
  // per-IP buckets for each path, same fail-open rules as checkRateLimit.
  if (isMcp || isLogin) {
    const ip = clientIp(request);
    if (ip) {
      const bucket = isMcp ? "mcp" : "login";
      const allowed = await checkRateLimit(bucket, ip);
      if (!allowed) {
        return isMcp ? mcpRateLimited() : loginRateLimited();
      }
    }
  }

  // The MCP endpoint does its OWN bearer-token auth (app/api/mcp/route.ts) and
  // MCP clients send no Supabase cookie — so skip the cookie-session gate here,
  // otherwise every call would be 3xx-redirected to /login before the route runs.
  if (isMcp) {
    return NextResponse.next({ request });
  }

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
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() revalidates the token; do not run code between creating
  // the client and this call. If auth is unreachable, treat it as "no user" and
  // fall through to the gate (which sends to the public /login) rather than 500.
  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    user = null;
  }

  const path = request.nextUrl.pathname;

  if (!user && !isPublic(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return redirectWith(response, url);
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return redirectWith(response, url);
  }

  return response;
}
