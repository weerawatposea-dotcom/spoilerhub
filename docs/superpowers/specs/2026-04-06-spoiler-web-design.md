# SpoilerHub — Spoiler Web Platform Design Spec

## Overview

A community-driven spoiler platform for the latest episodes/chapters of anime, manga, manhwa, manhua, and novels. Users can browse series, read spoilers (with warning gates), write their own spoilers, upvote, comment, and bookmark series they follow. Heavy SEO focus using ISR to maximize organic traffic while minimizing server cost.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Bun |
| Framework | Next.js 16 (App Router + Turbopack) |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| Auth | Auth.js v5 (Google, Discord) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Caching | ISR (`use cache` + revalidate) |
| React | React 19.2 (React Compiler enabled) |

### Next.js 16 Features Used

- **Turbopack** — default bundler, faster dev/build
- **`use cache` directive** — ISR caching for pages and components
- **React Compiler** — auto-memoization, no manual useMemo/useCallback
- **`proxy.ts`** — replaces middleware.ts for network boundary
- **View Transitions** — smooth page transitions (spoiler reveal, navigation)

## Architecture

Monolith Next.js — all pages, API routes, auth, and DB access in a single Next.js application. Server Actions for mutations. ISR for read-heavy pages.

## Project Structure

```
spoiler/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (main)/
│   │   │   ├── page.tsx                  # Homepage
│   │   │   ├── browse/page.tsx           # Browse series
│   │   │   ├── series/[slug]/page.tsx    # Series detail
│   │   │   ├── spoiler/[id]/page.tsx     # Spoiler view
│   │   │   ├── create/page.tsx           # Create spoiler
│   │   │   ├── profile/[id]/page.tsx     # User profile
│   │   │   ├── bookmarks/page.tsx        # My bookmarks
│   │   │   └── notifications/page.tsx    # Notifications
│   │   ├── admin/
│   │   │   └── page.tsx                  # Admin dashboard
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/       # Auth.js routes
│   │   │   └── og/route.tsx              # Dynamic OG image
│   │   ├── sitemap.ts                    # Auto-generated sitemap
│   │   ├── robots.ts                     # Robots.txt
│   │   └── layout.tsx                    # Root layout (dark theme)
│   ├── components/
│   │   ├── ui/                           # shadcn/ui components
│   │   ├── spoiler-card.tsx
│   │   ├── spoiler-reveal.tsx            # Warning + reveal gate
│   │   ├── series-card.tsx
│   │   ├── vote-button.tsx
│   │   ├── comment-section.tsx
│   │   ├── search-bar.tsx
│   │   ├── breadcrumbs.tsx
│   │   └── navbar.tsx
│   ├── db/
│   │   ├── schema.ts                     # Drizzle schema
│   │   ├── index.ts                      # DB connection
│   │   └── migrations/
│   ├── lib/
│   │   ├── auth.ts                       # Auth.js config
│   │   └── utils.ts
│   └── actions/
│       ├── spoiler.ts                    # Create/delete spoiler
│       ├── vote.ts                       # Upvote/downvote
│       ├── comment.ts                    # Add/delete comment
│       ├── bookmark.ts                   # Add/remove bookmark
│       ├── report.ts                     # Report content
│       └── series.ts                     # Admin: manage series
├── proxy.ts                              # Auth guard (replaces middleware)
├── drizzle.config.ts
├── tailwind.config.ts
└── package.json
```

## Database Schema

### Auth.js Tables (required by Auth.js)

**users**
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | cuid |
| name | text | |
| email | text unique | |
| emailVerified | timestamp | |
| image | text | avatar URL |
| role | enum | `user` / `moderator` / `admin` |
| createdAt | timestamp | default now |

**accounts** — OAuth provider accounts linked to users
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| userId | text FK → users | |
| type | text | |
| provider | text | google, discord |
| providerAccountId | text | |
| access_token | text | |
| refresh_token | text | |

**sessions**
| Column | Type | Notes |
|--------|------|-------|
| sessionToken | text PK | |
| userId | text FK → users | |
| expires | timestamp | |

**verification_tokens**
| Column | Type | Notes |
|--------|------|-------|
| identifier | text | |
| token | text | |
| expires | timestamp | |

### Content Tables

