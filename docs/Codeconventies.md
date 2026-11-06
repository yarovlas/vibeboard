# Codeconventies — Vibeboard

Dit document beschrijft de afspraken die in deze repository worden gebruikt. Het is geen theoretisch ideaalbeeld: het volgt de structuur, tooling en schrijfwijze die op dit moment in de code staan. Nieuwe code hoort zich aan dezelfde lijn te houden, zodat het project ook na de oplevering leesbaar blijft.

## 1. Uitgangspunten

- **Code en codecommentaar zijn Engels.** Denk aan functienamen, types, test-id's en uitleg in de buurt van lastige logica.
- **Gebruikersdocumentatie en testdocumentatie zijn Nederlands.** De README, het testplan, het testrapport en deze conventies zijn Nederlands.
- **Commitberichten zijn Nederlands.** De types blijven Engels (`feat`, `fix`, `test`), de beschrijving is Nederlands en in de gebiedende wijs.
- **Eén taakgroep per branch en pull request.** Een PBI mag uit meerdere commits bestaan, maar niet uit meerdere losse onderwerpen.
- **Tooling is leidend.** Als Biome, Ruff, mypy, ty of typos iets afkeuren, wordt de code aangepast en niet de regel uitgezet.

## 2. Git, branches en pull requests

### 2.1 Branchnamen

| Soort werk | Patroon | Voorbeeld |
| --- | --- | --- |
| Feature | `feat/pbi-xx-korte-naam` | `feat/pbi-22-responsieve-ui` |
| Bugfix | `fix/korte-naam` of `fix/pbi-xx-korte-naam` | `fix/postit-editor-enter` |
| Documentatie | `docs/korte-naam` | `docs/portfolio-documentatie` |
| Refactor | `refactor/korte-naam` | `refactor` |
| Meerdere PBI's | `feat/pbi-xx-yy-zz-korte-naam` | `feat/pbi-17-18-19-postits-sorteren-filteren-zoeken` |

Branchnamen zijn lowercase en gebruiken koppeltekens. Bestandsnamen volgen de tabel hierboven: componenten zijn PascalCase, helpers en tests zijn kebab-case. Gebruik geen spaties in bestandsnamen.

### 2.2 Commitberichten

Formaat:

```
<type>(<scope>): <korte beschrijving>
```

De scope is meestal een PBI (`PBI-20`), een laag (`frontend`, `backend`) of een klein onderdeel (`tests`). De beschrijving begint met een werkwoord in de gebiedende wijs en heeft geen punt aan het einde.

| Type | Waarvoor | Voorbeeld |
| --- | --- | --- |
| `feat` | Nieuwe functionaliteit | `feat(PBI-22): maak de UI responsief voor telefoon en tablet` |
| `fix` | Bugfix of regressie | `fix(PBI-20): sla de post-it op met Enter of een klik naast de editor` |
| `test` | Tests toevoegen of bijwerken | `test(PBI-22): voeg Playwright-tests toe voor de responsieve UI` |
| `refactor` | Gedrag ongewijzigd, structuur verbetert | `refactor(frontend): verwijder de tijdelijke tabelweergave` |
| `style` | Formatting zonder gedragswijziging | `style(frontend): biome-formatter aan postits-status.spec.ts` |
| `chore` | Tooling, scripts, configuratie | `chore: voeg lokaal backend-testscript en Nederlandse typos-woorden toe` |
| `docs` | Documentatie | `docs: voeg testplan en testrapport toe` |

Een feature-commit en de bijbehorende testcommit staan bij voorkeur los van elkaar. Zo blijft in de geschiedenis zichtbaar wat de implementatie is en wat de dekking is. Kleine fixes die tijdens het testen nodig zijn, mogen als `fix` in dezelfde branch.

### 2.3 Pull requests

- De titel begint met de PBI of het onderwerp, bijvoorbeeld `PBI-22: Responsieve UI voor telefoon, tablet en desktop`.
- De beschrijving bevat een korte samenvatting, de belangrijkste wijzigingen, de acceptatiecriteria en de uitgevoerde controles.
- Een PR sluit de bijbehorende issue met `Closes #29` (of meerdere issues).
- Er wordt pas gemerged als de CI groen is: backendtests, Playwright in vier shards, Docker Compose, pre-commit en zizmor.
- Na de merge wordt de branch verwijderd en gaat `master` mee met `git pull --ff-only origin master`.

## 3. Frontend

### 3.1 Structuur en naamgeving

