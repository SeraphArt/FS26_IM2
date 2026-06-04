console.log("blub");

console.log("script läuft");

function zeitstempel() {
    return new Date().toLocaleTimeString("de-CH", { hour12: false });
}

function elementKurzInfo(el) {
    if (!el) return "(kein Element)";

    const tag = (el.tagName || "").toLowerCase();
    const id = el.id ? `#${el.id}` : "";
    const classes = el.classList && el.classList.length ? `.${Array.from(el.classList).slice(0, 4).join(".")}` : "";
    const dataAttrs = el.dataset && Object.keys(el.dataset).length
        ? ` data=${JSON.stringify(el.dataset)}`
        : "";

    return `${tag}${id}${classes}${dataAttrs}`.trim();
}

function logAktion(titel, details = {}) {
    console.groupCollapsed(`[${zeitstempel()}] ${titel}`);
    Object.entries(details).forEach(([k, v]) => console.log(`${k}:`, v));
    console.groupEnd();
}

// Global: wirklich jeden Klick loggen (zum Nachvollziehen)
document.addEventListener(
    "click",
    (e) => {
        const target = e.target;
        logAktion("Klick erkannt", {
            "Geklicktes Element": elementKurzInfo(target),
            "Nächster Button/Link": elementKurzInfo(target?.closest?.("button, a")),
            "Position (Viewport)": { x: e.clientX, y: e.clientY },
        });
    },
    true
);

let suppressFilterToggle = false;


// Elemente holen
const toggleButton = document.getElementById("toggleButton");
const dropdown = document.getElementById("dropdown");
const arrow = document.getElementById("arrow");

// Dropdown öffnen/schließen
if (toggleButton && dropdown && arrow) {
    toggleButton.addEventListener("click", () => {

        const warOffen = dropdown.classList.contains("open");

        dropdown.classList.toggle("open");

        arrow.classList.toggle("down");
        arrow.classList.toggle("up");

        const istOffen = dropdown.classList.contains("open");
        logAktion("Dropdown geklickt", {
            "Vorher offen?": warOffen,
            "Jetzt offen?": istOffen,
            "Hinweis": "Wenn offen, werden die Typen angezeigt.",
        });
    });
}


// Weiße Punkte klickbar machen (Card types)
const menu_points = document.querySelectorAll(".menu_point");

menu_points.forEach(menu_point => {

    menu_point.addEventListener("click", (e) => {

        e.stopPropagation();

        const menuItem = menu_point.closest(".menu-item");
        const typ = (menuItem?.dataset?.type || menuItem?.textContent || "").trim();
        const warAktiv = menu_point.classList.contains("active");
        menu_point.classList.toggle("active");
        const istAktiv = menu_point.classList.contains("active");

        logAktion("Kartentyp ausgewählt", {
            "Typ": typ,
            "Vorher aktiv?": warAktiv,
            "Jetzt aktiv?": istAktiv,
            "Hinweis": "Mehrere Typen sind möglich.",
        });
    });
});

function findFilterTargetFromEvent(event, selector, container) {
    if (typeof event.composedPath === "function") {
        const hit = event
            .composedPath()
            .find((node) => node?.matches?.(selector));
        if (hit && (!container || container.contains(hit))) {
            return hit;
        }
    }

    const direct = event.target?.closest?.(selector);
    if (direct && (!container || container.contains(direct))) {
        return direct;
    }

    return null;
}

// Color filter selection (capture-phase to support dotlottie shadow DOM internals)
document.addEventListener("click", (event) => {
    if (suppressFilterToggle) return;

    const el = findFilterTargetFromEvent(event, ".filter-color", document);
    if (!el) return;

    const farbe = (el.dataset.color || "?").trim();
    const warSelected = el.classList.contains("selected");
    el.classList.toggle("selected");
    const istSelected = el.classList.contains("selected");
    logAktion("Farbe geklickt", {
        "Farb-Code": farbe,
        "Vorher ausgewählt?": warSelected,
        "Jetzt ausgewählt?": istSelected,
        "Erklärung": "Ausgewählte Farben werden später zur Suche verwendet.",
    });
}, true);

// Mana value (mv) filter selection (capture-phase for dotlottie compatibility)
document.addEventListener("click", (event) => {
    if (suppressFilterToggle) return;

    const el = findFilterTargetFromEvent(event, ".filter-mv", document);
    if (!el) return;

    const mv = (el.dataset.mv || "?").trim();
    const warSelected = el.classList.contains("selected");
    el.classList.toggle("selected");
    const istSelected = el.classList.contains("selected");
    logAktion("Manakosten geklickt", {
        "Mana Value (MV)": mv,
        "Vorher ausgewählt?": warSelected,
        "Jetzt ausgewählt?": istSelected,
        "Erklärung": "MV ist die umgewandelte Manakosten-Zahl (z.B. 3).",
    });
}, true);

function getSelectedColors() {
    return Array.from(document.querySelectorAll(".filter-color.selected"))
        .map(el => (el.dataset.color || "").trim())
        .filter(Boolean);
}

function getSelectedMvs() {
    return Array.from(document.querySelectorAll(".filter-mv.selected"))
        .map(el => (el.dataset.mv || "").trim())
        .filter(Boolean);
}

