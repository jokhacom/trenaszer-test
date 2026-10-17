import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/password/route";
import { forSpeech } from "@/lib/speech";

let n = 0;
// Each call from its own address, so the per-address limit does not interfere.
const call = (body: unknown, token?: string) =>
  POST(
    new Request("http://test/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `10.0.0.${++n}`, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    }),
  );

describe("email and password login", () => {
  const seen: { url: string; body: unknown; auth: string | null }[] = [];

  beforeEach(() => {
    seen.length = 0;
    vi.stubEnv("SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? "{}")) as { email?: string; password?: string };
        seen.push({ url, body, auth: new Headers(init?.headers).get("authorization") });
        if (url.includes("grant_type=password")) {
          return body.password === "right-password"
            ? Response.json({ access_token: "a", refresh_token: "r", expires_in: 3600, user: { email: body.email } })
            : Response.json({ error_code: "invalid_credentials" }, { status: 400 });
        }
        if (url.includes("/signup")) return Response.json({ id: "u1", email: body.email }); // confirmation letter first
        if (url.includes("/recover")) return Response.json({});
        if (url.endsWith("/auth/v1/user")) return new Headers(init?.headers).get("authorization") === "Bearer good" ? Response.json({ id: "u1" }) : new Response("{}", { status: 401 });
        return new Response("{}", { status: 404 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("logs in with the right password and returns the session", async () => {
    const res = await call({ mode: "login", email: "Mom@Example.com ", password: "right-password" });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { session: { access_token: string; email: string } };
    expect(data.session.access_token).toBe("a");
    expect(data.session.email).toBe("mom@example.com");
  });

  it("says the password is wrong", async () => {
    const res = await call({ mode: "login", email: "mom@example.com", password: "nope" });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe("wrong_password");
  });

  it("asks to confirm the email after sign-up, and refuses short passwords", async () => {
    expect(((await (await call({ mode: "signup", email: "dad@example.com", password: "12345678" })).json()) as { confirm?: boolean }).confirm).toBe(true);
    expect((await call({ mode: "signup", email: "dad@example.com", password: "123" })).status).toBe(400);
    expect(seen.filter((s) => s.url.includes("/signup"))).toHaveLength(1);
  });

  it("sends the reset letter back to this site", async () => {
    expect((await call({ mode: "reset", email: "mom@example.com" })).status).toBe(200);
    expect(seen[0].url).toContain("redirect_to=http%3A%2F%2Ftest");
  });

  it("sets a new password only when logged in", async () => {
    expect((await call({ mode: "set", password: "new-password" })).status).toBe(401);
    expect((await call({ mode: "set", password: "new-password" }, "bad")).status).toBe(401);
    expect((await call({ mode: "set", password: "new-password" }, "good")).status).toBe(200);
  });

  it("rejects a bad email", async () => {
    expect((await call({ mode: "login", email: "nope", password: "x" })).status).toBe(400);
  });
});

describe("reading aloud", () => {
  it("reads signs as words", () => {
    expect(forSpeech("8 + 5 = ?", "uz")).toBe("8 qo‘shuv 5 teng necha?");
  });
});

describe("voice route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const tts = async (text: string) => {
    const { POST: speakRoute } = await import("@/app/api/tts/route");
    return speakRoute(new Request("http://test/api/tts", { method: "POST", headers: { "x-forwarded-for": `10.1.0.${++n}` }, body: JSON.stringify({ text, lang: "uz" }) }));
  };

  it("is off without the Azure key", async () => {
    expect((await tts("Salom")).status).toBe(503);
  });

  it("reads Uzbek with the Uzbek voice", async () => {
    vi.stubEnv("AZURE_SPEECH_KEY", "k");
    vi.stubEnv("AZURE_SPEECH_REGION", "westeurope");
    const azure = vi.fn(async (_url: string, init?: RequestInit) => new Response(new Uint8Array([1, 2, 3]), { status: String(init?.body).includes("uz-UZ-MadinaNeural") ? 200 : 400 }));
    vi.stubGlobal("fetch", azure);
    const res = await tts("Keling, birga o‘ylaymiz!");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
    expect(String(azure.mock.calls[0][0])).toContain("westeurope.tts.speech.microsoft.com");
  });
});
