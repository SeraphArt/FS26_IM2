const toggleButton = document.getElementById("toggleButton");
const dropdown = document.getElementById("dropdown");
const arrow = document.getElementById("arrow");

if (toggleButton && dropdown && arrow) {
    toggleButton.addEventListener("click", () => {
        dropdown.classList.toggle("open");
        arrow.classList.toggle("down");
        arrow.classList.toggle("up");
    });
}

document.querySelectorAll(".menu_point").forEach((point) => {
    point.addEventListener("click", (event) => {
        event.stopPropagation();
        point.classList.toggle("active");
    });
});

function findFilterTarget(event, selector, container = document) {
    if (typeof event.composedPath === "function") {
        const hit = event.composedPath().find((node) => node?.matches?.(selector));
        if (hit && container.contains(hit)) return hit;
    }

    const direct = event.target?.closest?.(selector);
    if (direct && container.contains(direct)) return direct;

    return null;
}

document.addEventListener(
    "click",
    (event) => {
        const colorEl = findFilterTarget(event, ".filter-color");
        if (colorEl) {
            colorEl.classList.toggle("selected");
            return;
        }

        const mvEl = findFilterTarget(event, ".filter-mv");
        if (mvEl) {
            mvEl.classList.toggle("selected");
        }
    },
    true
);

function getSelectedColors() {
    return Array.from(document.querySelectorAll(".filter-color.selected"))
        .map((el) => (el.dataset.color || "").trim())
        .filter(Boolean);
}

function getSelectedMvs() {
    return Array.from(document.querySelectorAll(".filter-mv.selected"))
        .map((el) => (el.dataset.mv || "").trim())
        .filter(Boolean);
}

function getSelectedTypes() {
    return Array.from(document.querySelectorAll(".menu_point.active"))
        .map((point) => (point.closest(".menu-item")?.dataset.type || "").trim())
        .filter(Boolean);
}

function getColorMatchModeFromUrl() {
    const mode = new URLSearchParams(window.location.search).get("colorMode");
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
        const next = toggle.dataset.mode === "exact" ? "include" : "exact";
        applyMode(next);
    });
}

function normalizeSelectionsForFullSet({ colors, mvs, types }) {
    const allColorCodes = new Set(["C", "W", "U", "B", "R", "G"]);
    const allMvCodes = new Set(["0", "1", "2", "3", "4", "5", "6plus"]);
    const allTypeCodes = new Set(["land", "creature", "artifact", "enchantment", "instant", "sorcery"]);

    const uniqueColors = Array.from(new Set(colors.map((c) => c.toUpperCase())));
    const uniqueMvs = Array.from(new Set(mvs));
    const uniqueTypes = Array.from(new Set(types.map((t) => t.toLowerCase())));

    return {
        colors:
            uniqueColors.length === allColorCodes.size && uniqueColors.every((c) => allColorCodes.has(c))
                ? []
                : colors,
        mvs:
            uniqueMvs.length === allMvCodes.size && uniqueMvs.every((mv) => allMvCodes.has(mv))
                ? []
                : mvs,
        types:
            uniqueTypes.length === allTypeCodes.size && uniqueTypes.every((t) => allTypeCodes.has(t))
                ? []
                : types,
    };
}

setupColorMatchToggle();

const submitButton = document.querySelector(".submit");
if (submitButton) {
    submitButton.addEventListener("click", () => {
        const normalized = normalizeSelectionsForFullSet({
            colors: getSelectedColors(),
            mvs: getSelectedMvs(),
            types: getSelectedTypes(),
        });

        const colorMatchMode =
            (document.getElementById("colorMatchToggle")?.dataset.mode || "include") === "exact"
                ? "exact"
                : "include";

        const params = new URLSearchParams();
        if (normalized.colors.length) params.set("colors", normalized.colors.join(","));
        if (normalized.mvs.length) params.set("mvs", normalized.mvs.join(","));
        if (normalized.types.length) params.set("types", normalized.types.join(","));
        params.set("colorMode", colorMatchMode);

        const suffix = params.toString();
        window.location.href = suffix ? `cardpage.html?${suffix}` : "cardpage.html";
    });
}