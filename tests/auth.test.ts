import { afterEach, describe, expect, it, vi } from "vitest";
import { requireLogin } from "@/lib/server/auth";

const req = (token?: string) => new Request("http://test/api/lesson", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {} });

describe("AI only for logged-in families", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("stays open when login is not set up", async () => {
    expect(await requireLogin(req(), false)).toBeNull();
  });

  it("refuses without a valid login and lets a logged-in parent in", async () => {
    vi.stubEnv("SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const auth = new Headers(init?.headers).get("authorization");
        return auth === "Bearer good" ? Response.json({ id: "u1", email: "mom@example.com" }) : new Response("{}", { status: 401 });
      }),
    );
    expect((await requireLogin(req(), true))?.status).toBe(401);
    expect((await requireLogin(req("bad"), true))?.status).toBe(401);
    expect(await requireLogin(req("good"), true)).toBeNull();
  });
});
