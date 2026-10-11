// The cloud save route against a real Postgres. Runs when TEST_POSTGRES_URL is
// set; the login check is replaced with a fake that knows two tokens.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const url = process.env.TEST_POSTGRES_URL;

vi.mock("@/lib/server/auth", () => ({
  authEnabled: () => true,
  userFromToken: async (t: string) =>
    t === "mom" ? { id: "11111111-1111-1111-1111-111111111111", email: "mom@example.com" } : t === "dad" ? { id: "22222222-2222-2222-2222-222222222222", email: "dad@example.com" } : null,
}));

describe.skipIf(!url)("/api/sync", () => {
  let route: typeof import("@/app/api/sync/route");
  let sql: NonNullable<ReturnType<typeof import("@/lib/server/db").db>>;
  const req = (method: string, token: string | null, body?: unknown) =>
    new Request("http://test/api/sync", {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });

  beforeAll(async () => {
    process.env.POSTGRES_URL = url;
    const db = await import("@/lib/server/db");
    sql = db.db()!;
    await sql`drop table if exists family_data`;
    route = await import("@/app/api/sync/route");
  });
  afterAll(async () => {
    await sql?.end();
  });

  it("refuses without a valid login", async () => {
    expect((await route.GET(req("GET", null))).status).toBe(401);
    expect((await route.GET(req("GET", "stranger"))).status).toBe(401);
  });

  it("joins saves from two phones and keeps families apart", async () => {
    await route.PUT(req("PUT", "mom", { data: { "mirodil:photo": { tries: 3, selfSolved: 2, helpSum: 1 }, "mirodil:days": ["2026-10-10"] } }));
    const second = await route.PUT(req("PUT", "mom", { data: { "mirodil:photo": { tries: 1, selfSolved: 1, helpSum: 0 }, "mirodil:days": ["2026-10-11"], junk: 1 } }));
    expect((await second.json()).data).toEqual({
      "mirodil:photo": { tries: 3, selfSolved: 2, helpSum: 1 },
      "mirodil:days": ["2026-10-10", "2026-10-11"],
    });
    const mom = await (await route.GET(req("GET", "mom"))).json();
    expect(mom.email).toBe("mom@example.com");
    expect(mom.data["mirodil:days"]).toEqual(["2026-10-10", "2026-10-11"]);
    expect(await (await route.GET(req("GET", "dad"))).json()).toEqual({ email: "dad@example.com", data: {} });
  });
});
