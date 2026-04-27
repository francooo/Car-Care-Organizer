# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## AutoCare AI (artifacts/autocare)

React Native / Expo mobile app for vehicle maintenance AI diagnostics.

### Screens
- **(auth)/login** — Login screen with email/password and Google mock
- **(auth)/signup** — Sign up with name, email, password, terms
- **(tabs)/index** — Garage: vehicle cards with fluid gauges (Garagem)
- **(tabs)/scan** — Camera scanner with AI overlay and detection points
- **(tabs)/chat** — AI Mechanic specialist chat (Especialista)
- **(tabs)/profile** — User profile and settings
- **diagnostic/[vehicleId]** — Full fluid diagnosis report with FluidCards
- **guide/[fluidType]** — Animated step-by-step maintenance guide
- **history** — Maintenance history with fluid type filters
- **vehicle/new** — Add vehicle with make/model/year pickers
- **vehicle/[id]** — Edit / delete vehicle

### Context Providers
- `AuthContext` — mock JWT auth with AsyncStorage persistence
- `VehicleContext` — vehicle CRUD with mock data (2 sample vehicles)
- `ChatContext` — AI chat with mock specialist responses
- `HistoryContext` — maintenance records with AsyncStorage

### Design Tokens
- Primary: `#1D4ED8`, Success: `#059669`, Warning: `#D97706`, Danger: `#DC2626`
- Dark mode supported via `useColors()` hook
- Inter font family (400/500/600/700)

### Dependencies
- `@react-native-async-storage/async-storage` — local persistence
- `expo-image-picker` — gallery photo for scanner
- `expo-file-system` (^55) — copies picked photos into `Paths.document/vehicle-photos/` so URIs survive Expo Go cache eviction
- Pre-installed: expo-router, @expo/vector-icons, react-native-reanimated, react-native-keyboard-controller

### Expo Go font / image gotchas
- `@expo/vector-icons` v15 no longer auto-bundles fonts in Expo Go — `_layout.tsx` spreads `...Feather.font` into the `useFonts` call, otherwise icons render as empty squares.
- `ImagePicker` returns cache URIs (e.g. `cache/ImagePicker/xxx.jpg`) that Android wipes between sessions. `lib/persistImage.ts` copies the picked file into the document directory before persisting the URI.
