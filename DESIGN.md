# Design System: SpoilerHub

## 1. Visual Theme & Atmosphere

**Mood:** Dark, immersive, content-forward — an atmosphere that feels like scrolling through a late-night anime forum. The design prioritizes readability of spoiler text against a deep, ink-black canvas, creating a cave-like reading environment where bright cover art and colored type badges pop with vivid contrast.

**Density:** Medium-dense. Cards and list items sit closely together with minimal whitespace, encouraging vertical scrolling through feeds of spoilers. The layout avoids feeling cramped by using generous internal padding within cards.

**Aesthetic Philosophy:** Utilitarian otaku. The UI stays out of the way — no decorative flourishes, no gradients on surfaces, no glow effects. Color is used surgically: only for content-type badges, destructive actions, and interactive primary elements. Everything else lives in the grayscale spectrum.

## 2. Color Palette & Roles

### Core Surfaces
| Name | Value | Role |
|------|-------|------|
| Void Black | `oklch(0.145 0 0)` ~`#09090b` | Page background — the deepest layer |
| Charcoal Slab | `oklch(0.205 0 0)` ~`#1a1a1e` | Card backgrounds, popovers, elevated surfaces |
| Smoke Gray | `oklch(0.269 0 0)` ~`#27272a` | Secondary surfaces, muted backgrounds, tab bars, badges |

### Text & Foreground
| Name | Value | Role |
|------|-------|------|
| Snow White | `oklch(0.985 0 0)` ~`#fafafa` | Primary text, headings, card foreground |
| Ash Gray | `oklch(0.708 0 0)` ~`#a1a1aa` | Muted text — dates, metadata, secondary labels |
| Stone Gray | `oklch(0.556 0 0)` ~`#71717a` | Tertiary text, focus ring, disabled states |

### Interactive & Semantic
| Name | Value | Role |
|------|-------|------|
| Pale Silver | `oklch(0.922 0 0)` ~`#e4e4e7` | Primary buttons (inverted — light button on dark surface) |
| Ember Red | `oklch(0.704 0.191 22.216)` ~`#ef4444` | Destructive actions, error states, downvotes |
| Whisper Border | `oklch(1 0 0 / 10%)` | Borders — barely visible white at 10% opacity |
| Ghost Input | `oklch(1 0 0 / 15%)` | Input field backgrounds — subtle white at 15% opacity |

