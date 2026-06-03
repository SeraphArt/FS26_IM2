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

// Color filter selection
document.querySelectorAll(".filter-color").forEach((el) => {
    el.addEventListener("click", () => {
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
    });
});

// Mana value (mv) filter selection
document.querySelectorAll(".filter-mv").forEach((el) => {
    el.addEventListener("click", () => {
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
    });
});

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

// Submit -> navigate to cardpage with selected filters
const submitButton = document.querySelector(".submit");

if (submitButton) {
    submitButton.addEventListener("click", () => {
        const colors = getSelectedColors();
        const mvs = getSelectedMvs();
        const types = getSelectedTypes();

        logAktion("Submit geklickt (Auswahl zusammenfassen)", {
            "Ausgewählte Farben": colors.length ? colors : "(keine)",
            "Ausgewählte MV": mvs.length ? mvs : "(keine)",
            "Ausgewählte Typen": types.length ? types : "(keine)",
        });

        const params = new URLSearchParams();
        if (colors.length) params.set("colors", colors.join(","));
        if (mvs.length) params.set("mvs", mvs.join(","));
        if (types.length) params.set("types", types.join(","));

        const url = params.toString() ? `cardpage.html?${params.toString()}` : "cardpage.html";

        logAktion("Navigation zur Cardpage", {
            "Ziel-URL": url,
            "Hinweis": "Die Cardpage lädt danach Karten von Scryfall.",
        });
        window.location.href = url;
    });
}