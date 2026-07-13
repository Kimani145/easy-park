# EasyPark — Mobile-First Redesign with Light/Dark Mode

## Context

The current UI is desktop-first: a fixed 340px sidebar + full-width map panel, no bottom navigation, no theme switching. The user wants a mobile-first redesign that preserves all existing functionality (parking cards, reservation flow, directions, map, auth pages) but restructures the layout for small screens, adds a bottom nav bar for mobile navigation, uses a right sidebar for supplemental info on wide screens, and introduces full light + dark mode with a theme switcher. `next-themes` is already installed; it just isn't wired up.

---

## Plan

### 1. Wire up `next-themes` ThemeProvider

**File:** `src/app/Root.tsx`

Wrap `<Outlet />` with `<ThemeProvider attribute="class" defaultTheme="dark" enableSystem>` from `next-themes`. This applies the `.dark` class to `<html>` and makes `useTheme()` available throughout the app.

```tsx
import { ThemeProvider } from "next-themes";
export default function Root() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <Outlet />
    </ThemeProvider>
  );
}
```

---

### 2. Define light mode tokens in `theme.css`

**File:** `src/styles/theme.css`

Currently `:root` and `.dark` hold identical dark values. Change `:root` to be the **light theme** and keep `.dark` as the dark theme.

**Light mode token values for `:root`:**
```css
:root {
  --background: #f5f7f5;
  --foreground: #0c0f0e;
  --card: #ffffff;
  --card-foreground: #0c0f0e;
  --popover: #ffffff;
  --popover-foreground: #0c0f0e;
  --primary: #1a9e52;          /* darker green for light bg contrast */
  --primary-foreground: #ffffff;
  --secondary: #edf2ee;
  --secondary-foreground: #2a352c;
  --muted: #edf2ee;
  --muted-foreground: #5a6e5d;
  --accent: #1a9e52;
  --accent-foreground: #ffffff;
  --destructive: #d13d3d;
  --destructive-foreground: #ffffff;
  --border: rgba(0, 0, 0, 0.1);
  --input: transparent;
  --input-background: #edf2ee;
  --switch-background: #c5d1c8;
  --ring: #1a9e52;
  /* chart, sidebar tokens updated similarly */
}
```

Keep `.dark` block exactly as it is (the current dark values).

---

### 3. Theme switcher component

**File:** `src/app/components/ThemeSwitcher.tsx` (new file)

Simple button using `useTheme()` from `next-themes`. Renders a Sun icon in dark mode and a Moon icon in light mode. Used in: header on desktop, settings sheet on mobile.

```tsx
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
```

---

### 4. Mobile-first layout restructure — `Main.tsx`

This is the largest change. The current layout is `flex-row` (sidebar left + map right) with fixed pixel widths. Replace it with a mobile-first stack.

#### Layout strategy

| Breakpoint | Layout |
|---|---|
| `< md` (mobile) | Full-screen map, bottom nav bar, sliding bottom sheet for list/directions/reservations |
| `≥ md` (tablet) | Map fills most of screen, collapsible left panel, bottom nav hidden |
| `≥ lg` (desktop) | Map center, 340px left panel, optional right sidebar for reservations/detail |

#### Bottom nav bar (mobile only, `flex md:hidden`)

4 tabs with icons + labels:
- **Explore** (MapPin) — default, shows map + bottom sheet with parking list
- **Directions** (Navigation) — shows directions panel in bottom sheet
- **Reservations** (Ticket) — shows reservations in bottom sheet
- **Account** (User) — shows a minimal sheet with log-out + theme switcher

Navigation state controlled by a `activeTab` string in Main.

#### Sidebar (desktop `≥ lg`)

Left sidebar (`w-[320px] hidden lg:flex flex-col border-r`) contains the existing sorting controls + parking list. This replaces the current always-visible sidebar.

Right sidebar (for desktop): A collapsible `w-[300px]` panel (hidden by default, opens when "My Reservations" is clicked) showing reservation details. Uses `react-resizable-panels` or simple conditional CSS.

#### Bottom sheet (mobile)

Use `vaul` (already installed: `vaul` 1.1.2) for the mobile bottom sheet drawer. The `Drawer` from vaul provides a native-feel slide-up panel. The sheet contains:
- Parking list (default)
- Directions panel
- Reservations panel

#### Map

