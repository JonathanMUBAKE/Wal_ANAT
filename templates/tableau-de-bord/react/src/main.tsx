import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Application } from "./CentreDeCommande";
import { FournisseurSource } from "./lib/api/source";
import "./styles/tokens.css";

createRoot(document.getElementById("racine")!).render(
  <StrictMode>
    <FournisseurSource>
      <Application />
    </FournisseurSource>
  </StrictMode>,
);
