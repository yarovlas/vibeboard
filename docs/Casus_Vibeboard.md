# Casus: Vibeboard

**Achtergrond:**

Vibeboard is een jong bedrijf dat teams en facilitators helpt betere brainstorms, sprintplanningen en workshops te houden. Veel teams werken nu nog met fysieke whiteboards, foto's en losse takenlijsten. Ideeën raken kwijt, afspraken belanden in verschillende systemen en er is geen eenduidig overzicht van wat er moet gebeuren. Het huidige proces kost daardoor onnodig veel tijd en zorgt voor fouten in de overdracht.

Om samenwerking en overzicht te verbeteren, wil Vibeboard een moderne webapplicatie laten ontwikkelen waarmee teams ideeën kunnen vastleggen, ordenen en direct omzetten in taken. De applicatie moet zowel tijdens een workshop als daarna prettig werken.

**Opdracht:**

Ontwikkel een webapplicatie voor Vibeboard waarin gebruikers whiteboards kunnen aanmaken, post-its en tekeningen kunnen toevoegen, en dezelfde post-its als taken in een Kanban-bord kunnen beheren. De applicatie moet zowel gebruiksvriendelijk zijn voor de facilitator als eenvoudig te beheren voor teamleden.

**Vereisten:**

1. **Gebruikersbeheer:**

- Gebruikers moeten een account kunnen aanmaken en inloggen.
- Gebruikers moeten hun wachtwoord kunnen herstellen.
- Gebruikers mogen alleen hun eigen whiteboards, post-its en tekeningen zien en wijzigen.

2. **Whiteboards:**

- Gebruikers moeten meerdere whiteboards kunnen aanmaken, een naam geven en openen.
- Na inloggen moet het laatst gebruikte whiteboard automatisch worden geopend.
- Bij een nieuwe gebruiker moet automatisch een leeg whiteboard worden aangemaakt.

3. **Post-its:**

- Gebruikers moeten via een knop of dubbelklik een post-it kunnen plaatsen.
- De tekst van een post-it moet direct ingevoerd en later bewerkt kunnen worden.
- Post-its moeten verwijderd kunnen worden, met een bevestiging.
- Post-its moeten vrij over het canvas verplaatst kunnen worden; de positie blijft bewaard na het herladen van de pagina.
- Gebruikers moeten de kleur van een post-it kunnen kiezen uit een vast palet.
- Post-its met dezelfde kleur moeten in een map gegroepeerd kunnen worden. De map:

  - **Teller:** de map toont hoeveel post-its erin zitten.
  - **Naam:** de map kan een eigen naam krijgen.
  - **Openen en sluiten:** de map kan worden open- en dichtgeklapt.
  - **Verplaatsen:** de map kan worden verplaatst; de leden bewegen mee.

4. **Tekenen:**

- Gebruikers moeten vrij kunnen tekenen met een pen.
- Penkleur en lijndikte moeten instelbaar zijn.
- Tekeningen moeten los van post-its worden opgeslagen en bij het openen worden hersteld.
- Undo en redo moeten werken voor tekenacties, met knoppen en sneltoetsen.

5. **Taakbeheer:**

- Elke post-it moet een status hebben: TODO, IN PROGRESS of DONE.
- Gebruikers moeten een prioriteit (LOW, MEDIUM, HIGH) en een vervaldatum kunnen instellen.
- Bij hover moet een tooltip status, prioriteit en deadline tonen.

6. **Kanban:**

- Dezelfde post-its moeten in een Kanban-bord worden getoond. Het bord heeft drie kolommen:

  - **TODO:** nog niet gestart.
  - **IN PROGRESS:** mee bezig.
  - **DONE:** afgerond.

- Gebruikers moeten kaarten tussen kolommen kunnen slepen; de status wordt automatisch aangepast en opgeslagen.
- Kaarten moeten vanuit Kanban bewerkt en verwijderd kunnen worden.

7. **Overzicht en navigatie:**

- Kaarten moeten gesorteerd kunnen worden op prioriteit, vervaldatum of handmatige volgorde.
- Kaarten moeten gefilterd kunnen worden op status en prioriteit.
- Gebruikers moeten post-its kunnen zoeken op titel en inhoud.
- Het whiteboard moet onbegrensd zijn; gebruikers moeten kunnen zoomen en pannen.
- De applicatie moet bruikbaar zijn op desktop en laptop.

8. **Responsive design:**

- De applicatie moet zowel op desktop als op kleinere schermen goed functioneren.
- De Kanban- en whiteboardweergave moeten bruikbaar blijven op kleinere resoluties.

9. **Overige wensen:**

- Gebruikers moeten post-its kunnen voorzien van tags om op thema te filteren.
- De applicatie moet een consistente en toegankelijke interface hebben.
- De applicatie moet prettig en voorspelbaar aanvoelen, met duidelijke feedback op acties.

**Technologieën:**

Je hebt de vrijheid om de technologieën te kiezen, maar een voorbeeldstack kan zijn:

1. Front-end: HTML, CSS, JavaScript en een framework zoals React.
2. Back-end: een server-side framework zoals FastAPI of Node.js met Express.
3. Database: een relationele database zoals PostgreSQL.
4. Authenticatie: veilige login met gehashte wachtwoorden en JWT.
5. Canvas: een bibliotheek voor interactieve visuals, bijvoorbeeld Konva.

**Fase 1: Planning en onderzoek**

1. Onderzoek vergelijkbare whiteboard- en Kanban-applicaties.
2. Maak wireframes en ontwerpschetsen voor het whiteboard en het Kanban-bord.
3. Bepaal het datamodel voor gebruikers, whiteboards, post-its en tekeningen.

**Fase 2: Bouw van de basisfunctionaliteiten**

1. Ontwikkel gebruikersbeheer en whiteboardbeheer.
2. Zorg dat gebruikers post-its kunnen plaatsen, bewerken, verplaatsen en verwijderen.
3. Zorg dat alle wijzigingen betrouwbaar worden opgeslagen.

**Fase 3: Tekenen en taakbeheer**

1. Voeg tekenen toe, inclusief kleur, dikte, undo/redo en opslaan.
2. Voeg status, prioriteit en vervaldatum toe aan post-its.
3. Voeg de hover-tooltip met taakinformatie toe.

**Fase 4: Kanban, overzicht en afronding**

1. Bouw de Kanban-weergave en het slepen tussen kolommen.
2. Voeg sorteren, filteren en zoeken toe.
3. Voeg zoomen, pannen en een onbegrensd canvas toe.
4. Controleer de applicatie en verbeter de gebruikerservaring.
