import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button, Empty } from "@/components/ui";
import { Field, LoadingRows, PageHeader, Textarea, frDate } from "@/components/gov";
import { api } from "@/lib/api";

/*
 * Contrôle croisé de l'administration (thème 2 de l'analyse, AD-1). Le responsable informatique administre la
 * plateforme ; la DG relit ici ce qu'il a fait depuis la dernière relecture, puis vise le journal.
 */
interface Entry {
  id: string;
  created_at: string;
  kind: string;
  label: string;
  category: string;
  severity: "critique" | "importante" | "normale";
  actor_name: string;
  summary: string;
}
interface Review {
  id: string;
  reviewer_name: string | null;
  period_end: string;
  count: number;
  comment: string;
  created_at: string;
}
interface Data {
  admins: { id: string; name: string; title: string | null }[];
  last_review: Review | null;
  entries: Entry[];
  count: number;
  history: Review[];
}

const time = (iso: string) => `${frDate(iso.slice(0, 10))} à ${new Date(iso).toTimeString().slice(0, 5)}`;
const SEVERITY: Record<Entry["severity"], string> = {
  critique: "text-danger",
  importante: "text-warning",
  normale: "text-muted",
};

export function AdminReviewPage() {
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-review"],
    queryFn: () => api.get<Data>("/api/org/admin-review"),
  });
  const review = useMutation({
    mutationFn: () => api.post<Data>("/api/org/admin-review", { comment }),
    onSuccess: (r) => {
      qc.setQueryData(["admin-review"], r);
      setComment("");
      toast.success("Journal visé : l'administrateur en est prévenu");
    },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="min-h-full">
      <PageHeader
        Icon={ShieldCheck}
        crumbs={["Organisation", "Contrôle de l'administration"]}
        title="Relecture du journal d'administration"
        subtitle="L'administrateur système gère les comptes, les profils et la plateforme ; une autre personne relit ses actions et vise le journal."
      />
      <div className="mx-auto max-w-[1100px] space-y-6 p-4 sm:px-8 sm:py-6">
        {isLoading && <LoadingRows />}
        {error && <p className="text-[13px] text-danger">{(error as Error).message}</p>}
        {data && (
          <>
            <section className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line px-4 py-3 text-[13px]">
                <p className="text-[12px] text-muted">Administration système</p>
                {data.admins.length ? (
                  data.admins.map((a) => (
                    <p key={a.id} className="mt-0.5 font-medium">
                      {a.name}
                      {a.title && <span className="font-normal text-muted"> · {a.title}</span>}
                    </p>
                  ))
                ) : (
                  <p className="mt-0.5 text-muted">Aucun administrateur désigné</p>
                )}
              </div>
              <div className="rounded-xl border border-line px-4 py-3 text-[13px]">
                <p className="text-[12px] text-muted">Dernière relecture</p>
                {data.last_review ? (
                  <p className="mt-0.5 font-medium">
                    {time(data.last_review.created_at)} par {data.last_review.reviewer_name ?? "—"}
                    <span className="font-normal text-muted">
                      {" "}
                      · {data.last_review.count} action{data.last_review.count > 1 ? "s" : ""}
                    </span>
                  </p>
                ) : (
                  <p className="mt-0.5 text-muted">Le journal n'a encore jamais été relu</p>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-[15px] font-semibold">
                À relire : {data.count} action{data.count > 1 ? "s" : ""} depuis la dernière relecture
              </h2>
              {data.entries.length ? (
                <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
                  {data.entries.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2.5 text-[13px]">
                      <span className="tabular w-[150px] shrink-0 text-[12px] text-muted">{time(e.created_at)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="font-medium">{e.label}</span>
                        {e.summary && <span className="text-muted"> · {e.summary}</span>}
                      </span>
                      <span className={`text-[12px] ${SEVERITY[e.severity]}`}>
                        {e.category} · {e.severity}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-2">
                  <Empty icon={<ShieldCheck className="size-6" />} title="Rien à relire">
                    Aucune action de l'administrateur depuis la dernière relecture.
                  </Empty>
                </div>
              )}
              <div className="mt-3 space-y-2">
                <Field label="Observations" hint="Facultatif : ce qui appelle une explication, ou « rien d'anormal »">
                  {(a) => <Textarea {...a} value={comment} onChange={(e) => setComment(e.target.value)} />}
                </Field>
                <Button variant="primary" loading={review.isPending} onClick={() => review.mutate()}>
                  Viser le journal
                </Button>
              </div>
            </section>

            {data.history.length > 0 && (
              <section>
                <h2 className="text-[15px] font-semibold">Relectures précédentes</h2>
                <ul className="mt-2 space-y-1.5 text-[13px]">
                  {data.history.map((r) => (
                    <li key={r.id} className="text-muted">
                      {time(r.created_at)} · {r.reviewer_name ?? "—"} · {r.count} action{r.count > 1 ? "s" : ""}
                      {r.comment && <span className="text-fg"> · {r.comment}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
