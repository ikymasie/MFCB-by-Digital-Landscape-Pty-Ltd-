# Framer Motion Advanced Implementation Plan — MFCB Portal

Generated: 2026-05-07  
Scope: `apps/portal/src`  
Pages surveyed: 34 routes across auth, app, layout, and UI components

---

## 1. Design Token Reference

All animations pull from this shared vocabulary. Define once in `lib/motion.ts`.

```ts
// lib/motion.ts
export const spring = {
  crisp:  { type: 'spring', stiffness: 380, damping: 30 },
  soft:   { type: 'spring', stiffness: 120, damping: 20 },
  slow:   { type: 'spring', stiffness: 60,  damping: 18 },
};

export const ease = {
  premium: [0.23, 1, 0.32, 1] as const,
  snap:    [0.16, 1, 0.3,  1] as const,
};

export const duration = {
  fast:   0.18,
  normal: 0.28,
  slow:   0.45,
};

export const fadeUp = {
  initial:  { opacity: 0, y: 16 },
  animate:  { opacity: 1, y: 0  },
  exit:     { opacity: 0, y: -8 },
  transition: { ...spring.soft },
};

export const fadeIn = {
  initial:    { opacity: 0 },
  animate:    { opacity: 1 },
  exit:       { opacity: 0 },
  transition: { duration: duration.normal, ease: ease.premium },
};

export const scaleIn = {
  initial:    { opacity: 0, scale: 0.94 },
  animate:    { opacity: 1, scale: 1    },
  exit:       { opacity: 0, scale: 0.97 },
  transition: { ...spring.crisp },
};

export const staggerContainer = (stagger = 0.06) => ({
  animate: { transition: { staggerChildren: stagger, delayChildren: 0.05 } },
});

export const staggerItem = {
  initial:  { opacity: 0, y: 12 },
  animate:  { opacity: 1, y: 0  },
  transition: { ...spring.soft },
};

export const shakeX = {
  animate: { x: [0, -6, 6, -4, 4, -2, 2, 0] },
  transition: { duration: 0.5, ease: 'easeInOut' },
};

export const pulseOpacity = {
  animate:    { opacity: [1, 0.55, 1] },
  transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
};
```

---

## 2. Required Shared Components

Build these once. Every page imports them.

### `components/motion/PageWrapper.tsx`
Wraps every page with `AnimatePresence`-compatible fade-up entry.

```tsx
'use client';
import { motion } from 'framer-motion';
import { fadeUp } from '@/lib/motion';

export function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div {...fadeUp} className="w-full">
      {children}
    </motion.div>
  );
}
```

### `components/motion/StaggerList.tsx`
Wraps repeated lists (table rows, cards, grid items).

```tsx
'use client';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/motion';

export function StaggerList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerContainer()} initial="initial" animate="animate" className={className}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}
```

### `components/motion/AnimatedNumber.tsx`
Smooth count-up for KPI metrics. Uses `useMotionValue` + `useSpring` + `useTransform`.

```tsx
'use client';
import { useEffect } from 'react';
import { useMotionValue, useSpring, useTransform, motion } from 'framer-motion';

export function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const mv   = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => `${Math.round(v).toLocaleString()}${suffix}`);
  useEffect(() => { mv.set(value); }, [value, mv]);
  return <motion.span>{display}</motion.span>;
}
```

### `components/motion/AnimatedBar.tsx`
Animated width progress bars (replaces CSS `transition-all`).

```tsx
'use client';
import { motion } from 'framer-motion';
import { ease, duration } from '@/lib/motion';

export function AnimatedBar({ pct, className }: { pct: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ width: 0 }}
      animate={{ width: `${pct}%` }}
      transition={{ duration: duration.slow, ease: ease.premium }}
    />
  );
}
```

### `app/layout.tsx` — Add `AnimatePresence`

```tsx
import { AnimatePresence } from 'framer-motion';
// wrap {children} in:
<AnimatePresence mode="wait">
  {children}
</AnimatePresence>
```

---

## 3. Screen-by-Screen Plan

---

### AUTH GROUP — `(auth)/`

---

#### `/login` — `(auth)/login/page.tsx`

**Current state:** Static card, no entrance animation, error div appears instantly.

