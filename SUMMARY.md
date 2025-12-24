# FIRELOCK BLUEBIRD - Development Summary

**Date:** 2025-12-14

## Project Overview

Built an army list builder for the **Firelock 198X** tabletop wargame with a 1980s terminal aesthetic. The project is named "BLUEBIRD" after the in-universe Federal intelligence reconnaissance system.

## What Was Accomplished

### Planning Phase
- Reviewed pretalk conversation about Firelock 198X lore and factions
- Defined MVP requirements and tech stack
- Created implementation plan with 4 phases

### Tech Stack Chosen
- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS v4
- **Backend:** Node.js + Fastify + Prisma ORM + Zod
- **Database:** PostgreSQL
- **Infrastructure:** Docker Compose for local dev

### Phase 1: Project Setup (Completed)
- Initialized monorepo structure (`frontend/`, `backend/`, `infra/`)
- Set up Vite + React + TypeScript frontend
- Set up Fastify + Prisma backend
- Configured Docker Compose with PostgreSQL, backend, and frontend services
- Downloaded IBM VGA 8x16 font from int10h.org

### Phase 2: Core Features (Completed)
- **Database Schema:** Created Prisma models for `ArmyList`, `TacticalGroup`, and `Unit`
- **API Endpoints:**
  - `POST /api/lists` - Create army list
  - `GET /api/lists/:id` - Retrieve army list
  - `GET /api/health` - Health check
- **Terminal UI Components:**
  - `Terminal` - Main wrapper with CRT scanlines, header, footer
  - `Box`, `Separator`, `DoubleSeparator` - Layout elements
  - `Message` - Info/success/error messages
  - `Cursor`, `Prompt` - Blinking cursor effects
- **Army Form:**
  - Dynamic tactical groups (add/remove)
  - Dynamic unit entries with E/D/T designation
  - Point tracking with over-cap warning
  - All four factions supported
- **View List Page:**
  - Read-only display of army lists
  - Shareable URLs (`/list/{id}`)
  - Copy link functionality

### Terminal Aesthetic
- Amber phosphor color scheme (`#FFB000` on `#1A1100`)
- CSS variables for easy theme switching (green phosphor alternative included)
- CRT scanline overlay effect
- IBM VGA 8x16 monospace font
- Box-drawing characters: `═`, `─`, `║`, `│`, `╔`, `╗`, `╚`, `╝`
- Shade characters: `░`, `▒`, `▓`, `█`
- Text glow effects

### Army List Parser (Completed)
- Built Lezer grammar for parsing army list text format
- Supports: headers, tactical groups, units, mounted units
- Optional command clause (some lists only have points)
- Blank line handling between groups
- Numeric mount types `[1]`-`[9]` for tercio-style unit organization
- Quantity multipliers `(x2)`, `(x3)` after units
- Token precedence rules to handle greedy Name token
- 10 test files in `/test/*.army` - all passing

### Bug Fixes
- Fixed TypeScript `verbatimModuleSyntax` errors (type-only imports)
- Fixed Prisma OpenSSL issue in Alpine Docker container
- Removed deprecated `version` from docker-compose.yml
- Downgraded from Prisma 7 to Prisma 5 for stability

## Project Structure

```
firelock_bluebird/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Terminal/      # CRT terminal UI
│   │   │   └── ArmyForm/      # Form components
│   │   ├── pages/
│   │   │   ├── Home.tsx       # Entry form
│   │   │   └── ViewList.tsx   # Read-only view
│   │   └── types/             # TypeScript interfaces
│   └── public/fonts/          # IBM VGA font
├── backend/
│   ├── src/
│   │   ├── routes/            # API endpoints
│   │   └── schemas/           # Zod validation
│   └── prisma/                # Database schema
├── docker-compose.yml
└── README.md
```

## Running the Project

```bash
docker compose up -d
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Database: PostgreSQL on port 5432

## Next Steps (Future Sessions)

### Phase 3: Polish
- [ ] Add typing animation for system messages
- [ ] Improve form validation with inline errors
- [ ] Add loading states/spinners
- [ ] Mobile responsiveness
- [ ] More CRT effects (subtle curvature, flicker)

### Phase 4: Infrastructure
- [ ] Create production Dockerfiles
- [ ] Write Ansible playbooks for Oracle Cloud deployment
- [ ] Configure Nginx with SSL (Let's Encrypt)
- [ ] Set up Cloudflare DNS
- [ ] Document deployment process

### Future Enhancements
- [ ] Unit images matched by name
- [ ] Sidebar with unit tooltips/stats
- [ ] PDF export of army lists
- [ ] Print stylesheet