| Onderdeel | Conventie | Voorbeeld |
| --- | --- | --- |
| Componenten | PascalCase-bestand en named export | `WhiteboardCanvas.tsx` → `export function WhiteboardCanvas` |
| Hooks | `use` + camelCase | `useMobile.ts`, `useCustomToast.ts` |
| Losse helpers | kebab-case | `board-geometry.ts`, `kanban-controls.ts` |
| Routes | bestandsnaam volgens TanStack Router | `boards.$boardId.tsx` |
| Tests | `*.spec.ts` in `frontend/tests/` | `whiteboard-zoom.spec.ts` |
| Test-id's | kebab-case, Engels | `data-testid="post-it-editor"` |

Gebruik de path alias `@/` voor imports uit `src/`. Biome sorteert de imports; handmatig sorteren is niet nodig.

De mappen `src/client/`, `src/components/ui/` en `src/routeTree.gen.ts` zijn gegenereerd of door shadcn beheerd. Die pas je niet met de hand aan. De API-client wordt opnieuw gegenereerd met:

```bash
bash scripts/generate-client.sh
```

### 3.2 React en TypeScript

- `strict` staat aan in `tsconfig.json`; `noUnusedLocals` en `noUnusedParameters` staan ook aan.
- Gebruik functiecomponenten met een named export. Geen class components.
- Props krijgen een eigen `interface` boven de component.
- Vermijd `any` in nieuwe code. Het staat in Biome niet volledig uit, maar het is geen vrijbrief.
- Gebruik `cn()` uit `@/lib/utils` voor conditionele Tailwind-classes.
- Commentaar legt **waarom** iets gebeurt, niet **wat** de code doet. Voorbeeld: uitleg waarom een muisklik met een tolerantie van 3 px wordt genegeerd, niet "hier wordt de muisklik afgehandeld".

### 3.3 Data en state

- Alle serverdata loopt via TanStack Query. Query-opties staan in `src/lib/board-queries.ts`, query keys in `src/lib/query-keys.ts`.
- Gebruik nooit losse string-arrays als query key; gebruik `queryKeys.boards.postits(boardId)` en vergelijkbare helpers.
- Mutaties werken optimistisch: eerst de cache bijwerken, dan de API aanroepen. Bij een fout wordt de cache geïnvalideerd of teruggezet.
- De API is de bron van waarheid. Na een geslaagde mutatie wordt het boarddetail geïnvalideerd waar dat nodig is.
- View-only voorkeuren (zoals sortering) staan in componentstate. Filters en zoekopdracht staan in de URL. Boarddata staat in de database.

### 3.4 Styling

- Gebruik Tailwind CSS en de shadcn/ui-componenten. Kleuren, randen en ringen komen uit de tokens in `src/index.css` (`bg-background`, `text-muted-foreground`, `border-border`, `ring-ring`).
- Hardcoded kleuren zijn alleen toegestaan voor het post-it-palet, de prioriteitskleuren en de statuskleuren. Die horen bij de functionele data, niet bij het thema.
- Mobile-first: basisclasses voor kleine schermen, daarna `sm:`, `md:` en `lg:`.
- Gebruik dezelfde paginastructuur als de rest van de app: `mx-auto w-full max-w-7xl`, `gap-6`, `p-4 sm:p-6 md:p-8` waar van toepassing.
- Elke interactieve knop heeft een zichtbare focusstate en een toegankelijke naam. Een icoon-only knop krijgt een `aria-label` en een `title`.
- Animaties zijn subtiel en respecteren `motion-safe:`.

### 3.5 Canvas (Konva)

- Boardcoördinaten en viewportcoördinaten blijven gescheiden. Een post-it slaat zijn positie op in boardcoördinaten; zoom en pan veranderen alleen de camera.
- Het canvas is onbegrensd. Voeg geen clamp toe op post-it- of mapposities.
- Gebruik geen schaling voor hover- of mountanimaties: dat verschuift hitareas. Fade en schaduw zijn veilig.
- Post-its en mappen hebben een verborgen `<ul>` met dezelfde inhoud voor schermlezers. Nieuwe canvasobjecten krijgen dezelfde behandeling.
- Lokale-opslagsleutels beginnen met `vibeboard:` en zijn boardspecifiek, bijvoorbeeld `vibeboard:folder-positions:${boardId}`.

### 3.6 Fouten en feedback

- API-fouten gaan via `handleError(error, showErrorToast)` uit `@/lib/errors`, zodat verlopen tokens centraal worden afgehandeld.
- Succesfeedback gaat via `useCustomToast()`, dat sonner gebruikt.
- Een destructieve actie vraagt om bevestiging in een dialoog. Annuleren stuurt geen request.
- Een mislukte mutatie laat de gebruiker niet met een optimistische maar onjuiste UI achter: cache invalideren of terugzetten.

### 3.7 Tests

