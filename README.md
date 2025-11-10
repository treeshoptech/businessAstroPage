# TreeShop SaaS Platform

Professional tree service operations platform built with Astro, React, MUI, Convex, and WorkOS.

## Tech Stack

- **Astro** - Modern web framework
- **React 19** - UI library
- **Material-UI (MUI)** - Component library with dark theme
- **Convex** - Real-time database and backend
- **WorkOS** - Multi-tenant authentication and organization management
- **Google Maps API** - Map-centric dashboard and drive time calculations
- **PWA** - Progressive Web App capabilities with Vite PWA plugin

## Project Structure

```
src/
├── components/
│   ├── AppShell/          # Main layout with right drawer navigation
│   ├── Map/               # Google Maps dashboard
│   ├── Pricing/           # Pricing calculators
│   ├── Projects/          # Project management
│   ├── Customers/         # Customer management
│   └── Settings/          # Settings and configuration
├── lib/
│   ├── convex/            # Convex client utilities
│   ├── workos/            # WorkOS integration
│   ├── pricing/           # Pricing formulas engine
│   ├── utils/             # Utility functions
│   └── theme.ts           # MUI dark theme
├── types/
│   └── index.ts           # TypeScript type definitions
├── pages/
│   └── index.astro        # Main page with map dashboard
convex/
└── schema.ts              # Convex database schema
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Required environment variables:
- `PUBLIC_CONVEX_URL` - Your Convex deployment URL
- `WORKOS_API_KEY` - WorkOS API key
- `WORKOS_CLIENT_ID` - WorkOS client ID
- `PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps API key

### 3. Initialize Convex

```bash
npx convex dev
```

This will:
- Create a new Convex project (first time)
- Set up the database schema
- Start the Convex development server

### 4. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:4321`

## Features

### Multi-Tenancy
- Organization-based data isolation via WorkOS
- User roles: Owner, Admin, Manager, Estimator, Crew Leader, Crew Member
- Team collaboration features

### Pricing Engine
Complete TreeShop Score pricing system:
- **Forestry Mulching** - Acreage × DBH package with AFISS factors
- **Stump Grinding** - StumpScore formula with modifiers
- **Land Clearing** - Day-based estimation with intensity levels
- **Tree Removal** - Height × Crown × DBH calculations
- **Tree Trimming** - Percentage-based pricing

### AFISS System
80+ complexity factors across 18 categories:
- Access conditions
- Site facilities
- Irregularities
- Environmental factors
- Safety considerations

### Map Dashboard
- Google Maps integration with dark mode styling
- Project locations visualization
- Drive time calculations from company headquarters
- Route planning and optimization

### PWA Features
- Offline support
- Install to home screen
- Push notifications (planned)
- Background sync for field crews

## Database Schema

Key entities:
- **Organizations** - Multi-tenant root entity
- **Users** - Team members with roles
- **Equipment** - Fleet management with cost calculations
- **Employees** - Crew management with burden multipliers
- **Loadouts** - Service configurations (equipment + crew)
- **Customers** - Client management
- **Projects** - Job tracking through workflow stages
- **Proposals** - Auto-generated quotes with AFISS
- **Quotes** - Financial breakdowns

## Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Convex
npx convex dev           # Start Convex dev server
npx convex deploy        # Deploy to production

# Type checking
npm run astro check      # Check Astro and TypeScript
```

## Pricing Formulas

All pricing calculations follow the complete TreeShop methodology documented in `.claude/CLAUDE.md`:

1. Equipment hourly cost = Ownership + Operating costs
2. Employee true cost = Base rate × Burden multiplier (1.6-2.0)
3. Loadout cost = Equipment + Labor + Overhead
4. Billing rate = Cost ÷ (1 - Margin%) - NOT Cost × Markup
5. Project price = Hours × Billing rate

## Workflow Stages

Projects flow through 4 stages:
1. **LEAD** - Discovery and qualification
2. **PROPOSAL** - Pricing and closing
3. **WORK ORDER** - Execution and documentation
4. **INVOICE** - Payment and reviews

## Deployment

### Convex Production Deployment
```bash
npx convex deploy --prod
```

### Static Site Deployment
The app can be deployed to any static hosting service:
- Vercel
- Netlify
- Cloudflare Pages
- AWS S3 + CloudFront

Build command: `npm run build`
Output directory: `dist/`

## Contributing

This is a private project for TreeShop founding members.

## License

Proprietary - All rights reserved

## Support

For issues and questions, contact: support@treeshop.app
