# Car Logbook

## Overview

A mobile logbook app for car owners — similar to an aviation logbook but for vehicles. Users can track multiple cars with full maintenance, parts, fuel, insurance, and dealership records. Includes comprehensive report generation.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Mobile app**: Expo (React Native) with Expo Router
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: bcryptjs (password hashing), jsonwebtoken (JWT), expo-secure-store (token storage), expo-local-authentication (biometric sign-in)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── car-logbook/        # Expo mobile app
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Features

- **Authentication**: Email/password login & signup with JWT tokens, biometric sign-in (Face ID / Touch ID), forgot/reset password flow
- **Cars**: Add/manage multiple vehicles (make, model, year, color, VIN, license plate, mileage, photos)
- **Maintenance**: Log service records with type, date, mileage, cost, shop, next due date
- **Parts**: Track replacement parts with brand, category, cost, supplier, warranty
- **Insurance**: Manage policies with provider, policy number, premiums, dates
- **Dealerships**: Log dealership visits with purpose, cost, contact info, rating
- **Fuel**: Track fill-ups with liters, cost, mileage, fuel type, station
- **Reports**: Full per-car report with cost breakdown, activity timeline, upcoming services

## Navigation

- Tab 1: **Login** — sign in screen (tab bar hidden)
- Tab 2: **Sign Up** — create account screen (tab bar hidden)
- Tab 3: **Reports** — pick a car and see full logbook report
- **Home Dashboard** (stack): quick action menu (Add Car, My Fleet, Add Maintenance, Upcoming)
- **Car Detail** (stack): tabs for Maintenance, Parts, Insurance, Dealerships, Fuel with add/delete
- **Add Car** (modal): form to add a new vehicle
- **Report** (stack): full report with cost breakdown and activity

## Database Tables

- `users` — user accounts (email, password_hash, name)
- `password_reset_tokens` — password reset tokens (token, userId, expiresAt, usedAt)
- `cars` — vehicle records
- `maintenance_records` — service/maintenance log
- `parts_records` — replacement parts log
- `insurance_records` — insurance policies
- `dealership_records` — dealership/service visits
- `fuel_records` — fuel fill-up log

## Auth Flow

- Login/signup via email+password → JWT token stored in expo-secure-store (native) or localStorage (web)
- After first successful login on native device, user is prompted to enable biometric sign-in
- Biometric button appears on login screen when device supports it and user has enrolled
- Forgot password: modal → enter email → backend generates reset token (logged to console, email delivery TBD) → enter token + new password to reset
- Token key: `ctl_auth_token`, user key: `ctl_auth_user`, biometric pref: `ctl_biometric_enabled`
- API helper (`useApi.ts`) automatically attaches Bearer token to all requests

## Key Files

- `artifacts/car-logbook/app/(tabs)/index.tsx` — Login screen
- `artifacts/car-logbook/app/(tabs)/signup.tsx` — Sign up screen
- `artifacts/car-logbook/app/(tabs)/reports.tsx` — Reports list screen
- `artifacts/car-logbook/app/home.tsx` — Menu dashboard (post-login)
- `artifacts/car-logbook/context/AuthContext.tsx` — Auth state + biometric management
- `artifacts/car-logbook/hooks/useApi.ts` — API helper with auth token injection
- `artifacts/car-logbook/app/car/[id].tsx` — Car detail with all log tabs
- `artifacts/car-logbook/app/car/add.tsx` — Add car form
- `artifacts/car-logbook/app/report/[id].tsx` — Full car report
- `artifacts/api-server/src/routes/auth.ts` — Auth endpoints (register, login, forgot/reset password)
- `artifacts/api-server/src/routes/cars.ts` — All car/maintenance REST endpoints
- `lib/db/src/schema/cars.ts` — Drizzle schema for all tables

## Packages

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 API with full CRUD + report generation + auth (bcryptjs, jsonwebtoken).

### `artifacts/car-logbook` (`@workspace/car-logbook`)
Expo mobile app with Expo Router, React Query, expo-secure-store, expo-local-authentication.

### `lib/db` (`@workspace/db`)
Drizzle ORM with PostgreSQL. Run migrations with `pnpm --filter @workspace/db run push`.

### `lib/api-spec` (`@workspace/api-spec`)
OpenAPI spec. Run codegen: `pnpm --filter @workspace/api-spec run codegen`
