# MONARCHS MC

A production-ready website and member platform for a motorcycle club: a public
site, a private member portal, and an administrative dashboard, built on
Next.js, TypeScript, Tailwind CSS, Firebase and Vercel.

---

## Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Authorization model](#authorization-model)
- [Data model](#data-model)
- [Storage layout](#storage-layout)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment variables](#environment-variables)
- [Firebase setup](#firebase-setup)
- [Local development](#local-development)
- [Emulators and seed data](#emulators-and-seed-data)
- [Testing](#testing)
- [Deploying to Vercel](#deploying-to-vercel)
- [Production checklist](#production-checklist)
- [Project structure](#project-structure)
- [Known limitations](#known-limitations)

---

## Overview

Three audiences, one codebase:

| Area | Route prefix | Who |
| --- | --- | --- |
| Public site | `/` | Anyone |
| Member portal | `/member` | Signed-in **active** members |
| Admin dashboard | `/admin` | Editors, admins and superadmins |

Design principles the implementation actually follows:

- **Nothing is faked.** Every list, count and form is backed by Firestore. There
  are no placeholder statistics and no buttons that do nothing.
- **Authentication is not membership.** Having a Firebase account grants
  nothing. A separate `membershipStatus` decides access, and only an officer can
  set it.
- **Authorization is enforced at the data layer.** Route guards are convenience;
  Firestore and Storage Security Rules are the boundary, and they are tested.
- **The club writes its own history.** No founding dates, chapters, member
  counts, officers, locations or social profiles are invented anywhere. Where
  the club has not supplied content, the UI either shows clearly-marked
  placeholder copy or hides the section entirely.

---

## Architecture

```
Browser
  │
  ├── Firebase Auth (client SDK)  ── sign in / reset password
  │        │  ID token
  │        ▼
  │   POST /api/auth/session  ──►  Admin SDK verifies the token,
  │                                syncs custom claims, returns an
  │                                httpOnly session cookie
  │
  ▼
Next.js (App Router, Server Components by default)
  │
  ├── Server Components + Server Actions ── Firebase Admin SDK ── Firestore / Storage
  │        every one begins with a guard from lib/auth/guards.ts
  │
  └── Route handlers
           /api/admin/upload      authenticated, role-checked, content-sniffed uploads
           /api/documents/[id]    authorised download via a short-lived signed URL
           /api/media/member/[uid] authorised member photograph
```

**Why a session cookie.** Firebase Auth runs in the browser, but Server
Components need a trustworthy identity. The ID token is exchanged once for an
`httpOnly; secure; sameSite=lax` session cookie, so the token never sits in
JavaScript-readable storage and the server can resolve the caller on every
request.

**Why the server resolves role from Firestore.** `getSessionUser()` reads
`users/{uid}` rather than trusting the cookie's claims, so a suspension or role
change takes effect on the very next request instead of whenever the token
happens to refresh. Custom claims are kept in sync because *Security Rules* read
them.

**Server Components by default.** Client Components are used only where
interaction requires them — the header drawer, forms, the gallery lightbox, the
RSVP control, admin controls. No page is a client component.

**The Admin SDK bypasses Security Rules.** This is the single most important
thing to remember when extending the app: every server action and route handler
must perform its own authorization check. `lib/auth/guards.ts` exists for that
and is the first line of every privileged function.

---

## Authorization model

Four roles, ranked. Every role also requires `membershipStatus === "active"` —
a suspended superadmin has no privileges at all.

| Role | May do |
| --- | --- |
| `member` | Member portal: rides, events, directory, announcements, documents, own profile |
| `editor` | …plus news, gallery and public page copy |
| `admin` | …plus members, applications, rides, events, announcements, documents, messages |
| `superadmin` | …plus role assignment and global site settings |

Defined once in [`lib/auth/roles.ts`](lib/auth/roles.ts) and consumed by the UI,
the server guards and — mirrored in rules syntax — by
[`firestore.rules`](firestore.rules), so the three cannot drift apart.

Two invariants are enforced in trusted server code and cannot be reached from a
browser:

- **No self-elevation.** Nobody may change their own role, and *no client may
  write `users/{uid}` at all* — the rules deny it outright, including to the
  document's owner.
- **No lock-out.** The last remaining superadmin cannot be demoted.

Suspending or deactivating an account also revokes its refresh tokens, so
existing sessions end immediately rather than at token expiry.

---

## Data model

Identity, club membership, public profile and private administrative data are
deliberately separated rather than merged into one user document.

| Collection | Contains | Client access |
| --- | --- | --- |
| `users/{uid}` | Email, role, membershipStatus, audit stamps | Read: owner + admin. **Write: nobody** |
| `members/{uid}` | Club-facing profile, privacy settings, officer position | Read: published officers publicly, all active members. Write: owner (allow-listed fields), admin (a wider allow-list) |
| `memberContact/{uid}` | Phone, location, emergency contact | Read: owner + admin. Write: owner (allow-listed) |
| `memberAdmin/{uid}` | Internal notes, membership history | Admin read only. Write: nobody |
| `applications/{id}` | Membership applications | Admin read; admin may update triage fields only. Create/delete: nobody |
| `rides/{id}` | Club runs | Public when `published && visibility == "public"` |
| `rides/{id}/rsvps/{uid}` | RSVPs, **keyed by uid** | Owner + admin |
| `events/{id}` | Club events | Public when `status == "published" && visibility == "public"` |
| `gallery/{id}` | Photograph metadata | Public when `approved` |
| `news/{id}` | Articles | Public when `published` |
| `announcements/{id}` | Member notices | Active members, when `published` |
| `documents/{id}` | Document metadata | Active members whose role reaches `requiredRole` |
| `contactMessages/{id}` | Contact form submissions | Admin read; admin may update triage fields only |
| `pages/{pageId}` | Editable marketing copy | Public read, editor write |
| `settings/site` | Club name, contact, social links | Public read, superadmin write |
| `auditLogs/{id}` | Privileged actions | Admin read. **Write: nobody** |
| `rateLimits/{key}` | Abuse counters | Nobody |

**RSVP idempotency.** The document id *is* the member's uid
(`rides/{rideId}/rsvps/{uid}`), so a member has exactly one document path
available to them and cannot accumulate duplicate responses. Changing an answer
overwrites; it never appends.

### Rules are not filters

Firestore evaluates a rule against every document a `list` would return; if one
fails, the whole query fails. Every query in `lib/data/` is therefore
constrained so its entire result set satisfies the rules. For example the public
rides listing always includes `where("published","==",true)` and
`where("visibility","==","public")` — an unconstrained `getDocs(collection(db,
"rides"))` is denied outright, and there is a test asserting exactly that.

The composite indexes those queries need are in
[`firestore.indexes.json`](firestore.indexes.json).

---

## Storage layout

| Path | Read | Write |
| --- | --- | --- |
| `gallery/`, `news/`, `rides/`, `events/` | Public — these images appear on the public site | **Denied to all clients** |
| `members/{uid}/` | **Denied.** Served by `/api/media/member/[uid]` after an authorization check | **Denied to all clients** |
| `documents/` | **Denied.** Served by `/api/documents/[id]` via a 5-minute signed URL, and logged | **Denied to all clients** |

**Why every client write is denied.** All uploads go through
`POST /api/admin/upload`, which authenticates the caller, checks their role for
the target area, applies a per-user rate limit, enforces a size ceiling, and
identifies the file by **sniffing its actual leading bytes** — the declared MIME
type and the filename are never trusted. Permitting direct client writes would
let all of that be skipped, so the rules do not.

Knowing a Storage path is never sufficient to read a private file.

---

## Prerequisites

- **Node.js 20.9+** (22 LTS recommended)
- **npm 10+**
- A **Firebase project** on the Blaze or Spark plan
- **Java 11+** — only for the Firebase Emulator Suite
- The **Firebase CLI** — installed as a dev dependency, so `npx firebase` works

---

## Installation

```bash
git clone https://github.com/kimcastillocaneda88-source/monarchsmc.git
cd monarchsmc
npm install
cp .env.example .env.local     # then fill it in
```

---

## Environment variables

Every variable is documented in [`.env.example`](.env.example).

| Variable | Scope | Required | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Browser | Yes | Not a secret; the web SDK requires it |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Browser | Yes | |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Browser | Yes | |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Browser | Yes | |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Browser | Yes | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Browser | Yes | |
| `NEXT_PUBLIC_SITE_URL` | Browser | Recommended | Canonical origin for SEO and the sitemap |
| `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` | Browser | Optional | Enables App Check when set |
| `FIREBASE_PROJECT_ID` | **Server** | Yes | |
| `FIREBASE_CLIENT_EMAIL` | **Server** | Yes | From the service-account JSON |
| `FIREBASE_PRIVATE_KEY` | **Server** | Yes | **Secret.** Literal `\n` sequences are converted back to newlines |
| `FIREBASE_STORAGE_BUCKET` | **Server** | Yes | Usually the same as the public bucket |

> **The `NEXT_PUBLIC_` values are safe to expose.** The Firebase web SDK cannot
> work without them, and they are not credentials — access is controlled by
> Security Rules and App Check. `FIREBASE_PRIVATE_KEY` and `FIREBASE_CLIENT_EMAIL`
> are genuine secrets and must never carry the `NEXT_PUBLIC_` prefix.

Never commit `.env.local` or a service-account JSON file; `.gitignore` already
excludes both.

---

## Firebase setup

### 1. Create the project

Firebase console → **Add project**. Then **Build → Authentication → Get
started → Email/Password → Enable**. Do not enable other providers unless the
club actually wants them.

Under **Authentication → Templates**, customise the password-reset email — the
club never sets a member's password, so this email is the only way a new member
gets in.

### 2. Firestore

**Build → Firestore Database → Create database → Start in production mode**
(locked down). Pick the region closest to the club.

### 3. Storage

**Build → Storage → Get started**, production mode.

### 4. Service account

**Project settings → Service accounts → Generate new private key**. Copy
`project_id`, `client_email` and `private_key` into your environment; do not
commit the file.

### 5. Deploy rules and indexes

```bash
cp .firebaserc.example .firebaserc     # set your project id
npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes,storage
```

Index builds take a few minutes. Until they finish, some listings return empty.

### 6. Create the first superadmin

There is no bootstrap back door — that is deliberate. Create the first account
by hand, once:

1. **Authentication → Users → Add user** with your email and a password.
2. Copy the generated **UID**.
3. In Firestore create `users/{uid}`:
   ```json
   {
     "email": "you@example.com",
     "role": "superadmin",
     "membershipStatus": "active",
     "createdAt": "<server timestamp>",
     "updatedAt": "<server timestamp>"
   }
   ```
4. Create `members/{uid}` with at least `displayName`, `membershipStatus:
   "active"`, `role: "superadmin"`, `publicOfficer: false`, and
   `privacy: { showInDirectory: true, showEmail: false, showPhone: false }`.
5. Sign in. The session route syncs your custom claims automatically.

From then on, every other account is created through **Admin → Applications**.

### 7. App Check (recommended)

1. **Build → App Check → Apps → Register** your web app with reCAPTCHA
   Enterprise.
2. Put the site key in `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY`.
3. Run in **monitoring mode** for a week, then enforce.

App Check is an additional layer against automated abuse. It is not a
replacement for Authentication or Security Rules, and the app does not treat it
as one — leaving the key unset simply disables it.

---

## Local development

```bash
npm run dev          # http://localhost:3000
npm run typecheck
npm run lint
npm run build
```

The app degrades gracefully with no Firebase configuration: public pages render
with empty states rather than crashing, so a fresh clone builds before you have
credentials.

---

## Emulators and seed data

```bash
npm run emulators    # Auth :9099, Firestore :8080, Storage :9199, UI :4000
```

In a second terminal, with the emulator variables from `.env.example`
uncommented in `.env.local`:

```bash
npm run seed         # demo accounts and content
npm run dev
```

Seed accounts (emulator only — the script refuses to touch a real project
unless `SEED_ALLOW_PRODUCTION=true`):

| Email | Password | Role / status |
| --- | --- | --- |
| `superadmin@monarchs.test` | `monarchs-superadmin-2026` | superadmin / active |
| `admin@monarchs.test` | `monarchs-admin-2026` | admin / active |
| `editor@monarchs.test` | `monarchs-editor-2026` | editor / active |
| `member@monarchs.test` | `monarchs-member-2026` | member / active |
| `pending@monarchs.test` | `monarchs-pending-2026` | member / pending |

Every seeded document is prefixed `[DEMO DATA — replace before launch]`. None of
it asserts anything about the real club. **Production can start with completely
empty collections.**

---

## Testing

```bash
npm test          # unit + component tests (Vitest)
npm run test:rules  # Security Rules against the emulator
npm run test:e2e    # full journeys against the emulator (Playwright)
```

**Unit and component** — the authorization model at every role and status, the
validation schemas including field-level protection, date/URL/text helpers, the
open-redirect guard, upload content sniffing, the markdown renderer's XSS
resistance, form accessibility wiring, and navigation across auth states.

**Security Rules** — the specification's test matrix executed as raw database
operations: what an unauthenticated visitor, a pending account, a suspended
admin, a member, an editor, an admin and a superadmin can and cannot read and
write, plus the "rules are not filters" behaviour and the default-deny rule.

**End-to-end** — real journeys against real emulated Auth, Firestore and rules:
visitor → rides → ride detail → join; member sign-in → dashboard → RSVP (and
that RSVP is idempotent); profile editing; a member being refused admin routes
*and* the admin API; admin reviewing an application; admin creating a ride that
then appears publicly; an editor publishing an article that then appears
publicly; an editor uploading and approving a gallery image; and an upload
disguised as an image being rejected.

---

## Deploying to Vercel

1. **Import** the GitHub repository at [vercel.com/new](https://vercel.com/new).
   Framework preset: **Next.js**. The defaults are correct.
2. **Environment variables** — add every variable from `.env.example` under
   **Settings → Environment Variables**, for **Production**, **Preview** and
   **Development**.
   - Paste `FIREBASE_PRIVATE_KEY` exactly as it appears in the service-account
     JSON, including the literal `\n` sequences.
   - Set `NEXT_PUBLIC_SITE_URL` per environment so canonical URLs and the
     sitemap are correct on each.
3. **Deploy.** Every push to `main` produces a production deployment; every pull
   request gets a preview deployment.
4. **Custom domain** — **Settings → Domains**. HTTPS is provisioned
   automatically. Add the domain to **Firebase → Authentication → Settings →
   Authorized domains**, or sign-in and password reset will fail on it.

Use a **separate Firebase project for preview/staging**. Preview deployments
pointed at production Firebase will write to live data.

---

## Production checklist

**Firebase**

- [ ] Security Rules deployed (`firebase deploy --only firestore:rules,storage`)
- [ ] Indexes deployed and finished building
- [ ] Email/Password enabled; password-reset template customised
- [ ] Storage bucket created
- [ ] First superadmin created and verified
- [ ] App Check registered, monitored, then enforced
- [ ] Backups configured (Firestore → Backups)

**Vercel**

- [ ] All environment variables set for every environment
- [ ] `NEXT_PUBLIC_SITE_URL` matches the real domain
- [ ] Custom domain added and added to Firebase authorized domains
- [ ] Preview deployments pointed at a non-production Firebase project

**Content**

- [ ] Site settings filled in (Admin → Settings)
- [ ] Placeholder page copy replaced with the club's own words
- [ ] Officer positions assigned; only real ones published
- [ ] Hero and section photography uploaded
- [ ] Social links added only for profiles the club actually operates
- [ ] Privacy and Terms reviewed by someone qualified
- [ ] Seed/demo data removed

**Verification**

- [ ] `npm run build` succeeds
- [ ] `npm test` and `npm run test:rules` pass
- [ ] Signed out: member and admin routes redirect to sign-in
- [ ] A pending account cannot reach member content
- [ ] A member cannot reach `/admin` or the admin API
- [ ] A draft article 404s at its public URL

---

## Project structure

```
app/
  (site)/            public marketing site
  member/            member portal   — noindex, force-dynamic
  admin/             admin dashboard — noindex, force-dynamic
  api/               session exchange, uploads, authorised media/documents
components/
  ui/                design-system primitives
  site/ home/ forms/ rides/ events/ gallery/ auth/ member/ admin/
lib/
  auth/              roles, guards, session, error mapping
  data/              server-side Firestore access, all bounded
  actions/           server actions, all guarded
  validation/        Zod schemas shared by client and server
  storage/           upload validation and path rules
  content/           default editorial copy + CMS section registry
types/               domain types mirroring the Firestore model
tests/unit/          unit and component tests
tests/rules/         Security Rules tests
e2e/                 Playwright journeys
firestore.rules  storage.rules  firestore.indexes.json  firebase.json
```

---

## Known limitations

Stated plainly rather than hidden:

- **Search is prefix/substring over one page.** Member and application search
  filters the bounded page already fetched rather than querying the whole
  collection. Firestore has no native full-text search; for a club-sized
  database this is correct behaviour, and if the club outgrows it the fix is an
  external index (Algolia, Typesense) rather than an unbounded query.
- **No transactional email.** Password resets use Firebase's own emails.
  Application outcomes are communicated by an officer out of band — deliberate,
  since the app never reveals internal application status. Adding Resend or
  Postmark would be a self-contained addition to the admin actions.
- **Image dimensions are not extracted on upload.** `width`/`height` on gallery
  items are `null`; the grid uses fixed aspect ratios, so nothing shifts. Adding
  `sharp` to the upload route would populate them.
- **Signed URLs require a real service account.** Document downloads work in
  production but not against the Storage emulator, which cannot sign URLs. The
  e2e suite therefore covers upload and authorization, not emulated download.
- **Document downloads are proxied, not streamed.** Files are read into memory
  before being returned. Fine at the 25 MB ceiling; a very large corpus would
  want streaming.
- **Rate limiting is per fixed window, per hashed IP.** Sufficient against
  casual abuse and bots. A determined distributed attacker needs App Check
  enforcement and, if it ever matters, Cloud Armor.

---

Built for MONARCHS MC. Ride with purpose. Ride as one.
