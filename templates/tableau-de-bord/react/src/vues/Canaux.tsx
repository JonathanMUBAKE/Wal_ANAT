import { useState } from "react";
import { BarreMini, Bouton, Carte, Entete, Jeton, LigneReglage, LigneStat, Onglets, Pastille, Progression, TeteCarte } from "../composants/Primitives";
import { Icone, type NomIcone } from "../composants/Icone";
import { Etincelle } from "../composants/Graphique";
import { useUI } from "../composants/Superpositions";
import { cx, fmt } from "../lib/format";
import { sms, smtp, whatsapp, type EtatCanal } from "../lib/communication";

const TON: Record<EtatCanal, "bon" | "vigilance" | "critique" | "neutre"> = {
  "actif": "bon", "dégradé": "vigilance", "en erreur": "critique", "non configuré": "neutre",
};

/* Canaux d'envoi : trois canaux, trois façons de tomber en panne.
   La messagerie se juge à sa réputation, le SMS à son crédit et à sa
   couverture, WhatsApp à la qualité de son numéro et à ses modèles approuvés.
   Un canal « actif » qui n'envoie plus rien se repère ici, pas dans les
   réclamations des agents trois jours plus tard. */
export function Canaux() {
  const ui = useUI();
  const [onglet, poserOnglet] = useState("messagerie");
  const [adresseTest, poserAdresseTest] = useState("");

  async function tester(canal: string) {
    if (canal === "messagerie" && !adresseTest.trim()) {
      return ui.message("Indiquez une adresse de destination pour l'essai.", "critique");
    }
    ui.message(`Envoi d'essai sur ${canal}…`, "info", { duree: 1300 });
    setTimeout(() => ui.message(`Essai ${canal} : message remis en 1,4 s.`, "bon"), 1500);
  }

  return (
    <>
      <Entete
        titre="Canaux d'envoi"
        sous="Par où le SIGRH joint les agents : messagerie, SMS, WhatsApp."
        actions={<Bouton icone="rafraichir" onClick={() => ui.message("État des canaux actualisé.", "bon", { duree: 1400 })} enfants="Actualiser" />}
      />

      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <PaveCanal icone="enveloppe" nom="Messagerie" etat={smtp.etat}
          principal={`${fmt(smtp.statistiques.envoyes30j, "compact")} messages`}
          secondaire={`${smtp.statistiques.delivres} % remis · ${smtp.statistiques.rebondsDurs} % rebonds durs`}
          serie={smtp.historique} couleur="--serie-1"
          alerte={smtp.verifications.find((v) => v.etat === "vigilance")?.detail} />
        <PaveCanal icone="telephone" nom="SMS" etat={sms.etat}
          principal={`${fmt(sms.envoyesMois, "compact")} messages`}
          secondaire={`${sms.delivres} % remis · crédit ${fmt(sms.creditRestant)} ${sms.devise}`}
          serie={sms.historique} couleur="--serie-3" />
        <PaveCanal icone="discussion" nom="WhatsApp" etat={whatsapp.etat}
          principal={`${fmt(whatsapp.envoyesMois, "compact")} messages`}
          secondaire={`${whatsapp.lus} % lus · qualité ${whatsapp.qualite.toLowerCase()}`}
          serie={whatsapp.historique} couleur="--serie-6"
          alerte={whatsapp.avertissement} />
      </div>

      <Carte enfants={
        <>
          <Onglets
            actif={onglet} surChoix={poserOnglet}
            onglets={[
              { cle: "messagerie", nom: "Messagerie (SMTP)" },
              { cle: "sms", nom: "SMS" },
              { cle: "whatsapp", nom: "WhatsApp" },
            ]}
          />

          <div className="pas-carte">
            {onglet === "messagerie" && (
              <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}>
                <section>
                  <TeteCarte titre="Serveur sortant" sous="Les paramètres de connexion" />
                  <div className="pt-3">
                    <LigneStat etiquette="Hôte" valeur={<span className="font-mono">{smtp.hote}</span>} />
                    <LigneStat etiquette="Port" valeur={String(smtp.port)} />
                    <LigneStat etiquette="Chiffrement" valeur={smtp.chiffrement} ton="bon" />
                    <LigneStat etiquette="Authentification" valeur={smtp.authentification} />
                    <LigneStat etiquette="Compte" valeur={<span className="font-mono">{smtp.utilisateur}</span>} />
                    <LigneStat etiquette="Expéditeur affiché" valeur={smtp.expediteur} />
                    <LigneStat etiquette="Répondre à" valeur={smtp.repondreA} />
                    <LigneStat etiquette="Pièce jointe maximale" valeur={`${smtp.tailleMaxPiece} Mio`} />
                    <div className="mt-3 pt-3 border-t border-bordure">
                      <div className="flex items-baseline gap-2 mb-[4px] text-[12px]">
                        <span className="text-encre-3">Débit horaire</span>
                        <span className="ml-auto tab-num">{fmt(smtp.envoyeDerniereHeure)} / {fmt(smtp.limiteParHeure)}</span>
                      </div>
                      <Progression valeur={(smtp.envoyeDerniereHeure / smtp.limiteParHeure) * 100} ton="bon" />
                      <p className="text-[12px] text-encre-3 mt-2">
                        {fmt(smtp.filesEnAttente)} messages en file. Au-delà de la limite horaire,
                        les envois ne sont pas perdus : ils attendent.
                      </p>
                    </div>
                  </div>
                </section>

                <section>
                  <TeteCarte titre="Réputation" sous="Ce qui décide si le message arrive ou part en indésirable" />
                  <div className="pt-3">
                    {smtp.verifications.map((v) => (
                      <div key={v.nom} className="flex items-start gap-3 py-[9px] border-b border-bordure last:border-0">
                        <Pastille ton={v.etat === "bon" ? "bon" : "vigilance"} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold">{v.nom}</div>
                          <p className="text-[12px] text-encre-3">{v.detail}</p>
                        </div>
                        <Jeton ton={v.etat === "bon" ? "bon" : "vigilance"} enfants={v.etat === "bon" ? "conforme" : "à revoir"} />
                      </div>
                    ))}
                    <div className="mt-3 p-3 rounded-[4px] bg-vigilance-voile text-[12px] text-encre-2">
                      Une politique DMARC en « none » laisse passer les messages qui usurpent votre
                      domaine. Tant qu'elle n'est pas durcie, n'importe qui peut écrire aux agents
                      au nom du SIGRH.
                    </div>
                  </div>
                </section>

                <section>
                  <TeteCarte titre="Remise" sous="Sur les trente derniers jours" />
                  <div className="pt-3">
                    <LigneStat etiquette="Messages envoyés" valeur={fmt(smtp.statistiques.envoyes30j)} />
                    <LigneStat etiquette="Remis" valeur={`${smtp.statistiques.delivres} %`} ton="bon" />
                    <LigneStat etiquette="Rebonds durs" valeur={`${smtp.statistiques.rebondsDurs} %`} ton={smtp.statistiques.rebondsDurs > 2 ? "critique" : undefined} />
                    <LigneStat etiquette="Rebonds souples" valeur={`${smtp.statistiques.rebondsSouples} %`} />
                    <LigneStat etiquette="Plaintes" valeur={`${smtp.statistiques.plaintes} %`} ton="bon" />
                    <LigneStat etiquette="Ouverts" valeur={`${smtp.statistiques.ouverts} %`} />
                    <p className="text-[12px] text-encre-3 mt-3">
                      Un rebond dur veut dire que l'adresse n'existe pas : il faut la corriger dans le
                      référentiel, pas réessayer. Au-delà de 2 %, la réputation du domaine se dégrade.
                    </p>
                  </div>
                </section>

                <section>
                  <TeteCarte titre="Envoi d'essai" sous="Vérifier avant que les agents ne le fassent pour vous" />
                  <div className="pt-3">
                    <label htmlFor="essai" className="block text-[12px] text-encre-3 mb-[6px]">Adresse de destination</label>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-2 h-8 px-[10px] flex-1 rounded-[4px] bg-surface-2 border border-bordure focus-within:border-accent transi">
                        <Icone nom="enveloppe" taille="s" className="text-encre-3" />
                        <input id="essai" type="email" value={adresseTest} onChange={(e) => poserAdresseTest(e.target.value)}
                          placeholder="vous@exemple.org"
                          className="w-full bg-transparent outline-none text-[13px] text-encre placeholder:text-encre-4" />
                      </div>
                      <Bouton ton="principal" icone="eclair" onClick={() => tester("messagerie")} enfants="Envoyer" />
                    </div>
                    <p className="text-[12px] text-encre-3 mt-3">
                      L'essai passe par le même chemin que les messages réels : même serveur, même
                      signature, même expéditeur. Si l'essai arrive en indésirable, les autres aussi.
                    </p>
                  </div>
                </section>
              </div>
            )}

            {onglet === "sms" && (
              <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}>
                <section>
                  <TeteCarte titre="Fournisseur" sous="Qui achemine, et à quel prix" />
                  <div className="pt-3">
                    <LigneStat etiquette="Fournisseur" valeur={sms.fournisseur} />
                    <LigneStat etiquette="Identifiant d'expéditeur" valeur={<span className="font-mono">{sms.identifiantExpediteur}</span>} />
                    <LigneStat etiquette="Pays desservis" valeur={sms.pays.join(", ")} />
                    <LigneStat etiquette="Coût unitaire" valeur={`${sms.coutUnitaire} ${sms.devise}`} />
                    <LigneStat etiquette="Débit maximal" valeur={`${sms.limiteParMinute} par minute`} />
                    <div className="mt-3 pt-3 border-t border-bordure">
                      <div className="flex items-baseline gap-2 mb-[4px] text-[12px]">
                        <span className="text-encre-3">Crédit restant</span>
                        <span className={cx("ml-auto tab-num font-semibold", sms.creditRestant < sms.seuilAlerte && "text-critique")}>
                          {fmt(sms.creditRestant)} {sms.devise}
                        </span>
                      </div>
                      <Progression valeur={Math.min(100, (sms.creditRestant / 2000) * 100)} ton={sms.creditRestant < sms.seuilAlerte ? "critique" : "bon"} />
                      <p className="text-[12px] text-encre-3 mt-2">
                        Soit environ {fmt(Math.floor(sms.creditRestant / sms.coutUnitaire))} messages.
                        Une alerte part sous {sms.seuilAlerte} {sms.devise}.
                      </p>
                    </div>
                  </div>
                </section>

                <section>
                  <TeteCarte titre="Remise" sous="Pourquoi les messages n'arrivent pas" />
                  <div className="pt-3">
                    <LigneStat etiquette="Envoyés ce mois" valeur={fmt(sms.envoyesMois)} />
                    <LigneStat etiquette="Remis" valeur={`${sms.delivres} %`} ton="bon" />
                    <LigneStat etiquette="En échec" valeur={`${sms.echecs} %`} ton={sms.echecs > 5 ? "vigilance" : undefined} />
                    <div className="mt-3 pt-3 border-t border-bordure">
                      <div className="text-[11px] font-semibold uppercase tracking-[.06em] text-encre-3 mb-2">Motifs d'échec</div>
                      {sms.motifsEchec.map((m) => (
                        <div key={m.motif} className="flex items-center gap-3 py-[5px] text-[12.5px]">
                          <span className="text-encre-2 flex-1 min-w-0 truncate">{m.motif}</span>
                          <BarreMini valeur={m.part} largeur={60} />
                          <span className="tab-num w-[36px] text-right text-encre-3">{m.part} %</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[12px] text-encre-3 mt-3">
                      Près de la moitié des échecs viennent de numéros erronés dans le référentiel.
                      C'est là qu'il faut agir, pas sur le fournisseur.
                    </p>
                  </div>
                </section>

                <section>
                  <TeteCarte titre="Envoi d'essai" sous="Sur votre propre numéro" />
                  <div className="pt-3">
                    <Bouton ton="principal" icone="eclair" onClick={() => tester("SMS")} enfants="Envoyer un SMS d'essai" />
                    <p className="text-[12px] text-encre-3 mt-3">
                      L'essai est facturé comme un envoi réel. Il vérifie l'identifiant d'expéditeur :
                      certains opérateurs le remplacent par un numéro court, ce qui change la façon
                      dont les agents reconnaissent le message.
                    </p>
                  </div>
                </section>
              </div>
            )}

            {onglet === "whatsapp" && (
              <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}>
                <section className="xl:col-span-2">
                  <div className="flex items-start gap-3 p-3 rounded-[4px] bg-vigilance-voile border border-vigilance/40">
                    <Icone nom="discussion" className="text-vigilance mt-[2px]" />
                    <div className="text-[13px] text-encre-2">{whatsapp.avertissement}</div>
                  </div>
                </section>

                <section>
                  <TeteCarte titre="Numéro professionnel" sous="Identité et qualité" />
                  <div className="pt-3">
                    <LigneStat etiquette="Numéro" valeur={<span className="font-mono">{whatsapp.numero}</span>} />
                    <LigneStat etiquette="Compte" valeur={whatsapp.compte} ton="bon" />
                    <LigneStat etiquette="Qualité du numéro" valeur={whatsapp.qualite}
                      ton={whatsapp.qualite === "Élevée" ? "bon" : whatsapp.qualite === "Moyenne" ? "vigilance" : "critique"} />
                    <LigneStat etiquette="Conversations ouvertes" valeur={`${fmt(whatsapp.conversationsOuvertes)} / ${fmt(whatsapp.limiteConversations)}`} />
                    <Progression valeur={(whatsapp.conversationsOuvertes / whatsapp.limiteConversations) * 100} ton="accent" />
                  </div>
                </section>

                <section>
                  <TeteCarte titre="Ce que WhatsApp impose" sous="Les règles qui ne se contournent pas" />
                  <div className="pt-3 space-y-3 text-[12.5px] text-encre-2 leading-[18px]">
                    <p>
                      <b className="text-encre">Fenêtre de 24 heures.</b> Passé {whatsapp.fenetre.toLowerCase()},
                      on ne peut plus écrire librement : seul un modèle approuvé passe.
                    </p>
                    <p>
                      <b className="text-encre">Modèles approuvés.</b> Chaque message type est examiné
                      avant d'être utilisable. Un modèle classé « service » qui fait de la promotion
                      est refusé — et les refus répétés font baisser la qualité du numéro.
                    </p>
                    <p>
                      <b className="text-encre">Qualité du numéro.</b> Elle dépend de ce que font les
                      destinataires : un blocage ou un signalement la fait baisser. Trois baisses
                      consécutives suspendent l'envoi.
                    </p>
                  </div>
                </section>

                <section>
                  <TeteCarte titre="Remise et lecture" sous="Sur le mois" />
                  <div className="pt-3">
                    <LigneStat etiquette="Envoyés" valeur={fmt(whatsapp.envoyesMois)} />
                    <LigneStat etiquette="Remis" valeur={`${whatsapp.delivres} %`} ton="bon" />
                    <LigneStat etiquette="Lus" valeur={`${whatsapp.lus} %`} ton="bon" />
                    <LigneStat etiquette="Réponses" valeur={`${whatsapp.reponses} %`} />
                    <p className="text-[12px] text-encre-3 mt-3">
                      Le taux de lecture est nettement meilleur que celui de la messagerie. C'est aussi
                      pourquoi un message mal classé y est plus mal reçu.
                    </p>
                    <Bouton taille="s" className="mt-3" icone="eclair" onClick={() => tester("WhatsApp")} enfants="Envoyer un essai" />
                  </div>
                </section>
              </div>
            )}
          </div>
        </>
      } />

      <Carte className="mt-4" enfants={
        <>
          <TeteCarte titre="Règles d'acheminement" sous="Quel canal pour quel message, et que faire quand il échoue" />
          <div className="pas-carte pt-3">
            <LigneReglage titre="Repli automatique"
              texte="Quand un envoi échoue trois fois sur son canal, le système tente le canal suivant déclaré pour l'agent."
              controle={<Jeton ton="bon" enfants="activé" />} />
            <LigneReglage titre="Ordre de préférence"
              texte="Messagerie, puis WhatsApp, puis SMS. Le SMS coûte le plus cher : il vient en dernier."
              controle={<Bouton taille="s" onClick={() => ui.message("Éditeur d'ordre à brancher.", "info")} enfants="Modifier" />} />
            <LigneReglage titre="Heures d'envoi"
              texte="Aucun envoi automatique entre 20 h et 6 h, sauf les alertes de sécurité."
              avertissement="Les codes de vérification ignorent cette règle : un agent qui se connecte la nuit doit pouvoir recevoir son code."
              controle={<Jeton ton="bon" enfants="06 h – 20 h" />} />
            <LigneReglage titre="Consentement"
              texte="Un agent peut refuser WhatsApp et SMS depuis son portail. La messagerie institutionnelle, elle, ne se refuse pas."
              controle={<Jeton ton="bon" enfants="respecté" />} />
          </div>
        </>
      } />
    </>
  );
}

