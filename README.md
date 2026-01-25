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


## Project Structure
TODO: update this

## Game Data Extraction (Required)

  This app requires game data files that are not included in the repository. (because I wanted to try a private repo used in a public one)

  A lot of it is created automatically now, but TODO: update to current procedure.

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

See the `infra/` directory for deployment guides.

## License

MIT

---

