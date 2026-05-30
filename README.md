# Sawmill Planner – Custom Edition v9

v9 ändrar rotationslogiken:

- Steg 1 räknas från rundstockens botten mot bädden.
- Efter steg 1 antas den sågade plana ytan ligga mot bädden.
- Därför blir steg 2 och framåt normalt lika med färdig blockdimension.
  - Exempel 175×175: steg 2+ = 175 mm / 6.89"
- Sågbilden visar förenklat den plana referensytan mot bädden efter första snittet.

Kör:
1. Dubbelklicka `start-local-server.bat`
2. Öppna http://localhost:8000/


## v10 ändringar

- Efter första snittet ritas inte stocken längre som hel rundstock.
- Den bortsågade delen tas bort visuellt.
- Bark i den bortsågade delen tas också bort.
- Kvarvarande stock ritas som cirkelsegment med plan snittyta.


## v11 ändringar

- Stockformen roteras nu med valt steg.
- Efter första snittet följer den kapade plana ytan med när stocken vänds.
- Vid 180° hamnar den bortsågade/kapade sidan nedåt mot bädden, som i verkligheten.


## v12 ändringar

- Stock och block roteras nu som en gemensam/stel kropp.
- Kroppen flyttas ned till bädden efter rotation i stället för att blocket flyttas separat.
- Vid 90° slutar den kapade sidan och blockets kant i samma linje.
- Vid 180° följer stocken med ned till bädden tillsammans med blocket.


## v13 ändringar

- Appen håller nu reda på alla redan utförda snitt.
- Vid steg 3 är snitt 1 och 2 borttagna från stockformen.
- Vid steg 4 är snitt 1, 2 och 3 borttagna.
- Barken klipps bort tillsammans med bortsågat material.


## v14 ändringar

- Svärdhöjden beräknas dynamiskt för varje rotationssteg.
- Höjden är inte längre automatiskt lika med blockdimensionen efter steg 1.
- Tidigare snitt tas bort, kroppen roteras, lägsta punkt läggs mot bädden och svärdet placeras vid blockets aktuella övre färdigyta.
- Detta gör särskilt 90°/180°-steg mer realistiska när stocken fortfarande vilar på rundsida.


## v15 ändringar

- Sista steget använder nu plan blockyta som stöd om den sidan redan är sågad.
- Appen skiljer på:
  - rundstock/spill mot bädd
  - plan färdig blockyta mot bädd
- Detta gör att steg 4 inte längre ska ligga på den del som ska sågas bort.


## v16 ändringar

- Fysisk rotationsriktning är korrigerad.
- 90° betyder nu att höger sida hamnar upp mot svärdet.
- 270° betyder nu att vänster sida hamnar upp mot svärdet.
- Detta ska rätta sista steget där blocket roterade men stockens kapade sidor hamnade fel.


## v17 ändringar

- Första snittet får separata mått för rotstöd och toppstöd.
- Detta behövs när rotdiameter och toppdiameter vid stöden skiljer sig.
- Första snittet räknas förenklat som:
  - rotstöd = rotdiameter/2 + blockhöjd/2
  - toppstöd = toppdiameter/2 + blockhöjd/2
- Senare snitt, när plan referensyta används, får normalt samma höjd vid båda stöden.


## v18 ändringar

- Rotstöd och toppstöd skiljer sig nu i alla steg där stocken fortfarande vilar på rund/osågad stock eller kvarvarande spill.
- Bara när en färdig plan blockyta ligger mot bädden visas samma mått på båda stöden.
- Detta rättar t.ex. steg 3 där stocken fortfarande kan ligga på osågad/rund sida.


## v19 ändringar

- Sågbilden visar nu rotstöd och toppstöd separat även när de skiljer sig.
- Texten "båda stöd" används inte längre i bilden när måtten inte är lika.
- Bilden förklarar att tvärsnittet visar medelhöjd, medan tabellen ger de faktiska stödmåtten.


## v20 ändringar

- Nytt fält: Tillåten hörnvankant.
- Nytt fält: Profilradie efter fräsning.
- Effektiv tillåten hörnvankant = max(hörnvankant, profilradie × 0,4).
- Passningskontrollen tillåter att hörnen sticker ut lite ur designcirkeln.
- Det är användbart för timmerhusstockar som senare fräses/rundas i hörnen.


## v22 – Dimensionstyper

Ny dimensionsmodell:

- Fyrkant: bredd och höjd måste uppfyllas, t.ex. 190×190.
- Fri bredd: tjocklek fast, bredd beräknas automatiskt, t.ex. 30×*.
- Minbredd: tjocklek fast och minsta bredd anges, t.ex. 30×150+.
- Vildmarkspanel: checkbox per rad. Tillåter mer råkant/vankant längs brädans bredd.

