# ERD — Vibeboard

Dit ERD is afgeleid van `backend/app/models.py` en de Alembic-migraties. Het toont de vier entiteiten en de relaties die samen het whiteboard, de Kanban-weergave en de tekeningen opslaan.

```mermaid
erDiagram
    USER ||--o{ BOARD : "owns"
    BOARD ||--o{ POSTIT : "contains"
    BOARD ||--o{ STROKE : "contains"

    USER {
        uuid id PK
        string email UK
        string full_name
        string hashed_password
        boolean is_active
        datetime created_at
    }
    BOARD {
        uuid id PK
        string name
        uuid owner_id FK
        datetime created_at
        datetime updated_at
        jsonb collapsed_colors
    }
    POSTIT {
        uuid id PK
        uuid board_id FK
        string title
        text content
        float x
        float y
        string color
        enum status
        enum priority
        date due_date
    }
    STROKE {
        uuid id PK
        uuid board_id FK
        jsonb points
        string color
        float width
        string tool
        datetime created_at
    }
```

## Relaties en regels

- Een **User** bezit nul of meer **Boards** (`Board.owner_id` → `User.id`, `ON DELETE CASCADE`).
- Een **Board** bevat nul of meer **PostIts** en **Strokes** (`board_id` → `Board.id`, `ON DELETE CASCADE`).
- `PostIt.status` is een enum met `TODO`, `IN_PROGRESS` en `DONE`; `PostIt.priority` is `LOW`, `MEDIUM` of `HIGH` (optioneel).
- `PostIt.x` en `PostIt.y` bewaren de positie in boardcoördinaten; `color` bewaart de kleur uit het vaste palet.
- `Stroke.points` en `Board.collapsed_colors` worden als PostgreSQL `JSONB` opgeslagen.
- De cascade-regels zijn expliciet vastgelegd in migratie `1a31ce608336_add_cascade_delete_relationships.py`.