| Element | Animation | API |
|---|---|---|
| Outer `<main>` wrapper | `fadeUp` on mount | `motion.main` with `fadeUp` |
| Logo icon `.w-16.h-16` | Scale + rotate from 0.6/−15° | `initial={{ scale: 0.6, rotate: -15 }}` spring.crisp |
| Heading + subtitle | Stagger 80ms after icon | `motion.h1` + `motion.p` with `staggerItem` |
| Email field | Slide in from left | `initial={{ x: -20, opacity: 0 }}` |
| Password field | Slide in from right | `initial={{ x: 20, opacity: 0 }}` |
| Submit button | `whileHover={{ scale: 1.02 }}` `whileTap={{ scale: 0.97 }}` | `motion.button` |
| Error div | `shakeX` when it mounts AND shake the card | wrap error in `AnimatePresence`, trigger shake on card ref |
| Security disclaimer | Fade up 200ms after card | `motion.div` with `fadeUp` + `delay: 0.4` |
| Forgot password link | `whileHover={{ x: 2 }}` | `motion.a` |

**Card entrance:** Wrap entire card div in `motion.div` with `scaleIn`. `transformOrigin: "top center"`.

---

#### `/auth/mfa` — `(auth)/auth/mfa/page.tsx`

**Current state:** Static OTP inputs, no transitions between states.

| Element | Animation | API |
|---|---|---|
| Shield icon | Pulse ring: `animate={{ scale: [1, 1.12, 1] }}` repeat | `motion.div` around icon, `transition: { repeat: Infinity, duration: 2 }` |
| 6 OTP inputs | Stagger entry 40ms each | `StaggerList` wrapping `<div className="flex justify-between gap-2">` |
| Each digit input | Pop in: `scaleIn` variant, `delay: i * 0.04` | `motion.input` with `variants={staggerItem}` |
| Filled digit | Scale micro-bump: `animate={{ scale: [1, 1.15, 1] }}` on value change | `useEffect` watching digit value, trigger via `animate` prop |
| Error state | `shakeX` on entire form | wrap `<form>` in `motion.form`, call `animate` imperatively via `useAnimate` |
| "Verify" button | Same as login: `whileHover/whileTap` scale | `motion.button` |
| Accent bar (`.h-1.5`) | Slide in from left on mount | `motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transformOrigin: "left"` |
| Footer links | Stagger fade in | `StaggerList` + `StaggerItem` wrapping `.map()` |

**Page transition:** Wrap entire page in `PageWrapper` with `fadeUp`.

---

#### `/auth/reset` — `(auth)/auth/reset/page.tsx`

| Element | Animation |
|---|---|
| Form card | `scaleIn` mount |
| Input fields | Sequential fade-up (stagger 60ms) |
| Submit button | `whileHover/whileTap` |
| Success state (email sent) | `AnimatePresence` swap: form exit `fadeIn` reverse → success message `fadeUp` |

---

#### `/auth/reset/confirm` — `(auth)/auth/reset/confirm/page.tsx`

| Element | Animation |
|---|---|
| Password fields | Stagger entry |
| Password strength bar | `AnimatedBar` growing as user types |
| Submit | `whileHover/whileTap` |

---

#### `/auth/enroll` — `(auth)/auth/enroll/page.tsx`

**QR code enrollment — high animation value.**

| Element | Animation |
|---|---|
| Step indicator | `layoutId="step-indicator"` morph between steps |
| QR code container | Reveal: `scaleIn` with `initial={{ filter: "blur(8px)" }} animate={{ filter: "blur(0px)" }}` |
| Step transitions | Horizontal slide: step 1 exits `x: -40`, step 2 enters `x: 40` via `AnimatePresence` |
| Completion checkmark | Draw SVG path: `pathLength: [0, 1]` |

---

### APP GROUP — `(app)/`

---

#### Layout — `(app)/layout.tsx` + `Sidebar.tsx` + `TopBar.tsx`

**Sidebar — high impact, seen on every page.**

| Element | Animation |
|---|---|
| Sidebar mount | `motion.aside initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}` spring.soft |
| Active nav item highlight | `layoutId="sidebar-active"` — the `bg-white/15` pill morphs between items on navigation |
| ChevronRight rotation | Already CSS `rotate-90`. Replace with `motion.svg animate={{ rotate: isExpanded ? 90 : 0 }}` spring.crisp |
| Submenu expand/collapse | `AnimatePresence` + `motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}` |
| Each sub-item | Stagger 40ms entry when submenu opens |
| User avatar | `whileHover={{ scale: 1.08 }}` spring.crisp |
| Nav items (initial load) | Stagger 30ms from top down |

**TopBar:**

| Element | Animation |
|---|---|
| TopBar mount | `motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}` |
| Page title change | `AnimatePresence mode="wait"` — old title exits up, new title enters from below |

---

#### `/institutions` — `(app)/institutions/page.tsx`

**Current state:** Static table, static bento grid, no entrance.

