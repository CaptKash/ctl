# CTL (Car Technical Log) — Product Brief

> Prepared from codebase, schema, configuration, and i18n content only.  
> No API keys, secrets, credentials, internal URLs, environment variable values, database connection strings, or real user PII are included.  
> All prices cited are from developer mock packages in `artifacts/car-logbook/lib/revenuecat.ts`; real prices are set in the App Store Connect / RevenueCat dashboards and are not in the codebase.

---

## 1. Product Overview

CTL — Car Technical Log — is a native mobile application for logging, tracking, and managing the full lifecycle of one or more vehicles. The product targets both individual car owners and multi-user enterprise fleets (dealerships, workshops, transport operators).

**Core problem solved:** Vehicle ownership generates a large, fragmented paper trail — maintenance receipts, fuel fill-ups, insurance renewals, inspection records, fault codes, and parts replacements. CTL centralises all of that into a single structured logbook per vehicle, with reminders for upcoming service dates and the ability to export a complete vehicle history.

**Sources:** iOS `infoPlist` permission strings in `app.json`, upgrade screen i18n copy (`lib/i18n/locales/en.json`), and home/fleet/enterprise screen content throughout `artifacts/car-logbook/app/`.

Quoted taglines from the codebase:
- Fleet tier: *"Manage every vehicle without limits"* (`fleetUpgrade.tagline`)
- Enterprise tier: *"Run your whole team on one shared fleet"* (`enterpriseUpgrade.tagline`)
- Settings card: *"For dealerships, fleets & workshops"* (`settings.enterprise.tagline`)

---

## 2. Target Users & Use Cases

### Individual / Consumer

A single user registers one or two vehicles (free) or an unlimited number (Fleet subscription). A typical session:

1. Opens the app to the **Home** tab — sees today's date, a personalised greeting, and a list of upcoming events (license renewals, insurance, inspections, next scheduled service).
2. Taps **Log Event** to record a new maintenance service, fault, or renewal for a chosen vehicle.
3. After a fuel stop, logs litres dispensed, price per litre, station name, and whether it was a full tank.
4. Receives a push notification 30, 7, and 1 day before a tracked expiry (registration, insurance, warranty, inspection) and can add the reminder to the device calendar.
5. Uses **Nearby Service** to find repair shops and service centres at their current GPS location.
6. Generates a PDF or XLSX export of the full vehicle history.

**Source:** `app/home.tsx`, `app/fuel.tsx`, `app/nearby-service.tsx`, `app/export.tsx`, notification i18n strings.

### Enterprise / Organization Member

An enterprise subscriber creates an **organization**, sets a seat limit matching their subscription tier, and invites staff members by email. Two roles exist:

- **Admin** — can add, edit, and delete vehicles and all records on behalf of the org.
- **Staff** — read-only access to the shared fleet.

A typical enterprise session:

1. Admin opens the app, switches context from "Personal" to the organization name using the chip switcher on the Home screen.
2. Sees the shared fleet of org vehicles and upcoming maintenance across all of them.
3. Invites a new technician by email from the Organization screen; the server sends an invite email via Resend.
4. The technician installs CTL, signs up, sees a pending invite banner on their Home screen, and accepts.
5. Staff members log maintenance and fault records against org vehicles; the admin reviews the org activity feed showing who made each change.

**Sources:** `app/organization.tsx`, `app/org-activity.tsx`, `artifacts/api-server/src/routes/orgs.ts`, `app/home.tsx` (context switcher), `lib/db/src/schema/cars.ts` (`organization_members` table).

---

## 3. Core Features

