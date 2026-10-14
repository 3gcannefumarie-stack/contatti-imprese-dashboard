# Rubrica contatti professionali

Dashboard statica in italiano per tenere una rubrica di amministratori e imprese nelle province di Brescia, Mantova e Vicenza e nell'Alto Garda trentino (Riva del Garda, Arco, Nago-Torbole). La provincia di Verona è esclusa.

## Avvio

Apri `index.html` in un browser o pubblica i file statici con GitHub Pages. La directory pubblica legge i soli contatti verificati da `public-contacts.js`.

Per caricare i contatti già raccolti, passa a **Miei contatti** e importa `contatti-locali.json`, presente nella cartella di lavoro ma non pubblicato. L'archivio personale e le note di follow-up vengono salvati nel `localStorage` del browser; non sono inviati al server. Usa **Esporta archivio** per salvare una copia privata. Questi dati resteranno sul dispositivo e nel profilo browser utilizzati per l'importazione.

## Fonti e limiti

- La directory pubblica contiene solo recapiti professionali comparsi su fonti pubbliche primarie e controllati alla data indicata su ogni scheda. La fonte ANACI Vicenza elenca gli amministratori iscritti 2025: 79 righe in provincia sono state deduplicate in 70 recapiti email unici, aggregando i nominativi che condividono lo stesso recapito. Sono stati riportati nome, comune, email e telefono pubblicati, non gli indirizzi degli uffici; la fonte associativa è linkata su ogni scheda.
- È presente anche Studio di Amministrazioni Bonaldo srl a Porto Mantovano, verificato sul suo sito ufficiale. L'assenza di un sito web sulla scheda ANACI non è compensata deducendolo dal dominio email.
- I contatti importati dai fogli originali sono una lista di lavoro **non verificata**: non vengono promossi alla directory pubblica e non sono inclusi in alcun file del sito.
- I fogli ODS originali, i recapiti personali e gli identificativi fiscali non sono pubblicati.
- La raccolta pubblica non è esaustiva: la copertura verificata attuale è concentrata su Vicenza e Mantova. La ricerca di amministratori per Brescia, Alto Garda, Mantova e di imprese edili, idrauliche, termoidrauliche, fumisti e installatori resta da completare. I fogli originali non sono stati promossi alla directory pubblica perché la loro presenza non verifica da sola i recapiti.
- La dashboard apre le email singolarmente nel programma di posta dell'utente. Non esegue invii, né invii massivi. Il flag **Non contattare** blocca i link email di quella scheda.
- Lo stato dei contatti, le date di follow-up, i flag di esclusione e le note sono locali al browser e possono essere cancellati se si svuota la memoria del sito.

Il catalogo è un punto di partenza da aggiornare e ricontrollare prima di ogni contatto; non costituisce una certificazione della disponibilità o dell'attualità di tutti i servizi offerti.