| Element | Animation |
|---|---|
| Page header (h1 + p) | `PageWrapper` + `fadeUp` |
| "New Institution" button | `whileHover={{ scale: 1.03, boxShadow: "0 4px 20px rgba(0,30,64,0.3)" }}` `whileTap={{ scale: 0.97 }}` |
| Filter card | `motion.div fadeUp delay: 0.1` |
| Table container | `motion.div fadeUp delay: 0.2` |
| Table rows | `motion.tr` via `StaggerItem` — stagger 40ms. `whileHover={{ backgroundColor: "#eceef0" }}` |
| Action buttons (Eye, Pencil, Ban) | `whileHover={{ scale: 1.2 }}` `whileTap={{ scale: 0.9 }}` |
| Status dot (ACTIVE) | `pulseOpacity` — animate the `.w-1.5.h-1.5.rounded-full` for ACTIVE only |
| Bento stats grid | `StaggerList` with 60ms stagger, cards use `staggerItem` |
| Suspended bento (red) | Extra: `whileHover={{ scale: 1.02 }}` to draw attention |
| Progress bar in Total card | `AnimatedBar` replacing static `div style={{ width: '100%' }}` |
| Empty state (Building2 icon) | `motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2 }}` |

---

#### `/institutions/new` — `(app)/institutions/new/page.tsx`

| Element | Animation |
|---|---|
| Form card | `scaleIn` mount |
| Field rows | Stagger entry 50ms |
| Submit button | `whileHover/whileTap` |
| Breadcrumb chevron | `whileHover={{ x: 2 }}` |

---

#### `/institutions/[id]` — `(app)/institutions/[id]/page.tsx`

**Institutional profile with tabbed navigation and management actions.**

| Element | Animation | API |
|---|---|---|
| Detail card | `PageWrapper fadeUp` | |
| Status badge | `scaleIn` on mount | |
| Tab bar (Overview / Users / etc) | `layoutId="institution-tab-underline"` — border-bottom indicator morphs | |
| Tab content swap | `AnimatePresence mode="wait"` with `fadeIn` | |
| Quick Navigation buttons (Sidebar) | `StaggerList` 60ms stagger. Icons: `whileHover={{ rotate: 8, scale: 1.1 }}` | |
| Export Profile button | `whileHover={{ scale: 1.05 }}` `whileTap={{ scale: 0.97 }}` | |
| Save Changes button | `whileHover={{ scale: 1.05 }}` with `spring.crisp` | |
| Security Protocol card | `motion.div whileHover={{ y: -2 }}` | |

---

#### `/institutions/[id]/sftp` — `(app)/institutions/[id]/sftp/page.tsx`

**Secure data gateway configuration — high technical precision feel.**

| Element | Animation | API |
|---|---|---|
| Page | `PageWrapper fadeUp` | |
| Breadcrumb | Sequential fade-up | `StaggerList` |
| Status badge (ACTIVE/INACTIVE) | `scaleIn` on mount | |
| Config card (Form) | `scaleIn` mount, stagger fields | `StaggerList` wrapping grid |
| Authorized keys list | `StaggerList` 40ms stagger. Each key: `staggerItem` | |
| Delete key button (Trash2) | `whileHover={{ scale: 1.2, color: "#ba1a1a" }}` | |
| Save success alert | `AnimatePresence` slide-down | `initial={{ height: 0 }} animate={{ height: "auto" }}` |
| "Test Connection" button | `whileHover={{ scale: 1.02 }}`. Loading: `motion.div animate={{ rotate: 360 }}` | |
| Help cards (bottom) | `StaggerList` 80ms stagger. Cards: `whileHover={{ y: -4 }}` | |

---

#### `/institutions/[id]/users` — `(app)/institutions/[id]/users/page.tsx`

**Management dashboard with modals and bento-style stats.**

| Element | Animation | API |
|---|---|---|
| Page | `PageWrapper fadeUp` | |
| Search input | Focus ring: `motion.div animate={{ boxShadow: "0 0 0 3px rgba(151,204,254,0.4)" }}` | |
| "Invite User" button | `whileHover={{ scale: 1.03, boxShadow: "0 4px 16px rgba(0,30,64,0.25)" }}` | |
| Staff Roster table | `StaggerList` 40ms. Rows: `whileHover={{ backgroundColor: "#eceef0" }}` | |
| Role/Status badges | Pop-in: `scaleIn` with spring.crisp | |
| Action buttons (Pencil/Trash) | `whileHover={{ scale: 1.2 }}` `whileTap={{ scale: 0.9 }}` | |
| Sidebar "Invite" form | `scaleIn` container, stagger input labels | |
| Seat Allocation ring | SVG circle: `motion.circle initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}` | |
| Invite/Edit Modals | `AnimatePresence` + `scaleIn` panel + `fadeIn` backdrop | |

