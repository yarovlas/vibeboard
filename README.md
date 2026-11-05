# Vibeboard

Vibeboard is een whiteboard-app voor brainstorms, workshops en sprintplanningen. Je legt ideeën vast op post-its, tekent er vrij bij en beheert dezelfde post-its daarna als taken op een Kanban-bord. De boardinhoud wordt per gebruiker opgeslagen, dus als je een board later opnieuw opent, staat de indeling er nog precies zoals je hem achterliet.

Dit project is mijn uitwerking van de Vibeboard-casus. Ik ben begonnen met de FastAPI full-stacktemplate en heb de voorbeelditems vervangen door boards, post-its en tekeningen. De frontend is React met TanStack Router en TanStack Query, de canvaslaag is Konva en de backend is FastAPI met SQLModel en PostgreSQL.

[![Backend tests](https://github.com/yarovlas/vibeboard/actions/workflows/test-backend.yml/badge.svg)](https://github.com/yarovlas/vibeboard/actions/workflows/test-backend.yml)
[![Playwright](https://github.com/yarovlas/vibeboard/actions/workflows/playwright.yml/badge.svg)](https://github.com/yarovlas/vibeboard/actions/workflows/playwright.yml)

Laatst bijgewerkt: 5 november 2026.

## Wat je kunt doen

**Whiteboards en post-its**

- Meerdere whiteboards aanmaken en openen. Na inloggen opent het laatst gebruikte board; een nieuwe gebruiker krijgt automatisch een leeg board.
- Post-its plaatsen met de knop of met een dubbelklik op het canvas, de tekst direct intypen en later aanpassen.
- Post-its verwijderen met een bevestiging, van kleur wisselen en vrij over een onbegrensd canvas slepen. De positie blijft bewaard na een reload.
- Post-its met dezelfde kleur in een map groeperen. Een map heeft een teller, een eigen naam, klapt open en dicht en kan worden verplaatst.
- Vrij tekenen met een pen, met instelbare kleur en lijndikte. Tekeningen worden apart van post-its opgeslagen en bij het openen hersteld. Undo en redo werken met knoppen en met `Ctrl+Z` / `Ctrl+Y`.
- Zoomen met de knoppen of het muiswiel (25%–400%) en pannen met de linkermuisknop op een lege plek, de middelste muisknop of `Spatie` + slepen.

**Taken en Kanban**

- Elke post-it heeft een status (TODO, IN PROGRESS, DONE), een optionele prioriteit (LOW, MEDIUM, HIGH) en een optionele vervaldatum. Bij hover zie je een korte samenvatting.
- Dezelfde post-its verschijnen in een Kanban-bord met drie kolommen. Kaarten zijn tussen kolommen te slepen; alleen de status wordt dan opgeslagen.
- Kaarten zijn vanuit Kanban te bewerken en te verwijderen, zonder de positie op het whiteboard kwijt te raken.
- Sorteren op prioriteit, vervaldatum of handmatige volgorde, filteren op status en prioriteit, en zoeken in titel en inhoud. Filters en zoekopdracht staan in de URL, zodat een reload of gedeelde link dezelfde weergave geeft.

**Accounts en interface**

- Registreren, inloggen, uitloggen en wachtwoord herstellen via e-mail. Wachtwoorden worden gehasht en de API controleert per verzoek of een board bij de ingelogde gebruiker hoort.
- De interface werkt op desktop, laptop en tablet, en blijft bruikbaar op een telefoon: de header, whiteboard-toolbar en Kanban-filters schalen mee en de Kanban-kolommen scrollen horizontaal.
- Lichte en donkere modus, zichtbare focusstates en korte feedback via toasts na acties als verwijderen, bewerken en groeperen.

## Techniek

| Onderdeel | Keuze |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, TanStack Router, TanStack Query |
| Styling | Tailwind CSS 4 en shadcn/ui |
| Canvas | Konva en react-konva |
| Backend | FastAPI, SQLModel, Pydantic |
| Database | PostgreSQL 18, migraties met Alembic |
| Authenticatie | JWT en Argon2-wachtwoordhashes |
| Tests | Pytest (API) en Playwright (end-to-end) |
| Kwaliteitscontrole | Biome, Ruff, mypy, ty, typos en GitHub Actions |

## Lokaal draaien

Nodig: Docker, [uv](https://docs.astral.sh/uv/) en [Bun](https://bun.sh/).

Start eerst PostgreSQL en Mailpit:

```bash
docker compose up -d db mailpit
```

Daarna de backend, vanuit `backend/`:

```bash
uv sync
uv run bash scripts/prestart.sh
uv run fastapi dev
```

En in een tweede terminal de frontend, vanuit de projectroot:

```bash
bun install
bun run dev
```

De applicatie staat op <http://localhost:5173>. De API draait op <http://localhost:8000> en de interactieve API-documentatie op <http://localhost:8000/docs>. Mailpit, waar de wachtwoordresetmails binnenkomen, vind je op <http://localhost:8025>.

De lokale admin is `admin@example.com`. Het bijbehorende wachtwoord staat in `.env` onder `FIRST_USER_PASSWORD`.

Wil je de gebouwde frontend door FastAPI laten serveren, dan bouw je hem vanuit `frontend/` met `bun run build` en open je <http://localhost:8000>. Meer uitleg over Docker Compose, de `.env` en deployment staat in [development.md](./development.md).

## Testen

De frontend-tests draaien tegen een actieve stack:

```bash
cd frontend
bunx playwright test
```

De backend-tests gebruiken een aparte database (`app_test`) en laten de ontwikkeldatabase met rust:

```bash
bash backend/scripts/test-backend-local.sh
```

De volledige suite bestaat uit 98 Pytest-tests en 121 Playwright-tests. De backend haalt 94% regelcoverage. Wat er precies is getest en wat de resultaten waren, staat in het [testplan](./docs/Testplan.md) en het [testrapport](./docs/Testrapport.md).

## Projectstructuur

```
backend/
  app/api/routes/       boards, post-its, strokes, login en users
  app/models.py         SQLModel-modellen en API-schema's
  app/alembic/          databasemigraties
  tests/                Pytest-suite
frontend/
  src/components/Boards whiteboard, Kanban, post-its en mappen
  src/lib/              boardgeometrie, viewport, filters en helpers
  src/routes/           login, boards, boarddetail en settings
  tests/                Playwright-suite
docs/
  Testplan.md
  Testrapport.md
```

## Een paar ontwerpkeuzes

**Konva in plaats van losse DOM-elementen.** Een whiteboard kan veel post-its en honderden tekenlijnen bevatten. Die allemaal als DOM-knooppunten laten bestaan wordt op den duur traag, en dan is één canvaslaag met eigen hitdetectie eenvoudiger. De keerzijde is dat toegankelijkheid niet vanzelf komt: daarom staan de post-its en mappen ook in verborgen lijsten voor schermlezers, en heeft het Kanban-bord een toetsenbordbediening via dnd-kit.

**Boardcoördinaten staan los van de viewport.** Een post-it bewaart zijn positie in boardcoördinaten. Zoomen en pannen veranderen alleen de camera, niet de opgeslagen data. Dat is ook de reden dat de zoom- en panstand na een reload terug naar 100% gaat: de inhoud blijft, de camera is bewust vluchtig.

**Optimistische updates, API blijft de bron van waarheid.** Bij slepen, bewerken en statuswijzigingen past de UI de cache eerst aan en stuurt daarna de wijziging naar de API. Als de server weigert, wordt de cache opnieuw opgehaald. Daardoor voelt slepen direct, zonder dat mislukte verzoeken stil blijven hangen.

**Groeperen is een expliciete actie.** Een map wordt niet automatisch gemaakt zodra twee post-its dezelfde kleur hebben; je drukt zelf op Groeperen. Daardoor kun je eerst vrij kleuren gebruiken en pas daarna opruimen. De mappenindeling (namen, posities en welke post-its erin zitten) wordt lokaal in de browser bewaard; welke kleuren zijn ingeklapt staat op het board zelf.

## Wat er bewust niet in zit

- **Tags** (PBI-13, issue #20) zijn niet gebouwd. Die wens stond op `wont-have` en is buiten de oplevering gebleven.
- **Realtime samenwerking** ontbreekt. Meerdere gebruikers kunnen wel hun eigen boards hebben, maar niet tegelijk in hetzelfde board werken.
- **De tabelweergave** is tijdens de Kanban-ontwikkeling verwijderd. De casus noemt hem, maar de Kanban-weergave dekt dezelfde taken en houdt het aantal views klein.
- **Mobiel tekenen en pannen** zijn niet als aparte workflow uitgewerkt. De responsive tests controleren de layout op 375×667 en 820×1180 in een desktopbrowser, niet op fysieke toestellen.
- **Mappen verplaatsen** verplaatst de map zelf. De post-its erin houden hun eigen boardpositie; na uitklappen staan ze dus niet automatisch onder de map.
- **Whiteboards verwijderen** kan via de API, maar heeft nog geen knop in het overzicht.

## Documentatie

- [Testplan](./docs/Testplan.md) — scope, strategie, omgeving en testgevallen
- [Testrapport](./docs/Testrapport.md) — resultaten en de gedocumenteerde bugs #56 en #57
- [Ontwikkelomgeving](./development.md) — Docker Compose, `.env`, migraties en deployment
- [Backend](./backend/README.md) en [frontend](./frontend/README.md) — specifieke instructies per laag

## Licentie

Dit project valt onder de MIT-licentie, net als de template waarop het is gebaseerd. Zie [LICENSE](./LICENSE).
