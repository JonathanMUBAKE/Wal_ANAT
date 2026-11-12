import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Briefcase, CalendarDays, Check, FileText, Link2, Mail, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button, Empty } from "@/components/ui";
import { LoadingRows, PageHeader, Section, Select, Status, Table, Td, Tr, frDate } from "@/components/gov";
import { PartnerSelect } from "@/components/partners";
import { api } from "@/lib/api";
import { useCan } from "@/lib/hooks";
import { useForms } from "@/lib/referentials";
import { NewMeeting } from "./Meetings";

/* Les liens d'un partenaire avec les autres modules (lot PA3, docs/CONCEPTION.md § 4.7). */

export interface PartnerLinks {
  dossiers: {
    kind: "project" | "activity";
    id: string;
    label: string;
    role: string;
    type_code: string | null;
    date: string | null;
    href: string;
  }[];
  meetings: {
    id: string;
    reference: string;
    meeting_type: string;
    title: string;
    meeting_date: string;
    start_time: string | null;
    status: string;
  }[];
  mail: {
    id: string;
    reference: string;
    direction: "entrant" | "sortant";
    subject: string;
    correspondent: string;
    contact_name: string | null;
    received_on: string;
    status: string;
    confidential: boolean;
  }[];
  contracts: {
    id: string;
    title: string;
    consultant_name: string;
    project_id: string | null;
    project_name: string | null;
    start_on: string;
    end_on: string;
    status: "active" | "ended";
  }[];
}

const MEETING_STATE: Record<string, { label: string; tone: "neutral" | "info" | "success" | "warning" }> = {
  planned: { label: "Programmée", tone: "info" },
  held: { label: "Tenue", tone: "neutral" },
  submitted: { label: "Soumis à validation", tone: "warning" },
  validated: { label: "Compte rendu validé", tone: "success" },
  cancelled: { label: "Annulée", tone: "neutral" },
};
const MAIL_STATE: Record<string, { label: string; tone: "neutral" | "info" | "success" }> = {
  enregistre: { label: "Enregistré", tone: "neutral" },
  impute: { label: "Imputé", tone: "info" },
  traite: { label: "Traité", tone: "success" },
};

export function DossiersTab({ links }: { links: PartnerLinks }) {
  const nav = useNavigate();
  const form = useForms();
  return (
    <>
      <Section title="Projets et activités">
        {links.dossiers.length ? (
          <Table head={["Dossier", "Nature", "Rôle du partenaire", "Date"]}>
            {links.dossiers.map((d) => (
              <Tr key={d.id} onClick={() => nav(d.href)}>
                <Td className="font-medium">{d.label}</Td>
                <Td className="text-muted">{d.kind === "project" ? "Projet" : form(d.type_code ?? "").label}</Td>
                <Td className="text-muted">{d.role}</Td>
                <Td className="tabular text-muted">{frDate(d.date)}</Td>
              </Tr>
            ))}
          </Table>
        ) : (
          <Empty icon={<Briefcase className="size-6" />} title="Aucun dossier">
            Un projet dont il est commanditaire, une activité dont il est l'interlocuteur apparaissent ici. On les relie
            depuis la fiche du projet ou de l'activité.
          </Empty>
        )}
      </Section>
      <Section title="Contrats de prestation">
        {links.contracts.length ? (
          <Table head={["Mission", "Projet", "Période", "État"]}>
            {links.contracts.map((c) => (
              <Tr key={c.id} onClick={() => c.project_id && nav(`/projects/${c.project_id}/contrats`)}>
                <Td className="font-medium">{c.title}</Td>
                <Td className="text-muted">{c.project_name ?? "—"}</Td>
                <Td className="tabular text-muted">
                  {frDate(c.start_on)} → {frDate(c.end_on)}
                </Td>
                <Td>
                  <Status
                    label={c.status === "active" ? "En cours" : "Terminé"}
                    tone={c.status === "active" ? "info" : "neutral"}
                  />
                </Td>
              </Tr>
            ))}
          </Table>
        ) : (
          <p className="px-5 pb-5 pt-1 text-[13px] text-muted">
            Aucun contrat visible. Un partenaire classé « prestataire » se choisit à la création d'un contrat de projet.
          </p>
        )}
      </Section>
    </>
  );
}

export function MeetingsTab({ partner, links }: { partner: { id: string; name: string }; links: PartnerLinks }) {
  const nav = useNavigate();
  const can = useCan();
  const [creating, setCreating] = useState(false);
  return (
    <Section
      title="Réunions avec le partenaire"
      aside={
        can("meetings.manage") && (
          <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            Programmer une réunion
          </Button>
        )
      }
    >
      {links.meetings.length ? (
        <Table head={["Numéro", "Réunion", "Date", "État"]}>
          {links.meetings.map((m) => (
            <Tr key={m.id} onClick={() => nav(`/reunions/${m.id}`)}>
              <Td className="whitespace-nowrap font-mono text-[12px] text-muted">{m.reference}</Td>
              <Td className="font-medium">
                {m.title && m.title !== "Réunion" ? `${m.meeting_type} — ${m.title}` : m.meeting_type}
              </Td>
              <Td className="tabular text-muted">
                {frDate(m.meeting_date)}
                {m.start_time ? ` · ${m.start_time.slice(0, 5)}` : ""}
              </Td>
              <Td>
                <Status
                  label={MEETING_STATE[m.status]?.label ?? m.status}
                  tone={MEETING_STATE[m.status]?.tone ?? "neutral"}
                />
              </Td>
            </Tr>
          ))}
        </Table>
      ) : (
        <Empty icon={<CalendarDays className="size-6" />} title="Aucune réunion">
          Programmez une réunion avec ce partenaire : ses contacts se convoquent comme personnes extérieures.
        </Empty>
      )}
      {creating && <NewMeeting partner={partner} onClose={() => setCreating(false)} />}
    </Section>
  );
}

