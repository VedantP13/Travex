# Travex: Smart Travel Expenses

## Overview
Travex is an intelligent expense capture and splitting application designed for modern travelers. It simplifies the process of tracking group costs, managing shared balances, and organizing trip logistics through a combination of automated workflows and AI-driven insights.

## Project Status
The application is live in the production environment associated with the `travexapp` project. All core modules including authentication, trip management, and financial analytics are operational.

## Core Capabilities
### Advanced Search and Discovery
The application features an optimized search engine for finding friends and travel companions. It utilizes prefix matching and prioritizes existing trip participants to ensure high relevance in results.

### Guest Identity Management
Unauthenticated users are assigned unique, travel-inspired identities (e.g., "Nomadic Voyager"). This allows for an immediate, high-fidelity experience while encouraging eventual account security through Google integration.

### AI-Enhanced Workflows
- **Categorization**: Transactions are automatically mapped to logical categories using semantic analysis of descriptions.
- **Visualization Hints**: Trip names are analyzed to suggest relevant visual themes and destination imagery.

### Financial Intelligence
The platform provides a comprehensive ledger system that calculates net standings, suggests optimized settlement plans, and offers detailed spending analytics through interactive charts.

## Synchronization and Development
### Branch Reconciliation
To resolve divergent Git branches and ensure your local environment matches the remote repository, utilize the integrated sync utility:
```bash
npm run sync
```
This script configures the standard merge strategy and pulls the latest updates from the main branch.

## Technical Architecture
- **Framework**: Next.js 15 (App Router)
- **Interface**: React with ShadCN UI components and Tailwind CSS
- **Data Layer**: Firebase Firestore with persistent local caching
- **Security**: Firebase Auth with Google and Anonymous providers
- **Intelligence**: Genkit leveraging Google Gemini models

## Deployment
The application is served via Firebase App Hosting. For the latest production URL, refer to the App Hosting tab within the Firebase Console for the `travexapp` project.

## Development Constraints
### Visual Assets
The "New Trip" and "Add Expense" interfaces contain custom SVG assets and specific high-fidelity styling. Developers should avoid manual modifications to the Dialog components or path data to preserve the established visual language.

### Logic Scope
The "Secure your adventure" conversion prompt for guest users is strictly scoped to the primary trip creation workflow located in `src/app/trips/new/page.tsx`.