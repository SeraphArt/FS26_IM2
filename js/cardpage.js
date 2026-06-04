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

    while (url) {
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Scryfall request failed (${res.status})`);
        }

        const json = await res.json();
        if (Array.isArray(json.data)) {
            allCards.push(...json.data);
        }

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
        return;
    }

    status.textContent = `${cards.length} card(s) found.`;

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

    const query = buildScryfallQuery({ colors, mvs, types, colorMode });

    if (status) {
        status.textContent = "Loading all matching cards...";
    }

    try {
        const cards = await fetchScryfallCards(query);
        const shouldApplyColorPostFilter = colors.length > 0;

        const cardsAfterColorCheck = shouldApplyColorPostFilter
            ? cards.filter((card) => matchesSelectedColors(card, colors, colorMode))
            : cards;

        renderCards(cardsAfterColorCheck);
    } catch (err) {
        console.error(err);
        if (status) {
            status.textContent = "Failed to load cards. Please try again.";
        }
    }
}

main();