Map fills the full available height. On mobile: `h-[calc(100vh-4rem-3.5rem)]` (subtracting header + bottom nav). On desktop: `h-full` of the flex container.

---

### 5. Auth pages — mobile-first update

**Files:** `src/app/Login.tsx`, `src/app/Signup.tsx`

Both already have `hidden lg:flex` on the decorative left panel, so the form is already full-width on mobile. Minor updates:
- Add `ThemeSwitcher` in the top-right corner of the form panel
- Ensure inputs and buttons are `h-12` (touch-friendly 48px) on mobile
- Use `text-base` (not `text-sm`) for inputs on mobile to prevent iOS zoom
- Add the `ThemeProvider`-aware background so light mode renders correctly

---

### 6. Header adjustments

**In `Main.tsx` header:**
- On mobile (`md:hidden`): show logo + theme switcher only; search goes into a sheet/modal triggered by a search icon
- On desktop: existing layout unchanged (logo, search, reservations button, live indicator, log out, theme switcher)

---

## Files to Modify

| File | Changes |
|---|---|
| `src/app/Root.tsx` | Add `ThemeProvider` wrapper |
| `src/styles/theme.css` | Define light mode `:root` tokens |
| `src/app/Main.tsx` | Full mobile-first layout restructure |
| `src/app/Login.tsx` | Touch-friendly inputs, ThemeSwitcher, light mode aware |
| `src/app/Signup.tsx` | Same as Login |

## Files to Create

| File | Purpose |
|---|---|
| `src/app/components/ThemeSwitcher.tsx` | Sun/Moon toggle using `useTheme()` |

---

## Reuse of Existing Utilities

- `vaul` (installed) — bottom sheet drawer for mobile
- `next-themes` (installed) — ThemeProvider + useTheme
- `lucide-react` — Sun, Moon, User icons for new UI
- `src/app/components/ui/utils.ts` — `cn()` helper for conditional classes
- All existing parking logic (filtering, sorting, reservation flow) stays untouched

---

---

### 7. Network status bar (YouTube/Gmail pattern)

**File:** `src/app/components/NetworkStatus.tsx` (new)

A bar that pins itself just below the header. It monitors `navigator.onLine` via `window` event listeners (`online` / `offline`). 

**Behavior:**
- **Goes offline** → bar slides down (CSS `translate-y`) from behind the header, colored dark gray/charcoal with a WiFi-off icon: `"You are offline"`. Stays pinned.
- **Comes back online** → bar transitions to green with a checkmark: `"Back online"`, then auto-dismisses after 3 seconds with a slide-up animation.

**Placement:** Rendered inside `Root.tsx` just above `<Outlet />`, so it appears on every page (login, signup, main app). Uses `fixed top-14 left-0 right-0 z-50` so it sits directly below the header on the main app, and `fixed top-0` on auth pages (no header).

```tsx
// Pseudocode
const [status, setStatus] = useState<"online"|"offline"|"restored">("online");
useEffect(() => {
  window.addEventListener("offline", () => setStatus("offline"));
  window.addEventListener("online", () => { setStatus("restored"); setTimeout(() => setStatus("online"), 3000); });
}, []);
// Render: animate bar in/out with motion or CSS transition
```

**Styling:**
- Offline: `bg-[#323232] text-white` (neutral dark, YouTube-style)
- Restored: `bg-[#39e079] text-[#0a0f0c]` (green confirmation)
- Height: `h-9`, full width, centered text with icon

Mount this in `Root.tsx` above `<Outlet />`.

---

### 8. Profile page

**Route:** `/app/profile` (add to `routes.ts` as a child of the `/app` parent, or as a separate route)

**File:** `src/app/Profile.tsx` (new)

Three sections, stacked vertically on mobile, same layout on desktop:

#### A. Profile header
- Avatar circle (initials-based, no image upload needed for now)
- User name + email (static/mock for now; will pull from JWT claims on backend)
- "Member since" date

#### B. Change password form
Fields: Current Password, New Password, Confirm New Password
- Same password strength meter pattern from `Signup.tsx`
- Submit button → simulated success toast (using `sonner`)
- **Backend hook:** `PATCH /api/auth/change-password/` with `{current_password, new_password}`

#### C. Recent parking history (summary)
- Shows last 5 reservations in a compact list (parking name, date, duration, cost)
- "View more" button at the bottom → opens the History Popup

---

### 9. History popup component

**File:** `src/app/components/ParkingHistoryModal.tsx` (new)