### Content Type Badges (Series Classification)
| Name | Tailwind Class | Role |
|------|----------------|------|
| Anime Blue | `bg-blue-600` (#2563eb) | Anime series badge |
| Manga Red | `bg-red-600` (#dc2626) | Manga series badge |
| Manhwa Green | `bg-green-600` (#16a34a) | Manhwa series badge |
| Manhua Amber | `bg-yellow-600` (#ca8a04) | Manhua series badge |
| Novel Purple | `bg-purple-600` (#9333ea) | Novel series badge |
| Other Slate | `bg-gray-600` (#4b5563) | Other/uncategorized badge |

## 3. Typography Rules

**Font Family:** Inter — a clean, neutral sans-serif optimized for screen readability. Loaded via `next/font/google` for performance. No serif or display fonts are used anywhere.

**Weight Scale:**
- `font-bold` (700) — Page headings (H1), logo text, stat numbers
- `font-semibold` (600) — Section headings (H2), card emphasis
- `font-medium` (500) — Series titles, author names, button labels, badge text
- Normal (400) — Body text, spoiler content, comments, metadata

**Size Scale:**
- `text-2xl` — Page titles ("Latest Spoilers", "Browse Series", series name)
- `text-xl` — Logo in navbar ("SpoilerHub")
- `text-lg` — Section headings ("Spoilers (3)"), warning gate title
- `text-sm` — Card content, series names in lists, navigation links
- `text-xs` — Metadata (dates, chapter numbers, comment counts), badge labels

**Thai Language Support:** The app renders Thai text natively (`lang="th"` on html). Inter handles Thai characters well. No special Thai font is loaded.

## 4. Component Stylings

### Buttons
- **Shape:** Subtly rounded corners (`rounded-lg`, approximately 10px)
- **Primary (Default):** Pale Silver background with Charcoal Slab text — creates a high-contrast "light button on dark page" effect. No shadow.
- **Outline:** Transparent with Whisper Border stroke, darkened input background on hover
- **Destructive:** Soft red tint background (`bg-destructive/10`) with Ember Red text — understated until hovered
- **Size `sm`:** Height 28px, used in navbar and inline actions
- **Behavior:** `translate-y-px` on active press (micro-press feedback), opacity reduction when disabled

### Cards (Spoiler Cards)
- **Shape:** Generously rounded corners (`rounded-xl`, approximately 14px)
- **Background:** Charcoal Slab (`bg-card`)
- **Border:** Hairline ring at 10% white (`ring-1 ring-foreground/10`) — barely visible separation
- **Shadow:** None — completely flat. Depth conveyed through background color difference alone.
- **Hover:** Subtle tint shift to `bg-accent/50` (Smoke Gray at 50% opacity)
- **Internal padding:** 16px (`p-4`)

### Series Cards (Cover Grid)
- **Shape:** Rounded-xl with `overflow-hidden` to clip cover images
- **Image:** Fills a 2:3 aspect ratio container via `object-cover`
- **Fallback:** Smoke Gray background with Ash Gray "No Image" text centered
- **Footer:** Compact 12px padding (`p-3`) with truncated title and two badges

### Badges
- **Shape:** Fully rounded pill shape (`rounded-4xl`)
- **Height:** Fixed at 20px (`h-5`), compact
- **Variants:**
  - `default` — Pale Silver background (used for primary labels)
  - `secondary` — Smoke Gray background (used for type badges)
  - `outline` — Border-only with Whisper Border stroke (used for genre tags, status)
- **Content Type Badges:** Override with vivid Tailwind colors (blue-600, red-600, etc.) + forced white text

### Spoiler Warning Gate
- **Container:** Dashed border (`border-dashed`), centered text, generous vertical padding (64px)
- **Message:** Two-line — bold "Spoiler content is hidden" + muted description text
- **CTA:** Standard primary button ("View Spoiler")
- **Confirmation Dialog:** Standard shadcn Dialog with warning text and two-button footer (Cancel outline + Confirm primary)

### Vote Buttons
- **Layout:** Horizontal row — [+] [count] [-]
- **Active state:** Primary fill when voted, outline when not
- **Downvote active:** Destructive variant (red tint)
- **Count display:** Centered, minimum 3-character width for alignment

### Comments
- **Avatar:** 32px circle with fallback showing first letter of name
- **Layout:** Avatar left, content right (flex row with gap-3)
- **Metadata:** Name (font-medium) + date (text-xs muted) on same line
- **Content:** text-sm, no background or border — clean inline text

### Breadcrumbs
- **Separator:** "/" character in muted gray
- **Links:** Muted gray, hover to foreground white
- **Current page:** Full white (foreground), no link
- **JSON-LD:** Embedded BreadcrumbList schema for SEO

### Inputs & Forms
- **Background:** Ghost Input (`bg-input/30` = white at ~5% effective opacity)
- **Border:** Whisper Border, transitions to ring color on focus
- **Focus state:** 3px ring in ring color with 50% opacity
- **Placeholder:** Ash Gray text
- **Corner radius:** `rounded-lg` matching buttons

## 5. Layout Principles

### Content Width
- **Maximum:** `max-w-6xl` (1152px) — centered on page via `mx-auto`
- **Horizontal padding:** 16px (`px-4`) at all breakpoints
- **Narrow content:** `max-w-3xl` for spoiler reading view, `max-w-2xl` for forms and notifications

### Navbar
- **Height:** 56px (`h-14`), sticky to top (`sticky top-0 z-50`)
- **Background:** Same as page background with bottom border
- **Structure:** Logo + nav links (left) | CTA + user menu (right)
- **Responsive:** Nav links hidden below `md` breakpoint

### Vertical Rhythm
- **Section gaps:** 24px (`space-y-6`) between major page sections
- **Card list gaps:** 8px (`space-y-2`) between spoiler cards — tight feed
- **Card grid gaps:** 16px (`gap-4`) between series cover cards

### Grid System
- **Series grid:** Responsive columns — 2 on mobile, 3 on `sm`, 4 on `md`, 5 on `lg`
- **Stats grid:** 2 columns on `sm`, 4 columns on `lg` for admin dashboard
- **Form layout:** Single column, stacked fields with 16px gaps

### Streaming & Loading
- **Pattern:** Every page uses thin `page.tsx` → `<Suspense fallback={<Skeleton />}>` → `content.tsx`
- **Skeleton:** Animated pulse bars (`Skeleton` component) matching approximate content dimensions
- **Navbar fallback:** Empty 56px header bar with border (prevents layout shift)

### Whitespace Philosophy
- Compact but not crowded. The dark theme provides visual separation through color contrast rather than spacing. Content areas are padded generously (16px), but gaps between items are tight (8px for lists, 16px for grids) to create a dense, scroll-friendly feed experience reminiscent of community forums and manga reading apps.
