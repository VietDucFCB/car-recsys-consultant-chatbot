# Profile + Favorites Wiring + Header Auth — Design

**Date:** 2026-06-01
**Status:** Approved (design), pending implementation

## Problem

The header (CarMarket) shows only Home / Browse / Sell + Explore — no Favorites or
Profile, even though `FavoritesPage.tsx` exists. Investigation (git history + code) shows
this is **incomplete wiring, not lost code**:
- `FavoritesPage.tsx` exists and is fully coded (auth-guard + `useFavorites` + VehicleCard)
  but is an **orphan — never registered as a route** in `App.tsx` and never linked.
- No Profile page has ever existed in git.
- Header has no auth-aware links (Favorites / Profile / Logout).

Everything the features need on the backend already exists:
- Auth: `authApi.login/register/logout`, `isAuthenticated()`, `getCurrentUser()`,
  `authApi.getMe()` → `GET /auth/me`. Token + user persisted in localStorage.
- Favorites: `GET/POST/DELETE /interactions/favorites` (frontend `useFavorites` hook).
- `User` shape: id, username, email, full_name?, phone?, is_active, created_at.
- shadcn `DropdownMenu` + `Avatar` components present.

So this is **frontend wiring only — no backend changes**.

## Decisions (locked with user)

| Topic | Decision |
|---|---|
| Scope | Favorites route + new ProfilePage + auth-aware header links. |
| Header (logged out) | Show **Login** button (current behavior). |
| Header (logged in) | **Avatar dropdown** (shadcn DropdownMenu + Avatar, initial of username): Profile · ♥ Favorites · Logout. |
| Profile editing | Out of scope (backend has no PATCH /me) — Profile is read-only. |
| History / search-history | Out of scope (user chose the Favorites+Profile option, not the history option). |

## Architecture / Components

### 1. `src/App.tsx` (MODIFY) — register routes
Add `import FavoritesPage from "./pages/FavoritesPage";` and a new `ProfilePage` import,
plus routes:
```tsx
<Route path="/favorites" element={<FavoritesPage />} />
<Route path="/profile" element={<ProfilePage />} />
```
FavoritesPage already self-guards (redirects to /login when `!isAuthenticated()`), so no
extra protection wrapper is needed.

### 2. `src/pages/ProfilePage.tsx` (CREATE) — read-only profile
- Route `/profile`. On mount, if `!isAuthenticated()` → redirect `/login`.
- Load the user: prefer `getCurrentUser()` (localStorage, instant) and/or `authApi.getMe()`
  (fresh from `/auth/me`); show username, email, full_name, phone, and "Member since"
  (`created_at`). Avatar = first letter of username (shadcn `Avatar`/`AvatarFallback`).
- Quick actions: a card/link "My Favorites" → `/favorites`; a **Logout** button
  (`authApi.logout()` then navigate `/`).
- Wrapped in `<Header/>` … `<Footer/>`; theme tokens only (works dark default + light).
- No edit form (read-only; backend has no profile-update endpoint).

### 3. `src/components/Header.tsx` (MODIFY) — auth-aware right cluster
- Keep nav (Home/Browse/Sell) + `ThemeToggle`.
- Right cluster branches on `isAuthenticated()`:
  - **Logged out:** the existing Login link/button (→ `/login`).
  - **Logged in:** a shadcn `DropdownMenu`. Trigger = `Avatar` with `AvatarFallback` =
    `getCurrentUser()?.username?.[0]?.toUpperCase()`. Menu items:
    - **Profile** → `/profile`
    - **♥ Favorites** → `/favorites`
    - **Logout** → `authApi.logout()` then navigate `/` (and refresh auth state so the
      header flips back to Login).
- `authApi.logout()` clears localStorage; after it, navigate home. Since `isAuthenticated()`
  reads localStorage synchronously, a `navigate("/")` + component re-render reflects the
  logged-out state (use a small local state or `window.location` if needed to force the
  header to re-evaluate — implementer picks the minimal approach that actually flips the UI).

## Data flow (all endpoints exist)
```
Header/ProfilePage → isAuthenticated()/getCurrentUser() (localStorage)
ProfilePage        → authApi.getMe() → GET /auth/me
FavoritesPage      → useFavorites() → GET /interactions/favorites
Logout             → authApi.logout() (clear localStorage) → navigate /
```

## Out of scope (YAGNI)
- Editing profile / change password (no backend PATCH /me).
- Interaction history & search-history tabs (separate, deferred).
- Protected-route HOC/wrapper — pages self-guard with `isAuthenticated()` redirect.
- Backend changes of any kind.

## Verification
1. `/favorites` renders the logged-in user's favorites (VehicleCard grid); when logged out,
   redirects to `/login`.
2. `/profile` shows the user's username/email/full_name/phone/created_at from `/auth/me`;
   Logout clears auth and returns to `/`.
3. Header: logged out → Login; logged in → avatar dropdown with Profile / Favorites /
   Logout, each navigating correctly; after Logout the header shows Login again.
4. `npm run build` passes (TS clean); both dark (default) and light themes look right;
   mobile header still usable.
