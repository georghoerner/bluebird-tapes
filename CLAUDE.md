# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Firelock Bluebird is an army list builder for the **Firelock 198X** tabletop wargame. The project features a 1980s terminal aesthetic with IBM VGA fonts, CRT effects, and ASCII art visualizations. Named after the in-universe Federal intelligence reconnaissance system "BLUEBIRD."

## Common Development Commands

### Full Stack Development
```bash
# Start all services (recommended)
docker compose up -d

# Access points:
# - Frontend: http://localhost:5173
# - Backend API: http://localhost:3001
# - Database: PostgreSQL on localhost:5432
```

### Frontend Development
```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Start Vite dev server (port 5173)
npm run build        # Build for production (TypeScript compile + Vite build)
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Backend Development
```bash
cd backend
npm install          # Install dependencies
npm run dev          # Start Fastify dev server with tsx watch (port 3001)
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled production server
npx prisma db push   # Push schema changes to database (no migrations)
npx prisma db:studio # Open Prisma Studio GUI for database inspection
```

### Army List Parser (Lezer)
The project uses a Lezer grammar for parsing army list text format.

```bash
cd frontend/src/utils/armyListParser
node buildParser.js    # Rebuild parser from grammar
node testParser.js     # Run all parser tests
node testParser.js <file.army>  # Detailed output for one file
```

- Grammar file: `frontend/src/utils/armyListParser/armyList.grammar`
- Test files: `test/*.army` (10 files, all passing)
- Key features: Optional command clause, blank lines, numeric mount types [1]-[9], quantity multipliers (x2)

### ASCII Art Generation
The project includes a custom ASCII art generator that converts unit images to colored ASCII representations.

```bash
cd frontend/scripts/ascii-batch-generator
npm install
node index.ts  # Batch process all unit images to ASCII
```

- Script locations: `frontend/scripts/ascii-batch-generator/`
  - `index.ts` - Main batch processor
  - `imageProcessor.ts` - Core ASCII generation logic
  - `formatConverter.ts` - Format conversion utilities
- Input images: `frontend/public/unit_images/`
- Output: `frontend/public/unit_ascii/{unit_id}_{width}.json`
- JSON format: Indexed color palette with character grid

## Architecture & Code Organization

### High-Level Architecture

**Monorepo Structure:**
- `frontend/` - React 18 + TypeScript + Vite SPA
- `backend/` - Fastify API server with Prisma ORM
- `infra/` - Ansible playbooks and Nginx configs for deployment
- Docker Compose orchestrates PostgreSQL, backend, and frontend in development

**Data Flow:**
1. User types army list in text editor (`ArmyTextEditor.tsx`)
2. Autocomplete suggests units from faction JSON files
3. Cursor position triggers unit info and ASCII art panels to update
4. On submit, army list POSTs to `/api/lists` endpoint
5. Backend validates with Zod schemas and persists via Prisma
6. Shareable URL generated with nanoid for viewing (`/list/:id`)

### Frontend Architecture

**Component Hierarchy:**
- `App.tsx` - React Router with routes: `/`, `/list/:id`, `/parser`, `/ascii`
- `pages/Home.tsx` - Main army builder interface
- `components/Terminal/` - CRT terminal aesthetic UI primitives
  - `Terminal.tsx` - Main wrapper with scanlines, header, footer
  - `ExampleBlock.tsx` - Collapsible example army list
  - `Separator.tsx`, `DoubleSeparator.tsx` - Visual dividers
- `components/ArmyEditor/` - Army list editing components
  - `ArmyEditorLayout.tsx` - 3-column responsive grid
  - `ArmyTextEditor.tsx` - Main text input with autocomplete
  - `UnitInfoPanel.tsx` - Shows unit stats and abilities (right panel)
  - `AsciiArtPanel.tsx` - Displays colored ASCII art (far right panel)
  - `StatTooltip.tsx` - Hover tooltips for stats and special rules
  - `TerminalDropdown.tsx` - Terminal-styled faction selector

**Data Management:**
- Faction data: JSON files in `frontend/src/data/factions/` and `frontend/public/data/factions/`
- Unit images: `frontend/public/unit_images/`
- ASCII art: Pre-generated indexed JSON in `frontend/public/unit_ascii/`
- Rules text: `frontend/public/rules/` (includes special abilities, weapon descriptions)
- Custom hook: `useFactionData.ts` - Loads and caches faction JSON

**Styling System:**
- TailwindCSS v4 with custom terminal theme
- CSS variables in `index.css`:
  - `--color-bg`: `#1A1100` (dark amber background)
  - `--color-text`: `#FFB000` (phosphor amber)
  - `--color-dim`: Dimmed amber for secondary text
  - `--color-bright`: Bright amber for highlights
  - Green phosphor alternative theme available
- IBM VGA 8x16 font from int10h.org in `public/fonts/`
- CRT effects: scanlines, text glow, phosphor persistence

### Backend Architecture

**Fastify Server:**
- Entry point: `backend/src/index.ts`
- CORS configured for `http://localhost:5173` (frontend)
- Pretty logging with pino-pretty

**API Routes:**
- `src/routes/armyList.ts` - Army list CRUD operations
  - `POST /api/lists` - Create new army list (returns shareable ID)
  - `GET /api/lists/:id` - Retrieve army list by nanoid
  - `GET /api/health` - Health check endpoint

**Data Model (Prisma):**
```
ArmyList (id, faction, name, pointCap, commandPoints, armyKey)
  └─ TacticalGroup[] (groupName, groupFunction, groupNumber)
       └─ Unit[] (designation [E/D/T], unitName, pointCost, tacomDesignation)
```

- Schema: `backend/prisma/schema.prisma`
- Database: PostgreSQL 16
- Validation: Zod schemas in `backend/src/schemas/`
- IDs: nanoid for shareable URLs (ArmyList.id)

### Key Technical Patterns

**Autocomplete System:**
- Triggered by typing in `ArmyTextEditor`
- Fuzzy matches against faction unit names
- Context-aware: after typing `-`, suggests `[D]`, `[E]`, `[T]` designations
- Position-aware: knows when cursor is on unit name vs designation

**ASCII Art Loading:**
- `AsciiArtPanel` fetches `/unit_ascii/{unit_id}_40.json` dynamically
- JSON format: `{ palette: string[], chars: string, fg: number[], bg: number[] }`
- Renders as `<span>` grid with inline styles from palette

**Unit Info Tooltips:**
- Hover over stats (T6/4/4) or abilities (NBC, Amphibious)
- Fetches explanation from `public/rules/` text files
- Some rules too long for tooltips - need dedicated pages (see TODO.md)

## Important Implementation Details

**Unit ID Normalization:**
- Unit IDs in JSON are lowercase with underscores: `type_68c_appomattox`
- Display names have proper casing: `TYPE 68C "APPOMATTOX"`
- When matching for autocomplete/ASCII, normalize both to lowercase

**Faction Data Dual Location:**
- Development: `frontend/src/data/factions/` (faster iteration)
- Production: `frontend/public/data/factions/` (served statically)
- Decision pending on permanent storage location (see TODO.md)

**Docker Considerations:**
- Backend uses Debian-based image (not Alpine) due to Prisma OpenSSL requirements
- Prisma downgraded from v7 to v5 for stability
- No `version:` field in docker-compose.yml (deprecated)

**Terminal Aesthetic:**
- Box drawing: `═ ─ ║ │ ╔ ╗ ╚ ╝`
- Shading: `░ ▒ ▓ █`
- Always use monospace font (`font-mono` class)
- Preserve scanline overlay effect on all terminal components

## Testing & Debugging

**Frontend:**
- Vite dev server auto-reloads on file changes
- Check browser console for errors
- React DevTools helpful for component state inspection

**Backend:**
- `tsx watch` provides hot reload
- Check terminal logs (pino-pretty formatted)
- Test API with: `curl http://localhost:3001/api/health`

**Database:**
- Access Prisma Studio: `npx prisma db:studio`
- Direct psql access: `docker exec -it bluebird-db psql -U bluebird -d bluebird`

**ASCII Generator:**
- Test with single image before batch processing
- Check color quantization: some colors (green) may not display correctly (known issue in TODO.md)
- Brightness quantization may need adjustment

## Development Workflow Notes

- **No git repository currently**: Project not version controlled yet
- Use `npx prisma db push` for schema changes (not migrations) in development
- Terminal components should always maintain 1980s aesthetic consistency
- When adding new units, update faction JSON and regenerate ASCII art
- Rules text files should be kept concise for tooltip display

## Deployment

Infrastructure code in `infra/` directory:
- Ansible playbooks for Oracle Cloud deployment
- Nginx reverse proxy configuration
- SSL via Let's Encrypt planned
- Cloudflare DNS integration planned

(See SUMMARY.md Phase 4 for deployment roadmap)
