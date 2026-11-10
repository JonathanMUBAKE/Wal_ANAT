import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CopyPlus, ListTree, Plus, Radar, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Dialog, Empty, IconButton } from "@/components/ui";
import {
  Field,
  Input,
  LoadingRows,
  PageHeader,
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
import { api } from "@/lib/api";
import { useCan, useUnits } from "@/lib/hooks";

interface Domain {
  id: string;
  name: string;
  description: string;
  archived: boolean;
}
interface SheetRow {
  id: string;
  unit_id: string | null;
  version: number;
  status: "draft" | "approved" | "archived";
  domain_count: number;
  relation_count: number;
  valid_from: string | null;
}
interface Sheet extends SheetRow {
  mission: string;
  legal_ref: string;
  valid_to: string | null;
  domains: { domain_id: string; role: string; name?: string }[];
  relations: { target_unit_id: string; kind: string; domain_id: string | null; note: string }[];
  can: { edit: boolean; approve: boolean; version: boolean };
}
interface Gap {
  id: string;
  kind: keyof typeof KIND;
  summary: string;
  unit_name: string | null;
  domain_name: string | null;
  status: keyof typeof GAP_STATUS;
  note: string;
  evidence: { type: string; id: string; label: string }[];
}
const ROLES: Record<string, string> = {
  responsable: "Responsable",
  contributeur: "Contributeur",
  consulte: "Consulté",
  validateur: "Validateur",
  informe: "Informé",
};
const RELATIONS: Record<string, string> = {
  hierarchique: "Hiérarchique",
  appui: "Appui",
  consultation: "Consultation obligatoire",
  validation: "Validation",
  coordination: "Coordination",
  information: "Information",
};
const KIND = {
  absence: "Absence",
  consultation_omise: "Consultation omise",
  reunion_incomplete: "Réunion incomplète",
  hors_attribution: "Hors attribution",
  chevauchement: "Chevauchement",
  concentration: "Concentration",
} as const;
const GAP_STATUS: Record<string, { label: string; tone: Tone }> = {
  open: { label: "À examiner", tone: "warning" },
  justified: { label: "Justifié", tone: "neutral" },
  to_fix: { label: "À corriger", tone: "danger" },
  review: { label: "Attribution à revoir", tone: "info" },
  resolved: { label: "Résolu", tone: "success" },
};
const fail = (e: unknown) => toast.error((e as Error).message);

export function AttributionsPage() {
  const can = useCan();
  const [tab, setTab] = useState<"sheets" | "gaps" | "domains">("sheets");
  const tabs = [
    { id: "sheets" as const, label: "Fiches des entités" },
    ...(can("pilotage.view") ? [{ id: "gaps" as const, label: "Écarts de participation" }] : []),
    { id: "domains" as const, label: "Catalogue des domaines" },
  ];
  return (
    <div className="min-h-full">
      <PageHeader
        Icon={ListTree}
        crumbs={["Organisation", "Attributions"]}
        title="Attributions"
        subtitle="Ce dont chaque entité répond, avec qui elle travaille, et les écarts entre l'attendu et le réalisé."
      />
      <Tabs value={tab} onChange={setTab} items={tabs} />
      <div className="mx-auto max-w-[1240px] p-4 sm:px-8 sm:py-6">
        {tab === "sheets" && <Sheets />}
        {tab === "gaps" && <Gaps />}
        {tab === "domains" && <Domains />}
      </div>
    </div>
  );
}

function Sheets() {
  const can = useCan();
  const { data: units } = useUnits();
  const { data: rows, isLoading } = useQuery({
    queryKey: ["attributions"],
    queryFn: () => api.get<SheetRow[]>("/api/attributions"),
  });
  const [open, setOpen] = useState<{ id?: string; unit_id: string } | null>(null);
  if (isLoading) return <LoadingRows />;
  return (
    <Section>
      <Table head={["Entité", "Fiche en vigueur", "Domaines", "Rapports", "Depuis", ""]}>
        {units?.map((u) => {
          const approved = rows?.find((s) => s.unit_id === u.id && s.status === "approved");
          const draft = rows?.find((s) => s.unit_id === u.id && s.status === "draft");
          const shown = approved ?? draft;
          return (
            <Tr key={u.id} onClick={shown ? () => setOpen({ id: shown.id, unit_id: u.id }) : undefined}>
              <Td className="font-medium">
                {u.name}
                <span className="ml-2 text-[12px] font-normal text-muted">{u.kind}</span>
              </Td>
              <Td>
                {approved ? (
                  <Status label={`Approuvée · version ${approved.version}`} tone="success" />
                ) : draft ? (
                  <Status label="En préparation" tone="info" />
                ) : (
                  <Status label="Fiche manquante" tone="warning" />
                )}
                {approved && draft && (
                  <span className="ml-2 text-[12px] text-muted">nouvelle version en préparation</span>
                )}
              </Td>
              <Td className="tabular">{shown?.domain_count ?? "—"}</Td>
              <Td className="tabular">{shown?.relation_count ?? "—"}</Td>
              <Td className="tabular">{frDate(approved?.valid_from)}</Td>
              <Td className="text-right">
                {!shown && can("attributions.manage") && (
                  <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => setOpen({ unit_id: u.id })}>
                    Créer la fiche
                  </Button>
                )}
                {approved && draft && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen({ id: draft.id, unit_id: u.id });
                    }}
                  >
                    Ouvrir la préparation
                  </Button>
                )}
              </Td>
            </Tr>
          );
        })}
      </Table>
      {open && (
        <SheetDialog
          {...open}
          name={units?.find((u) => u.id === open.unit_id)?.name ?? ""}
          onClose={() => setOpen(null)}
          onOpen={(id) => setOpen({ id, unit_id: open.unit_id })}
        />
      )}
    </Section>
  );
}

