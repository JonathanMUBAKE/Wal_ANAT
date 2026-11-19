import { useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarOff, Check, CirclePlus, ClipboardPen, Plane, UserRoundX, X } from "lucide-react";
import { Button, Empty, Spinner, cn } from "@/components/ui";
import { Drawer, DrawerSection } from "@/components/drawer";
import {
  Field,
  Input,
  PageHeader,
  PeopleSelect,
  Section,
  Select,
  Status,
  Table,
  Tabs,
  Td,
  Textarea,
  Tr,
  frDate,
  type Tone,
} from "@/components/gov";
import { Fact, Facts } from "@/components/record";
import { useUsers } from "@/lib/hooks";
import { todayIso } from "@/lib/format";
import { api } from "@/lib/api";

/*
 * Congés et absences (RH, deuxième étape). L'agent demande ; le chef de son entité accorde ou refuse (motif
 * obligatoire pour un refus) ; personne ne décide de sa propre demande ni de celle qu'il a saisie. Le service RH voit
 * tout et enregistre au nom d'un agent une absence constatée. Chacun est prévenu à chaque étape.
 */

export const LEAVE_LABEL: Record<string, string> = {
  conge_annuel: "Congé annuel",
  maladie: "Congé de maladie",
  /** Nature protégée (santé) : seuls l'agent et le service RH la voient. */
  absence: "Absence",
  maternite: "Congé de maternité",
  paternite: "Congé de paternité",
  permission: "Permission d'absence",
  formation: "Formation",
  mission: "Mission",
  autre: "Autre absence",
};
const STATUS: Record<string, { label: string; tone: Tone }> = {
  demande: { label: "En attente", tone: "info" },
  approuve: { label: "Accordé", tone: "success" },
  refuse: { label: "Refusé", tone: "danger" },
  annule: { label: "Annulé", tone: "neutral" },
};

interface Leave {
  id: string;
  user_id: string;
  user_name: string;
  unit_name: string | null;
  kind: string;
  start_on: string;
  end_on: string;
  days: number;
  reason: string;
  interim_id: string | null;
  interim_name: string | null;
  status: keyof typeof STATUS;
  decided_by_name: string | null;
  decided_at: string | null;
  decision_note: string;
  created_by: string | null;
  created_at: string;
  can?: { decide: boolean; cancel: boolean };
}
interface Summary {
  mine: { pending: number; taken: number; upcoming: number };
  to_decide: number;
  absent_today: { user_id: string; user_name: string; kind: string; end_on: string; interim_name: string | null }[];
  can: { all: boolean; manage: boolean };
}
type Tab = "mine" | "valider" | "equipe" | "toutes";
const fail = (e: unknown) => toast.error((e as Error).message);

