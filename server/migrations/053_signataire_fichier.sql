-- Parapheur (thème 6 de l'analyse, PH-1) : le document à signer est un fichier joint (PDF, Word…), scellé par son
-- empreinte à l'entrée dans le circuit ; le bordereau des visas et signatures cite cette empreinte.
ALTER TABLE sign_documents ADD COLUMN file_name TEXT;
ALTER TABLE sign_documents ADD COLUMN file_mime TEXT;
ALTER TABLE sign_documents ADD COLUMN file_size INTEGER;
ALTER TABLE sign_documents ADD COLUMN file_data BYTEA;
