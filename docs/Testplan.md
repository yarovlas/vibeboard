# Testplan — Vibeboard

| | |
| --- | --- |
| Versie | 1.0 |
| Datum | 5 november 2026 |
| Auteur | Yaroslav Vlasenko |
| Status | Definitief |
| Project | Vibeboard (whiteboard en Kanban voor workshops) |

## 1. Inleiding

Dit testplan beschrijft hoe de Vibeboard-applicatie is getest voordat hij als oplevering werd beschouwd. Het doel is tweeledig: aantonen dat de functionele eisen uit de casus werken, en vastleggen hoe regressies uit het verleden zijn afgedekt.

Vibeboard bestaat uit een React-frontend met een Konva-canvas en een FastAPI-backend met PostgreSQL. De belangrijkste risico's zitten niet in losse formuliervelden, maar in interacties die data combineren: slepen en opslaan, zoomen en pannen, post-its groeperen, en dezelfde post-it in twee weergaven tonen. Daar ligt in dit plan dan ook het zwaartepunt.

## 2. Doel en scope

### 2.1 In scope

- Registreren, inloggen, uitloggen, sessiebehoud en wachtwoordherstel.
- Whiteboards aanmaken, openen en het laatst gebruikte board automatisch laden.
- Post-its aanmaken, bewerken, verwijderen, verplaatsen, van kleur wisselen en groeperen.
- Status, prioriteit en vervaldatum beheren, inclusief de hover-tooltip.
- Vrij tekenen, penkleur en lijndikte, opslaan/herstellen, undo en redo.
- Kanban-weergave, slepen tussen kolommen, bewerken en verwijderen vanuit Kanban.
- Sorteren, filteren en zoeken, inclusief het bewaren van de zoekstatus in de URL.
- Zoomen, pannen en het onbegrensde canvas.
- Responsief gedrag op telefoon-, tablet- en desktopformaat.
- Consistente visuele feedback (hover, focus, toasts, lege toestanden).
- Autorisatie: een gebruiker mag geen boards, post-its of strokes van een ander lezen of wijzigen.

### 2.2 Buiten scope

