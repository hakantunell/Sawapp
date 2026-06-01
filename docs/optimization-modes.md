# Optimeringslägen

Det här dokumentet beskriver hur optimeringslägena i Sawapp är tänkta att fungera. Syftet är att göra det lättare att kontrollera att refaktoreringen inte ändrar beteendet.

## Grundprincip

Appen går igenom aktiva dimensionsrader i den ordning de ligger i dimensionslistan.

Den första aktiva dimensionen som får plats i stockens användbara diameter väljs som centrumblock.

Det betyder att ordningen i dimensionslistan är viktig. Det är inte en global matematisk maximering av värde eller volym, utan en prioriterad matchning.

## mixed

Läge: blandat.

Beteende:

- använder alla aktiva dimensionsrader
- fasta block kan väljas
- fri bredd kan väljas
- minsta bredd/panel kan väljas
- vildkant kan väljas

Detta är standardläget och fungerar som en generell prioriteringslista.

## timber

Läge: timmer/block.

Beteende:

- använder bara dimensionsrader med `type === "fixed"`
- ignorerar fri bredd
- ignorerar minsta bredd/panel

Detta bör användas när målet är att få ut ett bestämt centrumblock, till exempel 190 × 190 eller 170 × 170.

## plank

Läge: plank.

Beteende:

- använder bara dimensionsrader med `type === "freeWidth"`
- höjden/tjockleken är fast
- bredden räknas fram till maximal möjlig bredd inom stockens användbara diameter

Exempel:

- aktiv rad `50 × *` betyder ungefär: 50 mm tjock planka med så stor bredd som får plats
- aktiv rad `30 × *` betyder ungefär: 30 mm tjock planka med så stor bredd som får plats

## panel

Läge: panel/vildkant.

Beteende:

- använder dimensionsrader med `type === "minWidth"`
- använder även dimensionsrader med `wildEdge === true`
- bredden räknas fram, men måste minst uppfylla angiven minsta bredd

Exempel:

- `30 × 150+` betyder: 30 mm tjock, minst 150 mm bred, men gärna bredare om stocken tillåter
- `30 × 150+ R` betyder samma princip men med vildkant/rotkant

## Vankant

Vankant hanteras per dimension via `waneMm`.

Princip:

- `waneMm = 0` betyder ingen extra tillåtelse för vankant utöver profilradie/vildkantsstandard
- större `waneMm` gör att en dimension kan accepteras även om hörnen inte är helt rena
- vildkant får ett praktiskt standardpåslag om vankant inte är satt

## Kontroll vid test

När optimeringslogiken ändras eller refaktoreras bör man testa:

1. En grov stock där 190 × 190 får plats.
2. En mindre stock där 190 × 190 inte får plats men 170 × 170 gör det.
3. En stock där fasta block inte får plats men fri bredd gör det.
4. Panel-läge med `30 × 150+`.
5. Panel-läge med vildkant `R`.

Förväntad kontroll:

- `mixed` väljer första aktiva rad som får plats.
- `timber` väljer bara fasta dimensioner.
- `plank` väljer bara fri bredd.
- `panel` väljer minsta-bredd/vildkant.

## Viktig notering

Det här är dokumentation av nuvarande beteende, inte en rekommendation om framtida optimeringsstrategi.

Om appen senare ska få verklig värdeoptimering bör det göras som ett separat nytt optimeringsläge, inte genom att ändra innebörden av befintliga lägen under refaktoreringen.
