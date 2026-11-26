import { Bouton, Carte, Entete, Jeton, LigneStat, TeteCarte } from "../composants/Primitives";
import { Icone } from "../composants/Icone";
import { Empechement, useDistant } from "../composants/Distant";
import { ListeEchelonnee } from "../composants/Mouvement";
import { comptes as lireComptes, sante as lireSante } from "../lib/api/anat";
import { useSource } from "../lib/api/source";
import { cx, fmt } from "../lib/format";

/* =========================================================================
   Posture de sécurité — ce qui est faible aujourd'hui, et pourquoi.

   Tout ce qui est affiché ici est lu sur ANAT Pilotage. Aucun score inventé,
   aucune note sur cent : un chiffre global rassure sans rien dire, et il se
   dégrade toujours en « 87 % » que personne ne sait comment améliorer.

   À la place : des constats, chacun avec le nombre exact de comptes qu'il
   concerne et le geste qui le résout. Quand il n'y a rien à signaler, l'écran
   le dit — plutôt que de meubler.
   ========================================================================= */

interface Constat {
  cle: string;
  titre: string;
  combien: number;
  explication: string;
  geste: string;
  vers?: string;
  ton: "critique" | "vigilance" | "bon";
}

export function Securite({ aller }: { aller: (cle: string) => void }) {
  const { source } = useSource();
  const direct = source === "application";
  const sante = useDistant(lireSante);
  const comptes = useDistant(lireComptes);

  if (!direct)
    return (
      <>
        <Entete titre="Posture de sécurité" sous="Ce qui est faible aujourd'hui, et le geste qui le résout." />
        <Carte enfants={
          <div className="pas-carte text-[13px] text-encre-2 leading-[20px]">
            Cet écran ne lit que l'application : il n'a pas de version de démonstration, parce qu'une
            posture de sécurité inventée n'apprend rien à personne. Basculez la source sur
            <b> ANAT Pilotage</b> dans la barre du haut.
          </div>
        } />
      </>
    );

  const h = sante.donnees;
  const humains = (comptes.donnees ?? []).filter((c) => !c.is_ai);
  const verrouilles = humains.filter((c) => c.locked_until && +new Date(c.locked_until) > Date.now()).length;
  const sansDeuxFacteurs = humains.filter((c) => !c.totp_enabled && c.status === "active").length;
  const suspendus = humains.filter((c) => c.status === "suspended").length;
  const multiOrgs = humains.filter((c) => c.orgs.length > 1).length;

  const constats: Constat[] = h ? [
    {
      cle: "mfa-admins", titre: "Comptes à droits élevés sans deuxième facteur",
      combien: h.accounts.without_mfa_admins,
      explication: "Pour ces comptes, un mot de passe suffit à tout faire. C'est le constat le plus grave que cet écran puisse porter, parce qu'il réunit le pouvoir et la facilité d'y accéder.",
      geste: "Exiger le deuxième facteur sur les profils d'administration.",
      vers: "utilisateurs",
      ton: h.accounts.without_mfa_admins > 0 ? "critique" : "bon",
    },
    {
      cle: "mfa-tous", titre: "Comptes actifs sans deuxième facteur",
      combien: sansDeuxFacteurs,
      explication: "Moins grave que le précédent — ces comptes peuvent moins de choses — mais c'est la surface par laquelle on entre avant de monter.",
      geste: "Rendre le deuxième facteur obligatoire, en commençant par les profils qui écrivent.",
      vers: "utilisateurs",
      ton: sansDeuxFacteurs > 0 ? "vigilance" : "bon",
    },
    {
      cle: "jamais", titre: "Comptes jamais utilisés",
      combien: h.accounts.never_logged,
      explication: "Un compte créé et jamais ouvert garde ses droits sans que personne le surveille. Il n'est pas dormant — il attend — mais il se vole aussi bien.",
      geste: "Relancer l'invitation, ou fermer ce qui n'a jamais servi.",
      vers: "dormance",
      ton: h.accounts.never_logged > 0 ? "vigilance" : "bon",
    },
    {
      cle: "echecs", titre: "Échecs de connexion (24 h)",
      combien: h.security.failed_logins_24h,
      explication: "Quelques échecs sont normaux. Une série sur un même compte ou depuis une même adresse ne l'est pas, et l'application verrouille d'elle-même au-delà d'un seuil.",
      geste: "Lire le détail dans les actions critiques.",
      vers: "gestes",
      ton: h.security.failed_logins_24h > 10 ? "vigilance" : "bon",
    },
    {
      cle: "verrous", titre: "Comptes verrouillés en ce moment",
      combien: verrouilles || h.security.locked_24h,
      explication: "Un verrouillage protège, mais il empêche aussi quelqu'un de travailler. Chacun mérite qu'on sache pourquoi.",
      geste: "Vérifier qu'il s'agit d'un oubli de mot de passe et non d'une tentative.",
      vers: "gestes",
      ton: (verrouilles || h.security.locked_24h) > 0 ? "vigilance" : "bon",
    },
    {
      cle: "messagerie", titre: "Messagerie non configurée",
      combien: h.mail.configured ? 0 : 1,
      explication: "Sans messagerie, aucune alerte ne sort de l'outil : ni avertissement de dormance, ni notification de verrouillage, ni relance. La sécurité qui n'avertit personne ne sert à rien.",
      geste: "Configurer la messagerie de l'organisation.",
      vers: "canaux",
      ton: h.mail.configured ? "bon" : "critique",
    },
    {
      cle: "suspendus", titre: "Comptes suspendus",
      combien: suspendus,
      explication: "Un compte suspendu ne peut plus entrer, mais il existe encore et garde ses rattachements. C'est voulu, et cela mérite d'être revu de temps en temps.",
      geste: "Revoir si la suspension doit devenir une fermeture.",
      vers: "utilisateurs",
      ton: "bon",
    },
  ] : [];

  const aRegarder = constats.filter((c) => c.ton !== "bon" && c.combien > 0);
  const propres = constats.filter((c) => c.ton === "bon" || c.combien === 0);

  return (
    <>
      <Entete
        titre="Posture de sécurité"
        sous="Ce qui est faible aujourd'hui, et le geste qui le résout. Tout est lu sur l'application."
        actions={<Bouton icone="rafraichir" onClick={() => { sante.relancer(); comptes.relancer(); }} enfants="Relire" />}
      />

      <div className="mb-4">
        <Empechement etat={sante.etat} echec={sante.echec} relancer={sante.relancer} />
      </div>

      {h && (
        <>
          {/* Les alertes du serveur, mot pour mot. Il les a écrites pour un
              humain ; les reformuler finirait par en dire autre chose. */}
          {h.alerts.length > 0 && (
            <div className="grid gap-2 mb-4">
              {h.alerts.map((a) => (
                <div key={a.text}
                  className={cx("flex items-start gap-3 px-4 py-3 rounded-[4px] border anim-apparait",
                    a.level === "warning" ? "bg-vigilance-voile border-vigilance/40" : "bg-critique-voile border-critique/40")}>
                  <Icone nom="alerte" className={cx("mt-[2px]", a.level === "warning" ? "text-vigilance" : "text-critique")} />
                  <p className="flex-1 min-w-[min(100%,240px)] text-[13px] text-encre-2">{a.text}</p>
                  <span className="text-[11px] text-encre-4 shrink-0">dit par l'application</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
            <Carte className="pas-carte" enfants={<LigneStat etiquette="Constats à regarder" valeur={fmt(aRegarder.length)} ton={aRegarder.length ? "critique" : "bon"} />} />
            <Carte className="pas-carte" enfants={<LigneStat etiquette="Comptes humains" valeur={fmt(humains.length)} />} />
            <Carte className="pas-carte" enfants={<LigneStat etiquette="Connectés maintenant" valeur={fmt(h.sessions.users)} ton="accent" />} />
            <Carte className="pas-carte" enfants={<LigneStat etiquette="Sur plusieurs organisations" valeur={fmt(multiOrgs)} />} />
          </div>

          <Carte className="mb-4" enfants={
            <>
              <TeteCarte
                titre={aRegarder.length ? "Ce qui mérite un geste" : "Rien ne mérite un geste aujourd'hui"}
                sous={aRegarder.length ? "Du plus grave au moins grave" : "Les constats ci-dessous sont tous au vert"}
              />
              {aRegarder.length === 0 ? (
                <p className="pas-carte pt-3 text-[13px] text-encre-2">
                  Aucun constat en défaut. C'est une bonne nouvelle, et elle ne dit rien de ce que cet écran
                  ne sait pas regarder : il n'y a ici ni détection d'intrusion, ni analyse de trafic, ni
                  géolocalisation — l'application ne les porte pas.
                </p>
              ) : (
                <ListeEchelonnee className="divide-y divide-bordure">
                  {aRegarder.map((c) => (
                    <div key={c.cle} className="flex items-start gap-3 flex-wrap pas-carte">
                      <span className={cx("w-[7px] h-[7px] rounded-full shrink-0 mt-[7px]",
                        c.ton === "critique" ? "bg-critique" : "bg-vigilance")} />
                      <div className="min-w-[min(100%,240px)] flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-semibold">{c.titre}</span>
                          <Jeton ton={c.ton} enfants={fmt(c.combien)} />
                        </div>
                        <p className="text-[12.5px] text-encre-2 mt-[4px] leading-[18px]">{c.explication}</p>
                        <p className="text-[12px] text-encre-3 mt-[5px]"><b>À faire :</b> {c.geste}</p>
                      </div>
                      {c.vers && (
                        <Bouton taille="s" onClick={() => aller(c.vers!)} enfants="Y aller" />
                      )}
                    </div>
                  ))}
                </ListeEchelonnee>
              )}
            </>
          } />

          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,330px), 1fr))" }}>
            <Carte enfants={
              <>
                <TeteCarte titre="Au vert" sous="Vérifié, et sans rien à signaler" />
                <div className="pas-carte pt-3 divide-y divide-bordure">
                  {propres.map((c) => (
                    <div key={c.cle} className="flex items-center gap-3 py-[8px] first:pt-0 last:pb-0">
                      <Icone nom="check" taille="s" className="text-bon shrink-0" />
                      <span className="text-[12.5px] flex-1 min-w-0">{c.titre}</span>
                      <span className="text-[12px] tab-num text-encre-3">{fmt(c.combien)}</span>
                    </div>
                  ))}
                </div>
              </>
            } />

            <Carte enfants={
              <>
                <TeteCarte titre="Ce que cet écran ne sait pas voir" sous="Dit ici plutôt que deviné ailleurs" />
                <div className="pas-carte pt-3 text-[12.5px] text-encre-2 leading-[19px] grid gap-2">
                  <p><b>D'où viennent les connexions.</b> L'application enregistre l'adresse pour les
                  connexions, mais pas le pays ni la ville, et rien du tout pour les actes métier. Une
                  connexion depuis deux pays en une heure ne peut donc pas être détectée aujourd'hui.</p>
                  <p><b>Ce qui est plus vieux qu'un an.</b> Les actes de sécurité sont effacés au bout de
                  365 jours. Passé ce délai, cet écran ne peut rien dire — et c'est précisément ce que le
                  journal scellé du centre de commande viendra réparer.</p>
                  <p><b>Les actes qui n'ont pas été journalisés.</b> L'enregistrement se fait juste après
                  l'acte, hors transaction : si le serveur s'arrête entre les deux, l'acte a eu lieu sans
                  laisser de trace. La fenêtre est étroite et elle existait avant ce tableau de bord.</p>
                </div>
              </>
            } />
          </div>
        </>
      )}
    </>
  );
}
