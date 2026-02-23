# Guinness Passport 🍺

A full-stack pint diary web app — track every Guinness you drink, collect passport stamps, and view your drinking history on a map.

## Tech Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Firebase** — Auth (email + Google), Firestore, Storage
- **Tailwind CSS v4** — Custom dark Guinness theme
- **Framer Motion** — Animations (stamp reveal, card stagger, modals)
- **Mapbox GL JS** — Interactive pint map
- **Recharts** — Stats charts
- **react-hot-toast** — Toast notifications

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Edit `.env.local` and fill in your keys:

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Mapbox (for map page)
NEXT_PUBLIC_MAPBOX_TOKEN=...

# Google Maps / Places API (for pub search)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

> **Note:** The app works without Mapbox or Google Maps keys — map shows a fallback list view, and pub search returns mock Dublin pubs.

### 3. Firebase setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable **Authentication** with Email/Password and Google providers
3. Create a **Firestore** database (start in production mode)
4. Enable **Storage** for pint photos (optional)
5. Deploy security rules:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes
```

The `firestore.rules` and `firestore.indexes.json` files are included.

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  login/          Age gate + email/password + Google OAuth
  diary/          Paginated pint feed with stats strip
  log/            Multi-step add pint form (location → rating → tags → note → photo)
  map/            Full-screen Mapbox map with gold pin markers
  passport/       Passport stamp grid (one per pint) + export to PNG
  stats/          Bar charts: pints by day, rating distribution, best pub
  profile/        Edit name/home pub, sign out
  api/places/     Server-side Google Places API proxy routes

components/
  ui/             Button, Card, Modal, StarRating, TagPill, Skeleton, HarpLogo
  pint/           PintCard, PintForm, PintMap, PassportStamp
  layout/         TopBar, BottomNav, AuthGuard

lib/
  firebase.ts     Firebase app init + offline persistence
  firestore.ts    Typed Firestore helpers (addPint, getPints, computeStats…)
  auth.ts         Sign up / sign in / Google OAuth / sign out
  places.ts       GPS geolocation + Places API
  storage.ts      Firebase Storage photo upload

context/
  AuthContext.tsx Firebase Auth state + user Firestore doc

hooks/
  useAuth.ts
  usePints.ts     Paginated pint feed with optimistic updates
  useGeolocation.ts
```

## Features

- **Age gate** on login screen
- **Google OAuth** + email/password sign-in
- **Protected routes** — unauthenticated users → `/login`
- **Add a Pint** — 5-step flow: GPS pub detection → star rating → tag pills → tasting note → photo
- **Optimistic UI** — pint appears instantly before Firestore confirms
- **Passport stamps** — animated ink stamp per pint, exportable as PNG (html2canvas)
- **Interactive map** — gold pin markers, popup cards
- **Stats** — total pints, unique pubs, avg rating, best pub, day-of-week & rating charts
- **PWA** — manifest.json, installable on iOS/Android
- **Offline persistence** — Firestore IndexedDB enabled
- **Noise texture** + **Guinness brand palette** throughout

## Brand Colours

| Name      | Hex       | Usage           |
|-----------|-----------|-----------------|
| Black     | `#0a0a0a` | Background      |
| Cream     | `#f5f0e8` | Text            |
| Gold      | `#c9a84c` | Accents, stars  |
| Deep Red  | `#8b0000` | Error/danger    |

## Fonts

- **Playfair Display** — headings, pub names, display text
- **Libre Baskerville** — body copy, tasting notes
- **DM Mono** — labels, metadata, monospaced UI

## PWA Icons

Place 192×192 and 512×512 PNG icons at:
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