function getSelectedTypes() {
    return Array.from(document.querySelectorAll(".menu_point.active"))
        .map(point => {
            const menuItem = point.closest(".menu-item");
            return (menuItem?.dataset.type || "").trim();
        })
        .filter(Boolean);
}

function getColorMatchModeFromUrl() {
    const mode = (new URLSearchParams(window.location.search).get("colorMode") || "").toLowerCase();
    return mode === "exact" ? "exact" : "include";
}

function setupColorMatchToggle() {
    const toggle = document.getElementById("colorMatchToggle");
    const includeLabel = document.getElementById("colorMatchIncludeLabel");
    const exactLabel = document.getElementById("colorMatchExactLabel");
    if (!toggle) return;

    const applyMode = (mode) => {
        const safeMode = mode === "exact" ? "exact" : "include";
        toggle.dataset.mode = safeMode;
        toggle.setAttribute("aria-pressed", safeMode === "include" ? "true" : "false");
        includeLabel?.classList.toggle("active", safeMode === "include");
        exactLabel?.classList.toggle("active", safeMode === "exact");
    };

    applyMode(getColorMatchModeFromUrl());

    toggle.addEventListener("click", () => {
        const current = toggle.dataset.mode === "exact" ? "exact" : "include";
        const next = current === "include" ? "exact" : "include";
        applyMode(next);
        logAktion("Color-Match Modus gewechselt", {
            "Neuer Modus": next,
            "Erklärung": "Include zeigt Karten mit der Farbe an; Exact zeigt nur Karten ohne zusätzliche Farben außerhalb der Auswahl.",
        });
    });
}


function normalizeSelectionsForFullSet({ colors, mvs, types }) {
    const allColorCodes = new Set(["C", "W", "U", "B", "R", "G"]);
    const allMvCodes = new Set(["0", "1", "2", "3", "4", "5", "6plus"]);
    const allTypeCodes = new Set(["land", "creature", "artifact", "enchantment", "instant", "sorcery"]);

    const uniqueColors = Array.from(new Set(colors.map((c) => c.toUpperCase())));
    const uniqueMvs = Array.from(new Set(mvs));
    const uniqueTypes = Array.from(new Set(types.map((t) => t.toLowerCase())));

    const colorsAreFullySelected = uniqueColors.length === allColorCodes.size
        && uniqueColors.every((c) => allColorCodes.has(c));
    const mvsAreFullySelected = uniqueMvs.length === allMvCodes.size
        && uniqueMvs.every((mv) => allMvCodes.has(mv));
    const typesAreFullySelected = uniqueTypes.length === allTypeCodes.size
        && uniqueTypes.every((t) => allTypeCodes.has(t));

    return {
        colors: colorsAreFullySelected ? [] : colors,
        mvs: mvsAreFullySelected ? [] : mvs,
        types: typesAreFullySelected ? [] : types,
        colorsAreFullySelected,
        mvsAreFullySelected,
        typesAreFullySelected,
    };
}

setupColorMatchToggle();

// Submit -> navigate to cardpage with selected filters
const submitButton = document.querySelector(".submit");

if (submitButton) {
    submitButton.addEventListener("click", () => {
        const rawColors = getSelectedColors();
        const rawMvs = getSelectedMvs();
        const rawTypes = getSelectedTypes();

        const normalized = normalizeSelectionsForFullSet({
            colors: rawColors,
            mvs: rawMvs,
            types: rawTypes,
        });

        const colors = normalized.colors;
        const mvs = normalized.mvs;
        const types = normalized.types;
        const colorMatchMode = (document.getElementById("colorMatchToggle")?.dataset.mode || "include").toLowerCase() === "exact"
            ? "exact"
            : "include";

        logAktion("Submit geklickt (Auswahl zusammenfassen)", {
            "Ausgewählte Farben (raw)": rawColors.length ? rawColors : "(keine)",
            "Ausgewählte MV (raw)": rawMvs.length ? rawMvs : "(keine)",
            "Ausgewählte Typen (raw)": rawTypes.length ? rawTypes : "(keine)",
            "Farben vollständig ausgewählt?": normalized.colorsAreFullySelected,
            "MV vollständig ausgewählt?": normalized.mvsAreFullySelected,
            "Typen vollständig ausgewählt?": normalized.typesAreFullySelected,
            "Farben (für Query)": colors.length ? colors : "(kein Filter)",
            "MV (für Query)": mvs.length ? mvs : "(kein Filter)",
            "Typen (für Query)": types.length ? types : "(kein Filter)",
            "Color-Match": colorMatchMode,
        });

        const params = new URLSearchParams();
        if (colors.length) params.set("colors", colors.join(","));
        if (mvs.length) params.set("mvs", mvs.join(","));
        if (types.length) params.set("types", types.join(","));
        params.set("colorMode", colorMatchMode);

        const url = params.toString() ? `cardpage.html?${params.toString()}` : "cardpage.html";

        logAktion("Navigation zur Cardpage", {
            "Ziel-URL": url,
            "Hinweis": "Die Cardpage lädt danach Karten von Scryfall.",
        });
        window.location.href = url;
    });
}