---

#### `/institutions/[id]/webhooks` — `(app)/institutions/[id]/webhooks/page.tsx`

**API integration screen with secure field toggles.**

| Element | Animation | API |
|---|---|---|
| Page | `PageWrapper fadeUp` | |
| Info Alert | `fadeUp delay: 0.1` | |
| Signing secret input | `AnimatePresence` swap: `password` → `text` with `fadeIn` | |
| Secret copy button | `AnimatePresence` swap: icon → CheckCircle with `scaleIn` | |
| Event checkboxes | `whileHover={{ scale: 1.01, backgroundColor: "#f2f4f6" }}` | |
| Save/Test success | `AnimatePresence` slide-down alerts | |
| "Disable Webhook" button | `whileHover={{ backgroundColor: "#ffdad6" }}` warning highlight | |
| "Test Webhook" zap icon | `motion.svg animate={{ scale: [1, 1.2, 1] }} repeat: Infinity` on hover | |

---

#### `/batches` — `(app)/batches/page.tsx`

**High-value page — 4 KPI cards, table, progress bars, pagination.**

| Element | Animation |
|---|---|
| Page header | `PageWrapper fadeUp` |
| Action buttons | `whileHover/whileTap` scale |
| KPI metric cards (×4) | `StaggerList` stagger 70ms. Each card: `staggerItem`. Numbers: `AnimatedNumber` when data loads |
| KPI icon backgrounds | `motion.div whileHover={{ rotate: 10, scale: 1.1 }}` on the colored icon wrappers |
| Filter bar | `fadeUp delay: 0.15` |
| Clear filter button (XCircle) | `whileHover={{ rotate: 90, scale: 1.1 }}` spring.crisp |
| Table rows | `motion.tr` with `initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}` stagger 30ms |
| StatusBadge dot (in-progress) | `pulseOpacity` on dot for VALIDATING / PARSING / MASTERING |
| FileTypeBadge LIVE | `motion.span animate={{ scale: [1, 1.04, 1] }} transition={{ repeat: Infinity, duration: 3 }}` subtle pulse |
| Pagination buttons | `whileHover={{ scale: 1.1 }}` `whileTap={{ scale: 0.92 }}` |
| Active page number | `layoutId="batch-page-indicator"` pill morphs between page buttons |
| Bottom compliance card (dark blue) | `fadeUp delay: 0.3` |
| Download Schema / Integration Docs buttons | `whileHover={{ scale: 1.03, y: -1 }}` |
| Submission Trends bars | `AnimatedBar` replacing inline `style={{ width: \`${pct}%\` }}` |
| Empty state row | `motion.td` with `fadeIn` |
| Loading → data transition | `AnimatePresence mode="wait"` — spinner exits, table enters with `StaggerList` |

---

#### `/batches/new` — `(app)/batches/new/page.tsx`

**Drag-drop zone is the hero element.**

| Element | Animation |
|---|---|
| Breadcrumb | `fadeUp` |
| Form card | `scaleIn` |
| Field grid items | Stagger 50ms |
| File type LIVE warning | `AnimatePresence` — slides down: `initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}` |
| Copy button (idempotency key) | `AnimatePresence` swap icon → CheckCircle with `scaleIn` |
| Drop zone (default state) | `motion.div whileHover={{ borderColor: "#28628f", scale: 1.005 }}` |
| Drop zone (isDragOver) | `animate={{ scale: 1.02, borderColor: "#28628f", backgroundColor: "#f0f7ff" }}` spring.soft — "breathing" effect |
| Upload icon circle | `motion.div animate={isDragOver ? { scale: 1.15, rotate: -10 } : { scale: 1, rotate: 0 }}` |
| File selected → preview swap | `AnimatePresence mode="wait"`: drop zone exits `scaleIn` reverse, preview enters `fadeUp` |
| File preview checkmark dot | `motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}` spring.crisp |
| Trash2 button | `whileHover={{ scale: 1.2, color: "#ba1a1a" }}` |
| Submit button | `whileHover={{ scale: 1.02, boxShadow: "0 6px 24px rgba(0,30,64,0.4)" }}` `whileTap={{ scale: 0.97 }}` |
| Feature cards (×3) | `StaggerList` stagger 80ms. `whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}` |
| Feature card icon | `whileHover={{ rotate: 8, scale: 1.1 }}` spring.crisp |
| LIVE confirmation modal | `AnimatePresence` + `motion.div scaleIn` for modal, `motion.div fadeIn` for backdrop |
| Warning icon in modal | `motion.div animate={{ rotate: [0, -5, 5, -3, 3, 0] }} transition={{ delay: 0.3, duration: 0.5 }}` |