- Eén spec-bestand per functioneel gebied, in `frontend/tests/`.
- Testbeschrijvingen zijn Nederlands en beschrijven gedrag, bijvoorbeeld "sleept een post-it na het pannen naar de juiste boardpositie".
- Gebruik `getByRole`, `getByLabel` en `getByTestId` in die volgorde. Voeg een `data-testid` alleen toe als rol of label niet volstaat.
- Elke test die data aanmaakt, gebruikt een nieuwe gebruiker via `createUser()` en `logInUser()`.
- Wacht op een echte gebeurtenis (`waitForResponse`, `expect(...).toBeVisible()`), niet op een vaste `waitForTimeout`, tenzij een timer onderdeel van het gedrag is.
- Een bugfix krijgt een regressietest die zonder de fix zou falen.

## 4. Backend

### 4.1 Structuur

- Routebestanden staan per resource in `backend/app/api/routes/`: `boards.py`, `postits.py`, `strokes.py`, `login.py`, `users.py`.
- Modellen en API-schema's staan bij elkaar in `backend/app/models.py`.
- Database-toegang en security staan in `backend/app/core/`.
- Alembic-migraties staan in `backend/app/alembic/versions/` en worden nooit achteraf aangepast. Een nieuwe modelswijziging krijgt een nieuwe migratie.

### 4.2 Stijl

- Python 3.14, type hints op functies en duidelijke return-types.
- Ruff is leidend voor linting en formatting; `print()` is niet toegestaan in applicatiecode.
- mypy en ty staan op strict/error-on-warning. Nieuwe code moet beide halen.
- Gebruik SQLModel voor modellen en Pydantic voor request/response-schema's.
- Routefuncties zijn klein en doen één ding: input valideren, ownership controleren, database bijwerken, response teruggeven.
- Bij een update wordt `board.updated_at` bijgewerkt, zodat het board in het overzicht bovenaan komt.
- Lijsten die als JSON worden opgeslagen (zoals `points` en `collapsed_colors`) gebruiken PostgreSQL `JSONB`.

### 4.3 Autorisatie en fouten

- Elke boardgebonden route controleert eigenaarschap via `get_owned_board()` of dezelfde controles in de routemodule.
- Een niet-bestaand object geeft `404`. Een object van een andere gebruiker geeft `403`.
- Gebruik `HTTPException` met een korte, Engelse `detail`-tekst.
- Verplaats nooit een check naar de frontend. De API is de beveiligingsgrens.

### 4.4 Backendtests

- Testbestanden volgen de route: `backend/tests/api/routes/test_boards.py`, `test_postits.py`, enzovoort.
- Testfuncties beginnen met `test_` en hebben een beschrijvende naam.
- Gebruik de fixtures uit `conftest.py` (`client`, `db`, `first_user_token_headers`, `normal_user_token_headers`).
- Elke test ruimt zijn eigen data op via de bestaande teardown. Draai de suite nooit tegen de ontwikkeldatabase: gebruik `bash backend/scripts/test-backend-local.sh`, dat `app_test` gebruikt.
- De suite moet minimaal 90% coverage houden; de huidige stand is 94%.

## 5. Documentatie

- `README.md` is het startpunt: wat de app doet, hoe je hem start en waar de rest staat.
- `docs/Testplan.md` en `docs/Testrapport.md` worden bijgewerkt als de scope of de resultaten veranderen.
- `docs/Codeconventies.md` (dit bestand) beschrijft de afspraken; wijzig het als een conventie bewust verandert.
- Gebruik relatieve links tussen documenten in de repository, en volledige GitHub-links in de wiki.
- Documentatie is Nederlands; codecommentaar en API-`detail`-teksten zijn Engels.

## 6. Definition of Done

Een taak is pas klaar als:

- [ ] De functionaliteit werkt en de acceptatiecriteria zijn afgedekt.
- [ ] Nieuwe of gewijzigde logica een automatische test heeft.
- [ ] `cd frontend && bun run build` slaagt.
- [ ] `uv run prek run --all-files` groen is.
- [ ] De CI-pipeline groen is.
- [ ] De documentatie is bijgewerkt als gedrag of scope is veranderd.
- [ ] Er geen bekende blokkerende bug openstaat.
- [ ] De wijziging in een PR met een duidelijke beschrijving staat en de bijbehorende issue sluit.

## 7. Handige commando's

```bash
# Frontend lokaal
bun run dev

# Frontend build en types
cd frontend && bun run build

# Frontend end-to-end
cd frontend && PLAYWRIGHT_BASE_URL=http://localhost:5173 bunx playwright test

# Backend lokaal, tegen app_test
bash backend/scripts/test-backend-local.sh

# Alles wat de CI ook doet
uv run prek run --all-files

# API-client opnieuw genereren
bash scripts/generate-client.sh
```
