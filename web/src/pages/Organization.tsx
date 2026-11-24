import { pl } from "@/lib/format";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { PageHeader, Status, Tabs } from "@/components/gov";
import { Domains, Gaps, SheetDialog, Sheets, useSheetRows } from "./Attributions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AtSign, ChevronRight, MapPin, Network, Plus, Trash2, Users } from "lucide-react";
import { useReferentials, useUnitTypes } from "@/lib/referentials";
import { Avatar, Button, ConfirmDialog, Dialog, Empty, Spinner, cn, Hint } from "@/components/ui";
import { AssigneePicker } from "@/components/pickers";
import { AvatarUpload } from "@/components/AvatarUpload";
import { ORG_ROLE } from "@/components/Sidebar";
import { useCan, useMe, useServiceAddress, useTeams, useUnits, useUserMap, useUsers } from "@/lib/hooks";
import { InvitationsPanel, MemberAccessButton, ProfilesPanel, useProfiles } from "./OrgAccess";
import { api } from "@/lib/api";
import type { OrgUnit } from "@/lib/types";

/** Type d'entité : libellé du référentiel et repère « Province » pour les représentations en province. */
function UnitKind({ code }: { code: string }) {
  const unitType = useUnitTypes();
  const t = unitType(code);
  return (
    <>
      {t.label}
      {t.value?.props.provincial && (
        <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-success-soft px-1 text-[11px] font-medium text-success">
          <MapPin className="size-2.5" />
          Province
        </span>
      )}
    </>
  );
}

export function OrganizationPage() {
  const { data: me } = useMe();
  const { data: units, isLoading } = useUnits();
  const { data: people } = useUsers();
  const [params, setParams] = useSearchParams();
  type OrgTab = "tree" | "attributions" | "gaps" | "people" | "profiles" | "domains";
  const tab = (params.get("tab") as OrgTab) || "tree";
  const setTab = (t: OrgTab) => setParams(t === "tree" ? {} : { tab: t }, { replace: true });
  const can = useCan();
  const org = me?.orgs.find((o) => o.id === me.org_id);
  // La structure se modifie selon le profil, non selon le niveau (lot S : la DG lit, l'informatique administre)
  const isAdmin = can("org.structure");
  const canManage = can("org.members"),
    canProfiles = can("org.profiles");
  const humans = (people ?? []).filter((u) => !u.is_ai);
  // Une entité, ses attributions, ses écarts et le référentiel des domaines vivent ici (docs/ARCHITECTURE-INFORMATION.md)
  const tabs: { id: OrgTab; label: string }[] = [
    { id: "tree", label: "Organigramme" },
    ...(can("attributions.view") ? [{ id: "attributions" as const, label: "Attributions" }] : []),
    ...(can("pilotage.view") ? [{ id: "gaps" as const, label: "Écarts de participation" }] : []),
    { id: "people", label: "Personnes" },
    ...(canProfiles ? [{ id: "profiles" as const, label: "Profils et droits" }] : []),
    ...(can("attributions.view") ? [{ id: "domains" as const, label: "Référentiel des domaines" }] : []),
  ];

  return (
    <div className="min-h-full pb-16">
      <PageHeader
        Icon={Network}
        crumbs={["Organisation", "Structure"]}
        title={org?.name ?? "Organisation"}
        subtitle={`${units?.length ?? 0} entités · ${humans.length} personnes · chaque entité porte sa fiche d'attributions et ses rapports avec les autres.${isAdmin ? "" : " Lecture seule."}`}
      />
      <Tabs value={tab} onChange={setTab} items={tabs} />
      <div className="mx-auto max-w-[1480px] p-4 sm:px-8 sm:py-6">
        {isLoading ? (
          <Spinner />
        ) : tab === "tree" ? (
          <Tree units={units ?? []} isAdmin={isAdmin} />
        ) : tab === "attributions" ? (
          <Sheets />
        ) : tab === "gaps" ? (
          <Gaps />
        ) : tab === "domains" ? (
          <Domains />
        ) : tab === "profiles" && canProfiles ? (
          <ProfilesPanel />
        ) : (
          <>
            <People units={units ?? []} isAdmin={isAdmin} canManage={canManage} canStructure={can("org.structure")} />
            {canManage && <InvitationsPanel />}
          </>
        )}
      </div>
    </div>
  );
}