### Vehicle Management
- Add vehicles with: make, model, year, vehicle type (Car, SUV, Van, Pickup Truck, Heavy Truck, Bus, Motorcycle, Ambulance, Tractor, Digger, Forklift, Tow Truck, Other), nickname, colour, licence plate, VIN, current mileage/hours, tank capacity, electric flag, photos, notes.
- **Usage unit is type-aware**: distance-based vehicles (km or miles) vs. hour-based vehicles (forklifts, tractors, diggers, etc.). The UI adapts labels accordingly throughout the app.
- Source: `lib/db/src/schema/cars.ts` (`carsTable`), `artifacts/car-logbook/constants/vehicleTypeData.ts`, `artifacts/car-logbook/lib/vehicleTypes.ts`.

### Maintenance & Repair Logging
- Record type, description, date, mileage/hours, cost, shop name/address/phone, corrective action, parts replaced, warranty period and details, bill photo, warranty photo, notes.
- Optionally set a **next due date and/or next due mileage** to drive the upcoming events list.
- Source: `lib/db/src/schema/cars.ts` (`maintenanceTable`), `app/maintenance/`.

### Parts Tracking
- Log individual parts: name, part number, brand, category, quantity, cost, installed date and mileage, supplier, warranty.
- Source: `lib/db/src/schema/cars.ts` (`partsTable`).

### Fuel Logging
- Per fill-up: date, mileage, litres, price per litre, total cost, fuel level before/after, fuel type, station name, full-tank flag, notes.
- **AI-estimated tank capacity**: the app calls the backend (`POST /cars/estimate-tank-capacity`), which queries an OpenAI model to return the typical tank size in litres for a given make/model/year. Result is pre-filled when logging fuel.
- Source: `lib/db/src/schema/cars.ts` (`fuelTable`), `artifacts/api-server/src/routes/cars.ts`.

### Fault / Malfunction Logging
- Two input methods: typed description or a dashboard warning message.
- Fields: date, description, odometer, phase (car running / just started / parking / during drive), severity (critical / major / minor / cosmetic), dashboard message text, action taken.
- Faults carry an open/resolved status.
- Source: `lib/db/src/schema/cars.ts` (`malfunctionsTable`), `app/malfunction/`.

### Inspection Records
- Log formal vehicle inspections: date, place, results, cost, required repairs, next inspection date.
- Source: `lib/db/src/schema/cars.ts` (`inspectionsTable`), `app/inspection/`.

### Renewal Tracking (Insurance & Licence)
- Two renewal types: **licence** and **insurance**.
- Fields: date, valid until, issuing authority / insurance provider, reference/sticker/policy number, cost, notes.
- Expiry dates feed the upcoming events system and push notification scheduler.
- Source: `lib/db/src/schema/cars.ts` (`renewalsTable`), `app/renewal/`.

### Insurance & Dealership Records
- Standalone insurance records table (`insurance_records`) and dealership/workshop visit log (`dealership_records`): visit date, purpose, cost, rating (1–5), contact details.
- Source: `lib/db/src/schema/cars.ts`.

### Upcoming Events & Reminders
- Home screen aggregates upcoming items across all tracked deadlines (maintenance next-due, licence expiry, insurance expiry, inspections, warranties, part change intervals).
- Push notifications fire at 30 days, 7 days, and 1 day before each deadline (Expo Notifications, `service-reminders` channel).
- Users can add reminders to the device calendar (expo-calendar).
- Source: `artifacts/api-server/src/lib/upcomingItems.ts`, `app/home.tsx`, notification i18n strings.

### History
- Chronological unified history of all record types across all vehicles (or org vehicles in enterprise context).
- Filterable by vehicle; each entry shows record type badge, date, and summary.
- Source: `app/history.tsx`.

### Repair History (per vehicle)
- Vehicle-scoped view of repair and maintenance records.
- Source: `app/repair-history.tsx`.

### Service Costs (Fleet feature)
- Per-vehicle cost breakdown: maintenance, parts, fuel, insurance, licence.
- Totals and recent activity feed.
- Gated behind the Fleet entitlement.
- Source: `app/service-costs.tsx`.

