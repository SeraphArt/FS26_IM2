console.log("blub");

console.log("script läuft");







// Elemente holen
const toggleButton = document.getElementById("toggleButton");
const dropdown = document.getElementById("dropdown");
const arrow = document.getElementById("arrow");

// Dropdown öffnen/schließen
toggleButton.addEventListener("click", () => {

    dropdown.classList.toggle("open");

    arrow.classList.toggle("down");
    arrow.classList.toggle("up");
});


// Weiße Punkte klickbar machen
const radios = document.querySelectorAll(".radio");

radios.forEach(radio => {

    radio.addEventListener("click", (e) => {

        e.stopPropagation();

        radio.classList.toggle("active");
    });
});