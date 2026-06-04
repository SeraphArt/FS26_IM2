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

// Global: jeden Klick loggen
document.addEventListener(
    "click",
    (e) => {
        const target = e.target;
        logAktion("Klick erkannt (Cardpage)", {
            "Geklicktes Element": elementKurzInfo(target),
            "Nächster Button/Link": elementKurzInfo(target?.closest?.("button, a")),
            "Position (Viewport)": { x: e.clientX, y: e.clientY },
        });
    },
    true
);

function parseCsvParam(params, name) {
    const raw = params.get(name);
    if (!raw) return [];
    return raw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
}


function buildScryfallQuery({ colors, mvs, types, colorMode }) {
    const parts = ["set:tla"]; // fixed set

    if (colors.length) {
        const mode = colorMode === "exact" ? "exact" : "include";
        const clauses = colors.map((c) => {
            const color = c.toUpperCase();
            if (color === "C") {
                return "c:c";
            }
            return mode === "exact"
                ? `id:${color.toLowerCase()}`
                : `id>=${color.toLowerCase()}`;
        });
        parts.push(`(${clauses.join(" OR ")})`);
    }

    if (mvs.length) {
        const clauses = mvs.map((mv) => {
            if (mv === "6plus") return "mv>=6";
            return `mv=${mv}`;
        });
        parts.push(`(${clauses.join(" OR ")})`);
    }

    if (types.length) {
        const clauses = types.map((t) => `t:${t}`);
        parts.push(`(${clauses.join(" OR ")})`);
    }

    return parts.join(" ");
}

function getCardColors(card) {
    if (Array.isArray(card?.colors)) {
        return card.colors;
    }

    if (Array.isArray(card?.card_faces)) {
        const combined = new Set();
        for (const face of card.card_faces) {
            if (!Array.isArray(face?.colors)) continue;
            for (const color of face.colors) {
                combined.add(color);
            }
        }
        return Array.from(combined);
    }

    return [];
}

function getCardColorIdentity(card) {
    if (Array.isArray(card?.color_identity)) {
        return card.color_identity;
    }
    return [];
}

function matchesSelectedColors(card, selectedColors, colorMode) {
    if (!selectedColors.length) return true;

    const normalizedSelections = selectedColors.map((c) => c.toUpperCase());
    const selectedSet = new Set(normalizedSelections.filter((c) => c !== "C"));
    const cardColors = getCardColors(card);
    const isColorless = cardColors.length === 0;
    const cardColorIdentity = getCardColorIdentity(card);
    const hasColorlessIdentity = cardColorIdentity.length === 0;

    const mode = colorMode === "exact" ? "exact" : "include";

    const includesOneSelected = normalizedSelections.some((selectedColor) => {
        if (selectedColor === "C") {
            return isColorless && hasColorlessIdentity;
        }
        return cardColors.includes(selectedColor) || cardColorIdentity.includes(selectedColor);
    });

    if (mode !== "exact") {
        return includesOneSelected;
    }

    if (normalizedSelections.includes("C")) {
        // exact + colorless means strictly colorless
        if (selectedSet.size === 0) {
            return isColorless && hasColorlessIdentity;
        }
        return false;
    }

    const colorsSubset = cardColors.every((color) => selectedSet.has(color));
    const identitySubset = cardColorIdentity.every((color) => selectedSet.has(color));

    return includesOneSelected && colorsSubset && identitySubset;
}

function getCardImageUrl(card) {
    if (card.image_uris?.normal) return card.image_uris.normal;
    if (card.image_uris?.small) return card.image_uris.small;

    const face = card.card_faces?.[0];
    if (face?.image_uris?.normal) return face.image_uris.normal;
    if (face?.image_uris?.small) return face.image_uris.small;

    return null;
}