export function MailTab({ links }: { links: PartnerLinks }) {
  const nav = useNavigate();
  return (
    <Section title="Courrier échangé">
      {links.mail.length ? (
        <Table head={["Numéro", "Objet", "Contact", "Date", "État"]}>
          {links.mail.map((m) => (
            <Tr key={m.id} onClick={() => nav("/courrier")}>
              <Td className="whitespace-nowrap font-mono text-[12px] text-muted">{m.reference}</Td>
              <Td className="font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <Mail
                    className="size-3.5 text-muted"
                    aria-label={m.direction === "entrant" ? "Entrant" : "Sortant"}
                  />
                  {m.subject}
                </span>
              </Td>
              <Td className="text-muted">{m.contact_name ?? "—"}</Td>
              <Td className="tabular text-muted">{frDate(m.received_on)}</Td>
              <Td>
                <Status
                  label={MAIL_STATE[m.status]?.label ?? m.status}
                  tone={MAIL_STATE[m.status]?.tone ?? "neutral"}
                />
              </Td>
            </Tr>
          ))}
        </Table>
      ) : (
        <Empty icon={<FileText className="size-6" />} title="Aucun courrier">
          Le courrier dont ce partenaire est l'expéditeur ou le destinataire apparaît ici, selon vos droits sur le
          registre.
        </Empty>
      )}
    </Section>
  );
}

// ------------------------------------------------------------------ rapprochement
interface Group {
  source: "sponsor" | "counterpart" | "correspondent" | "contractor";
  label: string;
  text: string;
  count: number;
  suggestion: { id: string; name: string } | null;
}

export function ReconcilePage() {
  const qc = useQueryClient();
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [source, setSource] = useState<"" | Group["source"]>("");
  const { data, isLoading } = useQuery({
    queryKey: ["partners", "reconcile"],
    queryFn: () => api.get<Group[]>("/api/partners/reconcile"),
  });
  const link = useMutation({
    mutationFn: (g: Group & { partner_id: string }) =>
      api.post<{ linked: number }>("/api/partners/reconcile", {
        source: g.source,
        text: g.text,
        partner_id: g.partner_id,
      }),
    onSuccess: (r, g) => {
      qc.invalidateQueries({ queryKey: ["partners"] });
      qc.invalidateQueries({ queryKey: ["partner"] });
      toast.success(`${r.linked} mention${r.linked > 1 ? "s" : ""} « ${g.text} » reliée${r.linked > 1 ? "s" : ""}`);
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const key = (g: Group) => `${g.source}:${g.text}`;
  const rows = (data ?? []).filter((g) => !source || g.source === source);
  return (
    <div className="min-h-full">
      <PageHeader
        Icon={Link2}
        crumbs={["Partenariats", "Partenaires", "Rapprochement"]}
        title={
          <span className="flex items-center gap-2">
            <Link to="/partenaires" aria-label="Retour à l'annuaire" className="text-muted hover:text-fg">
              <ArrowLeft className="size-5" />
            </Link>
            Rapprocher l'existant
          </span>
        }
        subtitle="Les noms de tiers saisis en texte libre avant l'annuaire (commanditaires, interlocuteurs, correspondants, prestataires). Relisez chaque suggestion avant de relier : le texte d'origine est conservé. Le courrier et les activités confidentiels n'y figurent pas."
      />
      <div className="mx-auto max-w-[1480px] space-y-3 p-4 sm:px-8 sm:py-6">
        <Select
          aria-label="Origine"
          className="max-w-xs"
          value={source}
          onChange={(e) => setSource(e.target.value as typeof source)}
        >
          <option value="">Toutes les origines</option>
          <option value="sponsor">Commanditaires de projet</option>
          <option value="counterpart">Interlocuteurs d'activité</option>
          <option value="correspondent">Correspondants de courrier</option>
          <option value="contractor">Prestataires de contrat</option>
        </Select>
        <Section>
          {isLoading ? (
            <LoadingRows />
          ) : rows.length ? (
            <Table head={["Texte saisi", "Origine", "Mentions", "Fiche à relier", ""]}>
              {rows.map((g) => {
                const k = key(g);
                const picked = choice[k] ?? g.suggestion?.id ?? "";
                return (
                  <Tr key={k}>
                    <Td className="font-medium">{g.text}</Td>
                    <Td className="text-muted">{g.label}</Td>
                    <Td className="tabular">{g.count}</Td>
                    <Td className="min-w-[240px]">
                      <PartnerSelect
                        aria-label={`Fiche à relier à « ${g.text} »`}
                        supplier={g.source === "contractor"}
                        placeholder="Choisir une fiche…"
                        current={g.suggestion}
                        value={picked}
                        onChange={(id) => setChoice({ ...choice, [k]: id })}
                      />
                      {g.suggestion && picked === g.suggestion.id && (
                        <span className="mt-1 block text-[11.5px] text-muted">Suggestion : même nom ou même sigle</span>
                      )}
                    </Td>
                    <Td>
                      <Button
                        icon={<Check className="size-4" />}
                        disabled={!picked}
                        loading={link.isPending && link.variables?.text === g.text}
                        onClick={() => link.mutate({ ...g, partner_id: picked })}
                      >
                        Relier
                      </Button>
                    </Td>
                  </Tr>
                );
              })}
            </Table>
          ) : (
            <Empty icon={<Link2 className="size-6" />} title="Tout est rapproché">
              Aucun texte libre ne reste sans fiche.{" "}
              <Link to="/partenaires" className="text-primary hover:underline">
                Retour à l'annuaire
              </Link>
            </Empty>
          )}
        </Section>
      </div>
    </div>
  );
}
