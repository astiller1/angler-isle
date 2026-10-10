# 🐟 Angler-Insel

Ein gemütliches 3D-Angelspiel im Browser: Als Katze Mika erkundest du eine kleine Karibikinsel auf einem
winzigen Wasserplaneten, fängst Fische, erfüllst die Wünsche der Nachbarn und rüstest deine Angel auf.

**▶ Spielen: https://astiller1.github.io/angler-isle/**

## Steuerung

| | Tastatur & Maus | Gamepad |
|---|---|---|
| Laufen | WASD (Shift = rennen) | Linker Stick (LT = rennen) |
| Kamera | Pfeiltasten / rechte Maustaste ziehen | Rechter Stick |
| Springen | Leertaste | A |
| Reden / Nehmen / Kaufen | E | X |
| Angeln: Auswerfen (halten), Anschlagen, Einholen (halten) | F / linke Maustaste | RT |
| Abbrechen | Q | B |

## So geht's
1. Nimm dir im Köderladen am Hafen die Bambusrute vom Regal.
2. Such blubberndes Wasser — dort sind die Angelplätze (Hafen-Pier, Felsküste, Mangroven, Brandungsstrand).
3. Beim Einholen auf die Schnurspannung achten: wird der Balken rot, kurz loslassen!
4. Verkauf Fische bei Pelle oder bring den Nachbarn ihre Wunschfische (das gibt viel mehr Münzen).
5. Bei Rocco im Laden gibt es bessere Angeln. Ein Tag auf der Insel dauert 24 Minuten.

Der Spielstand wird automatisch im Browser gespeichert (`?reset` an die URL hängen für ein neues Spiel).

## Entwicklung
```bash
npm install
npm run dev      # http://localhost:5173  (?debug für Tuning-Panel)
npm test
npm run art      # 3D-Modelle aus den Blender-Skripten neu exportieren (Blender 4.2+)
npm run deploy   # bauen und auf GitHub Pages veröffentlichen
```
Three.js + Vite + TypeScript. Alle 3D-Modelle sind Blender-Python-Skripte in `art/`. Details in `CLAUDE.md`.