export function LeavesPage() {
  const [params, setParams] = useSearchParams();
  const { data: sum } = useQuery({
    queryKey: ["leaves", "summary"],
    queryFn: () => api.get<Summary>("/api/leaves/summary"),
  });
  const [tab, setTabState] = useState<Tab>((params.get("onglet") === "valider" ? "valider" : "mine") as Tab);
  const setTab = (t: Tab) => {
    setTabState(t);
    setParams(t === "mine" ? {} : { onglet: t }, { replace: true });
  };
  const [asking, setAsking] = useState<"self" | "rh" | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const scope = tab === "mine" ? "mine" : tab === "toutes" ? "all" : "team";
  const { data, error } = useQuery({
    queryKey: ["leaves", scope],
    queryFn: () => api.get<Leave[]>(`/api/leaves?scope=${scope}`),
  });
  const rows = (data ?? []).filter((l) => tab !== "valider" || l.status === "demande");
  const items: { id: Tab; label: string; badge?: number }[] = [
    { id: "mine", label: "Mes demandes", badge: sum?.mine.pending },
    { id: "valider", label: "À valider", badge: sum?.to_decide },
    { id: "equipe", label: "Mon équipe" },
    ...(sum?.can.all ? [{ id: "toutes" as const, label: "Toute l'institution" }] : []),
  ];
  return (
    <div className="min-h-full">
      <PageHeader
        Icon={CalendarOff}
        crumbs={["Organisation", "Congés et absences"]}
        title="Congés et absences"
        subtitle="Demandez un congé ; le chef de votre entité l'accorde ou le refuse. Le service des ressources humaines voit tout et enregistre les absences constatées."
        actions={
          <>
            {sum?.can.manage && (
              <Button icon={<ClipboardPen className="size-4" />} onClick={() => setAsking("rh")}>
                Enregistrer une absence
              </Button>
            )}
            <Button variant="primary" icon={<CirclePlus className="size-4" />} onClick={() => setAsking("self")}>
              Demander un congé
            </Button>
          </>
        }
      />
      <div className="mx-auto grid max-w-[1240px] gap-3 px-4 pb-4 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
        <Tile label="Congé annuel pris cette année" value={sum?.mine.taken} unit="jour(s) ouvré(s)" />
        <Tile label="Mes demandes en attente" value={sum?.mine.pending} />
        <Tile label="À valider" value={sum?.to_decide} alert={!!sum?.to_decide} />
        <Tile label="Absents aujourd'hui" value={sum?.absent_today.length} unit="dans votre périmètre" />
      </div>
      {!!sum?.absent_today.length && (
        <div className="mx-auto max-w-[1240px] px-4 pb-4 sm:px-8">
          <Section title="Absents aujourd'hui">
            <ul className="divide-y divide-line px-5 pb-3">
              {sum.absent_today.map((a) => (
                <li key={a.user_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-[13.5px]">
                  <UserRoundX className="size-4 text-muted" />
                  <span className="font-medium">{a.user_name}</span>
                  <span className="text-muted">
                    {LEAVE_LABEL[a.kind]} · absent jusqu'au {frDate(a.end_on)} inclus
                  </span>
                  {a.interim_name && <span className="text-muted">· intérim : {a.interim_name}</span>}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}
      <Tabs value={tab} onChange={setTab} items={items} />
      <div className="mx-auto max-w-[1240px] px-4 pb-16 pt-5 sm:px-8">
        <Section>
          {error ? (
            <p className="p-5 text-[13px] text-danger">{(error as Error).message}</p>
          ) : !data ? (
            <div className="p-5">
              <Spinner />
            </div>
          ) : rows.length ? (
            <Table
              head={[...(tab === "mine" ? [] : ["Agent"]), "Nature", "Période", "Jours ouvrés", "Intérim", "État"]}
            >
              {rows.map((l) => (
                <Tr key={l.id} onClick={() => setOpen(l.id)}>
                  {tab !== "mine" && (
                    <Td className="min-w-[180px]">
                      <span className="block font-medium">{l.user_name}</span>
                      <span className="block text-[12px] text-muted">{l.unit_name ?? "—"}</span>
                    </Td>
                  )}
                  <Td>{LEAVE_LABEL[l.kind] ?? l.kind}</Td>
                  <Td className="whitespace-nowrap tabular-nums">
                    {l.start_on === l.end_on ? frDate(l.start_on) : `${frDate(l.start_on)} → ${frDate(l.end_on)}`}
                  </Td>
                  <Td className="tabular-nums">{l.days}</Td>
                  <Td className="text-muted">{l.interim_name ?? "—"}</Td>
                  <Td>
                    <Status {...STATUS[l.status]} />
                  </Td>
                </Tr>
              ))}
            </Table>
          ) : (
            <Empty icon={<Plane className="size-6" />} title={tab === "valider" ? "Rien à valider" : "Aucune demande"}>
              {tab === "mine"
                ? "Vos demandes de congé et leurs réponses s'afficheront ici."
                : tab === "valider"
                  ? "Les demandes des agents que vous encadrez arrivent ici."
                  : "Aucune demande dans ce périmètre."}
            </Empty>
          )}
          <div className="h-3" />
        </Section>
      </div>
      {asking && <AskDrawer onBehalf={asking === "rh"} onClose={() => setAsking(null)} />}
      {open && <LeaveDrawer id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Tile({ label, value, unit, alert }: { label: string; value?: number; unit?: string; alert?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-panel px-4 py-3 shadow-sm">
      <p className="truncate text-[12.5px] text-muted">{label}</p>
      <p className={cn("text-[22px] font-semibold tabular-nums leading-tight", alert && "text-danger")}>
        {value ?? "—"}
      </p>
      {unit && <p className="truncate text-[12px] text-muted">{unit}</p>}
    </div>
  );
}

/** Demande de congé (l'agent) ou absence enregistrée au nom d'un agent (service RH). */
function AskDrawer({ onBehalf, onClose }: { onBehalf: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: users } = useUsers();
  const [f, setF] = useState({
    user_id: "",
    kind: onBehalf ? "maladie" : "conge_annuel",
    start_on: todayIso(),
    end_on: todayIso(),
    reason: "",
    interim_id: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const bad = f.end_on < f.start_on ? "La date de fin doit suivre la date de début" : null;
  const submit = async () => {
    setSaving(true);
    try {
      await api.post("/api/leaves", {
        kind: f.kind,
        start_on: f.start_on,
        end_on: f.end_on,
        reason: f.reason || undefined,
        interim_id: f.interim_id || null,
        ...(onBehalf ? { user_id: f.user_id } : {}),
      });
      qc.invalidateQueries({ queryKey: ["leaves"] });
      toast.success(onBehalf ? "Absence enregistrée ; l'agent est prévenu" : "Demande envoyée à votre chef d'entité");
      onClose();
    } catch (e) {
      fail(e);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Drawer
      open
      onClose={onClose}
      dirty={!!f.reason}
      title={onBehalf ? "Enregistrer une absence" : "Demander un congé"}
      subtitle={onBehalf ? "Au nom d'un agent · acquise d'emblée" : "Envoyée au chef de votre entité"}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" loading={saving} disabled={!!bad || (onBehalf && !f.user_id)} onClick={submit}>
            {onBehalf ? "Enregistrer" : "Envoyer la demande"}
          </Button>
        </>
      }
    >
      <DrawerSection title="La demande">
        <div className="grid gap-4 sm:grid-cols-2">
          {onBehalf && (
            <Field label="Agent" required className="sm:col-span-2">
              {(a) => <PeopleSelect {...a} value={f.user_id} onChange={set("user_id")} people={users} />}
            </Field>
          )}
          <Field label="Nature" required className="sm:col-span-2">
            {(a) => (
              <Select {...a} value={f.kind} onChange={(e) => set("kind")(e.target.value)}>
                {Object.entries(LEAVE_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Du" required>
            {(a) => <Input {...a} type="date" value={f.start_on} onChange={(e) => set("start_on")(e.target.value)} />}
          </Field>
          <Field label="Au (inclus)" required error={bad}>
            {(a) => <Input {...a} type="date" value={f.end_on} onChange={(e) => set("end_on")(e.target.value)} />}
          </Field>
          <Field
            label="Intérimaire"
            hint="La personne qui assure vos dossiers pendant l'absence ; elle est prévenue."
            className="sm:col-span-2"
          >
            {(a) => (
              <PeopleSelect
                {...a}
                value={f.interim_id}
                onChange={set("interim_id")}
                people={users?.filter((u) => u.id !== f.user_id)}
                placeholder="Aucun intérim"
              />
            )}
          </Field>
          <Field label={onBehalf ? "Pièce ou motif" : "Motif"} className="sm:col-span-2">
            {(a) => <Textarea {...a} value={f.reason} onChange={(e) => set("reason")(e.target.value)} />}
          </Field>
        </div>
      </DrawerSection>
    </Drawer>
  );
}

/** Une demande : consulter, puis accorder, refuser (motif) ou annuler selon ses droits. */
function LeaveDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: l } = useQuery({ queryKey: ["leave", id], queryFn: () => api.get<Leave>(`/api/leaves/${id}`) });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const act = async (path: string, body: unknown, done: string) => {
    setBusy(true);
    try {
      await api.post(`/api/leaves/${id}/${path}`, body);
      qc.invalidateQueries({ queryKey: ["leaves"] });
      qc.invalidateQueries({ queryKey: ["leave", id] });
      toast.success(done);
      onClose();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Drawer
      open
      onClose={onClose}
      title={l ? `${LEAVE_LABEL[l.kind]} · ${l.user_name}` : "Demande"}
      subtitle={l ? `Demandée le ${frDate(l.created_at.slice(0, 10))}` : undefined}
      badges={l && <Status {...STATUS[l.status]} />}
      footer={
        l && (
          <>
            {l.can?.cancel && (
              <Button disabled={busy} onClick={() => act("cancel", { note: note || undefined }, "Demande annulée")}>
                Annuler la demande
              </Button>
            )}
            {l.can?.decide && (
              <>
                <Button
                  icon={<X className="size-4" />}
                  disabled={busy || !note.trim()}
                  title={note.trim() ? undefined : "Indiquez le motif du refus"}
                  onClick={() => act("decide", { approve: false, note }, "Demande refusée ; l'agent est prévenu")}
                >
                  Refuser
                </Button>
                <Button
                  variant="primary"
                  icon={<Check className="size-4" />}
                  loading={busy}
                  onClick={() =>
                    act("decide", { approve: true, note: note || undefined }, "Congé accordé ; l'agent est prévenu")
                  }
                >
                  Accorder
                </Button>
              </>
            )}
            <Button onClick={onClose}>Fermer</Button>
          </>
        )
      }
    >
      {!l ? (
        <Spinner />
      ) : (
        <>
          <DrawerSection title="La demande">
            <Facts className="p-0">
              <Fact label="Agent">{l.user_name}</Fact>
              <Fact label="Entité">{l.unit_name}</Fact>
              <Fact label="Du">{frDate(l.start_on)}</Fact>
              <Fact label="Au (inclus)">{frDate(l.end_on)}</Fact>
              <Fact label="Jours ouvrés">{String(l.days)}</Fact>
              <Fact label="Intérim">{l.interim_name}</Fact>
              <Fact label="Motif" wide>
                {l.reason}
              </Fact>
            </Facts>
          </DrawerSection>
          {l.status !== "demande" && l.decided_by_name && (
            <DrawerSection title="Décision">
              <Facts className="p-0">
                <Fact label="Par">{l.decided_by_name}</Fact>
                <Fact label="Le">{l.decided_at ? frDate(l.decided_at.slice(0, 10)) : null}</Fact>
                <Fact label="Observation" wide>
                  {l.decision_note}
                </Fact>
              </Facts>
            </DrawerSection>
          )}
          {(l.can?.decide || l.can?.cancel) && (
            <DrawerSection title={l.can?.decide ? "Votre réponse" : "Annulation"}>
              <Field
                label={l.can?.decide ? "Observation" : "Motif de l'annulation"}
                hint={l.can?.decide ? "Obligatoire pour un refus ; transmise à l'agent." : undefined}
              >
                {(a) => <Textarea {...a} value={note} onChange={(e) => setNote(e.target.value)} />}
              </Field>
            </DrawerSection>
          )}
        </>
      )}
    </Drawer>
  );
}
