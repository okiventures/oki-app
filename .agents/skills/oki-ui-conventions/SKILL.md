---
name: oki-ui-conventions
description: 'Use when creating or modifying React Native components in the Oki App. Triggers: building new UI, adding screens, styling with NativeWind/Tailwind, using theme colors, creating Pressable/TouchableOpacity elements, adding fonts, using SafeAreaView/shadows, or importing shared components from src/components/.'
metadata:
  author: oki-app
  version: '1.0.0'
---

# Oki UI Conventions

## Theming

### useTheme() Hook

Every component that needs colors imports from `ThemeContext`:

```tsx
import { useTheme } from '../../context/ThemeContext';

function MyComponent() {
  const { colors } = useTheme();
  // colors.primary['600'], colors.ui.text, colors.ui.background, etc.
}
```

The `colors` object resolves to the active color scheme (`crimson` | `teal` | `indigo`):

| Token | Use |
|---|---|
| `colors.primary['50']` — `['900']` | Brand primary palette (headers, CTAs, badges) |
| `colors.secondary['50']` — `['900']` | Accent / complementary palette |
| `colors.ui.background` | Page background (`#FAFAFA`) |
| `colors.ui.surface` | Card/modal backgrounds (`#FFFFFF`) |
| `colors.ui.border` | Borders and separators (`#E5E7EB`) |
| `colors.ui.text` | Primary text (`#1C1917`) |
| `colors.ui.textMuted` | Secondary/muted text (`#6B7280`) |
| `colors.ui.textLight` | Disabled/light text (`#9CA3AF`) |

**Never hardcode brand colors.** The only hardcoded colors allowed:
- Status colors from `BOOKING_STATUS_COLORS` in `src/constants/theme.ts` (e.g., `#F59E0B` for Pending, `#10B981` for Completed)
- Service category colors from `SERVICE_CATEGORY_COLORS` in `src/constants/theme.ts`
- `#FFFFFF` / `#000000` for text-on-brand or shadow
- Tailwind grays (`gray-100`, `gray-200`) for neutral separators

### NativeWind CSS Variables

The Tailwind theme in `global.css` maps `--primary-*` and `--secondary-*` CSS variables to Tailwind color tokens. Use `bg-primary-600`, `text-primary-600`, `border-primary-200` etc. in NativeWind `className`:

```tsx
<View className="bg-primary-600 rounded-2xl px-5 py-4" />
```

The CSS variables are swapped at runtime when the theme changes (via `.theme-teal`, `.theme-indigo` classes on the root `View` in `ThemeContext`).

---

## Styling Rules

1. **NativeWind `className`** for all static layout, spacing, typography, borders, and bg-color
2. **Inline `style` prop** only for dynamic/computed values (theme colors accessed via `useTheme()`, pressed state, shadows)
3. **No `StyleSheet.create`** blocks — they are avoided in this codebase

### Shadows

Shadows cannot be expressed in NativeWind. Always use inline `style`:

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

## Typography

Font classes (registered in `global.css`):

| Class | Font | Use |
|---|---|---|
| `font-sans` | Inter (Regular) | Body text default |
| `font-heading` | NunitoBold | Page/section headings |
| `font-inter-medium` | InterMedium | Medium-weight body |
| `font-inter-semibold` | InterSemiBold | Card titles, labels |
| `font-inter-bold` | InterBold | Emphasis, totals |
| `font-nunito` | NunitoBold | Brand headings |
| `font-nunito-extrabold` | NunitoExtraBold | Hero/landing text |

Minimum font size: `text-xs` (12px).

Section headers in scrollable lists:
```tsx
<Text
  className="text-[11px] font-semibold tracking-widest uppercase"
  style={{ color: colors.ui.textMuted }}>
  Section Title
</Text>
```

---

## Interactive Elements

### Pressable (preferred over TouchableOpacity)

```tsx
<Pressable
  onPress={handlePress}
  android_ripple={{ color: `${colors.primary['600']}15` }}
  style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}>
  {/* content */}
</Pressable>
```

- `Button` / `IconButton` components for semantic actions (primary, secondary, tertiary, danger)
- `TouchableOpacity` is legacy — only use for compatibility with existing components that already use it

---

## Layout Patterns

### Safe-Area Ownership

- `SafeAreaView` from `react-native-safe-area-context` wraps every top-level screen
- Inside tab shells: `BottomNav` owns the **bottom** inset — screens use `edges={["top", "left", "right"]}`
- Outside tab shells: screens own their own bottom inset when they have fixed bottom actions
- `Navbar` component owns its own **top** inset via `useSafeAreaInsets()`
- Never add `pt-10` or magic top offsets when using `Navbar`

### Standard Page Skeleton

```tsx
<SafeAreaView className="flex-1" style={{ backgroundColor: colors.ui.background }}>
  {/* Coloured header band */}
  <View
    className="rounded-b-3xl px-5 pt-4 pb-10"
    style={{ backgroundColor: colors.primary['600'] }}>
    {/* header content */}
  </View>

  {/* Scrollable content */}
  <ScrollView
    className="flex-1"
    contentContainerStyle={{ paddingBottom: 36 }}
    showsVerticalScrollIndicator={false}
    style={{ backgroundColor: colors.ui.background }}>
    {/* Hero section overlapping the band */}
    <View style={{ marginTop: -40 }}>{/* hero content */}</View>
  </ScrollView>
</SafeAreaView>
```

### Flex Ownership (for screen-critical height)

When a screen's content collapses leaving only header/footer visible, add explicit `style={{ flex: 1 }}` on the root chain:

```tsx
<SafeAreaView className="flex-1" style={{ flex: 1, backgroundColor: colors.ui.background }}>
  <Navbar title="Example" />
  <View style={{ flex: 1 }}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}>
      {/* content */}
    </ScrollView>
    <View>{/* footer actions */}</View>
  </View>
</SafeAreaView>
```

