// Email Edge Function via Resend API
// Deploy: supabase functions deploy send-email
// RESEND_API_KEY must be set as a secret in Supabase Edge Functions
// The key is stored server-side only — never exposed to client

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Basic email format validation
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Rate limiting: simple in-memory store per IP (resets on cold start)
// For production, use Supabase with a rate_limit table instead
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // max emails per window
const RATE_WINDOW = 60 * 1000; // 1 minute window

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

// The Supabase gateway sends BOTH the apikey JWT (HS256, role=anon)
// AND the auth JWT (ES256, role=authenticated).
// We need to find and verify the auth JWT, not the apikey JWT.
function extractAuthToken(authHeader: string): string | null {
  // Auth header contains: "Bearer <apikey_jwt>,Bearer <auth_jwt>"
  // Or just: "Bearer <token>"
  const parts = authHeader.split(",");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith("Bearer ")) {
      const token = trimmed.slice(7);
      // Try to decode and check role
      try {
        const tokenParts = token.split(".");
        if (tokenParts.length === 3) {
          const payloadStr = base64UrlDecode(tokenParts[1]);
          const payload = JSON.parse(payloadStr);
          // Return the token that has authenticated role
          if (payload.role === "authenticated" || payload.role === "service_role") {
            return token;
          }
        }
      } catch {
        // continue
      }
    }
  }

  // Fallback: return the first bearer token (might be the auth JWT in some configs)
  const firstToken = parts[0]?.trim().replace(/^Bearer\s+/, "");
  return firstToken || null;
}

function base64UrlDecode(str: string): string {
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    return atob(base64);
  }
}

function verifyJWT(token: string): { sub: string; role: string; exp: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const payloadStr = base64UrlDecode(parts[1]);
    const payload = JSON.parse(payloadStr);

    if (!payload.sub || !payload.role) return null;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    // Only allow authenticated users or service role
    if (payload.role !== "authenticated" && payload.role !== "service_role") {
      return null;
    }

    return payload as { sub: string; role: string; exp: number };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting by IP
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                   req.headers.get("cf-connecting-ip") ||
                   "unknown";
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } }
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract and verify the auth JWT (not the apikey JWT)
    const token = extractAuthToken(authHeader);
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: no valid token found" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const verified = verifyJWT(token);
    if (!verified) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate request body
    let body: EmailRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { to, subject, html, text } = body;

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "to, subject, and html are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isValidEmail(to)) {
      return new Response(
        JSON.stringify({ error: "Invalid recipient email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize: prevent email header injection
    if (subject.includes("\n") || subject.includes("\r")) {
      return new Response(
        JSON.stringify({ error: "Invalid subject: newline characters not allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Resend API key from server-side secret (never exposed to client)
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("RESEND_API_KEY not configured in Edge Function secrets");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email via Resend API
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "DevFlow <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
        text: text || "",
      }),
    });

    const data = await res.json() as { id?: string; error?: { message: string } };

    if (!res.ok) {
      throw new Error(data?.error?.message || `Resend error: ${res.status}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email sent", id: data.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-email error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