### Reports & Export (Fleet feature)
- **PDF report**: full vehicle logbook rendered as a branded HTML/PDF (`expo-print`), including cost breakdown by category and record history.
- **XLSX spreadsheet export** (`xlsx-js-style`): six sections — maintenance, fuel, parts, insurance, faults, inspections — with colour-coded headers, selectable per export.
- Both gated behind the Fleet subscription entitlement.
- Source: `app/report/`, `app/export.tsx`.

### Nearby Service (Free feature)
- Requests device GPS location, queries the **Overpass API** (OpenStreetMap data) for nearby automotive service locations (garages, tyre shops, petrol stations, etc.).
- Displays name, type, distance (km), address, phone, website, opening hours, with a direct-dial and map-open link.
- No third-party map SDK; distance is calculated client-side with the Haversine formula.
- Available to all users (free tier).
- Source: `app/nearby-service.tsx`.

### Enterprise / Organisation Management
- Create an organization (requires enterprise entitlement).
- Invite members by email; invite row is created in the database first, then a Resend email is sent fire-and-forget.
- Role management: promote/demote between admin and staff.
- Remove members.
- Activity feed: timestamped log of who added or changed records on org vehicles (`createdByUserId` on every record table).
- Seat limit enforced server-side on every invite attempt.
- Pending invite banner appears on the invitee's Home screen until accepted or declined.
- Source: `app/organization.tsx`, `app/org-activity.tsx`, `artifacts/api-server/src/routes/orgs.ts`.

### Localisation & Accessibility
- Full English and Arabic translations (`lib/i18n/locales/en.json`, `ar.json`).
- RTL layout support throughout the app.
- Distance unit preference (km / miles) and currency setting.
- Light / dark / system theme.
- Source: `app/settings.tsx`, context files.

### In-app Feedback / Feature Request
- Users can submit a feature suggestion from the Tools screen; sent to the backend via `POST /suggest-tool` and relayed by email.
- Source: `app/tools.tsx`, `artifacts/api-server/src/routes/feedback.ts`.

---

## 4. Data Model

The schema lives in `lib/db/src/schema/cars.ts` (PostgreSQL via Drizzle ORM). The key entities and relationships:

```
users
  ├── id (serial PK — also used as RevenueCat appUserID)
  ├── email (unique, NOT NULL)
  ├── clerkUserId (nullable unique — NULL means not yet migrated to Clerk)
  ├── isAdmin (boolean)
  ├── country
  └── passwordUpgradeRequired

password_reset_tokens  →  users.id

organizations
  ├── id
  ├── ownerUserId  →  users.id
  └── seatLimit (NULL = unlimited)

organization_members
  ├── orgId   →  organizations.id
  ├── userId  →  users.id  (NULL while invite is pending)
  ├── email   (UNIQUE per org — both pending and active)
  ├── role    ("admin" | "staff")
  └── status  ("invited" | "active")

cars
  ├── userId  →  users.id        (personal vehicles; NULL for org vehicles)
  ├── orgId   →  organizations.id (org vehicles; NULL for personal vehicles)
  ├── make, model, year, vehicleType, usageUnit ("distance" | "hours")
  ├── licensePlate, licenseValidUntil, vin
  ├── insuredWith, insuredUntil
  ├── mileage, tankCapacity, isElectric
  └── nickname, color, notes, photos

maintenance_records  →  cars.id  (+ createdByUserId → users.id)
  └── type, description, date, mileage, cost, shop details,
      warranty fields, bill/warranty photos, nextDueDate, nextDueMileage

parts_records        →  cars.id
fuel_records         →  cars.id  (litres, pricePerLiter, totalCost, fuelType, station, fullTank)
malfunction_records  →  cars.id  (inputMethod, severity, phase, dashboardMessage, warningMessage)
insurance_records    →  cars.id
dealership_records   →  cars.id  (visitDate, purpose, cost, rating)
inspection_records   →  cars.id
renewal_records      →  cars.id  (type: "license" | "insurance", validUntil)

event_completions    →  cars.id  (polymorphic: recordType + recordId — marks upcoming items done)
password_reset_tokens → users.id
```