### Fixed Footer Pattern

- Avoid `absolute bottom-*` with magic offsets
- Use flex layout: scrollable content as `flex-1`, footer `View` as final sibling
- Do not manually compensate for the tab bar in fixed footers

---

## Component Library Reference

### UI Primitives (`src/components/ui/`)

| Component | Import | Key Props |
|---|---|---|
| `Avatar` | `../ui/Avatar` | `name`, `src`, `size`, `showOnlineDot` |
| `Badge` | `../ui/Badge` | `label`, `variant` (verified/online/offline/tier/status/count/primary/warning/error/success) |
| `Button` | `../ui/Button` | `label`, `onPress`, `variant` (primary/secondary/tertiary/danger), `loading`, `disabled`, `fullWidth`, `leftIcon`, `rightIcon` |
| `CalendarPicker` | `../ui/CalendarPicker` | Date picker |
| `Card` | `../ui/Card` | `children`, `variant` (elevated/bordered), `className`, `style` |
| `ConfirmDialog` | `../ui/ConfirmDialog` | `visible`, `onClose`, `title`, `message`, `onConfirm`, `confirmLabel`, `danger`, `loading` |
| `Dropdown` | `../ui/Dropdown` | `options`, `selected`, `onSelect`, `variant` (default/inline) |
| `EmptyState` | `../ui/EmptyState` | `icon`, `title`, `message` |
| `ErrorBoundary` | `../ui/ErrorBoundary` | `children` |
| `IconButton` | `../ui/IconButton` | `icon`, `onPress`, `variant` (ghost/filled/outline) |
| `Input` | `../ui/Input` | `label`, `value`, `onChangeText`, `error`, `placeholder` |
| `LoadingSpinner` | `../ui/LoadingSpinner` | `type` (fullscreen/inline) |
| `Modal` | `../ui/Modal` | `visible`, `onClose`, `title`, `children` |
| `RatingDisplay` | `../ui/RatingDisplay` | `rating`, `reviewCount`, `size` |
| `ScreenHeader` | `../ui/ScreenHeader` | `title`, `onBack`, `onSettings`, `onNotifications`, `rightAction` |
| `StarRatingInput` | `../ui/StarRatingInput` | `rating`, `onRatingChange` |
| `Stepper` | `../ui/Stepper` | `steps`, `currentStep` |
| `Tabs` | `../ui/Tabs` | `tabs`, `activeTab`, `onTabChange` |
| `TimePicker` | `../ui/TimePicker` | Time selection |
| `Toast` | `../ui/Toast` | `type` (success/error/info/warning), `message` |
| `VerticalStepper` | `../ui/VerticalStepper` | `steps` |

### Navigation (`src/components/navigation/`)

| Component | Import | Purpose |
|---|---|---|
| `BottomNav` | `../navigation/BottomNav` | Bottom tab bar (owns bottom inset) |
| `Navbar` | `../navigation/Navbar` | Top bar with title, back arrow, right action (owns top inset) |
| `Drawer` | `../navigation/Drawer` | Side drawer navigation |
| `TabBar` | `../navigation/TabBar` | Tab bar component |
| `BackButton` | `../navigation/BackButton` | Back navigation button |

### Forms (`src/components/forms/`)

| Component | Import | Purpose |
|---|---|---|
| `SearchBar` | `../forms/SearchBar` | Themed search input with optional filter |
| `FormField` | `../forms/FormField` | Labeled form field wrapper |
| `FormLabel` | `../forms/FormLabel` | Form label text |
| `FormError` | `../forms/FormError` | Form error text |
| `Select` | `../forms/Select` | Selection dropdown |

### Home (`src/components/home/`)

| Component | Purpose |
|---|---|
| `DashboardHeader` | Coloured header with location, notifications, avatar pill |
| `GreetingBlock` | Greeting text + SearchBar |
| `CategoryGrid` | Service category icon grid |
| `QuickBookCards` | "Book Now" / "Book Later" cards |
| `PromoCard` | Inline promo code banner |
| `ActiveBookingCard` | Live booking card with stepper |
| `RecentActivity` | Recent booking rows |
| `HeroHeader` | Hero section header |
| `TrustStrip` | Trust/reassurance strip |

### Cards (`src/components/cards/`)

| Component | Purpose |
|---|---|
| `BookingCard` | Standard booking list item |
| `ActiveBookingCard` | Full active booking card with stepper and track button |
| `JobCard` | Job listing card for handyman view |
| `ReviewCard` | Customer review card |

### Features (`src/components/features/`)

| Component | Purpose |
|---|---|
| `EmergencySOS` | SOS button/trigger |
| `MapPlaceholder` | Static map placeholder |
| `NotificationCenter` | Notification center UI |
| `PriceBreakdown` | Price breakdown display |
| `StateIndicator` | State/status indicator |
| `UserProfileHeader` | User profile header |

---

## Quick Reference

| Concern | Rule |
|---|---|
| Colors | `useTheme().colors` — never hardcode brand colors |
| Layout | NativeWind `className` first |
| Dynamic styles | Inline `style` prop only |
| Shadows | Inline `style` only |
| Page wrap | `SafeAreaView` from `react-native-safe-area-context` |
| Bottom inset | Owned by `BottomNav` inside tab shells |
| Top inset | Owned by `Navbar` |
| Buttons | `Pressable` preferred; `Button`/`IconButton` for semantic actions |
| Modals | Shared `Modal` component |
| Loading | `LoadingSpinner` or `ActivityIndicator` |
| Empty states | `EmptyState` component |
| Toasts | `Toast` component with `ToastContainer` |
| Mock data | Import from `../../src/mocks` barrel |
