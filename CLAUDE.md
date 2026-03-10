# skillsMN Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-10

## Active Technologies
- TypeScript 5.x (strict mode) + Node.js LTS (v20+) + Electron (master, 001-skill-manager, 002-local-skill-management, 003-ai-skill-generation)
- React 18+ + Tailwind CSS + Monaco Editor + Claude Agent SDK + skill-creator skill (001-skill-manager, 003-ai-skill-generation)
- React + Tailwind CSS + Monaco Editor (002-local-skill-management)
- GitHub REST API v3 (004-public-skill-discovery)
- Jest + Spectron/Playwright (003-ai-skill-generation)
- GitHub REST API v3 (004-public-skill-discovery)

## Project Structure

```text
src/
├── main/              # Electron main process (backend)
│   ├── models/
│   ├── services/
│   ├── ipc/
│   └── utils/
├── renderer/          # Electron renderer process (frontend)
│   ├── components/
│   ├── services/
│   └── styles/
└── shared/            # Shared code

tests/
├── unit/
└── integration/
```

## Commands

npm run build    # Compile TypeScript
npm test         # Run Jest tests
npm start        # Launch Electron app
npm run lint     # ESLint code checking

## Code Style

TypeScript 5.x (strict mode): Use strict type checking, avoid `any`, prefer interfaces over types for object shapes. Follow ESLint recommended rules.

## Recent Changes
- master: Added [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]
- 004-public-skill-discovery: Added GitHub REST API v3 integration for public skill discovery
- master: Added [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
