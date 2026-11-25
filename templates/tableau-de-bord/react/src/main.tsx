import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Application } from "./CentreDeCommande";
import "./styles/tokens.css";

createRoot(document.getElementById("racine")!).render(
  <StrictMode>
    <Application />
  </StrictMode>,
);