- **Tags** (PBI-13, issue #20). Deze wens heeft het label `wont-have` en is niet gebouwd.
- **Realtime samenwerking** tussen meerdere gebruikers in hetzelfde board.
- **De tabelweergave**. Die is tijdens de Kanban-ontwikkeling bewust verwijderd; de Kanban-weergave dekt dezelfde taken.
- **Fysieke mobiele toestellen**. Responsiviteit is getest met viewport-emulatie in Chromium, niet op iOS- of Android-hardware.
- **Whiteboard verwijderen via de UI**. De API ondersteunt het, maar er is nog geen knop in het overzicht.
- **Load- en penetratietests**. De applicatie is functioneel getest; grootschalige belasting en security-scans vallen buiten deze oplevering.

## 3. Testbasis

De testgevallen zijn afgeleid van:

1. De casus **Vibeboard** (`docs/Casus_Vibeboard.md`), met de eisen per fase.
2. De acceptatiecriteria en Definition of Done van de PBI's in GitHub Issues (#8 t/m #30).
3. De bugissues #56 en #57, die tijdens de ontwikkeling zijn gevonden en opgelost.
4. De bestaande implementatie en de afspraken in de repository (commitconventies, CI-workflows).

## 4. Teststrategie

| Niveau | Wat | Middel | Wanneer |
| --- | --- | --- | --- |
| API-tests | Endpoints, validatie, autorisatie en datapersistentie | Pytest met FastAPI `TestClient` | Bij elke push en pull request |
| End-to-end | Volledige gebruikersflows door de echte UI en API | Playwright, Chromium | Bij elke pull request |
| Statische controle | Types, lint, formatting, spelling en build | `tsc`, Biome, Ruff, mypy, ty, typos, `bun run build` | Voor elke commit en in CI |
| Infrastructuur | Docker Compose-opstart, migraties en servicegezondheid | GitHub Actions `test-docker-compose` | Bij elke pull request |
| Verkennend | Layout, hover, cursor en visuele consistentie | Handmatige controle in de browser | Tijdens de UI-werkzaamheden |

De API-tests gebruiken een eigen database. De end-to-end-tests maken per test een nieuwe gebruiker aan, zodat tests onafhankelijk van elkaar kunnen draaien en geen vaste testdata nodig hebben. Waar een test meer dan één post-it nodig heeft, wordt een tweede post-it via een dubbelklik op een vrije canvaspositie aangemaakt.

Er is geen aparte unit-testlaag voor React-componenten. De interacties die het meest foutgevoelig zijn — slepen, zoomen, groeperen en de gedeelde state tussen whiteboard en Kanban — worden via Playwright op gebruikersniveau afgedekt. Zuivere helpers zoals `board-geometry.ts`, `board-viewport.ts` en `kanban-controls.ts` worden indirect via diezelfde flows getest. Dat is een bewuste afweging: de functionele risico's zitten in de combinatie van UI en API, niet in losse rekenfuncties.

## 5. Testomgeving

| Onderdeel | Waarde |
| --- | --- |
| Besturingssysteem | macOS 26.6.2 |
| Frontend | React 19.2, Vite 8.2, TypeScript 6.0 |
| Backend | Python 3.14.0, FastAPI 0.141.1, SQLModel 0.0.39 |
| Database | PostgreSQL 18 in Docker Compose |
| Browser | Chromium via Playwright 1.62.1 |
| Testframeworks | Pytest 9.1.1, Playwright 1.62.1 |
| Frontend-URL | <http://localhost:5173> |
| Backend-URL | <http://localhost:8000> |
| E-mail | Mailpit op <http://localhost:8025> |
| CI | GitHub Actions: backend, Playwright in 4 shards, Docker Compose, pre-commit en zizmor |

De backend-tests draaien tegen de database `app_test`, niet tegen de ontwikkeldatabase. De testopzet verwijdert na afloop alle gebruikers, boards, post-its en strokes; daarom is een wegwerp-database verplicht. Het script `backend/scripts/test-backend-local.sh` regelt dat.

## 6. Testdata en isolatie

- Elke Playwright-test die data aanmaakt, gebruikt een unieke gebruiker met een willekeurig e-mailadres en wachtwoord. Een aantal alleen-lezen UI-tests gebruikt de vaste testgebruiker uit de auth-setup.
- De eerste login maakt automatisch een leeg whiteboard aan; tests die een board nodig hebben, gebruiken dat board of maken er expliciet een nieuwe aan.
- Post-its worden via de UI aangemaakt, zodat dezelfde code wordt geraakt als in normaal gebruik.
- De backend-suite gebruikt de vaste testgebruiker uit de configuratie en een aparte database. De teardown verwijdert alle rijden die de tests hebben aangemaakt.
- Er worden geen productiegegevens gebruikt.

## 7. Testgevallen

De onderstaande tabel is de afgesproken dekking. De kolom "Automatisering" verwijst naar de spec die het geval uitvoert. Meerdere testgevallen kunnen in één spec-bestand zitten.

### 7.1 Accounts en autorisatie

| ID | Scenario | Verwacht resultaat | Automatisering |
| --- | --- | --- | --- |
| AUTH-01 | Registreren met geldige gegevens | Account aangemaakt en daarna in te loggen | `sign-up.spec.ts` |
| AUTH-02 | Registreren met ongeldige of bestaande gegevens | Duidelijke foutmelding, geen account | `sign-up.spec.ts` |
| AUTH-03 | Inloggen met geldige gegevens | Doorsturen naar het laatst gebruikte board | `login.spec.ts`, `boards.spec.ts` |
| AUTH-04 | Inloggen met verkeerd wachtwoord | Foutmelding, gebruiker blijft op login | `login.spec.ts` |
| AUTH-05 | Sessie behouden en uitloggen | Ingelogd blijven na reload; na uitloggen geen toegang | `auth-session.spec.ts` |
| AUTH-06 | Wachtwoord vergeten en resetten | Resetmail in Mailpit, nieuw wachtwoord werkt | `reset-password.spec.ts` |
| AUTH-07 | Board van een andere gebruiker opvragen | API weigert met 403 | `backend/tests/api/routes/test_boards.py` |
| AUTH-08 | Post-it of stroke van een andere gebruiker wijzigen | API weigert met 403 | `test_postits.py`, `test_strokes.py` |

### 7.2 Whiteboards

| ID | Scenario | Verwacht resultaat | Automatisering |
| --- | --- | --- | --- |
| BOARD-01 | Nieuw whiteboard aanmaken | Board opent leeg en verschijnt in het overzicht | `boards.spec.ts` |
| BOARD-02 | Bestaand whiteboard openen | Boardnaam en inhoud worden geladen | `boards.spec.ts` |
| BOARD-03 | Home openen met bestaande boards | Laatst bijgewerkte board opent automatisch | `boards.spec.ts` |
| BOARD-04 | Eerste login zonder boards | Er wordt automatisch een leeg board aangemaakt | `boards.spec.ts` |
| BOARD-05 | Boardnaam en laatste wijziging tonen | Naam en datum staan op de boardpagina | `boards.spec.ts` |

### 7.3 Post-its en mappen

| ID | Scenario | Verwacht resultaat | Automatisering |
| --- | --- | --- | --- |
| POST-01 | Post-it aanmaken met de knop | Editor opent, tekst wordt opgeslagen | `postits.spec.ts` |
| POST-02 | Post-it aanmaken met een dubbelklik | Post-it verschijnt op de geklikte boardpositie | `postits.spec.ts`, `whiteboard-zoom.spec.ts` |
| POST-03 | Bestaande post-it bewerken | Nieuwe tekst blijft na reload staan | `postits.spec.ts` |
| POST-04 | Post-it verwijderen met bevestiging | Item verdwijnt; annuleren laat het staan | `postits.spec.ts` |
| POST-05 | Post-it slepen en herladen | Positie is opgeslagen en komt terug | `postits.spec.ts` |
| POST-06 | Kleur wijzigen uit het vaste palet | Kleur wordt opgeslagen en blijft na reload | `postits-color.spec.ts` |
| POST-07 | Post-its met dezelfde kleur groeperen | Map toont teller en klapt open en dicht | `postits-folders.spec.ts` |
| POST-08 | Map een eigen naam geven | Naam blijft zichtbaar na heropenen | `postits-folders.spec.ts` |
| POST-09 | Map verwijderen met bevestiging | Map en leden verdwijnen; annuleren laat alles staan | `postits-folders.spec.ts` |
| POST-10 | Nieuwe post-it naast een ingeklapte map | Nieuwe kaart blijft zichtbaar tot opnieuw groeperen | `postits-folders.spec.ts` |
| POST-11 | Status wijzigen | Status wordt opgeslagen en blijft na reload | `postits-status.spec.ts` |
| POST-12 | Prioriteit en vervaldatum instellen | Velden worden opgeslagen en na reload getoond | `postits-status.spec.ts` |
| POST-13 | Hoveren over een post-it | Tooltip toont status, prioriteit en deadline | `postits-status.spec.ts` |

### 7.4 Tekenen

| ID | Scenario | Verwacht resultaat | Automatisering |
| --- | --- | --- | --- |
| DRAW-01 | Een lijn tekenen | Stroke wordt naar de API gestuurd en getoond | `strokes.spec.ts` |
| DRAW-02 | Penkleur en lijndikte aanpassen | De stroke gebruikt de gekozen waarden | `strokes.spec.ts` |
| DRAW-03 | Slepen van post-its tijdens tekenmodus | De tekenlaag blokkeert het slepen niet | `strokes.spec.ts` |
| DRAW-04 | Dubbelklikken in tekenmodus | Er wordt geen post-it aangemaakt | `strokes.spec.ts` |
| DRAW-05 | Undo en redo met knoppen en sneltoetsen | Stroke verdwijnt/komt terug; redo-stack reset correct | `strokes.spec.ts` |

### 7.5 Kanban, sorteren, filteren en zoeken

| ID | Scenario | Verwacht resultaat | Automatisering |
| --- | --- | --- | --- |
| KAN-01 | Kanban openen | Drie kolommen met de juiste kaarten en tellers | `kanban.spec.ts` |
| KAN-02 | Status wijzigen op het whiteboard | Kaart staat direct in de juiste Kanban-kolom | `kanban.spec.ts` |
| KAN-03 | Kaart naar een andere kolom slepen | Alleen de status wordt opgeslagen; na reload nog steeds goed | `kanban.spec.ts` |
| KAN-04 | Kaart in dezelfde kolom neerzetten | Er gaat geen onnodige PATCH naar de API | `kanban.spec.ts` |
| KAN-05 | Kaart bewerken vanuit Kanban | Alle velden worden opgeslagen, positie blijft gelijk | `kanban.spec.ts` |
| KAN-06 | Bewerken annuleren of kaart verwijderen | Annuleren stuurt geen PATCH; verwijderen vraagt bevestiging | `kanban.spec.ts` |
| KAN-07 | Sorteren op prioriteit, vervaldatum en handmatig | Volgorde klopt, ook in beide richtingen | `kanban-sort.spec.ts` |
| KAN-08 | Filteren op status en prioriteit | Alleen passende kolommen/kaarten zichtbaar; filter staat in de URL | `kanban-filter.spec.ts` |
| KAN-09 | Zoeken in titel en inhoud | Hoofdletterongevoelig; zoekterm blijft na reload | `kanban-search.spec.ts` |
| KAN-10 | Zoeken combineren met een filter | Alleen kaarten die aan beide voorwaarden voldoen | `kanban-search.spec.ts` |

### 7.6 Canvas, zoomen en pannen

| ID | Scenario | Verwacht resultaat | Automatisering |
| --- | --- | --- | --- |
| CANVAS-01 | Zoomen met de knoppen en resetten | Percentage klopt en reset gaat terug naar 100% | `whiteboard-zoom.spec.ts` |
| CANVAS-02 | Zoomen met het muiswiel | Punt onder de cursor blijft staan; grens 25%–400% | `whiteboard-zoom.spec.ts` |
| CANVAS-03 | Pannen met de middelste muisknop | Viewport verschuift, boardinhoud blijft gelijk | `whiteboard-zoom.spec.ts` |
| CANVAS-04 | Pannen met Spatie + linkermuisknop | Viewport verschuift zoals verwacht | `whiteboard-zoom.spec.ts` |
| CANVAS-05 | Pannen met de linkermuisknop op leeg canvas | Board verschuift; een klik zonder slepen opent nog de editor | `whiteboard-canvas.spec.ts` |
| CANVAS-06 | Post-it voorbij de oude canvasrand slepen | Positie ligt buiten de oude grens en blijft na reload | `whiteboard-canvas.spec.ts`, `postits.spec.ts` |
| CANVAS-07 | Post-it slepen na het pannen | Opgeslagen coördinaat klopt met de zichtbare positie | `whiteboard-canvas.spec.ts` |
| CANVAS-08 | Post-it opslaan met Enter of een klik ernaast | Draft wordt gecommit; Shift+Enter voegt een regel toe | `whiteboard-canvas.spec.ts` |

### 7.7 Responsieve UI en visuele feedback

| ID | Scenario | Verwacht resultaat | Automatisering |
| --- | --- | --- | --- |
| RESP-01 | Header op 375×667 | View-toggle zichtbaar en bruikbaar; geen horizontale pagina-overflow | `responsive.spec.ts` |
| RESP-02 | Whiteboard-toolbar op 375×667 | Alle knoppen bereikbaar; instructietekst verborgen | `responsive.spec.ts` |
| RESP-03 | Kanban op 375×667 | Toolbar wrapt, kolommen scrollen binnen het board | `responsive.spec.ts` |
| RESP-04 | Whiteboard op 820×1180 | Canvas heeft bruikbare hoogte en breedte | `responsive.spec.ts` |
| RESP-05 | Boards-overzicht op 375×667 | Titel en knop overlappen niet | `responsive.spec.ts` |
| UI-01 | Post-it verwijderen | Toast verschijnt en de lege toestand wordt getoond | `ui-polish.spec.ts` |
| UI-02 | Post-it bewerken in Kanban | Toast "Post-it updated" verschijnt | `ui-polish.spec.ts` |
| UI-03 | Post-it verwijderen in Kanban | Toast "Post-it deleted" verschijnt | `ui-polish.spec.ts` |
| UI-04 | Groeperen en uitklappen | Passende toast verschijnt bij beide acties | `ui-polish.spec.ts` |

## 8. Entry- en exitcriteria

### 8.1 Entrycriteria

- De stack start zonder fouten: database, Mailpit, backend en frontend.
- De database draait op de nieuwste Alembic-migratie.
- De frontend bouwt met `bun run build`.
- Er zijn geen bekende blokkerende bugs voordat een testronde begint.

### 8.2 Exitcriteria

- Alle geautomatiseerde tests slagen.
- De backend haalt minimaal 90% regelcoverage; in deze oplevering is 94% gehaald.
- Er zijn geen openstaande bugs met severity Hoog of Kritiek.
- De acceptatiecriteria van de afgeronde PBI's zijn aantoonbaar afgedekt.
- Statische controles en de CI-pipeline zijn groen.

## 9. Defectprocedure

Een bevinding wordt als GitHub-issue vastgelegd met:

- een titel die het gedrag beschrijft, niet de oplossing;
- symptoom, oorzaak (indien bekend), verwacht gedrag en stappen om te reproduceren;
- labels voor `bug` en de juiste sprint;
- een koppeling naar de fix-commit en de pull request;
- minimaal één regressietest die zonder de fix zou falen.

Severity wordt als volgt bepaald:

| Severity | Betekenis |
| --- | --- |
| Kritiek | Dataverlies of de applicatie is onbruikbaar |
| Hoog | Kernfunctionaliteit werkt niet, geen redelijke workaround |
| Gemiddeld | Onderdeel werkt niet, maar er is een workaround |
| Laag | Visuele of tekstuele afwijking zonder functionele impact |

Prioriteit volgt de sprintplanning: `must-have`, `should-have` of `could-have`.

## 10. Risico's

| Risico | Kans | Impact | Maatregel |
| --- | --- | --- | --- |
| Canvas-interacties zijn moeilijk stabiel te testen | Middel | Hoog | Vaste coördinaten, royale muisstappen en expliciete wachttijd op API-responses |
| Post-it-posities raken vermengd met zoom/pan | Middel | Hoog | Boardcoördinaten loshouden van de viewport; aparte tests voor slepen na zoomen/pannen |
| Mappenindeling raakt uit sync met de server | Middel | Middel | Groeperen als expliciete actie; snapshots lokaal bewaren en bij deletes opruimen |
| Flaky tests door gedeelde accounts of data | Middel | Middel | Per test een nieuwe gebruiker en een eigen board |
| Docker of Postgres is lokaal niet beschikbaar | Laag | Middel | CI draait de volledige stack opnieuw op; lokaal script gebruikt een wegwerp-database |
| Beperkte tijd voor handmatige device-tests | Hoog | Laag | Responsiviteit via viewport-emulatie; fysieke toestellen als bekend aandachtspunt opnemen |

## 11. Uitvoering en rapportage

De testronde voor de oplevering is uitgevoerd op 5 november 2026, na het samenvoegen van PR #58 (responsieve UI) en PR #59 (UI-polish). De resultaten, de bugdocumentatie en de traceability-matrix staan in het [testrapport](./Testrapport.md).

## 12. Deliverables

- Dit testplan.
- Het testrapport met resultaten per suite.
- De geautomatiseerde suites in `backend/tests/` en `frontend/tests/`.
- De GitHub-issues #56 en #57 als vastgelegde defecten, inclusief fix en regressietest.