async function fetchScryfallCards(query) {
    let url = `https://api.scryfall.com/cards/search?include_extras=true&include_variations=true&unique=prints&q=${encodeURIComponent(query)}`;
    const allCards = [];

    logAktion("Scryfall Anfrage vorbereiten", {
        "Query (Suchtext)": query,
        "Erste URL": url,
        "Max. Karten": "alle Treffer",
        "Erklärung": "Scryfall liefert evtl. mehrere Seiten (Pagination). Extras und Varianten sind mit dabei.",
    });

    while (url) {
        logAktion("Scryfall Seite laden", {
            "URL": url,
            "Bisher geladen": allCards.length,
        });

        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Scryfall request failed (${res.status})`);
        }

        const json = await res.json();
        if (Array.isArray(json.data)) {
            allCards.push(...json.data);
        }

        logAktion("Scryfall Antwort erhalten", {
            "Karten in dieser Seite": Array.isArray(json.data) ? json.data.length : 0,
            "Total bisher": allCards.length,
            "Hat mehr Seiten?": Boolean(json.has_more),
        });

        if (json.has_more && json.next_page) {
            url = json.next_page;
        } else {
            url = null;
        }
    }

    return allCards;
}

function renderCards(cards) {
    const results = document.getElementById("results");
    const status = document.getElementById("resultsStatus");

    if (!results || !status) return;

    results.innerHTML = "";

    if (!cards.length) {
        status.textContent = "No cards found for your selection.";
        logAktion("Render: keine Karten", {
            "Hinweis": "Die Filter-Kombination hat keine Treffer ergeben.",
        });
        return;
    }

    status.textContent = `${cards.length} card(s) found.`;

    logAktion("Render: Karten anzeigen", {
        "Anzahl Karten": cards.length,
        "Hinweis": "Bilder werden nachgeladen (lazy loading).",
    });

    for (const card of cards) {
        const imageUrl = getCardImageUrl(card);
        if (!imageUrl) continue;

        const a = document.createElement("a");
        a.href = card.scryfall_uri;
        a.target = "_blank";
        a.rel = "noopener";
        a.className = "card";

        const img = document.createElement("img");
        img.src = imageUrl;
        img.alt = card.name || "Card";
        img.loading = "lazy";

        const name = document.createElement("div");
        name.className = "card_name";
        name.textContent = card.name || "";

        a.appendChild(img);
        a.appendChild(name);
        results.appendChild(a);
    }
}

async function main() {
    const status = document.getElementById("resultsStatus");

    const params = new URLSearchParams(window.location.search);
    const colors = parseCsvParam(params, "colors");
    const mvs = parseCsvParam(params, "mvs");
    const types = parseCsvParam(params, "types");
    const colorMode = (params.get("colorMode") || "include").toLowerCase() === "exact" ? "exact" : "include";

    logAktion("Filter aus URL gelesen", {
        "colors": colors.length ? colors : "(keine)",
        "mvs": mvs.length ? mvs : "(keine)",
        "types": types.length ? types : "(keine)",
        "colorMode": colorMode,
        "Erklärung": "Diese Werte kamen von der Startseite (Submit).",
    });

    const query = buildScryfallQuery({ colors, mvs, types, colorMode });

    logAktion("Scryfall Query gebaut", {
        "Query": query,
        "Erklärung": "Damit sucht Scryfall nach passenden Karten.",
    });

    if (status) {
        status.textContent = "Loading all matching cards...";
    }

    try {
        const cards = await fetchScryfallCards(query);
        const shouldApplyColorPostFilter = colors.length > 0;

        const cardsAfterColorCheck = shouldApplyColorPostFilter
            ? cards.filter((card) => matchesSelectedColors(card, colors, colorMode))
            : cards;

        logAktion("Farbfilter nach API-Farbfeld angewendet", {
            "Vorher (Anzahl Karten)": cards.length,
            "Nachher (Anzahl Karten)": cardsAfterColorCheck.length,
            "Erklärung": shouldApplyColorPostFilter
                ? "Farbprüfung nutzt immer colors + color_identity (inkl. multicolor identities und strict colorless für C)."
                : "Kein Farbfilter ausgewählt.",
        });

        renderCards(cardsAfterColorCheck);

        // Extra: Klicks auf Karten (Links) nachvollziehbar machen
        const results = document.getElementById("results");
        if (results && !results.dataset.clickLoggerAttached) {
            results.dataset.clickLoggerAttached = "true";
            results.addEventListener("click", (e) => {
                const cardLink = e.target.closest("a.card");
                if (!cardLink) return;
                logAktion("Karte angeklickt", {
                    "Name": cardLink.querySelector(".card_name")?.textContent || "(unbekannt)",
                    "Link": cardLink.href,
                    "Hinweis": "Öffnet Scryfall in neuem Tab.",
                });
            });
        }
    } catch (err) {
        console.error(err);
        if (status) {
            status.textContent = "Failed to load cards. Please try again.";
        }

        logAktion("Fehler beim Laden", {
            "Fehler": String(err?.message || err),
            "Tipp": "Falls du CORS/Netzwerkfehler siehst: Seite über einen lokalen Server öffnen (z.B. Live Server).",
        });
    }
}

main();
