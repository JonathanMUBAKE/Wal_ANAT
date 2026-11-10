import { buildApp } from "./app.js";

/* Démarrage commun des tests de la version gouvernementale : une application neuve, Alice propriétaire, Karim membre. */
type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
const NO_LIMITS = {
  anonymousPerMinute: 1e6,
  sessionPerMinute: 1e6,
  aiPerMinute: 1e6,
  invitationsPerHour: 1e6,
  aiRunsPerHour: 1e6,
};
const cookieOf = (res: { headers: Record<string, unknown> }) =>
  ([] as unknown[])
    .concat(res.headers["set-cookie"] ?? [])
    .map((c) => String(c).split(";")[0])
    .filter((c) => !/=$/.test(c))
    .join("; ");

export async function boot() {
  const ctx = await buildApp({ provider: "demo", demoDelayMs: 0, limits: NO_LIMITS });
  const cookies: Record<string, string> = {};
  const login = async (id: string) => {
    const res = await ctx.app.inject({ method: "POST", url: "/api/auth/login", payload: { user_id: id } });
    cookies[id] = cookieOf(res);
  };
  for (const id of ["u_alice", "u_karim", "u_hugo"]) await login(id);
  // biome-ignore lint/suspicious/noExplicitAny: réponses JSON des tests
  const api = async (
    who: string,
    method: Method,
    url: string,
    payload?: unknown,
  ): Promise<{ status: number; body: any; raw: Buffer; headers: Record<string, unknown> }> => {
    const res = await ctx.app.inject({
      method,
      url,
      payload: payload as never,
      headers: { cookie: cookies[who] ?? who },
    });
    let body = null;
    try {
      body = res.body ? JSON.parse(res.body) : null;
    } catch {
      body = res.body;
    }
    return { status: res.statusCode, body, raw: res.rawPayload, headers: res.headers };
  };
  const org = (await ctx.db.one<{ id: string }>("SELECT id FROM organizations WHERE name = 'Nova Mobile'"))!.id;
  const profiles = (await api("u_alice", "GET", "/api/org/profiles")).body as { id: string; name: string }[];
  const profile = (name: string) => profiles.find((p) => p.name === name)!.id;
  const promote = (user: string, name = "Administrateur") =>
    api("u_alice", "PUT", `/api/org/members/${user}/profile`, { profile_id: profile(name) });
  const units = async (n: number) => {
    const parent = (await api("u_alice", "GET", "/api/org/units")).body[0].id;
    const out: string[] = [];
    for (let i = 0; i < n; i++)
      out.push(
        (await api("u_alice", "POST", "/api/org/units", { name: `Entité ${Math.random()}`, parent_id: parent })).body
          .id,
      );
    return out;
  };
  /** Hugo fonde une autre organisation et y reste seul : c'est le propriétaire « extérieur ». */
  const foreignOrg = async () => {
    const b = await ctx.app.inject({
      method: "POST",
      url: "/api/orgs",
      payload: { name: "Organisation B" },
      headers: { cookie: cookies.u_hugo },
    });
    cookies.b = `${cookies.u_hugo.split(";")[0]}; ${cookieOf(b)}`;
    await ctx.db.query("DELETE FROM memberships WHERE user_id = 'u_hugo'");
    await ctx.db.query("DELETE FROM team_members WHERE user_id = 'u_hugo'");
    await ctx.db.query("DELETE FROM org_members WHERE user_id = 'u_hugo' AND org_id = $1", [org]);
    const list = (await api("b", "GET", "/api/org/units")).body;
    const unit = list[0]?.id ?? (await api("b", "POST", "/api/org/units", { name: "Racine" })).body.id;
    return { who: "b", unit: unit as string };
  };
  return { ctx, api, org, profile, promote, units, foreignOrg, login };
}
export type GovCtx = Awaited<ReturnType<typeof boot>>;
