# DOMUS

## Overview
DOMUS is a personal finance fintech application focused on Android, built as a monorepo with Expo SDK 54 and strict TypeScript. Its core principle is an Event Sourcing and "Offline-First" architecture, ensuring full functionality without an internet connection, with synchronization handled via a relay server. A key differentiator and central feature of DOMUS is its robust gamification system, encompassing XP, levels, streaks, archetypes, and seasonal challenges, designed to engage users and encourage financial discipline. The project aims to provide a comprehensive, engaging, and resilient personal finance management experience.

## User Preferences
I prefer detailed explanations of proposed changes.
I want iterative development.
Ask before making major changes.
I like functional programming paradigms where applicable.
Do not make changes to the `packages/sync` folder, as it contains legacy WebRTC code not actively used in the UI.

## System Architecture
**UI/UX Decisions:**
- **Color Scheme:** Six elegant and sober color palettes are defined, each corresponding to a user archetype (e.g., Explorer (teal), Organizer (indigo)). The theme automatically adjusts with archetype evolution.
- **Font:** DM Sans.
- **Navigation:** Leverages Expo Router for file-based navigation, including tab-based screens (`(tabs)`) and modals.
- **Component Reusability:** Emphasizes reusable components, custom hooks, and functional modules.

**Technical Implementations:**
- **Monorepo Structure:** Organized into `/packages` for domain-specific logic (events, domain, storage, gamification, season, personality, onboarding, theme, parsers) and `/app` for the UI layer.
- **Event Sourcing:** The core state management relies on immutable, typed, and signed events. The application state is always reconstructed by replaying events from the `EventStore`, never directly persisted.
- **Offline-First:** The application's core functionality is entirely offline. Synchronization occurs via a relay server when an internet connection is available and a sync group is active.
- **Strict TypeScript:** Ensures strong typing and code quality across the entire codebase.
- **Gamification Core:** XP engine (transaction logging, budget adherence, missions, streaks, season bonuses), level engine, streak engine, season engine (monthly calendar seasons, archetype evaluation, badges), and personality engine (6 archetypes detected by financial behavior, tone engine for adaptive messaging, archetype evolution).
- **Onboarding:** A 7-day adaptive mission system with varying difficulty levels (easy/normal/challenging) that adjusts based on user completion rates, designed to never punish the user.
- **Invoice Parsing:** Supports QR code scanning for NFC-e, direct SEFAZ HTML parsing, and OCR as a fallback. Classification uses keywords and optionally AI (Gemini) with manual correction.
- **Financial Core:** Manages accounts (checking, savings, wallet, credit card), transactions (income, expense, transfer), and budget allocation (50/30/20 rule). Handles installment plans.

**System Design Choices:**
- **Separation of Concerns:** A clear distinction between domain logic (`/packages`) and the UI (`/app`).
- **State Management:** Global state managed by `AppStateProvider` using Event Sourcing, exposed via `useAppState()` hook. Screens dispatch events rather than directly modifying state.
- **Data Persistence:** Local `EventStore` uses `expo-sqlite` with a single `events` table, storing event payloads as JSON strings.
- **Testing:** Comprehensive unit tests using Vitest across all packages, including an integration test for the full user journey.

## External Dependencies
- **Expo SDK 54:** The primary framework for building the cross-platform application.
- **Expo Router:** For file-based navigation within the Expo application.
- **expo-sqlite:** Used for local data persistence via SQLite.
- **expo-camera:** For QR code scanning functionality.
- **expo-file-system:** For file system operations, particularly for exporting/importing JSON bundles.
- **expo-sharing:** For sharing exported JSON bundles via system share sheets.
- **expo-document-picker:** For importing JSON bundles.
- **Express.js:** Used for the backend relay synchronization server.
- **PostgreSQL:** The database for the backend sync server.
- **Drizzle ORM:** Used with `pg` (Node.js PostgreSQL client) for database interactions on the backend.
- **Google Gemini (optional):** An AI model used for invoice classification as a fallback or enhancement to keyword-based classification.
- **ML Kit (via adapter):** Used as a fallback for OCR in invoice parsing.
- **Vitest:** The testing framework.