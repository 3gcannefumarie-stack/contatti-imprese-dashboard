(() => {
  "use strict";

  const PRIVATE_KEY = "rubrica-contatti-privati-v1";
  const TRACKING_KEY = "rubrica-follow-up-v1";
  const ALLOWED_REGIONS = new Set(["Brescia", "Mantova", "Vicenza", "Alto Garda trentino"]);
  const STORAGE_KEYS = [PRIVATE_KEY, TRACKING_KEY];
  const state = {
    view: "public",
    publicContacts: [],
    privateContacts: [],
    tracking: {},
    loadError: "",
  };

  const elements = {
    tabs: [...document.querySelectorAll(".tab")],
    title: document.querySelector("#workspace-title"),
    privacyNotice: document.querySelector("#privacy-notice"),
    privateTools: document.querySelector("#private-tools"),
    search: document.querySelector("#search"),
    region: document.querySelector("#region-filter"),
    category: document.querySelector("#category-filter"),
    list: document.querySelector("#contact-list"),
    count: document.querySelector("#results-count"),
    empty: document.querySelector("#empty-state"),
    emptyCopy: document.querySelector("#empty-copy"),
    importFile: document.querySelector("#import-file"),
    importStatus: document.querySelector("#import-status"),
    dialog: document.querySelector("#contact-dialog"),
    form: document.querySelector("#contact-form"),
  };

  function readStoredJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.error(`Impossibile leggere ${key} dal browser.`, error);
      showMessage("Non riesco a leggere l'archivio locale. Esporta un backup o cancella i dati non validi dalle impostazioni del browser.");
      return fallback;
    }
  }

  function saveStoredJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Impossibile salvare ${key} nel browser.`, error);
      showMessage("Salvataggio locale non riuscito. Esporta l'archivio per non perdere le modifiche.");
      return false;
    }
  }

  function showMessage(message) {
    elements.importStatus.textContent = message;
    elements.importStatus.classList.add("has-error");
  }

  function text(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function makeId(contact) {
    const seed = [contact.company, contact.location, contact.email, contact.phone].map(text).join("|").toLowerCase();
    let hash = 2166136261;
    for (let index = 0; index < seed.length; index += 1) {
      hash ^= seed.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `c-${(hash >>> 0).toString(36)}`;
  }

  function normalizeContact(raw) {
    if (!raw || typeof raw !== "object") return null;
    const company = text(raw.company) || text(raw.name);
    const location = text(raw.location);
    const address = text(raw.address);
    const region = text(raw.region);
    const publicListing = raw.publicListing === true;

    if (!company || !ALLOWED_REGIONS.has(region)) return null;
    if (/\bVR\b/i.test(`${address} ${location}`)) return null;

    return {
      id: text(raw.id) || makeId({ company, location, email: raw.email, phone: raw.phone }),
      name: text(raw.name),
      company,
      address,
      location,
      region,
      category: text(raw.category) || "Servizi tecnici",
      email: text(raw.email),
      phone: text(raw.phone),
      website: safeUrl(raw.website),
      sourceLabel: text(raw.sourceLabel) || (publicListing ? "Fonte pubblica" : "Importato localmente"),
      sourceUrl: safeUrl(raw.sourceUrl),
      verifiedAt: text(raw.verifiedAt),
      quality: publicListing ? "Fonte pubblica verificata" : "Da verificare",
      publicListing,
      status: text(raw.status) || "Da contattare",
      nextContact: text(raw.nextContact),
      notes: text(raw.notes),
    };
  }

  function safeUrl(value) {
    const url = text(value);
    if (!url) return "";
    try {
      const parsed = new URL(url);
      return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : "";
    } catch {
      return "";
    }
  }

  function appendText(parent, tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value;
    parent.append(node);
    return node;
  }

  function appendLink(parent, label, href, className, title) {
    const link = document.createElement("a");
    link.className = className;
    link.href = href;
    link.textContent = label;
    link.title = title || label;
    if (href.startsWith("http")) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    parent.append(link);
    return link;
  }

  function emailsFrom(value) {
    return [...new Set((value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map((email) => email.toLowerCase()))];
  }

  function firstPhone(value) {
    return value.split(/\s(?:[-–—]|\/)\s|[;,]/, 1)[0].trim();
  }

  function makeTrackingField(labelText, input, id) {
    const label = document.createElement("label");
    label.className = "track-field";
    label.htmlFor = id;
    appendText(label, "span", "", labelText);
    input.id = id;
    label.append(input);
    return label;
  }

  function getTracking(contact) {
    return state.tracking[contact.id] || {
      status: contact.status || "Da contattare",
      nextContact: contact.nextContact || "",
      doNotContact: false,
      notes: contact.notes || "",
    };
  }

  function cardFor(contact) {
    const card = document.createElement("article");
    card.className = "contact-card";
    const heading = document.createElement("div");
    heading.className = "card-top";
    const title = document.createElement("div");
    title.className = "card-title";
    appendText(title, "h3", "", contact.company);
    const subtitle = [contact.category, contact.name && contact.name !== contact.company ? contact.name : ""].filter(Boolean).join(" · ");
    if (subtitle) appendText(title, "p", "card-subtitle", subtitle);
    heading.append(title);
    const badge = appendText(heading, "span", `quality-badge${contact.publicListing ? "" : " review"}`, contact.publicListing ? "Fonte verificata" : "Da verificare");
    badge.title = contact.publicListing ? "Recapito aziendale verificato su fonte pubblica" : "Dato importato, non verificato per la pubblicazione";
    card.append(heading);

    const location = [contact.address, contact.location, contact.region].filter(Boolean).join(" · ");
    if (location) appendText(card, "p", "card-location", location);

    const links = document.createElement("div");
    links.className = "contact-links";
    const tracking = getTracking(contact);
    const emails = emailsFrom(contact.email);
    if (emails.length) {
      emails.forEach((email) => {
        const link = appendLink(links, `✉ ${email}`, `mailto:${encodeURIComponent(email)}`, "contact-link", "Apri una singola email nel tuo programma di posta");
        link.addEventListener("click", (event) => {
          if (tracking.doNotContact) {
            event.preventDefault();
            showMessage("Contatto bloccato: questa scheda è contrassegnata come do-not-contact.");
          }
        });
      });
    }
    if (contact.phone) {
      const phoneValue = firstPhone(contact.phone);
      const digits = phoneValue.replace(/[^\d+]/g, "");
      if (digits) appendLink(links, `☎ ${phoneValue}`, `tel:${digits}`, "contact-link", "Chiama il recapito aziendale");
      else appendText(links, "span", "card-subtitle", contact.phone);
    }
    if (contact.website) appendLink(links, "↗ Sito web", contact.website, "website-link", "Apri il sito aziendale");
    if (links.childElementCount) card.append(links);

    const source = document.createElement("div");
    source.className = "source-line";
    appendText(source, "span", "", contact.sourceLabel || "Fonte non specificata");
    if (contact.sourceUrl) appendLink(source, "Fonte ↗", contact.sourceUrl, "", `Apri fonte: ${contact.sourceUrl}`);
    else if (contact.verifiedAt) appendText(source, "span", "", "Fonte URL non disponibile");
    if (contact.verifiedAt) appendText(source, "span", "", `Verificato ${contact.verifiedAt}`);
    card.append(source);

    const trackingSection = document.createElement("div");
    trackingSection.className = "tracking";
    const status = document.createElement("select");
    ["Da contattare", "Contattato", "In attesa", "Interessato", "Non interessato"].forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      option.selected = tracking.status === value;
      status.append(option);
    });
    status.addEventListener("change", () => updateTracking(contact.id, { status: status.value }));
    const date = document.createElement("input");
    date.type = "date";
    date.value = tracking.nextContact || "";
    date.addEventListener("change", () => updateTracking(contact.id, { nextContact: date.value }));
    trackingSection.append(makeTrackingField("Stato", status, `status-${contact.id}`));
    trackingSection.append(makeTrackingField("Prossimo contatto", date, `date-${contact.id}`));
    const extra = document.createElement("div");
    extra.className = "tracking-extra";
    const doNotContact = document.createElement("input");
    doNotContact.type = "checkbox";
    doNotContact.checked = tracking.doNotContact === true;
    doNotContact.addEventListener("change", () => updateTracking(contact.id, { doNotContact: doNotContact.checked }));
    const optOut = document.createElement("label");
    optOut.className = "do-not-contact";
    optOut.append(doNotContact, document.createTextNode("Non contattare"));
    const notes = document.createElement("input");
    notes.className = "track-notes";
    notes.type = "text";
    notes.maxLength = 300;
    notes.placeholder = "Nota follow-up…";
    notes.value = tracking.notes || "";
    notes.setAttribute("aria-label", `Nota follow-up per ${contact.company}`);
    notes.addEventListener("change", () => updateTracking(contact.id, { notes: notes.value }));
    extra.append(optOut, notes);
    trackingSection.append(extra);
    card.append(trackingSection);
    return card;
  }

  function updateTracking(id, changes) {
    state.tracking[id] = { ...getTracking({ id, status: "Da contattare" }), ...changes };
    saveStoredJson(TRACKING_KEY, state.tracking);
    if (changes.doNotContact === true) render();
  }

  function currentContacts() {
    return state.view === "public" ? state.publicContacts : state.privateContacts;
  }

  function render() {
    const contacts = currentContacts();
    const query = elements.search.value.trim().toLocaleLowerCase("it");
    const filtered = contacts.filter((contact) => {
      const haystack = [contact.company, contact.name, contact.address, contact.location, contact.region, contact.category, contact.email, contact.phone].join(" ").toLocaleLowerCase("it");
      return (!query || haystack.includes(query))
        && (!elements.region.value || contact.region === elements.region.value)
        && (!elements.category.value || contact.category === elements.category.value);
    });

    elements.list.replaceChildren(...filtered.map(cardFor));
    elements.count.textContent = state.view === "public"
      ? `${filtered.length} ${filtered.length === 1 ? "contatto pubblico verificato" : "contatti pubblici verificati"}`
      : `${filtered.length} ${filtered.length === 1 ? "contatto nell’archivio locale" : "contatti nell’archivio locale"}`;
    elements.empty.hidden = filtered.length > 0;
    elements.emptyCopy.textContent = state.view === "public"
      ? "La directory è in costruzione e contiene solo recapiti verificati. Importa il tuo archivio privato o modifica i filtri."
      : "Importa il file contatti-locali.json oppure aggiungi un contatto privato.";
    document.querySelector("#public-count").textContent = String(state.publicContacts.length);
    document.querySelector("#private-count").textContent = String(state.privateContacts.length);
    document.querySelector("#verified-stat").textContent = String(state.publicContacts.length);
    document.querySelector("#local-stat").textContent = String(state.privateContacts.length);
    elements.title.textContent = state.view === "public" ? "Directory pubblica" : "Miei contatti";
    elements.privacyNotice.hidden = state.view === "private";
    elements.privateTools.hidden = state.view !== "private";
    document.querySelector("#contact-panel").setAttribute("aria-labelledby", state.view === "public" ? "tab-public" : "tab-private");
    elements.tabs.forEach((tab) => {
      const active = tab.dataset.view === state.view;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
  }

  function switchView(view) {
    state.view = view;
    elements.importStatus.textContent = "";
    elements.importStatus.classList.remove("has-error");
    render();
  }

  function mergeContacts(imported) {
    const existing = new Map(state.privateContacts.map((contact) => [contact.id, contact]));
    let rejected = 0;
    imported.forEach((raw) => {
      const contact = normalizeContact(raw);
      if (!contact || contact.publicListing) {
        rejected += 1;
        return;
      }
      const previous = existing.get(contact.id);
      existing.set(contact.id, previous ? { ...contact, ...previous } : contact);
    });
    state.privateContacts = [...existing.values()];
    saveStoredJson(PRIVATE_KEY, state.privateContacts);
    render();
    elements.importStatus.classList.remove("has-error");
    const accepted = imported.length - rejected;
    const acceptedLabel = `${accepted} ${accepted === 1 ? "contatto importato o aggiornato" : "contatti importati o aggiornati"}`;
    const rejectedLabel = rejected ? ` ${rejected} ${rejected === 1 ? "riga esclusa" : "righe escluse"} (fuori area o non valide).` : " Nessun dato è stato caricato sul server.";
    elements.importStatus.textContent = acceptedLabel + "." + rejectedLabel;
  }

  async function importFile(file) {
    if (!file) return;
    try {
      const content = (await file.text()).replace(/^\uFEFF/, "");
      const parsed = JSON.parse(content);
      const records = Array.isArray(parsed) ? parsed : parsed.contacts;
      if (!Array.isArray(records)) throw new Error("Il file deve contenere un elenco JSON di contatti.");
      mergeContacts(records);
    } catch (error) {
      console.error("Importazione contatti non riuscita.", error);
      showMessage(`Importazione non riuscita: ${error.message}`);
    } finally {
      elements.importFile.value = "";
    }
  }

  function exportPrivateContacts() {
    const data = JSON.stringify(state.privateContacts, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "contatti-privati-backup.json";
    link.click();
    URL.revokeObjectURL(url);
    elements.importStatus.classList.remove("has-error");
    elements.importStatus.textContent = "Backup privato scaricato sul dispositivo.";
  }

  function addPrivateContact(event) {
    event.preventDefault();
    const values = new FormData(elements.form);
    const contact = normalizeContact({
      company: values.get("company"),
      category: values.get("category"),
      region: values.get("region"),
      email: values.get("email"),
      phone: values.get("phone"),
      website: values.get("website"),
      sourceUrl: values.get("sourceUrl"),
      sourceLabel: values.get("sourceUrl") ? "Fonte inserita manualmente" : "Inserito manualmente · fonte da verificare",
      verifiedAt: "",
      publicListing: false,
      notes: values.get("notes"),
    });
    if (!contact) {
      showMessage("Il contatto non è valido: controlla azienda e area.");
      return;
    }
    state.privateContacts = [contact, ...state.privateContacts.filter((item) => item.id !== contact.id)];
    saveStoredJson(PRIVATE_KEY, state.privateContacts);
    elements.form.reset();
    elements.dialog.close();
    render();
    elements.importStatus.classList.remove("has-error");
    elements.importStatus.textContent = "Contatto salvato solo nell’archivio privato di questo browser.";
  }

  async function init() {
    document.querySelector("#year").textContent = String(new Date().getFullYear());
    state.privateContacts = readStoredJson(PRIVATE_KEY, []).map(normalizeContact).filter(Boolean);
    state.tracking = readStoredJson(TRACKING_KEY, {});
    try {
      if (!Array.isArray(window.PUBLIC_CONTACTS)) throw new Error("El catalogo pubblico non e disponibile.");
      state.publicContacts = window.PUBLIC_CONTACTS.map(normalizeContact).filter(Boolean);
    } catch (error) {
      console.error("Directory pubblica non disponibile.", error);
      state.loadError = "Impossibile caricare la directory pubblica.";
      showMessage(state.loadError);
    }

    elements.tabs.forEach((tab) => tab.addEventListener("click", () => switchView(tab.dataset.view)));
    elements.search.addEventListener("input", render);
    elements.region.addEventListener("change", render);
    elements.category.addEventListener("change", render);
    elements.importFile.addEventListener("change", () => importFile(elements.importFile.files[0]));
    document.querySelector("#export-button").addEventListener("click", exportPrivateContacts);
    document.querySelector("#add-button").addEventListener("click", () => elements.dialog.showModal());
    document.querySelector("#close-dialog").addEventListener("click", () => elements.dialog.close());
    document.querySelector("#cancel-dialog").addEventListener("click", () => elements.dialog.close());
    elements.form.addEventListener("submit", addPrivateContact);
    document.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        elements.search.focus();
      }
    });
    render();
  }

  init();
})();