Optimeringsläge:
- Timmerblock
- Plank / fri bredd
- Panel / minbredd
- Blandat enligt prioritet


## v23 – Flikar

Appen är uppdelad i flikarna Stock, Dimensioner, Sågplan och Storskärm.


## v24 – Inställningar

Ny flik: Inställningar. Stödavstånd, kerf, kantmarginal, vankant, profilradie, rotationsordning och optimeringsläge är flyttade dit.


## v25 – Sidoutbyte

Ny funktion: sidoutbyte.

- Först väljs centrumblock enligt prioritet.
- Därefter analyseras aktiva dimensioner av typen Fri bredd, Minbredd och Vildmark som möjliga sidobrädor.
- Resultatet visas under Sågplan → Sidoutbyte.
- Detta är en första förenklad sidoutbytesmodell, inte full optimering av flera brädor per sida.

## v26 – Sågverk / packning

Nytt optimeringsläge: Sågverk / packning.

- Försöker fylla användbar diameter med aktiva dimensioner i prioritetsordning.
- Samma dimension kan användas flera gånger.
- Fri bredd och minbredd trimmas mot tillgänglig bredd.
- Layouten listas under Layout / sidoutbyte.

Detta är en första förenklad prioritetspackning, inte full matematisk optimering.


## v27 – Packning ritas i sågbilden

Förbättrat läget Sågverk / packning:

- Väljer första passande fyrkant som centrumblock.
- Försöker placera aktiva Fri bredd/Minbredd/Vildmark som sidobitar runt centrumblocket.
- Ritar centrumblock och sidobitar i sågbilden.
- Detta liknar originalappens beteende bättre än v26.


## v28 – Vankant per dimension

- Tillåten vankant är nu per dimensionsrad.
- Man kan t.ex. ha 190×190 med 0 mm vankant och 20×* vildmarkspanel med 20 mm vankant i samma sågning.
- Vildmark-checkboxen sätter automatiskt 20 mm om raden saknar vankant.
- Den gamla globala vankanten i Inställningar är kvar visuellt men används inte längre för dimensionerna.


## v29 – Sidobitar först, centrumblock sist

I läget Sågverk / packning genereras sågplanen nu i produktionsordning:

1. Frigör sidobitar/plankor/panel först.
2. Blocka centrumkärnan sist.

Detta skiljer layouten från sågordningen och följer bättre hur originalappen och praktisk sågning fungerar.


## v30 – Sågbild följer sågplanen

- Sågverk / packning får nu flera blockningssteg för kärnan, inte bara en rad.
- Sågbilden visar aktuell sidobit/planka först i stället för att börja med centrumblocket.
- Såglistan är klickbar och styr vilken röd snittlinje som visas i layouten.
- Nästa/föregående använder sågverksplanens längd när Sågverk / packning är valt.


## v31 – Roterad stock i packningsläge

- I Sågverk / packning roteras nu stock/layouten efter valt sågplanssteg.
- Svärdet/kedjan ligger alltid horisontellt i bilden.
- För plankor/sidobitar visas snittet på yttersidan av plankan, inte mot blocket.


## v32 – Bortsågade bitar tas bort i packningsläge

- I Sågverk / packning tas tidigare frigjorda sidobitar bort ur sågbilden.
- Kvarvarande kropp roteras och flyttas ned till bädden innan nästa snitt visas.
- Stöd-/kedjemåtten i sågverksplanen räknas om från kvarvarande layout i aktuellt steg.


## v33 – Tar bort hela slabban

- Tidigare sidobitssnitt tar nu bort hela ytterzonen/slabban fram till barken.
- Inte bara den gula plankrektangeln.
- Kvarvarande layout och stödhöjd beräknas efter dessa borttagna slabbar.


## v34 – Två snitt per sidobit

Sågverk / packning använder nu korrekt ordning för sidobitar:

1. Såga bort ytterdel/slabba.
2. Utan rotation: såga loss plankan/sidobiten.
3. Rotera till nästa sida och upprepa.
4. Blocka centrumkärnan sist.

Yttersnitt och planksnitt visas som separata rader i sågplanen.


## v35 – Stöd 1 / Stöd 2 och valfria ändmått

- Inmatningen använder nu Diameter stöd 1 och Diameter stöd 2.
- Stödmåtten är obligatoriska.
- Rotända och toppända kan anges som valfria extra mått för mer noggrann diameter-/avsmalningsmodell.
- Sågplanens mått visas som Stöd 1 och Stöd 2 i stället för rot/topp.
- Ny enkel sidovy av sågen visar sågaggregat, stock, stöd 1/stöd 2 och mått per stöd.
