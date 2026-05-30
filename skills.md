# OKI App — Developer Skills & Conventions

A living reference document for patterns established across this codebase.
Keep it up to date when you introduce a new convention.

---

## Styling Approach

### 1. NativeWind (Primary)

- **Prioritize NativeWind className strings** for all layout, spacing, typography, and static visual attributes.
- Use static utility classes wherever possible — they compile at build time and are tree-shaken by Tailwind.
- Avoid ad-hoc `StyleSheet.create` blocks; prefer inline `style` props only for **dynamic / computed** values (e.g. theme colors, pressed-state opacities, shadow props).

### 2. Theme Tokens (via `useTheme`)

- All colors must come from `useTheme().colors`, which resolves to the active `COLOR_SCHEMES` entry (`crimson` | `teal` | `indigo`).
- Never hardcode brand colors. Use `colors.primary['600']`, `colors.ui.text`, etc.
- Neutral grays (`gray-100`, `gray-200`, etc.) from Tailwind are acceptable for separators and subtle borders.

### 3. Shadow / Elevation Pattern

Shadows are not expressible in NativeWind; use inline `style` props:

```tsx
style={{
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 3,
}}
```

---

## Layout & Screen Structure

### Safe-Area Ownership

- `SafeAreaProvider` belongs at the Expo Router root in `app/_layout.tsx`, not `App.tsx`.
- For screens rendered inside the custom bottom tab shell, `BottomNav` owns the **bottom** inset.
- Tab screens should use `SafeAreaView` with `edges={["top", "left", "right"]}` unless the screen is intentionally responsible for its own bottom safe area.
- Do not let both the screen and the tab bar reserve the bottom inset; that creates the extra strip above the tabs.
- Standalone flows outside the tab shell may own their own bottom inset when they have fixed bottom actions.

### Standard Page Skeleton

```tsx
<SafeAreaView className="flex-1" style={{ backgroundColor: colors.ui.background }}>
  {/* Coloured header band */}
  <View
    className="rounded-b-3xl px-5 pb-10 pt-4"
    style={{ backgroundColor: colors.primary['600'] }}>
    ...
  </View>

  {/* Scrollable content — overlaps the header via negative marginTop */}
  <ScrollView
    className="flex-1"
    contentContainerStyle={{ paddingBottom: 36 }}
    showsVerticalScrollIndicator={false}
    style={{ backgroundColor: colors.ui.background }}>
    {/* Hero section overlapping the band */}
    <View style={{ marginTop: -40 }}>...</View>
    ...
  </ScrollView>
</SafeAreaView>
```

- `SafeAreaView` from `react-native-safe-area-context` — **always** wrap top-level screens.
- Coloured header band with `rounded-b-3xl` gives the same visual language as the home dashboard.
- Avatar / hero card overlaps the band with a negative `marginTop` for a layered depth effect.

### Fixed Footer Pattern

- Avoid `absolute bottom-*` footers with magic offsets like `bottom-16` for primary screen actions.
- Prefer a normal flex layout: scrollable content as `flex-1`, then a footer `View` as the final sibling.
- Use `contentContainerStyle.paddingBottom` only for content breathing room, not to simulate navigator or safe-area spacing.
- Fixed footers inside tab screens must not try to compensate for the tab bar manually.

---

## Reusable Shared Components

### UI Primitives (`src/components/ui/`)

| Component       | Purpose                                                                |
| --------------- | ---------------------------------------------------------------------- |
| `Avatar`        | User photo or initials fallback, supports online dot                   |
| `Badge`         | Status labels with colour variants                                     |
| `Button`        | Full button with `primary`, `secondary`, `tertiary`, `danger` variants |
| `Card`          | White rounded container with optional border/shadow                    |
| `ConfirmDialog` | System alert-style confirmation                                        |
| `IconButton`    | Square/circular icon-only button (`ghost`, `filled`, `outline`)        |
| `Modal`         | Bottom/centre modal with dimmed backdrop and close button              |
| `RatingDisplay` | Star rating with count label                                           |
| `Stepper`       | Progress stepper for booking lifecycle                                 |
| `Toast`         | In-app toast notification                                              |

### Navigation (`src/components/navigation/`)

| Component | Purpose                                                  |
| --------- | -------------------------------------------------------- |
| `Navbar`  | Top bar with title, optional back arrow and right action |