---

#### `/batches/sftp` — `(app)/batches/sftp/page.tsx`

| Element | Animation |
|---|---|
| Page | `PageWrapper fadeUp` |
| SFTP connection status indicator | Animated ping dot (replace CSS `animate-ping` with Framer: `motion.span animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }} repeat: Infinity`) |
| Table rows | `StaggerList` |

---

#### `/batches/[id]` — `(app)/batches/[id]/page.tsx`

**Processing status flow — the primary real-time feedback screen.**

| Element | Animation | API |
|---|---|---|
| Page | `PageWrapper fadeUp` | |
| Status Banner | `AnimatePresence mode="wait"`. In-progress: pulsing glow `animate={{ boxShadow: ["0 0 0 0 rgba(255,255,255,0.4)", "0 0 0 8px rgba(255,255,255,0)"] }}` | |
| Metric Tiles (×5) | `StaggerList` 70ms. Numbers: `AnimatedNumber`. `whileHover={{ y: -2 }}` | |
| Processing Timeline | `StaggerList` horizontal. Active stage: `animate={{ scale: [1, 1.04, 1] }} repeat: Infinity` | |
| Timeline Progress Line | `style={{ background: \`linear-gradient(...)\` }}` — CSS transition on background | |
| Detail Tabs | `layoutId="batch-detail-tab"` underline morph | |
| Accepted/Rejected Bars | `AnimatedBar` with staggered delays (0s, 0.1s) | |
| Quality Index Gradient Card | `motion.div whileHover={{ y: -2 }}` | |
| Action buttons (View Errors/Accepted) | `whileHover={{ opacity: 0.9, scale: 1.01 }}` | |

---

#### `/batches/[id]/accepted` — `(app)/batches/[id]/accepted/page.tsx`

**High-volume reconciliation list.**

| Element | Animation | API |
|---|---|---|
| Page | `PageWrapper fadeUp` | |
| Metric cards (×4) | `StaggerList` 70ms stagger. Each card: `staggerItem`. `whileHover={{ y: -2 }}` | |
| Search/Filter bar | Focus scale: `animate={{ scale: 1.005 }}` | |
| Record table rows | `StaggerList` 30ms stagger. Rows: `whileHover={{ backgroundColor: "rgba(0,30,64,0.05)" }}` | |
| Accepted badge | `scaleIn` pop-in per row | |
| Row "Eye" action | `motion.button animate={{ opacity: groupHover ? 1 : 0 }}` | |
| Pagination active pill | `layoutId="pagination-active"` morph between numbers | |
| Data Integrity bento | `fadeUp delay: 0.3`. Icon: `pulseOpacity` | |

---

#### `/batches/[id]/errors` — `(app)/batches/[id]/errors/page.tsx`

**Compliance focus — errors must be distinct and actionable.**

| Element | Animation | API |
|---|---|---|
| Page | `PageWrapper fadeUp` | |
| Summary cards | `StaggerList` 70ms. Numbers: `AnimatedNumber` | |
| Severity badges (REJECT/WARN) | `scaleIn` pop-in with distinct colors | |
| Error code monospaces | `initial={{ opacity: 0 }} animate={{ opacity: 1 }} delay: 0.2` | |
| Table rows | `StaggerList` 30ms. `whileHover={{ backgroundColor: "#eceef0" }}` | |
| Pagination arrows | `whileHover={{ x: isLeft ? -3 : 3 }}` spring.crisp | |
| Help Section cards | `StaggerList` 100ms stagger. Icons: `whileHover={{ rotate: 5, scale: 1.1 }}` | |

---

### REPORTS

---

#### `/reports` — `(app)/reports/page.tsx`

**Search-type tab switcher and result reveal are key.**

| Element | Animation |
|---|---|
| Page header | `PageWrapper fadeUp` |
| Security notice card (right panel) | `motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}` |
| Search type tabs (×5) | `layoutId="reports-tab-indicator"` — the `border-b-2` underline morphs across tabs with spring |
| Tab content swap (conditional fields) | `AnimatePresence mode="wait"` — old field exits `{ opacity: 0, x: -10 }`, new enters `{ opacity: 0, x: 10 }` |
| Inquiry Metadata section | `motion.div whileHover={{ y: -1, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}` on the bg-surface-container-low wrapper |
| "Initiate Search" button | `whileHover={{ scale: 1.02 }}` `whileTap={{ scale: 0.97 }}`, loading state: `motion.div animate={{ rotate: 360 }} repeat: Infinity` |
| No-match / error alerts | `AnimatePresence` + `motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}` |
| Recent searches list | `StaggerList` 50ms stagger |
| Each recent search item | `StaggerItem` + `whileHover={{ x: 3 }}` spring.crisp |
| ChevronRight in recent item | `motion.svg whileHover (via group-hover)` → already CSS, replace with `motion.svg animate={{ x: groupHovered ? 3 : 0 }}` |
| Security compliance checkmarks (×2) | Stagger appear with `scaleIn` 100ms apart |