Every record table that was added with enterprise in mind carries a `createdByUserId` column (nullable for legacy rows) to support the org activity feed.

---

## 5. Technical Architecture

| Layer | Technology |
|---|---|
| **Mobile framework** | React Native via Expo SDK (~53), expo-router (file-based routing, typed routes), React Compiler enabled (`experiments.reactCompiler: true`) |
| **Language** | TypeScript throughout (mobile + backend) |
| **Backend** | Express.js on Node.js, hosted on Replit |
| **Database** | PostgreSQL, accessed via Drizzle ORM (`@workspace/db` shared package) |
| **Auth** | Clerk (custom UI — no hosted Clerk page): email/password, Apple Sign In, Google Sign In; legacy bcrypt users migrated lazily on first Clerk sign-in |
| **Subscriptions** | RevenueCat (`react-native-purchases`), StoreKit 2 on iOS, Google Play Billing on Android |
| **Email** | Resend (invite emails, feedback relay) |
| **AI** | OpenAI GPT-5-mini via Replit AI Integration proxy — used for tank capacity estimation |
| **Location / Map data** | expo-location for GPS; Overpass API (OpenStreetMap) for nearby venue search |
| **Notifications** | expo-notifications (push), expo-calendar (device calendar integration) |
| **Export** | expo-print (PDF generation via HTML), xlsx-js-style (XLSX spreadsheet) |
| **Photo upload** | expo-image-picker; photos stored as text in the database (base64 or URI strings) |
| **i18n** | react-i18next — English and Arabic locales, RTL layout support |
| **Build & CI** | EAS Build + EAS Submit (Expo Application Services) |
| **Monorepo** | pnpm workspaces — shared `@workspace/db` (schema + Drizzle client) and `@workspace/integrations-openai-ai-server` packages |