const useDomains = () => useQuery({ queryKey: ["domains"], queryFn: () => api.get<Domain[]>("/api/domains") });
function SheetDialog({
  id,
  unit_id,
  name,
  onClose,
  onOpen,
}: {
  id?: string;
  unit_id: string;
  name: string;
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const qc = useQueryClient();
  const can = useCan();
  const { data: domains } = useDomains();
  const { data: units } = useUnits();
  const existing = useQuery({
    queryKey: ["attribution", id],
    queryFn: () => api.get<Sheet>(`/api/attributions/${id}`),
    enabled: !!id,
  });
  const [draft, setDraft] = useState<Partial<Sheet> | null>(null);
  const s =
    draft ??
    existing.data ??
    (id ? null : { mission: "", legal_ref: "", valid_from: null, valid_to: null, domains: [], relations: [] });
  const ro = !!id && !existing.data?.can.edit;
  const set = (p: Partial<Sheet>) => setDraft({ ...s, ...p });
  const body = () => ({
    mission: s?.mission,
    legal_ref: s?.legal_ref,
    valid_from: s?.valid_from || null,
    valid_to: s?.valid_to || null,
    domains: s?.domains?.map(({ domain_id, role }) => ({ domain_id, role })),
    relations: s?.relations?.map((r) => ({ ...r, domain_id: r.domain_id || null })),
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["attributions"] });
    qc.invalidateQueries({ queryKey: ["attribution"] });
  };
  const save = useMutation({
    mutationFn: () =>
      id
        ? api.put<Sheet>(`/api/attributions/${id}`, body())
        : api.post<Sheet>("/api/attributions", { ...body(), unit_id }),
    onSuccess: () => {
      refresh();
      toast.success("Fiche enregistrée");
      onClose();
    },
    onError: fail,
  });
  const approve = useMutation({
    mutationFn: () => api.post(`/api/attributions/${id}/approve`),
    onSuccess: () => {
      refresh();
      toast.success("Fiche approuvée");
      onClose();
    },
    onError: fail,
  });
  const version = useMutation({
    mutationFn: () => api.post<Sheet>("/api/attributions", { ...body(), unit_id }),
    onSuccess: (r) => {
      refresh();
      setDraft(null);
      onOpen(r.id);
    },
    onError: fail,
  });
  if (!s) return null;
  const active = domains?.filter((d) => !d.archived) ?? [];
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title={`Fiche d'attributions · ${name}`}
      width={760}
      footer={
        <>
          <Button onClick={onClose}>Fermer</Button>
          {existing.data?.can.version && can("attributions.manage") && (
            <Button icon={<CopyPlus className="size-4" />} loading={version.isPending} onClick={() => version.mutate()}>
              Nouvelle version
            </Button>
          )}
          {existing.data?.can.approve && (
            <Button
              icon={<ShieldCheck className="size-4" />}
              loading={approve.isPending}
              onClick={() => approve.mutate()}
            >
              Approuver
            </Button>
          )}
          {!ro && (
            <Button
              variant="primary"
              disabled={!s.mission?.trim()}
              loading={save.isPending}
              onClick={() => save.mutate()}
            >
              Enregistrer
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Mission" required>
          {(a) => (
            <Textarea {...a} disabled={ro} value={s.mission ?? ""} onChange={(e) => set({ mission: e.target.value })} />
          )}
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Texte de référence">
            {(a) => (
              <Input
                {...a}
                disabled={ro}
                value={s.legal_ref ?? ""}
                onChange={(e) => set({ legal_ref: e.target.value })}
              />
            )}
          </Field>
          <Field label="En vigueur depuis">
            {(a) => (
              <Input
                {...a}
                disabled={ro}
                type="date"
                value={s.valid_from ?? ""}
                onChange={(e) => set({ valid_from: e.target.value })}
              />
            )}
          </Field>
          <Field label="Jusqu'au">
            {(a) => (
              <Input
                {...a}
                disabled={ro}
                type="date"
                value={s.valid_to ?? ""}
                onChange={(e) => set({ valid_to: e.target.value })}
              />
            )}
          </Field>
        </div>
        <div>
          <Head
            title="Domaines d'activité"
            add={
              !ro && !!active.length
                ? () => set({ domains: [...(s.domains ?? []), { domain_id: active[0].id, role: "responsable" }] })
                : undefined
            }
          />
          {!active.length && <p className="text-[13px] text-muted">Ajoutez d'abord des domaines au catalogue.</p>}
          <div className="space-y-2">
            {s.domains?.map((d, i) => {
              const up = (p: object) => set({ domains: s.domains!.map((x, n) => (n === i ? { ...x, ...p } : x)) });
              return (
                <div key={i} className="grid grid-cols-[1fr_180px_32px] items-center gap-2">
                  <Select
                    aria-label="Domaine"
                    disabled={ro}
                    value={d.domain_id}
                    onChange={(e) => up({ domain_id: e.target.value })}
                  >
                    {domains?.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </Select>
                  <Select aria-label="Rôle" disabled={ro} value={d.role} onChange={(e) => up({ role: e.target.value })}>
                    {Object.entries(ROLES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                  {!ro && (
                    <IconButton label="Retirer" onClick={() => set({ domains: s.domains!.filter((_, n) => n !== i) })}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <Head
            title="Rapports avec les autres entités"
            add={
              !ro && units?.length
                ? () =>
                    set({
                      relations: [
                        ...(s.relations ?? []),
                        { target_unit_id: units[0].id, kind: "coordination", domain_id: null, note: "" },
                      ],
                    })
                : undefined
            }
          />
          <div className="space-y-2">
            {s.relations?.map((r, i) => {
              const up = (p: object) => set({ relations: s.relations!.map((x, n) => (n === i ? { ...x, ...p } : x)) });
              return (
                <div key={i} className="grid items-center gap-2 sm:grid-cols-[1fr_190px_1fr_32px]">
                  <Select
                    aria-label="Entité liée"
                    disabled={ro}
                    value={r.target_unit_id}
                    onChange={(e) => up({ target_unit_id: e.target.value })}
                  >
                    {units?.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    aria-label="Type de rapport"
                    disabled={ro}
                    value={r.kind}
                    onChange={(e) => up({ kind: e.target.value })}
                  >
                    {Object.entries(RELATIONS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                  <Select
                    aria-label="Domaine concerné"
                    disabled={ro}
                    value={r.domain_id ?? ""}
                    onChange={(e) => up({ domain_id: e.target.value || null })}
                  >
                    <option value="">Tous les domaines</option>
                    {domains?.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </Select>
                  {!ro && (
                    <IconButton
                      label="Retirer"
                      onClick={() => set({ relations: s.relations!.filter((_, n) => n !== i) })}
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
const Head = ({ title, add }: { title: string; add?: () => void }) => (
  <div className="mb-2 flex items-center justify-between">
    <p className="text-[13px] font-semibold">{title}</p>
    {add && (
      <Button size="sm" variant="ghost" icon={<Plus className="size-3.5" />} onClick={add}>
        Ajouter
      </Button>
    )}
  </div>
);

function Gaps() {
  const can = useCan();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["gaps"], queryFn: () => api.get<Gap[]>("/api/gaps") });
  const [deciding, setDeciding] = useState<Gap | null>(null);
  const detect = useMutation({
    mutationFn: () => api.post<Gap[]>("/api/gaps/detect"),
    onSuccess: (r) => {
      qc.setQueryData(["gaps"], r);
      toast.success("Analyse terminée");
    },
    onError: fail,
  });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-[13px] text-muted">
          Un écart est un signal à examiner, jamais une sanction. La comparaison porte sur les 90 derniers jours et sur
          les seules activités enregistrées dans l'outil.
        </p>
        {can("attributions.manage") && (
          <Button
            variant="primary"
            icon={<Radar className="size-4" />}
            loading={detect.isPending}
            onClick={() => detect.mutate()}
          >
            Lancer l'analyse
          </Button>
        )}
      </div>
      {isLoading ? (
        <LoadingRows />
      ) : !data?.length ? (
        <Section>
          <Empty icon={<Radar className="size-6" />} title="Aucun écart relevé">
            Approuvez des fiches d'attributions puis lancez l'analyse.
          </Empty>
        </Section>
      ) : (
        <div className="stagger grid gap-3 lg:grid-cols-2">
          {data.map((g) => (
            <Section key={g.id}>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12.5px] font-semibold text-primary">{KIND[g.kind]}</p>
                  <Status {...GAP_STATUS[g.status]} />
                </div>
                <p className="mt-2 text-[13.5px] leading-snug">{g.summary}</p>
                {!!g.evidence.length && (
                  <p className="mt-2 text-[12px] text-muted">Preuves : {g.evidence.map((e) => e.label).join(", ")}</p>
                )}
                {g.note && <p className="mt-2 border-l-2 border-line-strong pl-2 text-[12.5px] text-muted">{g.note}</p>}
                {g.status === "open" && can("attributions.manage") && (
                  <div className="mt-3">
                    <Button size="sm" onClick={() => setDeciding(g)}>
                      Classer cet écart
                    </Button>
                  </div>
                )}
              </div>
            </Section>
          ))}
        </div>
      )}
      {deciding && <Decide gap={deciding} onClose={() => setDeciding(null)} />}
    </div>
  );
}
function Decide({ gap, onClose }: { gap: Gap; onClose: () => void }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState("justified");
  const [note, setNote] = useState("");
  const save = useMutation({
    mutationFn: () => api.patch(`/api/gaps/${gap.id}`, { status, note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gaps"] });
      onClose();
    },
    onError: fail,
  });
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title="Classer cet écart"
      description={gap.summary}
      width={520}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" disabled={!note.trim()} loading={save.isPending} onClick={() => save.mutate()}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Décision" required>
          {(a) => (
            <Select {...a} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="justified">Justifié</option>
              <option value="to_fix">À corriger</option>
              <option value="review">Attribution à revoir</option>
            </Select>
          )}
        </Field>
        <Field label="Motif" required>
          {(a) => <Textarea {...a} value={note} onChange={(e) => setNote(e.target.value)} />}
        </Field>
      </div>
    </Dialog>
  );
}

function Domains() {
  const can = useCan();
  const qc = useQueryClient();
  const { data } = useDomains();
  const [name, setName] = useState("");
  const add = useMutation({
    mutationFn: () => api.post("/api/domains", { name }),
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["domains"] });
    },
    onError: fail,
  });
  return (
    <Section>
      {can("attributions.manage") && (
        <div className="flex gap-2 p-4 pb-2">
          <Input
            aria-label="Nouveau domaine"
            placeholder="Nouveau domaine d'activité"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button variant="primary" disabled={!name.trim()} loading={add.isPending} onClick={() => add.mutate()}>
            Ajouter
          </Button>
        </div>
      )}
      {data?.length ? (
        <ul className="stagger divide-y divide-line px-4 pb-2">
          {data.map((d) => (
            <li key={d.id} className="py-2.5 text-[13.5px] font-medium">
              {d.name}
            </li>
          ))}
        </ul>
      ) : (
        <Empty title="Catalogue vide">Les domaines servent de référence commune à toute l'Agence.</Empty>
      )}
    </Section>
  );
}