---

#### `/reports/history` — `(app)/reports/history/page.tsx`

| Element | Animation |
|---|---|
| Page | `PageWrapper fadeUp` |
| History rows | `StaggerList` 40ms |
| Result badge (MATCH/NO_MATCH) | `scaleIn` per row |
| Search input focus | `motion.div animate={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(151,204,254,0.4)" }}` on focus |

---

#### `/reports/match-resolution` — `(app)/reports/match-resolution/page.tsx`

**High animation potential — "Situation Room" style.**

| Element | Animation |
|---|---|
| Page | `PageWrapper fadeUp` |
| Candidate cards | Stagger 80ms, `whileHover={{ y: -4, boxShadow: "..." }}` |
| Match confidence score bar | `AnimatedBar` |
| Connecting lines between candidates | SVG `motion.line initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}` |
| "Resolve" / "Reject" action buttons | `whileHover` scale + color. `whileTap` scale down |
| Decision confirmation | `AnimatePresence scaleIn` modal |

---

#### `/reports/[inquiryId]` — `(app)/reports/[inquiryId]/page.tsx`

**Credit report reveal — must feel premium.**

| Element | Animation |
|---|---|
| Page | `PageWrapper fadeUp` |
| Report header (borrower identity) | Stagger: name → ID → scores |
| Credit score ring | SVG `motion.circle animate={{ strokeDashoffset }}` — circular progress reveal |
| Score value | `AnimatedNumber` |
| Account history rows | `StaggerList` 40ms |
| Inquiry log | `StaggerList` 50ms |
| Each section card | `motion.div whileHover={{ y: -2 }}` |
| Print/Export button | `whileHover={{ scale: 1.03 }}` |

---

### QUALITY

---

#### `/quality` — `(app)/quality/page.tsx`

**KPI cards, error bar chart, league table.**

| Element | Animation |
|---|---|
| Page | `PageWrapper fadeUp` |
| Date range toggle buttons | `layoutId="quality-date-range"` pill morphs between 7/30/90 |
| Sub-nav links | `motion.a whileHover={{ backgroundColor: "rgba(0,0,0,0.04)" }}`. Active link: `layoutId="quality-subnav-underline"` |
| KPI cards (×4) | `StaggerList` 60ms. Numbers: `AnimatedNumber`. Icon wrapper: `whileHover={{ rotate: 8, scale: 1.1 }}` |
| "MTD" badge | `scaleIn delay: 0.3` after card appears |
| Top Error Codes bars | `AnimatedBar` — each bar grows in staggered 60ms. `whileHover={{ scale: 1.01, cursor: "pointer" }}` |
| Batch Status Distribution bars | `AnimatedBar` staggered 80ms |
| League Table rows | `StaggerList` 40ms. Rank number: `motion.span animate={{ opacity: [0, 1] }}`. Quality score bar: `AnimatedBar` |
| Rank #1 row | Extra: `motion.tr animate={{ backgroundColor: ["#ffffff", "#f0fdf4", "#ffffff"] }} transition={{ delay: 0.8, duration: 1 }}` — gold flash |
| Institution avatar initials | `motion.div whileHover={{ scale: 1.15 }}` spring.crisp |
| Recent Batches rows | `StaggerList` 30ms |
| "No error codes" state | `motion.svg animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}` on checkmark |

---

#### `/quality/compliance` — `(app)/quality/compliance/page.tsx`

| Element | Animation |
|---|---|
| Page | `PageWrapper fadeUp` |
| Compliance check items | `StaggerList` 60ms |
| Check/fail icon per item | `scaleIn` spring.crisp |
| "Scanning" visual | `motion.div animate={{ scaleX: [0, 1, 0] }} transformOrigin: "left" transition={{ repeat: Infinity, duration: 2 }}` shimmer line over document |
| Alert banners | `AnimatePresence` slide-down `height: "auto"` |

---

#### `/quality/corrections` — `(app)/quality/corrections/page.tsx`

