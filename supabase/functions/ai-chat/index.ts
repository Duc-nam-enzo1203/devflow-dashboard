// AI Chat Edge Function — Gemini API, key chỉ lưu server (secret GEMINI_API_KEY).
// Deploy: supabase secrets set GEMINI_API_KEY=your_key
//         supabase functions deploy ai-chat
// Optional: supabase secrets set GEMINI_MODEL=gemini-2.5-flash

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message: string;
  history: { role: string; content: string }[];
}

function base64UrlDecode(str: string): string {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );
  } catch {
    return atob(base64);
  }
}

/**
 * Supabase gateway đôi khi gửi Authorization dạng:
 * "Bearer <apikey_jwt>,Bearer <auth_jwt>".
 * Hàm này sẽ chọn token có role=authenticated/service_role.
 */
function extractAuthToken(authHeader: string): string | null {
  const parts = authHeader.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed.startsWith('Bearer ')) continue;
    const token = trimmed.slice(7).trim();
    try {
      const chunks = token.split('.');
      if (chunks.length !== 3) continue;
      const payload = JSON.parse(base64UrlDecode(chunks[1])) as { role?: string };
      if (payload.role === 'authenticated' || payload.role === 'service_role') {
        return token;
      }
    } catch {
      // continue
    }
  }
  const fallback = parts[0]?.trim().replace(/^Bearer\s+/, '');
  return fallback || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not configured on server' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Optional auth: vẫn cho phép gọi AI chat nếu token thiếu/sai.
    // Điều này tránh block toàn bộ tính năng khi gateway/client truyền Authorization không ổn định.
    if (authHeader) {
      const token = extractAuthToken(authHeader);
      if (token) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser(token);
        if (authError || !user) {
          console.warn('ai-chat: invalid auth token, fallback to anonymous mode');
        }
      } else {
        console.warn('ai-chat: cannot extract auth token, fallback to anonymous mode');
      }
    } else {
      console.warn('ai-chat: missing Authorization header, fallback to anonymous mode');
    }

    let body: ChatRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message, history } = body;
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const safeHistory = Array.isArray(history) ? history : [];

    const systemPrompt = `You are DevFlow AI assistant, helping developers manage their projects, tasks, and workflows.
You have access to the user's project management dashboard data.
Be concise, helpful, and actionable. Focus on helping with:
- Project planning and management
- Task organization and prioritization
- Productivity tips
- Technical questions related to the user's work
Always respond in the same language the user uses to ask.`;

    const contents = [
      ...safeHistory.slice(-10).map((h) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(h.content ?? '') }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.0-flash';
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            role: 'system',
            parts: [{ text: systemPrompt }],
          },
          generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error('Gemini API error:', geminiRes.status, errorText);
      let userMsg = 'AI service unavailable';
      try {
        const parsed = JSON.parse(errorText) as { error?: { message?: string } };
        if (parsed?.error?.message) userMsg = parsed.error.message;
      } catch {
        // ignore
      }
      return new Response(
        JSON.stringify({ error: userMsg }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = (await geminiRes.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const reply =
      result.candidates?.[0]?.content?.parts?.[0]?.text ||
      'I apologize, I could not generate a response.';

    return new Response(
      JSON.stringify({ reply }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('AI Chat function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
