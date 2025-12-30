# FIRELOCK BLUEBIRD

Army list builder for **Firelock 198X** tabletop wargame with a 1980s terminal aesthetic.
This is very much in development and not meant to be spun up in any sensible way without a lot of modification.

```
╔══════════════════════════════════════════════════════════════════════════╗
║  BLUEBIRD TERMINAL v1.0 - DREKFORT M.D.C. INTELLIGENCE DIVISION          ║
║  MAIN THREATS DIRECTORATE - ARMY SIGHTING REPORT SYSTEM                  ║
╚══════════════════════════════════════════════════════════════════════════╝
```

## Features (planned or implemented)

- Create and share army lists for Firelock 198X (planned)
- 1980s terminal aesthetic with IBM VGA font and CRT effects (implemented & working on)
- Support for all four factions as of end of 2025: (implemented)
  - Federal States-Army
  - Army of the Ebon Forest
  - The New Rygolic Host
  - Atom Barons of Santagria
- E/D/T unit sub-designations, with unit type and ability checking for error correction (implemented)
- Tactical groups (implemented)
- GLR-grammar based autocorrection and autocomplete with Lezer and Codemirror (implemented)
- Unit info with unit & weapon ability tooltip on hover (implemented & wokring on)
- Shareable links for army lists (planned)

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- TailwindCSS
- React Router
- React Hook Form

### Backend
- Node.js + Fastify
- Prisma ORM
- PostgreSQL
- Zod validation

### Infrastructure
- Docker + Docker Compose
- Ansible for deployment
- Nginx reverse proxy

## Development

### Prerequisites

- Node.js 22+
- Docker and Docker Compose
- PostgreSQL (or use Docker)

### Quick Start

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd firelock_bluebird
   ```

2. Start with Docker Compose:
   ```bash
   docker compose up -d
   ```

3. This makes it a bit less quick:
   see below for game data entry

4. Access the application:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

### Manual Development Setup

1. Start PostgreSQL:
   ```bash
   docker compose up -d db
   ```

2. Set up the backend:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npx prisma db push
   npm run dev
   ```

3. Set up the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/lists` | Create a new army list |
| GET | `/api/lists/:id` | Get an army list by ID |
| GET | `/api/health` | Health check endpoint |

## Project Structure

```
firelock_bluebird/
├── frontend/           # React frontend
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── pages/      # Route pages
│   │   └── types/      # TypeScript types
│   └── public/
│       └── fonts/      # IBM VGA font
│
├── backend/            # Fastify backend
│   ├── src/
│   │   ├── routes/     # API routes
│   │   └── schemas/    # Zod validation
│   └── prisma/         # Database schema
│
├── infra/              # Infrastructure
│   ├── ansible/        # Deployment playbooks
│   └── nginx/          # Nginx config
│
└── docker-compose.yml  # Local development
```

## Game Data Extraction (Required)

  This app requires game data files that are not included in the repository due to IP considerations.

  ### 1. Faction Data
  Create JSON files in `frontend/src/data/factions/` and `frontend/public/data/factions/`:

  ```json
  {
    "id": "faction_id",
    "name": "Faction Name",
    "units": [
      {
        "id": "unit_id",
        "name": "unit name lowercase",
        "displayName": "UNIT DISPLAY NAME",
        "points": 35,
        "stats": { ... },
        "abilities": [ ... ]
      }
    ]
  }
  ```

  check frontend/utils/armyListParser for an automated way to do this

  2. Unit Images

  Place unit PNG images in frontend/public/unit_images/
  Filename format: {unit_id}.png

  3. Generate ASCII Art

  cd frontend/scripts/ascii-batch-generator
  npm install
  node index.ts

  4. Rules Text

  Create .txt files in:
  - frontend/public/rules/weapon_abilities/
  - frontend/public/rules/unit_abilities/

  Each file should contain the rule description (filename = ability name).

  ---

## Deployment

See the `infra/` directory for Ansible playbooks and deployment guides.

## License

MIT

---

