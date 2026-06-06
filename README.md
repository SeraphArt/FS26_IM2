# FS26_IM2

Arbeitsreflexion:

## Team

- Yasmin Maggi
- Dominik Rickli

## Kurzbeschreibung

Unsere Website dient dazu Magic spielern dabei zu helfen, gewisse Karten zu finden. Es kann nach Farben, Manakosten und Kartentyp gefiltert werden.

## Schwierigkeiten

Für uns war es schwierig abzuschätzen, was im Rahmen unseres Projektes realistisch umzusetzen ist und was nicht. Der Filtermechanismus schien uns recht komplex, da eine Magickarte nicht nur das "color" Attribut sondern auch das "color_identity" Attribut hat. Das macht die Filterung für die richtigen Karten schwierig. Desweiteren stellte es sich als schwierig heraus, die Lottie Amnimationen sinnvoll einzubinden, da wir zum Beispiel unsere Set-Navigation als Lottie Animation auf die Website geladen haben. Jedoch scheint der Code nicht feststellen zu können, in welchem State sich die Animation befindet sondern erkennt nur wie oft schon auf die Animation geklickt wurde. Deswegen haben war es uns auch vorerst nicht möglich, weitere Sets in die Suche mit einzubinden.

## Learnings

Die Set-Navigation sollte nicht mit Lottie Animation gemacht werden, sondern direkt mit CSS und Java Script. Lottieanimationen für clickbare Komponenten funktionnieren, sind aber nicht immer ganz zuverlässig und der eigene Code kann diese nur beschränkt manipullieren und auslesen.

## Known Bugs

Es kann vorkommen, das die Lottie Animation für die Farbauswahl mit der zusätzlichen Animation des codes (brauner Ring") desynced und es nicht mehr klar ist, ob die Farbe nun ausgewählt ist oder nicht. Dann muss auf den Ring geachtet werden, da dieser direkt in den Code eingebettet und somit präziser ist als die Animation des Lottie files.

## Ressourcen

- Github Co-Pilot
- Hilfe von mitstudierenden (Kalid Ahbri)
-

## Zusätzliches