**series**
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | cuid |
| title | text | |
| slug | text unique | SEO-friendly URL |
| type | enum | `anime` / `manga` / `manhwa` / `manhua` / `novel` / `other` |
| coverImage | text | URL |
| synopsis | text | |
| status | enum | `ongoing` / `completed` / `hiatus` |
| createdAt | timestamp | |

**genres**
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| name | text unique | e.g. Action, Romance |
| slug | text unique | |

**series_genres** (many-to-many)
| Column | Type | Notes |
|--------|------|-------|
| seriesId | text FK → series | |
| genreId | text FK → genres | |
| | | PK(seriesId, genreId) |

**spoilers**
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | cuid |
| seriesId | text FK → series | |
| authorId | text FK → users | |
| title | text | spoiler headline |
| content | text | markdown body |
| chapter | text | episode/chapter number |
| slug | text unique | `{series-slug}-ch-{chapter}-{shortId}` |
| upvoteCount | integer | denormalized, default 0 |
| createdAt | timestamp | |

**comments**
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| spoilerId | text FK → spoilers | |
| authorId | text FK → users | |
| content | text | |
| createdAt | timestamp | |

**votes**
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| spoilerId | text FK → spoilers | |
| userId | text FK → users | |
| value | integer | +1 or -1 |
| | | unique(spoilerId, userId) |

### Engagement Tables

**bookmarks**
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| userId | text FK → users | |
| seriesId | text FK → series | |
| createdAt | timestamp | |
| | | unique(userId, seriesId) |

**reports**
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| reporterId | text FK → users | |
| targetType | enum | `spoiler` / `comment` |
| targetId | text | polymorphic reference |
| reason | text | |
| status | enum | `pending` / `resolved` / `dismissed` |
| createdAt | timestamp | |

**notifications**
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| userId | text FK → users | recipient |
| type | enum | `new_spoiler` / `comment` / `upvote` |
| referenceType | text | `spoiler` / `comment` |
| referenceId | text | |
| message | text | |
| isRead | boolean | default false |
| createdAt | timestamp | |

## Pages & Routes

| Route | Page | Auth | ISR |
|-------|------|------|-----|
| `/` | Homepage — latest spoilers + trending + search | public | 60s |
| `/browse` | Browse series — filter by type/genre/status | public | no (dynamic) |
| `/series/[slug]` | Series detail — info + all spoilers | public | 5 min |
| `/spoiler/[slug]` | Spoiler view — warning gate + content + comments | public | 5 min, revalidate on vote/comment |
| `/create` | Create spoiler form | login required | no |
| `/profile/[id]` | User profile — written spoilers + stats | public | 5 min |
| `/bookmarks` | My bookmarks | login required | no |
| `/notifications` | Notifications list | login required | no |
| `/login` | Social login (Google, Discord) | public | static |
| `/admin` | Admin dashboard — reports, series management | admin only | no |

## Spoiler UX Flow

1. User lands on `/spoiler/[slug]`
2. Page shows: series name, chapter, author, upvote count, created date
3. Spoiler content is **hidden** — shows warning message and a "View Spoiler" button
4. User clicks button → **confirmation dialog** appears: "You are about to read spoiler for {series} chapter {chapter}. Are you sure?"
5. User confirms → content reveals with smooth animation
6. Below content: upvote/downvote buttons + comment section

**Key detail:** Spoiler content is loaded via client-side fetch AFTER confirmation. The SSR/ISR page only contains metadata (title, chapter, author) — the actual spoiler text is never in the initial HTML. This prevents Google from indexing spoiler content in search snippets while keeping all metadata SEO-indexable.

## Voting System

- Optimistic UI — instant visual feedback on click
- Server Action validates unique constraint `(spoilerId, userId)`
- `upvoteCount` updated via SQL `increment` to prevent race conditions
- Changing vote: if already upvoted, clicking downvote removes upvote and adds downvote (and vice versa)

## Notification System

| Event | Recipient | Message |
|-------|-----------|---------|
| New spoiler in bookmarked series | Bookmark owners | "New spoiler: {series} chapter {X}" |
| Comment on your spoiler | Spoiler author | "@user commented on your spoiler" |
| Upvote milestone (10, 50, 100, 500) | Spoiler author | "Your spoiler reached {N} upvotes!" |

Notifications stored in DB. Badge count on bell icon in navbar. Poll via periodic revalidation.

## ISR Caching Strategy

