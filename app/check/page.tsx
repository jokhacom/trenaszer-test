import { aiEnabled, booksAiEnabled } from "@/lib/server/ai";
import { db } from "@/lib/server/db";
import { supabaseParts } from "@/lib/server/storage";

// Read the settings on every visit, not at build time.
export const dynamic = "force-dynamic";

/**
 * A page for the site owner: which settings the site can see. Shows only
 * yes/no, never the keys themselves.
 */
export default function Check() {
  const sb = supabaseParts();
  const rows: [string, boolean, string][] = [
    ["AI (Gemini или Claude)", aiEnabled(), "GEMINI_API_KEY или ANTHROPIC_API_KEY"],
    ["База данных Supabase", Boolean(db()), "POSTGRES_URL"],
    ["Адрес Supabase", sb.url, "SUPABASE_URL или NEXT_PUBLIC_SUPABASE_URL"],
    [
      "Публичный ключ Supabase (вход по почте)",
      sb.publicKey,
      "SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_PUBLISHABLE_KEY или NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ],
    ["Серверный ключ Supabase (учебники)", sb.serverKey, "SUPABASE_SERVICE_ROLE_KEY или SUPABASE_SECRET_KEY"],
    ["Gemini для учебников", booksAiEnabled(), "GEMINI_API_KEY"],
  ];
  const login = Boolean(db()) && sb.url && sb.publicKey;
  return (
    <main className="shell stack">
      <h1>🔧 Проверка настроек</h1>
      <div className="card stack">
        {rows.map(([name, ok, vars]) => (
          <div key={name}>
            <b>
              {ok ? "✅" : "❌"} {name}
            </b>
            {!ok && (
              <div className="muted" style={{ fontSize: 14 }}>
                Нужна переменная в Vercel: {vars}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="card">
        <b>{login ? "✅ Вход по почте включён на сайте." : "❌ Вход по почте выключен: не хватает строк с ❌ выше."}</b>
        <p className="muted" style={{ marginBottom: 0 }}>
          Ещё нужно в Supabase: Authentication → URL Configuration — адрес сайта в Site URL и Redirect URLs; Authentication → Sign
          In / Providers — Email включён. После изменения переменных в Vercel нужен Redeploy.
        </p>
      </div>
    </main>
  );
}
