const FIXED_SET_CODE = "tla";

function logAction(message, details) {
    if (details === undefined) {
        console.log(`[Card Page] ${message}`);
        return;
    }

    console.log(`[Card Page] ${message}`, details);
}

function parseCsv(params, key) {
    const rawValue = params.get(key);
    if (!rawValue) return [];

    return rawValue
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
}

function parseColorMode(params) {
    return (params.get("colorMode") || "include").toLowerCase() === "exact" ? "exact" : "include";
}

function buildScryfallQuery({ colors, mvs, types }) {
    const queryParts = [`set:${FIXED_SET_CODE}`];

    if (colors.length) {
        const colorParts = colors.map((color) => {
            const normalized = color.toUpperCase();
            return normalized === "C" ? "c:c" : `id>=${normalized.toLowerCase()}`;
        });
        queryParts.push(`(${colorParts.join(" OR ")})`);
    }

    if (mvs.length) {
        const manaValueParts = mvs.map((mv) => (mv === "6plus" ? "mv>=6" : `mv=${mv}`));
        queryParts.push(`(${manaValueParts.join(" OR ")})`);
    }

    if (types.length) {
        const typeParts = types.map((type) => `t:${type}`);
        queryParts.push(`(${typeParts.join(" OR ")})`);
    }

    return queryParts.join(" ");
}

function getCardColors(card) {
    return Array.isArray(card?.color_identity) ? card.color_identity : [];
}

function cardMatchesSelectedColors(card, selectedColors, colorMode) {
    if (!selectedColors.length) return true;

    const normalizedSelected = selectedColors.map((color) => color.toUpperCase());
    const selectedColoredSet = new Set(normalizedSelected.filter((color) => color !== "C"));
    const cardColors = getCardColors(card);
    const isColorlessCard = cardColors.length === 0;

    const hasAnySelectedColor = normalizedSelected.some((color) => {
        if (color === "C") return isColorlessCard;
        return cardColors.includes(color);
    });

    if (colorMode !== "exact") {
        return hasAnySelectedColor;
    }

    if (normalizedSelected.includes("C")) {
        // Exact + only colorless selected means card must be colorless.
        if (selectedColoredSet.size === 0) {
            return isColorlessCard;
        }
        return false;
    }

    const usesOnlySelectedColors = cardColors.every((color) => selectedColoredSet.has(color));
    const includesAllSelectedColors = Array.from(selectedColoredSet).every((color) => cardColors.includes(color));

    return usesOnlySelectedColors && includesAllSelectedColors;
}

function getCardImageUrl(card) {
    if (card.image_uris?.normal) return card.image_uris.normal;
    if (card.image_uris?.small) return card.image_uris.small;

    const firstFace = card.card_faces?.[0];
    if (firstFace?.image_uris?.normal) return firstFace.image_uris.normal;
    if (firstFace?.image_uris?.small) return firstFace.image_uris.small;

    return null;
}

async function fetchAllCards(query) {
    logAction("Start Scryfall fetch", query);

    let nextUrl = `https://api.scryfall.com/cards/search?include_extras=true&include_variations=true&unique=prints&q=${encodeURIComponent(query)}`;
    const allCards = [];

    while (nextUrl) {
        const response = await fetch(nextUrl);
        if (!response.ok) {
            throw new Error(`Scryfall request failed (${response.status})`);
        }

        const data = await response.json();
        if (Array.isArray(data.data)) {
            allCards.push(...data.data);
        }

        nextUrl = data.has_more && data.next_page ? data.next_page : null;
    }

    logAction("Finished Scryfall fetch", { totalCards: allCards.length });

    return allCards;
}

function createCardElement(card, imageUrl) {
    const cardLink = document.createElement("a");
    cardLink.href = card.scryfall_uri;
    cardLink.target = "_blank";
    cardLink.rel = "noopener";
    cardLink.className = "card";

    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = card.name || "Card";
    image.loading = "lazy";

    const name = document.createElement("div");
    name.className = "card_name";
    name.textContent = card.name || "";

    cardLink.appendChild(image);
    cardLink.appendChild(name);

    return cardLink;
}

function renderCards(cards) {
    const results = document.getElementById("results");
    const status = document.getElementById("resultsStatus");
    if (!results || !status) return;

    results.innerHTML = "";

    if (!cards.length) {
        status.textContent = "No cards were found with your selection.";
        logAction("No cards found for current filters");
        return;
    }

    status.textContent = `${cards.length} card(s) found.`;
    logAction("Rendered cards", { count: cards.length });

    cards.forEach((card) => {
        const imageUrl = getCardImageUrl(card);
        if (!imageUrl) return;

        results.appendChild(createCardElement(card, imageUrl));
    });
}

async function main() {
    const status = document.getElementById("resultsStatus");
    const cardPageRoot = document.querySelector(".parent.cardpage");

    cardPageRoot?.classList.add("is-loading");
    if (status) {
        status.textContent = "Loading all matching cards...";
    }
    logAction("Loading started");

    const params = new URLSearchParams(window.location.search);
    const selectedColors = parseCsv(params, "colors");
    const selectedMvs = parseCsv(params, "mvs");
    const selectedTypes = parseCsv(params, "types");
    const colorMode = parseColorMode(params);
    const query = buildScryfallQuery({ colors: selectedColors, mvs: selectedMvs, types: selectedTypes });

    logAction("Filters from URL", {
        colors: selectedColors,
        manaValues: selectedMvs,
        types: selectedTypes,
        colorMode,
    });
    logAction("Built Scryfall query", query);

    try {
        const allMatchingCards = await fetchAllCards(query);
        const finalCards =
            selectedColors.length > 0
                ? allMatchingCards.filter((card) => cardMatchesSelectedColors(card, selectedColors, colorMode))
                : allMatchingCards;

        if (selectedColors.length > 0) {
            logAction("Applied exact color filter in browser", {
                before: allMatchingCards.length,
                after: finalCards.length,
            });
        }

        renderCards(finalCards);
    } catch (error) {
        console.error(error);
        logAction("Loading failed", error.message || String(error));
        if (status) {
            status.textContent = "Failed to load cards. Please try again.";
        }
    } finally {
        cardPageRoot?.classList.remove("is-loading");
        logAction("Loading finished");
    }
}

main();
