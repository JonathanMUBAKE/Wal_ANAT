import { createContext, useContext } from "react";

export interface EtatApp {
  theme: string;
  densite: string;
  periode: string;
  vue: string;
  aller: (cle: string) => void;
}

export const ContexteApp = createContext<EtatApp>({
  theme: "sombre", densite: "normale", periode: "24h", vue: "apercu", aller: () => {},
});

export const useApp = () => useContext(ContexteApp);