A full-screen modal (mobile) or centered dialog (desktop) showing the complete parking log as a scrollable list. Each entry shows:
- Parking name + address
- Date + start time
- Duration + total cost
- Status badge: `Completed` / `Cancelled`

Uses the existing `Dialog` from `src/app/components/ui/dialog.tsx` (already available via Radix UI).

Triggered by "View more" on the Profile page.

---

### 10. Arrival confirmation interface

**File:** `src/app/components/ArrivalConfirmation.tsx` (new, rendered inside `Main.tsx`)

When a user has an active reservation and is navigating (directions panel open), a persistent banner appears at the bottom of the directions panel:

> **"Have you arrived?"**  
> [Confirm Arrival] button

On clicking **Confirm Arrival**:
1. A full-screen modal appears with:
   - Large green checkmark animation
   - "Welcome to {parking name}!" heading
   - Spot number reminder (`Your spot: 3-07`)
   - Booking ID
   - A checklist of next steps: "Park within your reserved spot", "Display your Booking ID if requested", "Your reservation is active until {end time}"
2. A "Done" button dismisses the modal

**State:** Add `arrivedReservationId: string | null` to Main state. Set it on confirm, clear it on Done.

**Backend hook:** `POST /api/reservations/{id}/arrive/` — records arrival timestamp for the marshal dashboard.

---

### 11. Bottom nav "Account" tab → Profile navigation

The mobile bottom nav **Account** tab (User icon) navigates to `/app/profile` instead of opening a sheet. The profile page has a back button returning to `/app`.

On desktop, add a **Profile** link in the header dropdown or alongside the Log out button.

---

## Backend feasibility notes (Django / DRF)

All frontend interactions are designed to map directly to DRF endpoints:

| Frontend action | DRF endpoint |
|---|---|
| Login | `POST /api/auth/token/` (JWT pair) |
| Signup | `POST /api/auth/register/` |
| Find nearby parkings | `GET /api/parkings/?lat=&lng=&radius=` (GeoDjango ST_DWithin) |
| Reserve spot | `POST /api/reservations/` |
| Cancel reservation | `DELETE /api/reservations/{id}/` |
| Confirm arrival | `POST /api/reservations/{id}/arrive/` |
| Change password | `PATCH /api/auth/change-password/` |
| Parking history | `GET /api/reservations/?user=me&ordering=-date` |
| Profile info | `GET /api/auth/me/` (decoded from JWT claims) |

RBAC roles (`DRIVER`, `MARSHAL`, `ADMIN`) are enforced server-side; the frontend only uses the `DRIVER` role for now. JWT tokens will be stored in `localStorage` or `httpOnly` cookies and attached as `Authorization: Bearer <token>` headers.

---

## Updated file manifest

| File | Action |
|---|---|
| `src/app/Root.tsx` | Add ThemeProvider + NetworkStatus |
| `src/styles/theme.css` | Light mode `:root` tokens |
| `src/app/Main.tsx` | Mobile-first layout, bottom nav, ArrivalConfirmation trigger |
| `src/app/Login.tsx` | Touch-friendly, ThemeSwitcher, light mode |
| `src/app/Signup.tsx` | Same as Login |
| `src/app/Profile.tsx` | New — profile + password change + history summary |
| `src/app/routes.ts` | Add `/app/profile` route |
| `src/app/components/ThemeSwitcher.tsx` | New — Sun/Moon toggle |
| `src/app/components/NetworkStatus.tsx` | New — offline/online bar |
| `src/app/components/ParkingHistoryModal.tsx` | New — full history dialog |
| `src/app/components/ArrivalConfirmation.tsx` | New — arrival confirm modal |

---

## Verification

1. **Light mode:** Toggle to light mode — all backgrounds, text, borders should invert correctly using CSS variable tokens
2. **Dark mode:** Toggle back — original dark scheme restored
3. **Mobile (< 640px):** Bottom nav shows; tapping Explore shows parking list in bottom sheet; tapping a card shows detail; tapping Go shows directions; tapping Reservations shows booking list
4. **Desktop (≥ 1024px):** Left sidebar visible; right reservations panel opens from header button; bottom nav hidden; header has search + theme switcher
5. **Auth pages:** Both login and signup render correctly in light and dark mode; inputs are touch-friendly
6. **Reservation flow:** Reserve modal still opens and completes correctly on both mobile and desktop