| Element | Animation |
|---|---|
| Page | `PageWrapper fadeUp` |
| Correction rows | `StaggerList`. `layout` prop on each row — when row removed it slides up |
| "Applied" status swap | `AnimatePresence` — pending state exits, success checkmark enters `scaleIn` |

---

#### `/quality/resubmissions` — `(app)/quality/resubmissions/page.tsx`

| Element | Animation |
|---|---|
| Page | `PageWrapper fadeUp` |
| Resubmission cards | `StaggerList` 60ms. `whileHover={{ y: -3 }}` |
| Status transitions | `AnimatePresence` for inline status changes |

---

### OPERATIONS

---

#### `/ops` — `(app)/ops/page.tsx`

**Live system — real-time pulse is the brand.**

| Element | Animation |
|---|---|
| Page | `PageWrapper fadeUp` |
| "System Active" ping dot | Replace CSS `animate-ping` with `motion.span animate={{ scale: [1, 2.2, 1], opacity: [0.8, 0, 0.8] }} transition={{ repeat: Infinity, duration: 1.5 }}` — more control |
| KPI stat cards (×4) | `StaggerList` 50ms. Numbers: `AnimatedNumber`. `whileHover={{ y: -2, boxShadow: "0 6px 20px rgba(0,0,0,0.08)" }}` |
| Quick Action buttons | `StaggerList` horizontal 60ms. `whileHover={{ scale: 1.03, y: -1 }}` `whileTap={{ scale: 0.97 }}` |
| Failed Batches table header | Subtle pulse on warning icon: `motion.svg animate={{ rotate: [-2, 2, -2] }} transition={{ repeat: Infinity, duration: 2 }}` |
| Failed batch rows | `StaggerList` 35ms |
| Channel badges | `scaleIn` per row |
| Empty "no failed batches" state | Checkmark `motion.svg animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2.5 }}` |

---

#### `/ops/queue` — `(app)/ops/queue/page.tsx`

**Queue processing — items pop out, list reflows.**

| Element | Animation |
|---|---|
| Page | `PageWrapper fadeUp` |
| Queue items | `motion.div layout` on each item — when item leaves list via `AnimatePresence`, remaining items slide up smoothly |
| Item exit | `animate={{ opacity: 0, x: 40, scale: 0.95 }}` — "processed" direction |
| Item enter (new batch) | Enter from top: `initial={{ y: -20, opacity: 0 }}` |
| Status badge update | `AnimatePresence mode="wait"` — old status exits, new enters `scaleIn` |
| Processing spinner (in-queue) | `motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}` |
| Refresh indicator | `motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity }}` |

---

#### `/ops/engagement` — `(app)/ops/engagement/page.tsx`

| Element | Animation |
|---|---|
| Page | `PageWrapper fadeUp` |
| Institution engagement cards | `StaggerList` 70ms. `whileHover={{ scale: 1.02, y: -2 }}` |
| Engagement status bars | `AnimatedBar` |
| Contact/message actions | `whileHover/whileTap` |

---

#### `/ops/sandbox` — `(app)/ops/sandbox/page.tsx`

| Element | Animation |
|---|---|
| Page | `PageWrapper fadeUp` |
| Certification steps | `StaggerList` 80ms. Step connector lines: `motion.div animate={{ scaleY: 1 }} transformOrigin: "top"` grow downward |
| Step complete checkmark | `motion.svg animate={{ pathLength: 1 }} initial={{ pathLength: 0 }}` drawn SVG checkmark |
| "Run Test" button | `whileHover={{ scale: 1.04 }}` + loading: spinning icon |

---

### AUDIT

---

#### `/audit` — `(app)/audit/page.tsx`

| Element | Animation |
|---|---|
| Page | `PageWrapper fadeUp` |
| Filter bar | `fadeUp delay: 0.1` |
| Audit log rows | `StaggerList` 25ms (fast — dense log) |
| Severity badge | `scaleIn` per row |
| Expandable row detail | `AnimatePresence` + `motion.tr animate={{ height: "auto" }}` with `layout` |
| Search input | Focus ring: `motion.div animate={{ boxShadow: "0 0 0 3px rgba(151,204,254,0.4)" }}` |
| Time column | `motion.td initial={{ opacity: 0 }}` stagger appears last in each row |

---

#### `/audit/consent` — `(app)/audit/consent/page.tsx`

| Element | Animation |
|---|---|
| Page | `PageWrapper fadeUp` |
| Consent record rows | `StaggerList` 35ms |
| Consent status (granted/revoked) | `scaleIn`. Revoked: `motion.span animate={{ opacity: [1, 0.6, 1] }} transition={{ repeat: Infinity }}` warning pulse |

