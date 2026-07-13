# Plan: Role Selection, Auth Routing, and Admin Dashboard

## Context
The Login and Signup pages currently hard-navigate every user to `/app` regardless of who they are. We need:
1. **Role selection** on both auth pages (Driver / Marshal) — admins access the system via `/admin` directly, not through role selection
2. **Post-auth routing** that sends each role to their dashboard: Drivers → `/app`, Marshals → `/marshal`, Admins → `/admin`
3. **Admin dashboard** at `/admin` — fully functional, styled dark-mode, hidden from public navigation
4. **Bug fixes** on the auth pages (minor UI/logic issues identified during review)

---

## Changes

### 1. `src/app/Login.tsx`
- Add a two-option role toggle: **Driver** | **Marshal** (pill-style selector above the form)
- On submit: navigate to `/app` for Driver, `/marshal` for Marshal
- No "Admin" option shown — admins go directly to `/admin`
- Fix: use `text-primary` tokens instead of hardcoded `#39e079` hex for Forgot password link (already uses token — keep)

### 2. `src/app/Signup.tsx`
- Add the same **Driver** | **Marshal** role selector
- Store selected role, navigate to the appropriate dashboard after signup
- No admin role in signup UI

### 3. `src/app/Admin.tsx` (new file)
Full admin dashboard with:
- **Header**: EasyPark logo + "Admin" pill badge, breadcrumb, logout button
- **Summary row**: 4 stat cards — Total Users, Active Reservations, Total Revenue, Unresolved Conflicts
- **Tabs**: Overview | Users | Zones | Marshal Activity
  - **Overview tab**: Revenue chart (recharts LineChart), recent reservations table (last 10), zone occupancy bar chart
  - **Users tab**: Searchable table of mock users with role badges (Driver/Marshal), status (Active/Suspended), action buttons (Suspend/Activate)
  - **Zones tab**: Zone cards (A/B/C) with occupancy %, capacity, unverified slots count, quick actions
  - **Marshal Activity tab**: Table of marshal actions (slot update log) with timestamp, zone, slot ID, action taken, marshal name
- Dark `#09090b` background (same as Marshal dashboard), green/red/orange accents
- Uses `recharts` for charts (already installed), existing shadcn `tabs` and `badge` components from `src/app/components/ui/`

### 4. `src/app/routes.ts`
- Add `{ path: "admin", Component: Admin }` to the children array
- Import `Admin` from `./Admin`

---

## Files to modify
| File | Change |
|---|---|
| `src/app/Login.tsx` | Add role selector, conditional navigation |
| `src/app/Signup.tsx` | Add role selector, conditional navigation |
| `src/app/routes.ts` | Add `/admin` route |
| `src/app/Admin.tsx` | **Create new** — full admin dashboard |

## Files to leave untouched
- `Root.tsx`, `Main.tsx`, `Marshal.tsx`, `Profile.tsx`, all `components/` — no changes needed

---

## Role selector UI pattern (both pages)
```
[ 🚗 Driver ]  [ 🚧 Marshal ]
```
- Two full-width toggle buttons in a `grid-cols-2` layout
- Selected state: solid primary-colored border + tinted background
- Sits between the page heading and the form fields
- Default selection: **Driver**

## Admin dashboard access
- Route exists at `/admin` but is not linked anywhere in the app UI
- No role check on the route itself (client-side protection is moot — real auth would be server-side)
- Admin can navigate away via logout → `/`

## Verification
1. Navigate to `/` → select Driver → log in → lands on `/app` ✓
2. Navigate to `/` → select Marshal → log in → lands on `/marshal` ✓
3. Navigate directly to `/admin` → admin dashboard renders ✓
4. Navigate to `/signup` → select Marshal → sign up → lands on `/marshal` ✓