function PaveCanal({ icone, nom, etat, principal, secondaire, serie, couleur, alerte }: {
  icone: NomIcone; nom: string; etat: EtatCanal;
  principal: string; secondaire: string; serie: number[]; couleur: string; alerte?: string;
}) {
  const fond = {
    bon: "bg-bon-voile text-bon", vigilance: "bg-vigilance-voile text-vigilance",
    critique: "bg-critique-voile text-critique", neutre: "bg-surface-3 text-encre-3",
  }[TON[etat]];
  return (
    <Carte className={cx(etat === "en erreur" && "border-critique/50", etat === "dégradé" && "border-vigilance/40")} enfants={
      <div className="pas-carte">
        <div className="flex items-center gap-2 mb-3">
          <span className={cx("w-[30px] h-[30px] rounded-[4px] grid place-items-center shrink-0", fond)}>
            <Icone nom={icone} />
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold">{nom}</div>
            <div className="flex items-center gap-[5px] text-[11px] text-encre-3">
              <Pastille ton={TON[etat]} pulse={etat === "actif"} />{etat}
            </div>
          </div>
        </div>
        <div className="text-[23px] font-semibold tab-num leading-[1.1]">{principal}</div>
        <div className="text-[12px] text-encre-3 mt-[2px]">{secondaire}</div>
        <Etincelle valeurs={serie} couleur={couleur} hauteur={28} />
        {alerte && (
          <div className="mt-2 flex items-start gap-[6px] text-[11.5px] text-vigilance">
            <Icone nom="alerte" taille="s" className="mt-[2px] shrink-0" />
            <span className="line-clamp-2">{alerte}</span>
          </div>
        )}
      </div>
    } />
  );
}
