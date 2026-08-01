---
name: Pre-release Clerk blockers
description: Two mandatory items before the next App Store public release — user migration and custom OAuth credentials.
---

# Pre-release Clerk blockers

**Why:** CTL migrated from Replit-managed Clerk to a self-hosted Clerk account (`charmed-garfish-1.clerk.accounts.dev`) in build 105 to fix Apple/Google SSO. This migration introduced two blockers that must be resolved before any public App Store release.

## 1. Migrate existing users

Existing users registered under the old Replit-managed Clerk tenant. After build 105 they will be unable to log in because their accounts don't exist in the new Clerk instance.

**How to apply:** Use Clerk's user migration API or export/import flow (Dashboard → Users → Import) before publishing to the App Store. Email/password users need their accounts recreated or migrated; SSO users will auto-create new accounts on next sign-in (but lose their data).

## 2. Set up custom Google and Apple OAuth credentials

The current Clerk app uses "Shared credentials" for Google and Apple SSO. Clerk's dashboard explicitly warns: *"You'll need to add custom credentials for your SSO connections in production."* Shared credentials work for development/TestFlight but are not permitted for App Store production.

**How to apply:**
- **Google:** Create an OAuth 2.0 client in Google Cloud Console for iOS (bundle ID: `com.ctl.carlogbook`), then paste the Client ID + Secret into Clerk Dashboard → SSO Connections → Google → Custom credentials.
- **Apple:** In Apple Developer → Certificates, create a Sign In with Apple key, then paste the Key ID, Team ID, and private key into Clerk Dashboard → SSO Connections → Apple → Custom credentials.
