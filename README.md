# Retourklaar

**Label naar A4**: print retourlabels op ware grootte, met zo veel mogelijk labels op één A4.

Webshops sturen verzendlabels vaak in een klein formaat (bijvoorbeeld 10 × 15 cm). Print je zo'n PDF gewoon uit, dan vergroot je printer hem tot een hele A4. Met deze tool sleep je je labels in het venster en zet hij ze op de echte maat op A4. Passen er meerdere op één pagina, dan doet hij dat ook.

## Gebruiken

1. Open `index.html` in je browser, of de GitHub Pages-link als die is ingesteld.
2. Sleep je retourlabels (PDF, PNG of JPG) in de map, of klik om ze te kiezen. Een screenshot plakken met ⌘V / Ctrl+V kan ook.
3. Klik op **Printen** en kies in het printvenster **Werkelijke grootte / 100%**.

Onder **Geavanceerde instellingen** kun je het volgende aanpassen:
- witte randen wegknippen
- labels draaien
- kniplijntjes tonen
- de marge rond elk label (tussen twee labels komt dan twee keer die marge)

## Privacy

Alles gebeurt in je eigen browser. Je labels worden nergens naartoe gestuurd. Alleen de PDF-lezer ([pdf.js](https://mozilla.github.io/pdf.js/)) wordt de eerste keer van cdnjs geladen.

## Hoe het werkt

- Uit een PDF leest de tool de echte afmeting van de pagina. Het label komt daardoor precies op ware grootte op papier.
- Bij een afbeelding is de echte maat onbekend. Dan neemt de tool 10 × 15 cm aan. Klik op het label in de lijst om de breedte aan te passen.
- De labels worden rij voor rij over de pagina's verdeeld. Waar het ruimte scheelt, worden ze een kwartslag gedraaid.

## Publiceren met GitHub Pages

Zet de repository op GitHub. Kies daarna bij **Settings → Pages** de branch `main` en de map `/ (root)`.

## Opbouw

```
index.html        de pagina zelf (alleen de opbouw)
css/styles.css    vormgeving, licht en donker, mobiel en print
js/shared.js      gedeelde instellingen en hulpfuncties
js/labels.js      PDF's en afbeeldingen inlezen, witranden wegknippen, draaien
js/packing.js     labels zo zuinig mogelijk over A4's verdelen
js/motion.js      animaties (map, vliegende labels)
js/app.js         de interface: lijst, voorbeeld, knoppen en instellingen
```

Er is geen build-stap of installatie nodig: de bestanden werken zoals ze zijn, ook als je `index.html` direct vanaf je computer opent.
