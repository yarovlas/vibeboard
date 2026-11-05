# Testrapport — Vibeboard

| | |
| --- | --- |
| Versie | 1.0 |
| Datum | 5 november 2026 |
| Auteur | Yaroslav Vlasenko |
| Status | Definitief |
| Hoort bij | [Testplan 1.0](./Testplan.md) |

## 1. Managementsamenvatting

De applicatie is op 5 november 2026 getest na de laatste twee opleveringen: de responsieve UI (PR #58) en de UI-polish (PR #59). De volledige geautomatiseerde suite is groen.

- **Backend:** 98 van 98 Pytest-tests geslaagd, 94% regelcoverage.
- **Frontend:** 121 van 121 Playwright-testgevallen geslaagd, plus de auth-setup; in totaal 122 uitgevoerde items.
- **Statische controles:** TypeScript, build, Biome, Ruff, mypy, ty, typos en zizmor zijn allemaal geslaagd.
- **CI:** alle checks op PR #58 en PR #59 waren groen voordat ze werden samengevoegd.
- **Bugs:** twee bugs zijn tijdens de ontwikkeling gevonden, gedocumenteerd als issue en opgelost. Beide zijn gesloten en hebben een regressietest.
- **Openstaande blokkerende bugs:** geen.

De twee gedocumenteerde bugs (#56 en #57) zaten allebei in de whiteboard-interactie rond PBI-20. Ze zijn op 3 november 2026 opgelost in PR #55 en op 5 november 2026 opnieuw meegenomen in de volledige regressieronde.

## 2. Uitgevoerde testronden

| Ronde | Datum | Scope | Resultaat |
| --- | --- | --- | --- |
| R1 | 3 november 2026 | PBI-17/18/19: sorteren, filteren, zoeken | Groen; PR #53 samengevoegd |
| R2 | 3 november 2026 | PBI-20: zoom, pan, onbegrensd canvas en bugfixes #56/#57 | Groen na fix; PR #55 samengevoegd |
| R3 | 5 november 2026 | PBI-22: responsieve UI | Groen; PR #58 samengevoegd |
| R4 | 5 november 2026 | PBI-23: UI-polish | Groen; PR #59 samengevoegd |
| R5 | 5 november 2026 | Volledige regressie na R3 en R4 | Groen; dit rapport |

## 3. Resultaten

### 3.1 Backend

Uitgevoerd tegen de wegwerp-database `app_test`, met de migraties van de nieuwste Alembic-revisie.

```
98 passed, 101 warnings in 4.51s
TOTAL 734 statements, 47 missed, 94% coverage
```

| Testbestand | Aantal | Resultaat |
| --- | ---: | --- |
| `api/routes/test_boards.py` | 15 | Geslaagd |
| `api/routes/test_postits.py` | 26 | Geslaagd |
| `api/routes/test_strokes.py` | 12 | Geslaagd |
| `api/routes/test_login.py` | 9 | Geslaagd |
| `api/routes/test_users.py` | 26 | Geslaagd |
| `api/routes/test_private.py` | 1 | Geslaagd |
| `crud/test_user.py` | 8 | Geslaagd |
| `test_cors.py` | 1 | Geslaagd |
| **Totaal** | **98** | **98 geslaagd, 0 mislukt** |

De coverage-eis uit de CI is minimaal 90%; met 94% is die gehaald. De laagste dekking zit in foutpaden van e-mailverzending en initialisatie (`initial_data.py`, `utils.py`), die in de end-to-end-tests via Mailpit worden geraakt maar niet door Pytest worden meegerekend.

### 3.2 Frontend

Uitgevoerd in Chromium tegen een actieve stack op `http://localhost:5173`.

```
122 passed (1.3m)
```

Daarvan is één item de auth-setup die het opgeslagen inlogcookie voor de overige tests maakt. De overige 121 zijn de testgevallen uit het testplan.

| Gebied | Tests | Resultaat |
| --- | ---: | --- |
| Accounts, login, sessie en instellingen | 41 | Geslaagd |
| Whiteboards | 8 | Geslaagd |
| Post-its, kleuren, mappen en status | 21 | Geslaagd |
| Tekenen en undo/redo | 7 | Geslaagd |
| Kanban, sorteren, filteren en zoeken | 23 | Geslaagd |
| Zoomen, pannen en onbegrensd canvas | 12 | Geslaagd |
| Responsieve UI | 5 | Geslaagd |
| UI-polish en toasts | 4 | Geslaagd |
| **Totaal** | **121 + 1 setup** | **122 geslaagd, 0 mislukt** |

Er zijn geen tests overgeslagen en geen tests als flaky gemarkeerd. In CI draait de suite met `--fail-on-flaky-tests`; ook daar waren alle vier de shards groen.

### 3.3 Statische controles en CI

| Controle | Resultaat |
| --- | --- |
| `tsc -p tsconfig.build.json --noEmit` | Geslaagd |
| `bun run build` | Geslaagd |
| Biome (frontend) | Geslaagd |
| Ruff en Ruff format (backend) | Geslaagd |
| mypy en ty | Geslaagd |
| typos | Geslaagd |
| Gegenereerde frontend-SDK | Actueel |
| zizmor (workflowsecurity) | Geslaagd |
| Docker Compose-opstart en migraties | Geslaagd in CI |
| Playwright in 4 shards | Geslaagd in CI |

## 4. Bugregister

Naast de twee onderstaande bugs zijn er geen applicatiebugs als GitHub-issue geregistreerd. Beide bugs zijn gevonden tijdens de ontwikkeling van PBI-20 en vóór de oplevering opgelost.

| ID | Issue | Titel | Severity | Prioriteit | Status | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| BUG-001 | [#56](https://github.com/yarovlas/vibeboard/issues/56) | Post-its konden niet buiten de canvasrand worden verplaatst | Hoog | Must-have | Gesloten op 3 nov 2026 | PR #55 |
| BUG-002 | [#57](https://github.com/yarovlas/vibeboard/issues/57) | Post-it-editor sluit niet af met Enter of een klik ernaast | Hoog | Must-have | Gesloten op 3 nov 2026 | PR #55 |

### 4.1 BUG-001 — Post-its konden niet buiten de canvasrand worden verplaatst

| Veld | Waarde |
| --- | --- |
| Issue | [#56](https://github.com/yarovlas/vibeboard/issues/56) |
| Severity | Hoog |
| Prioriteit | Must-have |
| Status | Gesloten |
| Gevonden in | PBI-20 (onbegrensd canvas en pannen) |
| Fix | PR [#55](https://github.com/yarovlas/vibeboard/pull/55), commits `2fb0337` en `b1f7aa2` |

**Symptoom.** Post-its en mappen stopten bij een hardcoded rand: rechts en onder was de maximale positie `canvasbreedte - 220` respectievelijk `canvashoogte - 180`. Negatieve coördinaten waren helemaal niet mogelijk. Daardoor kon een gebruiker een post-it niet buiten het zichtbare vlak leggen, ook niet nadat zoomen en pannen waren toegevoegd.

**Oorzaak.** De helpers `clampPosition` en later `clampDragPosition` begrensden elke move en elk dubbelklik-concept tot de zichtbare viewport. Die begrenzing stamde uit de eerste versie van het canvas, waarin nog niet werd gezoomd of gepand.

**Verwacht gedrag.** Het whiteboard is onbegrensd. Een post-it of map blijft exact op de plek waar hij wordt neergezet, ook buiten de oude rand. De positie wordt opgeslagen en overleeft een reload. Pannen blijft werken met de linkermuisknop, de middelste muisknop en Spatie + slepen.

**Oplossing.** De clamp-helpers zijn verwijderd, net als de `dragBoundFunc` op de Konva-nodes. De bestaande folder-dock (`dockPerRow`, `dockSlotAt`, `findFreeDockSlot`) is ongewijzigd gebleven, zodat nieuwe mappen nog steeds op dezelfde plek verschijnen.

**Regressietests.**

- `whiteboard-canvas.spec.ts` — "sleept een post-it voorbij de oude canvasgrens"
- `whiteboard-canvas.spec.ts` — "sleept een post-it na het pannen naar de juiste boardpositie"
- `whiteboard-canvas.spec.ts` — "pant met de linkermuisknop op een lege plek"
- `postits.spec.ts` — "kan een post-it voorbij de canvasrand slepen"

**Verificatie.** De volledige suite van 122 items is op 5 november 2026 opnieuw uitgevoerd en geslaagd. De test die vroeger de oude grens controleerde, is omgedraaid: hij controleert nu dat de opgeslagen positie voorbij de oude rand ligt.

### 4.2 BUG-002 — Post-it-editor sluit niet af met Enter of een klik ernaast

| Veld | Waarde |
| --- | --- |
| Issue | [#57](https://github.com/yarovlas/vibeboard/issues/57) |
| Severity | Hoog |
| Prioriteit | Must-have |
| Status | Gesloten |
| Gevonden in | PBI-20, als regressie van de nieuwe pan-handler |
| Fix | PR [#55](https://github.com/yarovlas/vibeboard/pull/55), commits `ae59997` en `b9440a0` |

**Symptoom.** Bij het aanmaken of bewerken van een post-it sloot Enter de editor niet af; alleen `Ctrl+Enter` of `Cmd+Enter` deed dat. Een klik naast de post-it sloot de editor evenmin. De editor bleef open en kon zelfs met het board meebewegen.

**Oorzaak.** De pan-handler voor de linkermuisknop riep `preventDefault()` aan op elke `mousedown` op het lege canvas. Daardoor kreeg de textarea geen blur, werd de draft niet gecommit en werd de klik als panbeweging behandeld. De handler was samen met het pannen geïntroduceerd en had onbedoeld invloed op de editor.

**Verwacht gedrag.** Enter slaat de post-it op en Shift+Enter voegt een nieuwe regel toe. Een klik zonder slepen naast de editor slaat de post-it op. Pannen met de linkermuisknop blijft werken, net als klikken en dubbelklikken.

**Oplossing.** Alleen de middelste muisknop onderdrukt nog het standaard `mousedown`-gedrag, om browser-autoscroll te voorkomen. De linkermuisknop laat blur en commit met rust. In de editor is Enter expliciet als opslaan toegevoegd; Shift+Enter houdt de bestaande regelafbreking.

**Regressietests.**

- `whiteboard-canvas.spec.ts` — "klikken naast de editor slaat de post-it op"
- `whiteboard-canvas.spec.ts` — "Enter slaat de post-it op en Shift+Enter voegt een regel toe"
- `whiteboard-canvas.spec.ts` — "een klik zonder slepen opent nog steeds de post-it-editor"

**Verificatie.** De drie regressietests zijn onderdeel van de groene volledige suite van 5 november 2026. De test voor klikken buiten de editor controleert ook dat de viewport niet is verschoven, zodat de klik niet stiekem als pan wordt uitgevoerd.

## 5. Traceability

| PBI | Onderwerp | Testgevallen | Status |
| --- | --- | --- | --- |
| PBI-01 | Whiteboard aanmaken en openen | BOARD-01 t/m BOARD-05, AUTH-03 | Afgedekt |
| PBI-02 | Post-it aanmaken | POST-01, POST-02 | Afgedekt |
| PBI-03 | Post-it bewerken en verwijderen | POST-03, POST-04 | Afgedekt |
| PBI-04/05 | Post-it verplaatsen en positie opslaan | POST-05, CANVAS-06, CANVAS-07 | Afgedekt |
| PBI-06 | Post-it kleur wijzigen | POST-06 | Afgedekt |
| PBI-07 | Post-its groeperen in mappen | POST-07 t/m POST-10 | Afgedekt |
| PBI-08/09 | Tekenen, opslaan en herstellen | DRAW-01 t/m DRAW-05 | Afgedekt |
| PBI-10 | Post-it status beheren | POST-11, KAN-02 | Afgedekt |
| PBI-11 | Hoverinformatie tonen | POST-13 | Afgedekt |
| PBI-12 | Prioriteit en vervaldatum | POST-12, KAN-05 | Afgedekt |
| PBI-13 | Tags toevoegen | — | Buiten scope (`wont-have`, #20) |
| PBI-14/15 | Kanban en slepen tussen kolommen | KAN-01 t/m KAN-04, KAN-08 | Afgedekt |
| PBI-17/18/19 | Sorteren, filteren en zoeken | KAN-07 t/m KAN-10 | Afgedekt |
| PBI-20 | Zoomen, pannen en onbegrensd canvas | CANVAS-01 t/m CANVAS-08, BUG-001, BUG-002 | Afgedekt |
| PBI-22 | Responsieve UI | RESP-01 t/m RESP-05 | Afgedekt |
| PBI-23 | UI-polish | UI-01 t/m UI-04 | Afgedekt |
| PBI-24 | Post-it bewerken in Kanban | KAN-05, KAN-06 | Afgedekt |

## 6. Afwijkingen en bekende beperkingen

Deze punten zijn geen open bugs, maar wel bewuste keuzes of beperkingen die een lezer van dit rapport moet kennen.

1. **Tags zijn niet gebouwd.** Issue #20 staat op `wont-have` en is buiten de oplevering gebleven. Filteren op thema's is daardoor niet mogelijk.
2. **De tabelweergave bestaat niet meer.** Tijdens de Kanban-ontwikkeling is de tijdelijke tabelweergave verwijderd. De Kanban-weergave dekt dezelfde taken; de casus noemt de tabel als optie, niet als harde eis.
3. **Zoom en pan worden niet bewaard.** Post-it-posities en tekeningen worden opgeslagen, maar de camera staat na een reload weer op 100%. Dat is een bewuste keuze: de viewport is een weergave-instelling, geen boarddata.
4. **De mappenindeling is deels lokaal.** Welke kleuren zijn ingeklapt staat op het board, maar namen, posities en de ledensnapshot van mappen staan in `localStorage`. Een andere browser kan daardoor een andere mappenindeling tonen. Dit is gedocumenteerd als ontwerpbeperking.
5. **Een map verplaatsen neemt de leden niet mee.** De map zelf volgt de muis, maar de post-its erin houden hun eigen boardpositie. Na uitklappen staan ze dus niet automatisch onder de verplaatste map. Dit wijkt af van de letterlijke casusregel "de leden bewegen mee"; het is als bekend punt opgenomen in plaats van als bug, omdat de groepsweergave zelf wel correct werkt.
6. **Responsiviteit is via viewport-emulatie getest.** De layout is gecontroleerd op 375×667, 820×1180 en desktopformaat. Echte iOS- en Android-toestellen zijn niet gebruikt, en touch-pannen is geen uitgewerkte workflow.
7. **Whiteboards verwijderen kan alleen via de API.** De backend ondersteunt `DELETE /boards/{id}`, maar het overzicht heeft nog geen verwijderknop.
8. **Geen realtime samenwerking.** Gebruikers hebben ieder hun eigen boards; gelijktijdig in hetzelfde board werken wordt niet ondersteund.

## 7. Overige bevindingen tijdens de testronde

- **Subpixel-afwijking in de zoomtest.** Bij 400% zoom kon de gemeten cursorpositie 2,4 px afwijken door een fractionele canvasbreedte. Dat was een testprobleem, geen productbug. De tolerantie in `whiteboard-zoom.spec.ts` is in PR #58 naar 3 px gebracht, met een toelichting in de test.
- **Docker was niet actief bij de start van de lokale ronde.** De database en Mailpit zijn herstart via Docker Compose. Dit had geen invloed op de applicatie of de testresultaten.
- **Eerdere CI-storing bij PR #54.** Een npm-integrityfout bij het uitpakken van `react-icons` zorgde eenmalig voor een rode build. Na een schone installatie was de pipeline weer groen; er is geen applicatiecode voor aangepast.

## 8. Conclusie

Binnen de afgesproken scope zijn alle acceptatiecriteria afgedekt door automatische tests. De backend heeft 94% coverage, de volledige Playwright-suite slaagt, en de twee gevonden bugs zijn opgelost en van regressietests voorzien. Er staan geen bugs met severity Hoog of Kritiek open.

De applicatie is daarmee klaar voor de demo en het portfolio. De belangrijkste restrisico's zijn de bewust niet gebouwde tags, het ontbreken van realtime samenwerking, het niet meebewegen van map-leden bij het verplaatsen van een map, en het feit dat responsive gedrag niet op fysieke mobiele toestellen is getest. Deze punten staan expliciet in sectie 6, zodat ze niet als verrassing komen bij een volgende ontwikkelronde.

## 9. Bijlagen

### 9.1 Commando's

Backend:

```bash
bash backend/scripts/test-backend-local.sh
# 98 passed, 94% coverage
```

Frontend, met een actieve stack:

```bash
cd frontend
PLAYWRIGHT_BASE_URL=http://localhost:5173 bunx playwright test
# 122 passed (1.3m)
```

Statische controles:

```bash
bun run lint
cd frontend && bun run build
uv run prek run --all-files
```

### 9.2 Bewijsstukken

- Bugissues: [#56](https://github.com/yarovlas/vibeboard/issues/56) en [#57](https://github.com/yarovlas/vibeboard/issues/57)
- Fix-PR: [#55](https://github.com/yarovlas/vibeboard/pull/55)
- Responsieve UI: PR [#58](https://github.com/yarovlas/vibeboard/pull/58)
- UI-polish: PR [#59](https://github.com/yarovlas/vibeboard/pull/59)
- Testsuite: `backend/tests/` en `frontend/tests/`
- CI-workflows: `.github/workflows/test-backend.yml` en `.github/workflows/playwright.yml`