**Notable architecture decisions:**
- The serial `users.id` (not Clerk's ID) is the primary key everywhere and is used as the RevenueCat `appUserID`. This was a deliberate choice (`schema/cars.ts` comment: *"We never reuse Clerk's user id as our primary key — `id` (serial) stays the source of truth so RevenueCat appUserIDs survive the migration."*)
- Subscriptions are verified **client-side** via RevenueCat; the server only enforces the seat limit (counts from the `organization_members` table) rather than re-verifying the subscription receipt.
- No mapping SDK (e.g. Google Maps, Mapbox) is used — the nearby service feature queries Overpass directly and computes distances in JavaScript.

---

## 6. Current Monetization

Monetization is **fully implemented** via RevenueCat with two separate subscription tiers.

### Free Tier (no purchase required)
- Up to **2 vehicles** (`FREE_CAR_LIMIT = 2`, `lib/revenuecat.ts`).
- Full logging across all record types.
- Nearby Service tool.
- Basic push reminders.

### CTL Fleet (individual subscription)
**Entitlement identifier:** `fleet` (`REVENUECAT_ENTITLEMENT_IDENTIFIER`, `lib/revenuecat.ts`)  
**RevenueCat offering:** `default`  
**Products (dev mock prices — real prices in App Store Connect):**
| Identifier | Type | Dev mock price |
|---|---|---|
| `$rc_monthly` | Monthly | ~$2.99/mo |
| `$rc_annual` | Annual | ~$19.99/yr (~44% saving) |
| `$rc_lifetime` | Lifetime one-time | ~$24.99 |

**Unlocks:**
- Unlimited vehicles (vehicle add is blocked with upgrade prompt when free limit is reached: `app/fleet.tsx`)
- Service Cost Tracker (`app/service-costs.tsx`)
- PDF and XLSX export (`app/export.tsx`, `app/report/`)
- All current and future tools (as per i18n copy)

**Source:** `app/fleet-upgrade.tsx`, `lib/revenuecat.ts`, `app/fleet.tsx`, `app/settings.tsx`.

### CTL Enterprise (multi-user organization subscription)
**Entitlements:** `enterprise_10` (10 seats), `enterprise_50` (50 seats), `enterprise_unlimited` (unlimited)  
**RevenueCat offering:** `enterprise`  
**Products (dev mock prices):**
| Tier | Billing | Dev mock price |
|---|---|---|
| 10 seats | Monthly | ~$29.99/mo |
| 10 seats | Annual | ~$299.99/yr |
| 50 seats | Monthly | ~$99.99/mo |
| 50 seats | Annual | ~$999.99/yr |
| Unlimited | Monthly | ~$199.99/mo |
| Unlimited | Annual | ~$1,999.99/yr |

**Unlocks:** Organization creation, member invites, shared fleet, admin/staff roles, org activity feed.  
After purchase, the subscriber is automatically navigated to the organization setup screen (`app/enterprise-upgrade.tsx`).

**Source:** `app/enterprise-upgrade.tsx`, `lib/revenuecat.ts`, `artifacts/api-server/src/routes/orgs.ts`.

**Gating implementation:**
- Vehicle count limit is enforced in `app/fleet.tsx` — if `cars.length >= FREE_CAR_LIMIT && !isFleet`, the add button routes to the upgrade screen instead.
- Export and service costs screens check `isFleet` before rendering the main content.
- Organization creation requires an active enterprise entitlement (checked client-side before calling the create-org API).
- Seat limit is enforced server-side: `countSeats(orgId)` is called on every invite attempt (`orgs.ts`).

---

## 7. Platform & Distribution

| | iOS | Android |
|---|---|---|
| **Status** | Live on App Store | Available (Google Play) |
| **Bundle / Package ID** | `com.ctl.carlogbook` | `com.inroomstudio.ctl` |
| **Current version** | 2.0.0, build 111 | 2.0.0, versionCode 26 |
| **Tablet support** | No (`supportsTablet: false`) | — |
| **Special entitlements** | Apple Sign In (`usesAppleSignIn: true`) | Google Play Billing permission |
| **Encryption** | None (`ITSAppUsesNonExemptEncryption: false`) | — |

**EAS project:** `2984157c-0a32-485b-8b48-1048d72a1520`, owner account `mkashour`.  
**App Store Connect App ID:** `6760766535`.  

Device permissions requested:
- Location (when in use) — nearby service search
- Camera — attaching photos to records
- Photo library (read + save) — attaching existing photos, saving exported reports
- Notifications — push reminders
- Calendar — adding service reminders

**Web:** An Expo web config entry exists (favicon only). The app is not structured as a PWA and no web-specific routing is implemented. It is a native mobile product.

**Source:** `artifacts/car-logbook/app.json`, `artifacts/car-logbook/eas.json` (implied by EAS build config).

---

## 8. Scale Indicators

No analytics endpoints, usage dashboards, aggregate count queries, or seed data that would reveal actual user numbers are present in the codebase. What can be inferred:

- **The product has live users.** The existence of a `bulk-migrate` endpoint (`POST /auth/clerk/admin/bulk-migrate`, `artifacts/api-server/src/routes/clerkAuth.ts`) — gated on `ADMIN_SECRET` — implies a population of legacy users created under the bcrypt auth system who need to be linked to Clerk accounts. The server's comment reads: *"NULL means 'not yet migrated' (still on legacy bcrypt auth)."* (`schema/cars.ts`)
- **Admin tooling is minimal.** The only operator-facing endpoints are: grant/revoke `isAdmin` on a user account, and bulk-migrate legacy users to Clerk. There is no admin dashboard, no aggregate stats route, and no analytics integration visible in the codebase.
- **A backup route exists** (`artifacts/api-server/src/routes/` includes a `backup.ts` file referenced in the session context at line 63, which sends an admin notification email). Its existence suggests active data that is worth protecting, but no backup schedule or size data is accessible from code.
- No staging environment, feature flags, or A/B testing infrastructure is present.

**Conclusion:** This is an early-stage live product. Usage scale is not determinable from the codebase alone.

---

## 9. Differentiators & Gaps

### Differentiators (based on implemented features)

**Multi-vehicle-type support including commercial/specialist vehicles.** The vehicle type list — Car, SUV, Van, Pickup Truck, Heavy Truck, Bus, Motorcycle, Ambulance, Tractor, Digger, Forklift, Tow Truck — and the dual usage-unit system (distance vs. hours) are uncommon in consumer logbook apps. Hour-based vehicles (forklifts, tractors, diggers) are explicitly handled with adapted UI labels throughout the app. Source: `constants/vehicleTypeData.ts`, `lib/vehicleTypes.ts`.

**Enterprise multi-user organization model.** A seat-limited multi-user org system with invite, role enforcement, and an activity feed (showing which staff member logged each record) sits on top of the personal logbook — an architecture that positions CTL to compete in the fleet management space, not just consumer apps.

**Bilingual English/Arabic with full RTL layout.** Both locale files are complete and RTL is handled throughout the UI (flex direction, text alignment, writing direction). This targets Arabic-speaking markets explicitly.

**AI-assisted data entry.** Tank capacity is estimated from make/model/year via an OpenAI call — a small but user-facing AI feature that reduces friction for a field most users don't know off the top of their head.

**No-map nearby service search.** The nearby service feature uses the OpenStreetMap Overpass API directly with no paid map SDK, keeping infrastructure costs at zero for that feature.

**Lifetime purchase option.** A one-time lifetime purchase is offered alongside monthly/annual subscriptions for the Fleet tier — unusual in a subscription-first market and potentially attractive to users who dislike recurring billing.

---

### Gaps (features typical of competitors in this space, not yet implemented)

**No offline / local-first data.** The app makes direct API calls for every read and write. There is no local database (e.g. SQLite via expo-sqlite) or sync layer. Loss of connectivity blocks all operations. Source: all data fetching uses `apiGet`/`apiPost` hooks with no offline queue.

**No VIN decode.** VIN is stored as a free-text field. No VIN lookup or decode API is called to auto-populate make/model/year/trim. Source: `app/car/add.tsx` — VIN is a plain `TextInput`.

**No telematics / OBD-II integration.** There is no Bluetooth or OBD adapter integration for automatic mileage or fault code reading.

**Google Play in-app subscriptions not yet created.** The Android billing permission is declared in `app.json`, but per the project task list, the actual Google Play subscription products for CTL Fleet have not yet been created. Enterprise products are also pending.

**No invite resend/regenerate.** Once an enterprise invite email is sent, there is no endpoint to re-send it if the recipient didn't receive it or the invite expired. The admin must delete the member and re-invite. Source: `artifacts/api-server/src/routes/orgs.ts` — no resend route exists.

**No web or admin dashboard.** There is no browser-based interface for enterprise admins to manage their organisation, view fleet status, or run reports. Management is entirely through the mobile app.

**No bulk vehicle or record import.** There is no CSV/Excel import path for onboarding an existing fleet. Each vehicle and record must be entered manually or via the app's forms.

**Photo storage in-database.** Vehicle and record photos are stored as text (base64 or URI strings) directly in the PostgreSQL `cars.photos` column and record `billPhoto`/`warrantyPhoto` columns. No dedicated object storage (e.g. S3-compatible bucket) is used. This limits scalability for photo-heavy usage.

**No public API or webhook system.** There is no documented external API for integrating CTL data with third-party fleet management, accounting, or ERP systems.

**Forgot-password is silently a no-op for Clerk-managed users.** The legacy `POST /auth/forgot-password` route returns a fake success response for users whose accounts are managed by Clerk, with no email sent. Those users must use Clerk's own password reset flow. Source: `artifacts/api-server/src/routes/auth.ts`, lines 297–373.
