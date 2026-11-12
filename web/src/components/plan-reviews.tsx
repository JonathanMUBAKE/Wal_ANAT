import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ClipboardCheck, Plus, Send, Undo2 } from "lucide-react";
import { Button, Spinner } from "@/components/ui";
import { Drawer, DrawerSection } from "@/components/drawer";
import { Field, Section, Select, Status, Textarea, frDate, type Tone } from "@/components/gov";
import { Fact, Facts, LongText } from "@/components/record";
import { PlanBar } from "@/components/directions";
import { todayIso } from "@/lib/format";
import { api } from "@/lib/api";

/*
 * Revue trimestrielle du plan de travail (docs/GUIDE-FONCTIONNEL.md § 5.9). L'entité relève, apprécie, explique les
 * écarts et propose des mesures ; la direction générale valide ou retourne. Validée, la revue est figée.
 */

type ReviewStatus = "brouillon" | "soumise" | "retournee" | "validee";
type Assessment = "atteint" | "en_bonne_voie" | "en_retard" | "compromis";
const STATUS: Record<ReviewStatus, { label: string; tone: Tone }> = {
  brouillon: { label: "En préparation", tone: "neutral" },
  soumise: { label: "Soumise à validation", tone: "warning" },
  retournee: { label: "Retournée", tone: "danger" },
  validee: { label: "Validée", tone: "success" },
};
const ASSESSMENT: Record<Assessment, { label: string; tone: Tone }> = {
  atteint: { label: "Atteint", tone: "success" },
  en_bonne_voie: { label: "En bonne voie", tone: "info" },
  en_retard: { label: "En retard", tone: "warning" },
  compromis: { label: "Compromis", tone: "danger" },
};
interface Line {
  activity_id: string;
  title: string;
  responsible_name: string | null;
  end_on: string | null;
  progress: number;
  expected: number | null;
  assessment: Assessment;
  comment: string;
  measure: string;
}
interface Review {
  id: string;
  quarter: number;
  period_end: string;
  status: ReviewStatus;
  summary: string;
  difficulties: string;
  measures: string;
  return_comment: string;
  validation_comment: string;
  submitted_by_name: string | null;
  validated_by_name: string | null;
  plan: { id: string; title: string; year: number; unit_name: string };
  lines: Line[];
  can: { edit: boolean; submit: boolean; decide: boolean };
}
export interface ReviewRef {
  id: string;
  quarter: number;
  status: ReviewStatus;
  period_end: string;
}
const fail = (e: unknown) => toast.error((e as Error).message);
const quarterStart = (year: number, q: number) => `${year}-${String(3 * q - 2).padStart(2, "0")}-01`;

