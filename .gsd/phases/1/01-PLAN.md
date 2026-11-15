---
phase: 1
plan: 1
wave: 1
depends_on: []
gap_closure: false
---

# Plan 1.1: Project Scaffold, Configuration, and Dashboard Shell

## Objective
Establish the foundational Next.js 15 application with React 19, TypeScript, and Tailwind CSS. Build the responsive application shell including top navigation, responsive mobile drawer, and the core dashboard overview layout with summary metric cards and quick action triggers.

## Context
Load these files for context:
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- .gsd/phases/1/RESEARCH.md

## Tasks

<task type="auto">
  <name>Scaffold Next.js 15 project and configure styling system</name>
  <files>
    package.json
    tsconfig.json
    tailwind.config.ts
    postcss.config.mjs
    app/globals.css
    lib/utils.ts
  </files>
  <action>
    Initialize Next.js 15 project with App Router, TypeScript, and Tailwind CSS.
    
    Steps:
    1. Scaffold or configure `package.json` with Next.js 15, React 19, Tailwind CSS, `clsx`, `tailwind-merge`, and `lucide-react`. Also include `@prisma/client` and `prisma` as dependencies for upcoming database integration.
    2. Setup `tsconfig.json` with strict type checking and `@/*` path alias mapping to project root.
    3. Configure `tailwind.config.ts` and `postcss.config.mjs` with SynCognia's color palette (slate, indigo, emerald for warranty statuses, amber for expiring warnings, and rose for expired/urgent states).
    4. Configure `app/globals.css` with baseline Tailwind directives (`@tailwind base; @tailwind components; @tailwind utilities;`) and responsive container styles.
    5. Create `lib/utils.ts` exporting a type-safe `cn(...)` utility helper combining `clsx` and `tailwind-merge`.
    
    AVOID: Deprecated Pages Router conventions or separate CSS modules for layout styles.
    USE: Next.js 15 App Router standard layout conventions and Tailwind utility classes.
  </action>
  <verify>
    npm run build
  </verify>
  <done>
    `package.json` contains Next.js 15 and core dependencies; `npm run build` succeeds without compilation or TypeScript errors.
  </done>
</task>

<task type="auto">
  <name>Build responsive application shell and dashboard overview layout</name>
  <files>
    app/layout.tsx
    components/layout/Navbar.tsx
    components/layout/Sidebar.tsx
    app/page.tsx
    components/dashboard/MetricCards.tsx
    components/dashboard/QuickActions.tsx
  </files>
  <action>
    Create the global application layout and dashboard interface shell.
    
    Steps:
    1. Create `components/layout/Navbar.tsx` displaying SynCognia branding ("SynCognia"), global search input bar placeholder, notification indicator bell, and user avatar.
    2. Create `components/layout/Sidebar.tsx` with responsive desktop sidebar and mobile slide-over navigation containing links: Dashboard, Assets, Receipts, Warranties, Maintenance, and Document Vault.
    3. Implement `app/layout.tsx` wrapping all views with proper HTML metadata, responsive viewport settings, Inter/system font styling, Navbar, and layout structure.
    4. Create `components/dashboard/MetricCards.tsx` rendering key overview metrics:
       - Total Registered Assets
       - Active Warranties Count
       - Expiring Soon (30 Days) Warning Badge
       - Upcoming Maintenance Actions Count
    5. Create `components/dashboard/QuickActions.tsx` with primary action buttons:
       - "Register Asset"
       - "Upload Receipt"
       - "Schedule Maintenance"
       - "Export Insurance Dossier"
    6. Wire `app/page.tsx` assembling MetricCards, QuickActions, and a placeholder section for recent asset activities and upcoming expiry deadlines.
    
    AVOID: Hardcoded viewport pixel dimensions that break mobile responsiveness.
    USE: Clean Tailwind flex/grid layouts with responsive breakpoints (`sm:`, `md:`, `lg:`).
  </action>
  <verify>
    npm run build
  </verify>
  <done>
    Application compiles cleanly with `npm run build`, and `app/page.tsx` renders the complete responsive dashboard shell with navigation, metrics, and action triggers.
  </done>
</task>

## Must-Haves
After all tasks complete, verify:
- [ ] Next.js 15 application builds cleanly (`npm run build`) with zero TypeScript errors.
- [ ] Tailwind styling system and `cn()` utility function are configured and operational.
- [ ] Responsive navigation shell (Navbar & Sidebar) renders correctly for desktop and mobile viewports.
- [ ] Dashboard homepage (`app/page.tsx`) displays summary metric cards and quick action controls.

## Success Criteria
- [ ] All tasks verified passing
- [ ] Must-haves confirmed
