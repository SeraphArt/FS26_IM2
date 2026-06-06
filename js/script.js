const ALL_COLORS = ["C", "W", "U", "B", "R", "G"];
const ALL_MANA_VALUES = ["0", "1", "2", "3", "4", "5", "6plus"];
const ALL_TYPES = ["land", "creature", "artifact", "enchantment", "instant", "sorcery"];

function logAction(message, details) {
    if (details === undefined) {
        console.log(`[Home] ${message}`);
        return;
    }

    console.log(`[Home] ${message}`, details);
}

function setupTypeDropdown() {
    const toggleButton = document.getElementById("toggleButton");
    const dropdown = document.getElementById("dropdown");
    const arrow = document.getElementById("arrow");

    if (!toggleButton || !dropdown || !arrow) return;

    toggleButton.addEventListener("click", () => {
        dropdown.classList.toggle("open");
        arrow.classList.toggle("down");
        arrow.classList.toggle("up");

        logAction(`Type dropdown ${dropdown.classList.contains("open") ? "opened" : "closed"}`);
    });
}

function setupTypePoints() {
    const points = document.querySelectorAll(".menu_point");

    points.forEach((point) => {
        point.addEventListener("click", (event) => {
            event.stopPropagation();
            point.classList.toggle("active");

            const typeName = point.closest(".menu-item")?.dataset.type || "unknown";
            logAction(`Type filter ${point.classList.contains("active") ? "selected" : "deselected"}`, typeName);
        });
    });
}

function findClickedFilter(event, selector) {
    if (typeof event.composedPath === "function") {
        const fromPath = event.composedPath().find((node) => node?.matches?.(selector));
        if (fromPath) return fromPath;
    }

    return event.target?.closest?.(selector) || null;
}

function setupFilterClicks() {
    // Capture phase is needed so clicks inside the Lottie web component are detected reliably.
    document.addEventListener(
        "click",
        (event) => {
            const colorFilter = findClickedFilter(event, ".filter-color");
            if (colorFilter) {
                colorFilter.classList.toggle("selected");
                const colorCode = colorFilter.dataset.color || "unknown";
                logAction(`Color filter ${colorFilter.classList.contains("selected") ? "selected" : "deselected"}`, colorCode);
                return;
            }

            const manaFilter = findClickedFilter(event, ".filter-mv");
            if (manaFilter) {
                manaFilter.classList.toggle("selected");
                const manaValue = manaFilter.dataset.mv || "unknown";
                logAction(`Mana value filter ${manaFilter.classList.contains("selected") ? "selected" : "deselected"}`, manaValue);
            }
        },
        true
    );
}

function getSelectedData(selector, dataKey) {
    return Array.from(document.querySelectorAll(selector))
        .map((element) => (element.dataset[dataKey] || "").trim())
        .filter(Boolean);
}

function getSelectedTypes() {
    return Array.from(document.querySelectorAll(".menu_point.active"))
        .map((point) => (point.closest(".menu-item")?.dataset.type || "").trim())
        .filter(Boolean);
}

function readColorModeFromUrl() {
    const mode = new URLSearchParams(window.location.search).get("colorMode");
    return mode === "exact" ? "exact" : "include";
}

function setupColorMatchToggle() {
    const toggle = document.getElementById("colorMatchToggle");
    const includeLabel = document.getElementById("colorMatchIncludeLabel");
    const exactLabel = document.getElementById("colorMatchExactLabel");

    if (!toggle) return;

    function setColorMode(mode) {
        const safeMode = mode === "exact" ? "exact" : "include";
        const isInclude = safeMode === "include";

        toggle.dataset.mode = safeMode;
        toggle.setAttribute("aria-pressed", isInclude ? "true" : "false");
        includeLabel?.classList.toggle("active", isInclude);
        exactLabel?.classList.toggle("active", !isInclude);
    }

    setColorMode(readColorModeFromUrl());

    toggle.addEventListener("click", () => {
        const currentMode = toggle.dataset.mode === "exact" ? "exact" : "include";
        const nextMode = currentMode === "exact" ? "include" : "exact";
        setColorMode(nextMode);
        logAction("Color match mode changed", nextMode);
    });
}

function isFullySelected(values, fullList, normalizer = (value) => value) {
    const uniqueValues = new Set(values.map(normalizer));
    const normalizedFullList = fullList.map(normalizer);

    return (
        uniqueValues.size === normalizedFullList.length &&
        normalizedFullList.every((fullValue) => uniqueValues.has(fullValue))
    );
}

function normalizeSelections({ colors, mvs, types }) {
    return {
        colors: isFullySelected(colors, ALL_COLORS, (color) => color.toUpperCase()) ? [] : colors,
        mvs: isFullySelected(mvs, ALL_MANA_VALUES) ? [] : mvs,
        types: isFullySelected(types, ALL_TYPES, (type) => type.toLowerCase()) ? [] : types,
    };
}

function setupSubmitButton() {
    const submitButton = document.querySelector(".submit");
    const colorModeToggle = document.getElementById("colorMatchToggle");

    if (!submitButton) return;

    submitButton.addEventListener("click", () => {
        const selected = normalizeSelections({
            colors: getSelectedData(".filter-color.selected", "color"),
            mvs: getSelectedData(".filter-mv.selected", "mv"),
            types: getSelectedTypes(),
        });

        const colorMode = colorModeToggle?.dataset.mode === "exact" ? "exact" : "include";
        const params = new URLSearchParams();

        if (selected.colors.length) params.set("colors", selected.colors.join(","));
        if (selected.mvs.length) params.set("mvs", selected.mvs.join(","));
        if (selected.types.length) params.set("types", selected.types.join(","));
        params.set("colorMode", colorMode);

        logAction("Submit filters", {
            colors: selected.colors,
            manaValues: selected.mvs,
            types: selected.types,
            colorMode,
        });

        const queryString = params.toString();
        window.location.href = queryString ? `cardpage.html?${queryString}` : "cardpage.html";
    });
}

setupTypeDropdown();
setupTypePoints();
setupFilterClicks();
setupColorMatchToggle();
setupSubmitButton();
logAction("Page ready");