| Page | Strategy | Revalidate |
|------|----------|-----------|
| Homepage | ISR | 60 seconds |
| Series detail | ISR | 5 minutes |
| Spoiler page (metadata only) | ISR | 5 minutes |
| Spoiler content (after reveal) | Client-side fetch, no ISR | — |
| Browse/search | Dynamic (no cache) | — |
| User profile | ISR | 5 minutes |
| OG images | ISR | 1 hour |
| Sitemap | ISR | 1 hour |

On-demand revalidation via `revalidatePath()` / `revalidateTag()` when:
- New spoiler created → revalidate series page + homepage
- Vote/comment added → revalidate spoiler page
- Series updated → revalidate series page + browse

## SEO

### Technical SEO

- **ISR** for all public pages — pre-rendered HTML for crawlers, minimal server cost
- **`generateMetadata()`** on every page — dynamic title, description, og:image
- **`app/sitemap.ts`** — auto-generated from DB (series + spoiler pages)
- **`app/robots.ts`** — allow all except `/admin`, `/api`
- **Canonical URLs** via `alternates.canonical` on every page
- **JSON-LD structured data** on every page

### Structured Data

- **Homepage:** `WebSite` schema + `SearchAction` (sitelinks search box)
- **Series page:** `Article` schema + `BreadcrumbList` (Home > Manga > Solo Leveling)
- **Spoiler page:** `Article` schema + `Comment` schema + `BreadcrumbList`
- **Browse page:** `CollectionPage` schema + `BreadcrumbList`

### Dynamic OG Images

Route: `/api/og?title={}&chapter={}&type={}`

Generated with `next/og` (Satori). Every spoiler + series page has a unique OG image showing:
- Series title
- Chapter number
- Series type badge
- Site branding

### URL Structure

```
/                                        → Homepage
/browse                                  → Browse all
/browse?type=manhwa&genre=action         → Filtered (URL params, shareable)
/series/solo-leveling                    → Series detail (slug)
/spoiler/solo-leveling-ch-385-abc123     → Spoiler (readable slug + unique ID)
/profile/username                        → User profile
```

### SEO Title/Description Patterns

- **Series:** `{title} สปอยล์ตอนล่าสุด | SpoilerHub`
- **Spoiler:** `สปอยล์ {title} ตอนที่ {chapter} | SpoilerHub`
- **Browse:** `สปอยล์ {type} ยอดนิยม | SpoilerHub`
- **Homepage:** `SpoilerHub — สปอยล์ anime manga manhwa ตอนล่าสุด`

### Additional SEO

- **Internal linking:** spoiler → series → genre → related series
- **Breadcrumbs:** every page, rendered as component + JSON-LD
- **Heading hierarchy:** single H1 per page, proper H2/H3 nesting
- **Image optimization:** `next/image` for all cover images with descriptive alt text
- **Mobile first:** responsive design, Google mobile-first indexing ready
- **Spoiler content protection:** actual spoiler text loaded client-side only, never in SSR HTML — prevents Google from showing spoiler content in search snippets

## UI/Theme

- **Dark theme** as default and primary — anime community aesthetic
- Base: shadcn/ui dark theme, customized with accent colors
- Cover images prominently displayed on cards
- Type badges (anime/manga/manhwa/manhua/novel) with distinct colors
- Spoiler warning gate: prominent, impossible to miss accidentally

## Auth Guard

| Route | Guest | Member | Admin |
|-------|-------|--------|-------|
| `/`, `/browse`, `/series/*` | read | read | read |
| `/spoiler/*` (view) | read | read | read |
| `/create`, `/bookmarks`, `/notifications` | redirect → login | full access | full access |
| comment, upvote, bookmark | blocked | allowed | allowed |
| `/admin` | blocked | blocked | full access |

Implemented via `proxy.ts` (Next.js 16) for route-level protection + server-side session checks in Server Actions for mutation protection.

## Search & Filter

- **Global search:** debounced (300ms), `ILIKE` query on series title
- **Filters:** type, genre, status — stored in URL search params for shareable links
- **Sort:** latest, most upvoted, most commented
- **Autocomplete:** on spoiler creation form for series selection

## Moderation

- **Report queue:** admin dashboard shows all pending reports
- **Admin actions:** delete spoiler/comment, ban user, dismiss report
- **Series management:** add/edit series metadata + cover image
- **Role-based:** `user` / `moderator` / `admin` roles on users table
