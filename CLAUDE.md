# skillsMN Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-09

## Active Technologies
- [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION] (master)
- [if applicable, e.g., PostgreSQL, CoreData, files or N/A] (master)

- TypeScript 5.x (strict mode) + Node.js LTS (v20+) + Electron (002-local-skill-management)
- React + Tailwind CSS + Monaco Editor (002-local-skill-management)

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

- 002-local-skill-management: Added TypeScript 5.x + Electron + React + Tailwind CSS + Monaco Editor

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