---

### REFERENCE + ADMIN

---

#### `/reference` — `(app)/reference/page.tsx`

| Element | Animation |
|---|---|
| Page | `PageWrapper fadeUp` |
| Reference category cards | `StaggerList` 70ms. `whileHover={{ y: -3 }}` |
| Accordion expand | `AnimatePresence` + `motion.div animate={{ height: "auto" }}` |

---

#### `/admin` — `(app)/admin/page.tsx`

| Element | Animation |
|---|---|
| Page | `PageWrapper fadeUp` |
| User rows | `StaggerList` 40ms |
| Role badge | `scaleIn` |
| "Invite User" button | `whileHover={{ scale: 1.03 }}` |
| Invite modal | `AnimatePresence scaleIn` |
| New user row entry | `motion.tr initial={{ opacity: 0, backgroundColor: "rgba(151,204,254,0.3)" }} animate={{ opacity: 1, backgroundColor: "rgba(255,255,255,0)" }}` — flash highlight |

---

## 4. UI Components — Global Upgrades

These components are used across all pages. Animate once, win everywhere.

### `components/ui/Button.tsx`

```tsx
// Wrap all <button> → <motion.button>
whileHover={{ scale: 1.02 }}
whileTap={{ scale: 0.97 }}
transition={spring.crisp}
// Disabled: no scale, opacity 0.6
```

### `components/ui/Modal.tsx`

```tsx
// Backdrop: motion.div fadeIn
// Modal panel: scaleIn (transformOrigin: "top center")
// Exit: reverse both
// AnimatePresence wraps both
```

### `components/ui/Badge.tsx`

```tsx
// All badges: initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
// transition: spring.crisp
```

### `components/ui/Alert.tsx`

```tsx
// Mount: initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
// Dismiss: exit reverse
// Error alerts: shakeX on mount
```

### `components/ui/Table.tsx`

```tsx
// tbody: StaggerList wrapper
// tr: motion.tr with staggerItem
// layout prop on each row for remove animations
```

### `components/ui/Spinner.tsx`

```tsx
// Replace CSS animate-spin with:
// motion.svg animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
```

### `components/ui/Pagination.tsx`

```tsx
// Active page pill: layoutId="pagination-active"
// Page buttons: whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
```

---

## 5. Implementation Order (Priority)

Execute in this order to maximize perceived quality impact per session.

| Phase | Work | Files |
|---|---|---|
| **1 — Foundation** | Install FM. Create `lib/motion.ts`. Create `PageWrapper`, `StaggerList/Item`, `AnimatedNumber`, `AnimatedBar`. Add `AnimatePresence` to `app/layout.tsx`. | 6 files |
| **2 — Layout** | Animate `Sidebar` (active `layoutId`, submenu expand, stagger nav). Animate `TopBar`. | 2 files |
| **3 — Auth** | Animate login card, OTP inputs, error shake. | 2 files |
| **4 — Batches** | Animate `/batches` (KPI cards, table rows, progress bars). Animate `/batches/new` (drop zone breathing, file preview swap, modal). | 2 files |
| **5 — Institutions** | Stagger table, pulse ACTIVE badges, bento stats. | 1 file |
| **6 — Reports** | Tab `layoutId` morph, field swap `AnimatePresence`, search result reveal. | 2 files |
| **7 — Quality** | KPI numbers, bar chart, league table rank flash. | 1 file |
| **8 — Ops** | Queue `layout` prop removals, live ping, stat cards. | 2 files |
| **9 — UI Components** | Upgrade Button, Modal, Badge, Alert, Spinner, Pagination. | 6 files |
| **10 — Audit + Admin + Reference** | Page wrappers + stagger lists. | 3 files |

---

## 6. Install

```bash
pnpm --filter portal add framer-motion
```

Framer Motion `v11+` supports React Server Components. Mark all animated components `'use client'` — they already are.

---

## 7. Performance Rules

1. Never animate `width`/`height` on large tables — use `opacity` + `transform` only (GPU composited).
2. `layout` prop triggers layout recalc — use only on queue items and expandable rows, not 100+ row tables.
3. `AnimatedNumber` uses `useSpring` — unmount when component leaves DOM to avoid orphaned springs.
4. `AnimatePresence` `mode="wait"` blocks next page paint until exit finishes — only use on page-level transitions. Use `mode="popLayout"` for list item removals.
5. `staggerChildren` above 0.08s feels slow for lists > 20 items. Cap at 0.04s for dense tables.
6. Wrap `motion.tr` inside a `motion.tbody` — mixing motion and non-motion table children causes DOM warnings.