/** Les quatre trimestres du plan : leur revue, ou de quoi l'ouvrir quand le trimestre a commencé. */
export function QuarterReviews({
  planId,
  year,
  reviews,
  canOpen,
}: {
  planId: string;
  year: number;
  reviews: ReviewRef[];
  canOpen: boolean;
}) {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const open = params.get("revue");
  const setOpen = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("revue", id);
    else next.delete("revue");
    setParams(next, { replace: true });
  };
  const [busy, setBusy] = useState<number | null>(null);
  const start = async (q: number) => {
    setBusy(q);
    try {
      const r = await api.post<Review>(`/api/plans/${planId}/reviews`, { quarter: q });
      qc.invalidateQueries({ queryKey: ["plan", planId] });
      setOpen(r.id);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };
  return (
    <Section title="Revues trimestrielles">
      <p className="px-5 pb-3 text-[13px] text-muted">
        Chaque trimestre, l'entité rend compte : avancement constaté face à l'attendu, écarts et mesures. La direction
        générale valide ; une revue validée est figée.
      </p>
      <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((q) => {
          const r = reviews.find((x) => x.quarter === q);
          const started = quarterStart(year, q) <= todayIso();
          return (
            <div key={q} className="flex flex-col gap-2 rounded-xl border border-line p-3">
              <p className="text-[13px] font-semibold">
                T{q} {year}
              </p>
              {r ? (
                <>
                  <Status {...STATUS[r.status]} />
                  <Button size="sm" onClick={() => setOpen(r.id)}>
                    Ouvrir la revue
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-[12px] text-muted">
                    {started ? "Pas encore de revue" : `Commence le ${frDate(quarterStart(year, q))}`}
                  </span>
                  {canOpen && started && (
                    <Button size="sm" icon={<Plus className="size-4" />} loading={busy === q} onClick={() => start(q)}>
                      Préparer la revue
                    </Button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      {open && <ReviewDrawer id={open} onClose={() => setOpen(null)} />}
    </Section>
  );
}

function ReviewDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: r } = useQuery({
    queryKey: ["plan-review", id],
    queryFn: () => api.get<Review>(`/api/plan-reviews/${id}`),
  });
  const [draft, setDraft] = useState<{ summary: string; difficulties: string; measures: string; lines: Line[] } | null>(
    null,
  );
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (r) setDraft({ summary: r.summary, difficulties: r.difficulties, measures: r.measures, lines: r.lines });
  }, [r]);
  const done = (next: Review, msg: string) => {
    qc.setQueryData(["plan-review", id], next);
    qc.invalidateQueries({ queryKey: ["plan", next.plan.id] });
    qc.invalidateQueries({ queryKey: ["pilotage-directions"] });
    toast.success(msg);
  };
  const run = async (fn: () => Promise<Review>, msg: string) => {
    setBusy(true);
    try {
      done(await fn(), msg);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  const save = () =>
    api.patch<Review>(`/api/plan-reviews/${id}`, {
      summary: draft?.summary,
      difficulties: draft?.difficulties,
      measures: draft?.measures,
      lines: draft?.lines.map((l) => ({
        activity_id: l.activity_id,
        assessment: l.assessment,
        comment: l.comment,
        measure: l.measure,
      })),
    });
  const setLine = (aid: string, patch: Partial<Line>) =>
    setDraft((d) => d && { ...d, lines: d.lines.map((l) => (l.activity_id === aid ? { ...l, ...patch } : l)) });
  const dirty =
    !!r &&
    !!draft &&
    (draft.summary !== r.summary ||
      draft.difficulties !== r.difficulties ||
      draft.measures !== r.measures ||
      JSON.stringify(draft.lines) !== JSON.stringify(r.lines));
  const editing = !!r?.can.edit;
  return (
    <Drawer
      open
      onClose={onClose}
      width={920}
      dirty={editing && dirty}
      title={r ? `Revue du T${r.quarter} ${r.plan.year} · ${r.plan.unit_name}` : "Revue trimestrielle"}
      subtitle={r ? `${r.plan.title} · situation au ${frDate(r.period_end)}` : undefined}
      badges={r && <Status {...STATUS[r.status]} />}
      footer={
        r && (
          <>
            {editing && (
              <Button disabled={busy || !dirty} onClick={() => run(save, "Revue enregistrée")}>
                Enregistrer
              </Button>
            )}
            {r.can.submit && (
              <Button
                variant="primary"
                icon={<Send className="size-4" />}
                loading={busy}
                onClick={() =>
                  run(async () => {
                    if (dirty) await save();
                    return api.post<Review>(`/api/plan-reviews/${id}/submit`);
                  }, "Revue soumise à la direction générale")
                }
              >
                Soumettre
              </Button>
            )}
            {r.can.decide && (
              <>
                <Button
                  icon={<Undo2 className="size-4" />}
                  disabled={busy || !comment.trim()}
                  title={comment.trim() ? undefined : "Indiquez ce qui est à reprendre"}
                  onClick={() =>
                    run(() => api.post<Review>(`/api/plan-reviews/${id}/return`, { comment }), "Revue retournée")
                  }
                >
                  Retourner
                </Button>
                <Button
                  variant="primary"
                  icon={<Check className="size-4" />}
                  loading={busy}
                  onClick={() =>
                    run(
                      () => api.post<Review>(`/api/plan-reviews/${id}/validate`, { comment: comment || undefined }),
                      "Revue validée",
                    )
                  }
                >
                  Valider
                </Button>
              </>
            )}
            <Button onClick={onClose}>Fermer</Button>
          </>
        )
      }
    >
      {!r || !draft ? (
        <Spinner />
      ) : (
        <>
          {r.status === "retournee" && r.return_comment && (
            <p className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-[13px] text-danger">
              À reprendre : {r.return_comment}
            </p>
          )}
          <DrawerSection title="Activités du plan">
            <div className="space-y-3">
              {draft.lines.map((l) => (
                <div key={l.activity_id} className="rounded-xl border border-line p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{l.title}</p>
                      <p className="text-[12px] text-muted">
                        {l.responsible_name ?? "Sans responsable"} · fin prévue {frDate(l.end_on)}
                      </p>
                    </div>
                    <div className="w-[200px]">
                      <PlanBar progress={l.progress} expected={l.expected} />
                    </div>
                  </div>
                  {editing ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr_1fr]">
                      <Field label="Appréciation">
                        {(a) => (
                          <Select
                            {...a}
                            value={l.assessment}
                            onChange={(e) => setLine(l.activity_id, { assessment: e.target.value as Assessment })}
                          >
                            {Object.entries(ASSESSMENT).map(([v, x]) => (
                              <option key={v} value={v}>
                                {x.label}
                              </option>
                            ))}
                          </Select>
                        )}
                      </Field>
                      <Field
                        label="Écart et causes"
                        required={l.assessment === "en_retard" || l.assessment === "compromis"}
                      >
                        {(a) => (
                          <Textarea
                            {...a}
                            className="min-h-[64px]"
                            value={l.comment}
                            onChange={(e) => setLine(l.activity_id, { comment: e.target.value })}
                          />
                        )}
                      </Field>
                      <Field
                        label="Mesure corrective"
                        required={l.assessment === "en_retard" || l.assessment === "compromis"}
                      >
                        {(a) => (
                          <Textarea
                            {...a}
                            className="min-h-[64px]"
                            value={l.measure}
                            onChange={(e) => setLine(l.activity_id, { measure: e.target.value })}
                          />
                        )}
                      </Field>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-1 text-[13px]">
                      <Status {...ASSESSMENT[l.assessment]} />
                      {l.comment && (
                        <p>
                          <span className="text-muted">Écart et causes : </span>
                          {l.comment}
                        </p>
                      )}
                      {l.measure && (
                        <p>
                          <span className="text-muted">Mesure : </span>
                          {l.measure}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </DrawerSection>
          <DrawerSection title="Synthèse du trimestre">
            {editing ? (
              <div className="grid gap-4">
                <Field label="Synthèse" required hint="Ce qu'il faut retenir du trimestre, en quelques lignes.">
                  {(a) => (
                    <Textarea
                      {...a}
                      value={draft.summary}
                      onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
                    />
                  )}
                </Field>
                <Field label="Difficultés rencontrées">
                  {(a) => (
                    <Textarea
                      {...a}
                      value={draft.difficulties}
                      onChange={(e) => setDraft({ ...draft, difficulties: e.target.value })}
                    />
                  )}
                </Field>
                <Field label="Mesures et appuis demandés">
                  {(a) => (
                    <Textarea
                      {...a}
                      value={draft.measures}
                      onChange={(e) => setDraft({ ...draft, measures: e.target.value })}
                    />
                  )}
                </Field>
              </div>
            ) : (
              <Facts className="p-0">
                <Fact label="Synthèse" wide>
                  <LongText>{r.summary}</LongText>
                </Fact>
                <Fact label="Difficultés rencontrées" wide>
                  {r.difficulties}
                </Fact>
                <Fact label="Mesures et appuis demandés" wide>
                  {r.measures}
                </Fact>
                <Fact label="Soumise par">{r.submitted_by_name}</Fact>
                <Fact label="Validée par">{r.validated_by_name}</Fact>
                {r.validation_comment && (
                  <Fact label="Observation de la direction générale" wide>
                    {r.validation_comment}
                  </Fact>
                )}
              </Facts>
            )}
          </DrawerSection>
          {r.can.decide && (
            <DrawerSection title="Votre décision">
              <Field label="Observation" hint="Obligatoire pour retourner la revue ; transmise à l'entité.">
                {(a) => <Textarea {...a} value={comment} onChange={(e) => setComment(e.target.value)} />}
              </Field>
            </DrawerSection>
          )}
          {!editing && !r.can.decide && r.status === "validee" && (
            <p className="flex items-center gap-2 text-[12.5px] text-muted">
              <ClipboardCheck className="size-4" /> Revue validée : elle est figée.
            </p>
          )}
        </>
      )}
    </Drawer>
  );
}
