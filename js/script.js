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
const menu_points = document.querySelectorAll(".menu_point");

menu_points.forEach(menu_point => {

    menu_point.addEventListener("click", (e) => {

        e.stopPropagation();

        menu_point.classList.toggle("active");
    });
});