#### Navbar Inset Rule

- `Navbar` owns its own **top** safe-area spacing via `useSafeAreaInsets()`.
- Never hardcode top offsets like `pt-10` for headers that can appear on multiple devices.
- If a screen uses `Navbar`, do not add a second top inset in that same screen unless the layout is intentionally custom.

### Home (`src/components/home/`)

| Component           | Purpose                                                   |
| ------------------- | --------------------------------------------------------- |
| `DashboardHeader`   | Coloured header with location, notifications, avatar pill |
| `GreetingBlock`     | Greeting text + `SearchBar`                               |
| `CategoryGrid`      | Service category icon grid                                |
| `QuickBookCards`    | "Book Now" / "Book Later" cards                           |
| `PromoCard`         | Inline promo code banner                                  |
| `ActiveBookingCard` | Live booking card with stepper                            |
| `RecentActivity`    | Recent booking rows                                       |

### Cards (`src/components/cards/`)

| Component           | Purpose                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| `BookingCard`       | Standard booking list item (supports `Booking` and `RecentActivityRow`) |
| `ActiveBookingCard` | Full active booking card with stepper and track button                  |
| `JobCard`           | Job listing card for handyman view                                      |
| `ReviewCard`        | Customer review card                                                    |

### Profile (`src/components/profile/`)

| Component         | Purpose                                                                              |
| ----------------- | ------------------------------------------------------------------------------------ |
| `ProfileMenuRow`  | Menu list row with icon badge, title, subtitle, optional badge label, danger variant |
| `ProfileStatsBar` | Horizontal strip of stat items (value + label)                                       |

### Forms (`src/components/forms/`)

| Component   | Purpose                                         |
| ----------- | ----------------------------------------------- |
| `SearchBar` | Themed search input with optional filter button |

---

## Interactive Elements

### Use `Pressable` (not `TouchableOpacity`) for all new interactive rows/buttons

- `Pressable` with a `style` function enables per-platform feedback:
  ```tsx
  <Pressable
    android_ripple={{ color: `${colors.primary['600']}15` }}
    style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
  >
  ```
- Reserve `TouchableOpacity` only for compatibility with existing legacy components.

---

## Typography

Fonts are registered in `global.css` and used via NativeWind class names:

| Class                   | Font            |
| ----------------------- | --------------- |
| `font-sans`             | Inter (Regular) |
| `font-heading`          | NunitoBold      |
| `font-inter-medium`     | InterMedium     |
| `font-inter-semibold`   | InterSemiBold   |
| `font-inter-bold`       | InterBold       |
| `font-nunito`           | NunitoBold      |
| `font-nunito-extrabold` | NunitoExtraBold |

Minimum font size: **12px** (`text-xs` or `text-[12px]`).

---

## Section Headers in Scrollable Lists

Use the pattern from `bookings.tsx` and `profile.tsx`:

```tsx
<Text
  className="text-[11px] font-semibold uppercase tracking-widest"
  style={{ color: colors.ui.textMuted }}>
  Section Title
</Text>
```

---

## Modal / Confirm Pattern

Use the shared `Modal` component for all confirmation dialogs:

```tsx
<Modal visible={visible} onClose={onClose} title="Confirm Action">
  <Text>Are you sure?</Text>
  <Button label="Confirm" variant="danger" fullWidth onPress={onConfirm} />
  <Button label="Cancel" variant="tertiary" fullWidth onPress={onClose} />
</Modal>
```

---

## Conventions Summary

| Concern        | Rule                                                                |
| -------------- | ------------------------------------------------------------------- |
| Colors         | Always via `useTheme().colors`                                      |
| Layout         | NativeWind className first                                          |
| Dynamic styles | Inline `style` prop only                                            |
| Shadows        | Inline `style` only (not expressible in NativeWind)                 |
| Page wrap      | `SafeAreaView` from `react-native-safe-area-context`                |
| Bottom inset   | Owned by `BottomNav` inside tab shells; screens should not duplicate it |
| Top inset      | Owned by `Navbar` when a screen uses the shared navbar              |
| Buttons        | `Pressable` preferred; `Button` / `IconButton` for semantic actions |
| Modals         | Shared `Modal` component                                            |
| Mock data      | `src/mocks/` — import from barrel `../../src/mocks`                 |