function Tree({ units, isAdmin }: { units: OrgUnit[]; isAdmin: boolean }) {
  const users = useUserMap();
  const [selected, setSelected] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const children = useMemo(() => {
    const m = new Map<string | null, OrgUnit[]>();
    for (const u of units) m.set(u.parent_id, [...(m.get(u.parent_id) ?? []), u]);
    return m;
  }, [units]);
  const hidden = useMemo(() => {
    const h = new Set<string>();
    const hide = (id: string) => {
      for (const c of children.get(id) ?? []) {
        h.add(c.id);
        hide(c.id);
      }
    };
    collapsed.forEach(hide);
    return h;
  }, [collapsed, children]);
  const current = units.find((u) => u.id === (selected ?? units[0]?.id));
  if (!units.length) return <Empty title="Aucune entité">Créez la structure de votre organisation.</Empty>;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
      <section className="overflow-hidden rounded-2xl border border-line bg-panel shadow-sm" aria-label="Organigramme">
        {units
          .filter((u) => !hidden.has(u.id))
          .map((u) => {
            const kids = children.get(u.id)?.length ?? 0;
            const manager = u.manager_id ? users.get(u.manager_id) : null;
            return (
              <div
                key={u.id}
                className={cn(
                  "flex h-12 items-center gap-2 border-b border-line pr-4 last:border-b-0",
                  current?.id === u.id ? "bg-active" : "hover:bg-hover",
                )}
                style={{ paddingLeft: 12 + u.depth * 22 }}
              >
                <button
                  aria-label={`${collapsed.has(u.id) ? "Déplier" : "Replier"} ${u.name}`}
                  aria-expanded={!collapsed.has(u.id)}
                  tabIndex={kids ? 0 : -1}
                  onClick={() => {
                    const n = new Set(collapsed);
                    n.has(u.id) ? n.delete(u.id) : n.add(u.id);
                    setCollapsed(n);
                  }}
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded text-faint hover:bg-hover",
                    !kids && "invisible",
                  )}
                >
                  <ChevronRight className={cn("size-3.5 transition-transform", !collapsed.has(u.id) && "rotate-90")} />
                </button>
                <button
                  onClick={() => setSelected(u.id)}
                  aria-current={current?.id === u.id ? "true" : undefined}
                  className="flex h-full min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn("block truncate text-[13.5px]", u.depth === 0 ? "font-semibold" : "font-medium")}
                    >
                      {u.name}
                    </span>
                    <span className="block truncate text-[11.5px] text-faint">
                      <UnitKind code={u.kind} />
                      {u.team_count ? ` · ${u.team_count} ${pl(u.team_count, "équipe(s)")}` : ""}
                      {u.member_count ? ` · ${u.member_count} pers.` : ""}
                    </span>
                  </span>
                  {manager && (
                    <span className="hidden items-center gap-1.5 text-[12px] text-muted sm:flex">
                      <Avatar user={manager} size={20} />
                      {manager.name.split(" ")[0]}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
      </section>
      {current && <UnitDetail key={current.id} unit={current} units={units} isAdmin={isAdmin} onSelect={setSelected} />}
    </div>
  );
}

function UnitDetail({
  unit,
  units,
  isAdmin,
  onSelect,
}: {
  unit: OrgUnit;
  units: OrgUnit[];
  isAdmin: boolean;
  onSelect: (id: string) => void;
}) {
  const qc = useQueryClient();
  const users = useUserMap();
  const { data: people } = useUsers();
  const { data: teams } = useTeams();
  const { data: refs } = useReferentials();
  const [name, setName] = useState(unit.name);
  const [child, setChild] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [sheetFor, setSheetFor] = useState<{ id?: string; unit_id: string; name: string } | null>(null);
  const can = useCan();
  const { data: sheets } = useSheetRows();
  const approved = sheets?.find((s) => s.unit_id === unit.id && s.status === "approved");
  const draft = sheets?.find((s) => s.unit_id === unit.id && s.status === "draft");
  const humans = (people ?? []).filter((u) => !u.is_ai);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["units"] });
    qc.invalidateQueries({ queryKey: ["users"] });
  };
  // Créer une entité, c'est aussitôt définir ce dont elle répond : la fiche d'attributions s'ouvre
  const createChild = () => {
    const name = child.trim();
    if (!name) return;
    api.post<{ id: string }>("/api/org/units", { name, parent_id: unit.id, kind: "service" }).then(
      (r) => {
        setChild("");
        refresh();
        if (can("attributions.manage")) {
          toast.success("Sous-entité créée. Définissez maintenant ses attributions.");
          setSheetFor({ unit_id: r.id, name });
        } else toast.success("Sous-entité créée");
      },
      (er) => toast.error(er.message),
    );
  };
  const patch = (body: Record<string, unknown>, ok?: string) =>
    api.patch(`/api/units/${unit.id}`, body).then(
      () => {
        refresh();
        if (ok) toast.success(ok);
      },
      (e) => toast.error(e.message),
    );
  // Une entité ne peut pas être déplacée sous elle-même ni sous ses descendantes
  const descendants = useMemo(() => {
    const out = new Set([unit.id]);
    let added = true;
    while (added) {
      added = false;
      for (const u of units)
        if (u.parent_id && out.has(u.parent_id) && !out.has(u.id)) {
          out.add(u.id);
          added = true;
        }
    }
    return out;
  }, [unit.id, units]);
  const manager = unit.manager_id ? users.get(unit.manager_id) : null;
  // L'entité racine représente l'organisation : elle utilise l'adresse contact@
  const address = useServiceAddress(unit.parent_id ? "unit" : "org", unit.id);
  const sub = units.filter((u) => u.parent_id === unit.id);
  const unitTeams = (teams ?? []).filter((t) => t.unit_id === unit.id);
  const members = humans.filter((u) => u.unit_id === unit.id);
  const field =
    "h-9 w-full rounded-lg border border-line bg-bg/60 px-2.5 text-[13.5px] outline-none focus:border-line-strong disabled:opacity-70";

  return (
    <aside className="space-y-5 rounded-2xl border border-line bg-panel p-5 shadow-sm lg:sticky lg:top-4 lg:self-start">
      <div className="space-y-3">
        <input
          value={name}
          disabled={!isAdmin}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== unit.name && patch({ name: name.trim() }, "Entité renommée")}
          aria-label="Nom de l'entité"
          className="w-full rounded-md bg-transparent text-[18px] font-semibold tracking-[-0.01em] outline-none hover:bg-hover focus:bg-hover disabled:hover:bg-transparent"
        />
        {address && (
          <p className="-mt-2 flex items-center gap-1.5 text-[12.5px] text-muted" title="Adresse de service">
            <AtSign className="size-3.5" />
            <span className="font-mono">{address.address}</span>
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[12px] text-muted">
            Type
            <select
              value={unit.kind}
              disabled={!isAdmin}
              onChange={(e) => patch({ kind: e.target.value })}
              className={cn(field, "mt-1")}
            >
              {(refs?.unit_type ?? [])
                .filter((t) => !t.archived || t.code === unit.kind)
                .map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                    {t.props.provincial ? " (province)" : ""}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-[12px] text-muted">
            Rattachée à
            <select
              value={unit.parent_id ?? ""}
              disabled={!isAdmin || !unit.parent_id}
              onChange={(e) => patch({ parent_id: e.target.value }, "Entité déplacée")}
              className={cn(field, "mt-1")}
            >
              {!unit.parent_id && <option value="">Racine</option>}
              {units
                .filter((u) => !descendants.has(u.id))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {"  ".repeat(u.depth)}
                    {u.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <div className="text-[12px] text-muted">
          Responsable
          <AssigneePicker
            memberIds={humans.map((u) => u.id)}
            value={unit.manager_id}
            onChange={(id) => isAdmin && patch({ manager_id: id }, "Responsable mis à jour")}
          >
            <button
              disabled={!isAdmin}
              className="mt-1 flex h-9 w-full items-center gap-2 rounded-lg border border-line bg-bg/60 px-2.5 text-left text-[13.5px] text-fg"
            >
              <Avatar user={manager} size={20} />
              {manager?.name ?? <span className="text-faint">Aucun</span>}
            </button>
          </AssigneePicker>
          <p className="mt-1 text-[11.5px] text-faint">
            Le responsable voit en lecture les projets de toute sa branche, sauf ceux des équipes privées.
          </p>
        </div>
      </div>

      {can("attributions.view") && (
        <Block title="Attributions">
          <div className="rounded-xl border border-line p-3">
            <div className="flex flex-wrap items-center gap-2">
              {approved ? (
                <Status label={`Fiche approuvée · version ${approved.version}`} tone="success" />
              ) : draft ? (
                <Status label="Fiche en préparation" tone="info" />
              ) : (
                <Status label="Fiche manquante" tone="warning" />
              )}
              {(approved ?? draft) && (
                <span className="text-[12px] tabular text-muted">
                  {(approved ?? draft)!.domain_count} {pl((approved ?? draft)!.domain_count, "domaine(s)")} · {(approved ?? draft)!.relation_count} {pl((approved ?? draft)!.relation_count, "rapport(s)")}
                </span>
              )}
            </div>
            <Hint className="mt-2">
              Ce dont l'entité répond, avec qui elle travaille : c'est la référence pour repérer les écarts de
              participation.
            </Hint>
            {(approved || draft || can("attributions.manage")) && (
              <Button
                size="sm"
                className="mt-2.5"
                onClick={() => setSheetFor({ id: (draft ?? approved)?.id, unit_id: unit.id, name: unit.name })}
              >
                {approved || draft ? "Ouvrir la fiche" : "Définir les attributions"}
              </Button>
            )}
          </div>
        </Block>
      )}

      <Block title={`Sous-entités · ${sub.length}`}>
        {sub.map((u) => (
          <button
            key={u.id}
            onClick={() => onSelect(u.id)}
            className="flex h-8 w-full items-center justify-between rounded-md px-2 text-left text-[13px] hover:bg-hover"
          >
            <span>{u.name}</span>
            <span className="text-[11.5px] text-faint">
              <UnitKind code={u.kind} />
            </span>
          </button>
        ))}
        {isAdmin && (
          <div className="mt-1 flex items-center gap-2">
            <input
              value={child}
              onChange={(e) => setChild(e.target.value)}
              placeholder="Nouvelle sous-entité"
              aria-label="Nom de la nouvelle sous-entité"
              onKeyDown={(e) => e.key === "Enter" && createChild()}
              className={field}
            />
            <Button size="sm" icon={<Plus className="size-3.5" />} disabled={!child.trim()} onClick={createChild}>
              Ajouter
            </Button>
          </div>
        )}
      </Block>

      <Block title={`Équipes · ${unitTeams.length}`}>
        {unitTeams.map((t) => (
          <Link
            key={t.id}
            to={`/teams/${t.id}`}
            className="flex h-8 items-center gap-2 rounded-md px-2 text-[13px] hover:bg-hover"
          >
            <span className="size-2.5 rounded-sm" style={{ background: t.color }} />
            {t.name}
            <span className="ml-auto text-[11.5px] text-faint">{t.member_count} {pl(t.member_count, "membre(s)")}</span>
          </Link>
        ))}
        {!unitTeams.length && <p className="px-2 text-[12.5px] text-faint">Aucune équipe rattachée.</p>}
      </Block>

      <Block title={`Personnes · ${members.length}`}>
        <div className="flex flex-wrap gap-1.5">
          {members.map((u) => (
            <span
              key={u.id}
              className="flex items-center gap-1.5 rounded-lg border border-line px-2 py-1 text-[12.5px]"
            >
              <Avatar user={u} size={18} />
              {u.name}
            </span>
          ))}
          {!members.length && <p className="px-2 text-[12.5px] text-faint">Personne n'est rattaché ici.</p>}
        </div>
      </Block>

      {sheetFor && (
        <SheetDialog
          id={sheetFor.id}
          unit_id={sheetFor.unit_id}
          name={sheetFor.name}
          onClose={() => setSheetFor(null)}
          onOpen={(id) => setSheetFor({ ...sheetFor, id })}
        />
      )}

      {isAdmin && unit.parent_id && (
        <>
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 className="size-3.5" />}
            onClick={() => setConfirmingDelete(true)}
          >
            Supprimer l'entité
          </Button>
          <ConfirmDialog
            open={confirmingDelete}
            onOpenChange={setConfirmingDelete}
            title={`Supprimer « ${unit.name} » ?`}
            confirmLabel="Supprimer l'entité"
            description="Seule une entité vide peut être supprimée : ni sous-entité, ni équipe, ni personne rattachée."
            onConfirm={() =>
              api.del(`/api/units/${unit.id}`).then(
                () => {
                  refresh();
                  onSelect(unit.parent_id!);
                  toast.success("Entité supprimée");
                },
                (e) => toast.error(e.message),
              )
            }
          />
        </>
      )}
    </aside>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-[12px] font-medium text-muted">{title}</h3>
      {children}
    </section>
  );
}

function People({
  units,
  isAdmin,
  canManage,
  canStructure,
}: {
  units: OrgUnit[];
  isAdmin: boolean;
  canManage: boolean;
  canStructure: boolean;
}) {
  const { data: people } = useUsers();
  const { data: me } = useMe();
  const profiles = useProfiles(canManage);
  const qc = useQueryClient();
  // Un changement de profil ou de rattachement se confirme ; le profil se motive (S-4)
  const [pending, setPending] = useState<{
    kind: "profile" | "unit";
    userId: string;
    name: string;
    value: string;
    label: string;
  } | null>(null);
  const [reason, setReason] = useState("");
  const set = (url: string, body: unknown, ok: string) =>
    api.put(url, body).then(
      () => {
        qc.invalidateQueries({ queryKey: ["users"] });
        qc.invalidateQueries({ queryKey: ["units"] });
        toast.success(ok);
      },
      (e) => toast.error(e.message),
    );
  const sel =
    "h-8 max-w-[220px] rounded-md border border-line bg-bg/60 px-2 text-[12.5px] outline-none disabled:border-transparent disabled:bg-transparent";
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-panel shadow-sm">
      <table className="grid-table min-w-[640px] text-left">
        <thead className="border-b border-line text-[12px] text-muted">
          <tr>
            <th className="px-4 py-2.5 font-medium">Personne</th>
            <th className="px-2 font-medium">Profil</th>
            <th className="px-2 font-medium">Entité</th>
            {canManage && <th className="px-2 font-medium">Droits</th>}
          </tr>
        </thead>
        <tbody>
          {(people ?? [])
            .filter((u) => u.id !== "ai_cadence")
            .map((u) => (
              <tr key={u.id} className="border-b border-line last:border-b-0">
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2.5">
                    <AvatarUpload compact user={u} size={30} editable={u.id === me?.id || (isAdmin && u.is_ai)} />
                    <span>
                      <span className="block font-medium">{u.name}</span>
                      <span className="block text-[12px] text-faint">{u.is_ai ? "Coéquipier IA" : u.title}</span>
                    </span>
                  </span>
                </td>
                <td className="px-2">
                  {canManage && profiles?.length && !u.is_ai ? (
                    <select
                      aria-label={`Profil de ${u.name}`}
                      disabled={u.id === me?.id}
                      value={u.profile_id ?? ""}
                      className={sel}
                      onChange={(e) =>
                        setPending({
                          kind: "profile",
                          userId: u.id,
                          name: u.name,
                          value: e.target.value,
                          label: profiles.find((p) => p.id === e.target.value)?.name ?? "",
                        })
                      }
                    >
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[12.5px] text-muted">{ORG_ROLE[u.org_role]}</span>
                  )}
                </td>
                <td className="px-2">
                  <select
                    aria-label={`Entité de ${u.name}`}
                    disabled={!canStructure}
                    value={u.unit_id ?? ""}
                    className={sel}
                    onChange={(e) =>
                      setPending({
                        kind: "unit",
                        userId: u.id,
                        name: u.name,
                        value: e.target.value,
                        label: units.find((x) => x.id === e.target.value)?.name ?? "Non rattaché",
                      })
                    }
                  >
                    <option value="">Non rattaché</option>
                    {units.map((x) => (
                      <option key={x.id} value={x.id}>
                        {" ".repeat(x.depth * 2)}
                        {x.name}
                      </option>
                    ))}
                  </select>
                </td>
                {canManage && (
                  <td className="px-2">{!u.is_ai && u.id !== me?.id && <MemberAccessButton user={u} />}</td>
                )}
              </tr>
            ))}
        </tbody>
      </table>
      <p className="flex items-center gap-1.5 border-t border-line px-4 py-2.5 text-[12px] text-faint">
        <Users className="size-3.5" />
        Les invités n'accèdent qu'aux projets partagés avec eux ; ils ne voient ni les équipes ni l'organigramme.
      </p>
      {pending && (
        <Dialog
          open
          onOpenChange={() => {
            setPending(null);
            setReason("");
          }}
          title={pending.kind === "profile" ? "Changer le profil" : "Changer le rattachement"}
          description={
            pending.kind === "profile"
              ? `${pending.name} recevra le profil « ${pending.label} » et les droits qui vont avec.`
              : `${pending.name} sera rattaché(e) à « ${pending.label} ».`
          }
          footer={
            <>
              <Button
                onClick={() => {
                  setPending(null);
                  setReason("");
                }}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                disabled={pending.kind === "profile" && !reason.trim()}
                onClick={() => {
                  const p = pending;
                  setPending(null);
                  setReason("");
                  if (p.kind === "profile")
                    set(`/api/org/members/${p.userId}/profile`, { profile_id: p.value, reason }, "Profil mis à jour");
                  else
                    set(`/api/org/members/${p.userId}/unit`, { unit_id: p.value || null }, "Rattachement mis à jour");
                }}
              >
                Confirmer
              </Button>
            </>
          }
        >
          {pending.kind === "profile" && (
            <label className="block text-[13px]">
              <span className="mb-1 block font-medium">Motif</span>
              <input
                autoFocus
                className="h-9 w-full rounded-lg border border-line bg-panel px-2.5 text-[13px]"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nouvelle fonction, affectation…"
              />
            </label>
          )}
        </Dialog>
      )}
    </div>
  );
}
