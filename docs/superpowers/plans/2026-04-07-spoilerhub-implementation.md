# SpoilerHub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a community-driven spoiler platform for anime/manga/manhwa/manhua/novel using Next.js 16, Drizzle ORM, PostgreSQL, and Auth.js v5 with full SEO optimization via ISR.

**Architecture:** Monolith Next.js 16 App Router with Server Actions for mutations, ISR via `use cache` for read-heavy pages, client-side spoiler content reveal for SEO protection. Dark theme anime aesthetic using shadcn/ui.

**Tech Stack:** Bun, Next.js 16 (Turbopack), Drizzle ORM, PostgreSQL, Auth.js v5 (Google/Discord), Tailwind CSS v4, shadcn/ui, React 19.2 + React Compiler

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `.env.local`, `.gitignore`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`
- Create: `src/lib/utils.ts`

- [ ] **Step 1: Create Next.js 16 project with Bun**

```bash
cd /Users/weerawatposeeya/Desktop/code/spoiler
bunx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --turbopack
```

Accept defaults. This scaffolds Next.js 16 with Turbopack, Tailwind CSS v4, App Router, and TypeScript.

- [ ] **Step 2: Install core dependencies**

```bash
bun add drizzle-orm postgres @auth/drizzle-adapter next-auth@beta react-markdown
bun add -d drizzle-kit @types/node
```

Packages:
- `drizzle-orm` + `postgres` — ORM + PostgreSQL driver (postgres.js works with Bun)
- `@auth/drizzle-adapter` + `next-auth@beta` — Auth.js v5
- `react-markdown` — render spoiler content

- [ ] **Step 3: Install shadcn/ui**

```bash
bunx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Slate
- CSS variables: Yes

Then install commonly needed components:

```bash
bunx shadcn@latest add button card dialog input textarea badge tabs avatar dropdown-menu separator skeleton toast
```

- [ ] **Step 4: Configure next.config.ts**

Replace `next.config.ts` with:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
```

- `reactCompiler: true` — enables React Compiler for auto-memoization
- `cacheComponents: true` — enables `use cache` directive and Cache Components (ISR)

- [ ] **Step 5: Create .env.local**

```bash
cat > .env.local << 'EOF'
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/spoilerhub

# Auth.js
AUTH_SECRET=generate-a-secret-here
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
AUTH_DISCORD_ID=your-discord-client-id
AUTH_DISCORD_SECRET=your-discord-client-secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

- [ ] **Step 6: Initialize git and commit**

```bash
cd /Users/weerawatposeeya/Desktop/code/spoiler
git init
echo ".env.local" >> .gitignore
echo ".superpowers/" >> .gitignore
git add .
git commit -m "chore: scaffold Next.js 16 project with Bun, Tailwind, shadcn/ui"
```

- [ ] **Step 7: Verify dev server starts**

```bash
bun run dev
```

Expected: Server starts on `http://localhost:3000` with Turbopack. No errors.

---

## Task 2: Database Schema & Drizzle Setup

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/index.ts`
- Create: `drizzle.config.ts`

- [ ] **Step 1: Create drizzle.config.ts**

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 2: Create database connection**

Create `src/db/index.ts`:

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

export const db = drizzle(client, { schema });
```

- [ ] **Step 3: Create full schema**

Create `src/db/schema.ts`:

```ts
import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  primaryKey,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// ─── Enums ───────────────────────────────────────────────

export const seriesTypeEnum = pgEnum("series_type", [
  "anime",
  "manga",
  "manhwa",
  "manhua",
  "novel",
  "other",
]);

export const seriesStatusEnum = pgEnum("series_status", [
  "ongoing",
  "completed",
  "hiatus",
]);

export const userRoleEnum = pgEnum("user_role", [
  "user",
  "moderator",
  "admin",
]);

export const reportTargetTypeEnum = pgEnum("report_target_type", [
  "spoiler",
  "comment",
]);

export const reportStatusEnum = pgEnum("report_status", [
  "pending",
  "resolved",
  "dismissed",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "new_spoiler",
  "comment",
  "upvote",
]);

// ─── Auth.js Tables ──────────────────────────────────────

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// ─── Content Tables ──────────────────────────────────────

export const series = pgTable("series", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  title: text("title").notNull(),
  slug: text("slug").unique().notNull(),
  type: seriesTypeEnum("type").notNull(),
  coverImage: text("coverImage"),
  synopsis: text("synopsis"),
  status: seriesStatusEnum("status").default("ongoing").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const genres = pgTable("genre", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").unique().notNull(),
  slug: text("slug").unique().notNull(),
});

export const seriesGenres = pgTable(
  "series_genre",
  {
    seriesId: text("seriesId")
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    genreId: text("genreId")
      .notNull()
      .references(() => genres.id, { onDelete: "cascade" }),
  },
  (sg) => ({
    pk: primaryKey({ columns: [sg.seriesId, sg.genreId] }),
  })
);

export const spoilers = pgTable("spoiler", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  seriesId: text("seriesId")
    .notNull()
    .references(() => series.id, { onDelete: "cascade" }),
  authorId: text("authorId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  chapter: text("chapter").notNull(),
  slug: text("slug").unique().notNull(),
  upvoteCount: integer("upvoteCount").default(0).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const comments = pgTable("comment", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  spoilerId: text("spoilerId")
    .notNull()
    .references(() => spoilers.id, { onDelete: "cascade" }),
  authorId: text("authorId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const votes = pgTable(
  "vote",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    spoilerId: text("spoilerId")
      .notNull()
      .references(() => spoilers.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    value: integer("value").notNull(), // +1 or -1
  },
  (vote) => ({
    uniqueVote: uniqueIndex("vote_spoiler_user_idx").on(
      vote.spoilerId,
      vote.userId
    ),
  })
);

// ─── Engagement Tables ───────────────────────────────────

export const bookmarks = pgTable(
  "bookmark",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    seriesId: text("seriesId")
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  },
  (bm) => ({
    uniqueBookmark: uniqueIndex("bookmark_user_series_idx").on(
      bm.userId,
      bm.seriesId
    ),
  })
);

export const reports = pgTable("report", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  reporterId: text("reporterId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetType: reportTargetTypeEnum("targetType").notNull(),
  targetId: text("targetId").notNull(),
  reason: text("reason").notNull(),
  status: reportStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const notifications = pgTable("notification", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  referenceType: text("referenceType").notNull(),
  referenceId: text("referenceId").notNull(),
  message: text("message").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

// ─── Relations ───────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  spoilers: many(spoilers),
  comments: many(comments),
  votes: many(votes),
  bookmarks: many(bookmarks),
  notifications: many(notifications),
}));

export const seriesRelations = relations(series, ({ many }) => ({
  spoilers: many(spoilers),
  genres: many(seriesGenres),
  bookmarks: many(bookmarks),
}));

export const spoilersRelations = relations(spoilers, ({ one, many }) => ({
  series: one(series, {
    fields: [spoilers.seriesId],
    references: [series.id],
  }),
  author: one(users, {
    fields: [spoilers.authorId],
    references: [users.id],
  }),
  comments: many(comments),
  votes: many(votes),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  spoiler: one(spoilers, {
    fields: [comments.spoilerId],
    references: [spoilers.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  spoiler: one(spoilers, {
    fields: [votes.spoilerId],
    references: [spoilers.id],
  }),
  user: one(users, {
    fields: [votes.userId],
    references: [users.id],
  }),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, {
    fields: [bookmarks.userId],
    references: [users.id],
  }),
  series: one(series, {
    fields: [bookmarks.seriesId],
    references: [series.id],
  }),
}));

export const seriesGenresRelations = relations(seriesGenres, ({ one }) => ({
  series: one(series, {
    fields: [seriesGenres.seriesId],
    references: [series.id],
  }),
  genre: one(genres, {
    fields: [seriesGenres.genreId],
    references: [genres.id],
  }),
}));
```

- [ ] **Step 4: Install cuid2**

```bash
bun add @paralleldrive/cuid2
```

- [ ] **Step 5: Generate and push migration**

```bash
bunx drizzle-kit generate
bunx drizzle-kit push
```

Expected: Migration files created in `src/db/migrations/`. Schema pushed to database. Verify with `bunx drizzle-kit studio` if desired.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add Drizzle schema with all 12 tables and relations"
```

---

## Task 3: Auth.js v5 Setup

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Create auth config**

Create `src/lib/auth.ts`:

```ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [Google, Discord],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.role = (user as typeof users.$inferSelect).role;
      return session;
    },
  },
});
```

- [ ] **Step 2: Create auth route handler**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 3: Extend next-auth types**

Create `src/types/next-auth.d.ts`:

```ts
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
      role: "user" | "moderator" | "admin";
    };
  }
}
```

- [ ] **Step 4: Create login page**

Create `src/app/(auth)/login/page.tsx`:

```tsx
import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign in to SpoilerHub</CardTitle>
          <p className="text-muted-foreground text-sm">
            Join the community and share spoilers
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <Button variant="outline" className="w-full" type="submit">
              Continue with Google
            </Button>
          </form>
          <form
            action={async () => {
              "use server";
              await signIn("discord", { redirectTo: "/" });
            }}
          >
            <Button variant="outline" className="w-full" type="submit">
              Continue with Discord
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Create auth helper for server components**

Create `src/lib/auth-utils.ts`:

```ts
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function getSession() {
  return await auth();
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "admin") {
    redirect("/");
  }
  return session;
}
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: configure Auth.js v5 with Google/Discord providers and Drizzle adapter"
```

---

## Task 4: Root Layout, Dark Theme & Navbar

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Create: `src/components/navbar.tsx`
- Create: `src/components/user-menu.tsx`

- [ ] **Step 1: Update globals.css for dark theme**

Replace `src/app/globals.css`. Keep the existing shadcn/ui CSS variables but ensure the dark theme is default. The file should have:

```css
@import "tailwindcss";
@plugin "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  /* keep existing shadcn theme tokens */
}

/* Force dark theme as default */
:root {
  color-scheme: dark;
}
```

Ensure the shadcn dark color variables are the active ones by default (shadcn init should have set these up — verify `class="dark"` approach is configured).

- [ ] **Step 2: Create navbar**

Create `src/components/navbar.tsx`:

```tsx
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./user-menu";

export async function Navbar() {
  const session = await auth();

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-primary">
            SpoilerHub
          </Link>
          <nav className="hidden gap-4 md:flex">
            <Link
              href="/browse"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Browse
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {session?.user ? (
            <>
              <Link href="/create">
                <Button size="sm">Write Spoiler</Button>
              </Link>
              <UserMenu user={session.user} />
            </>
          ) : (
            <Link href="/login">
              <Button size="sm" variant="outline">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Create user menu**

Create `src/components/user-menu.tsx`:

```tsx
"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserMenuProps {
  user: {
    id: string;
    name: string | null;
    image: string | null;
    role: string;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.image ?? undefined} />
          <AvatarFallback>{user.name?.charAt(0) ?? "U"}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/profile/${user.id}`}>Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/bookmarks">Bookmarks</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/notifications">Notifications</Link>
        </DropdownMenuItem>
        {user.role === "admin" && (
          <DropdownMenuItem asChild>
            <Link href="/admin">Admin</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>Sign Out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: Update root layout**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/navbar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "SpoilerHub — สปอยล์ anime manga manhwa ตอนล่าสุด",
    template: "%s | SpoilerHub",
  },
  description:
    "อ่านสปอยล์ anime manga manhwa manhua novel ตอนล่าสุด พร้อมสรุปเนื้อเรื่อง",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="dark">
      <body className={inter.className}>
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Verify dark theme renders**

```bash
bun run dev
```

Open `http://localhost:3000`. Expected: dark background, navbar with "SpoilerHub" logo, "Browse" link, "Sign In" button.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add root layout with dark theme navbar and user menu"
```

---

## Task 5: Auth Guard via proxy.ts

**Files:**
- Create: `proxy.ts` (project root, NOT in `src/`)

- [ ] **Step 1: Create proxy.ts**

Create `proxy.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = ["/create", "/bookmarks", "/notifications"];
const adminRoutes = ["/admin"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for auth session cookie (Auth.js sets this)
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ??
    request.cookies.get("__Secure-authjs.session-token")?.value;

  // Protected routes — require login
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Admin routes — check via cookie is minimal; full check in page/action
  if (adminRoutes.some((route) => pathname.startsWith(route))) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/create/:path*", "/bookmarks/:path*", "/notifications/:path*", "/admin/:path*"],
};
```

Note: `proxy.ts` only does a lightweight cookie check. Full role-based authorization is done server-side in pages/actions via `requireAuth()` / `requireAdmin()`.

- [ ] **Step 2: Commit**

```bash
git add proxy.ts
git commit -m "feat: add proxy.ts auth guard for protected routes"
```

---

## Task 6: Series & Genre Management (Admin)

**Files:**
- Create: `src/actions/series.ts`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/series/new/page.tsx`
- Create: `src/db/seed.ts`

- [ ] **Step 1: Create series server actions**

Create `src/actions/series.ts`:

```ts
"use server";

import { db } from "@/db";
import { series, genres, seriesGenres } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-utils";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export async function createSeries(formData: FormData) {
  await requireAdmin();

  const title = formData.get("title") as string;
  const type = formData.get("type") as
    | "anime"
    | "manga"
    | "manhwa"
    | "manhua"
    | "novel"
    | "other";
  const status = formData.get("status") as
    | "ongoing"
    | "completed"
    | "hiatus";
  const coverImage = formData.get("coverImage") as string;
  const synopsis = formData.get("synopsis") as string;
  const genreIds = formData.getAll("genres") as string[];

  const slug = slugify(title);

  const [newSeries] = await db
    .insert(series)
    .values({ title, slug, type, status, coverImage, synopsis })
    .returning();

  if (genreIds.length > 0) {
    await db.insert(seriesGenres).values(
      genreIds.map((genreId) => ({
        seriesId: newSeries.id,
        genreId,
      }))
    );
  }

  revalidatePath("/");
  revalidatePath("/browse");
}

export async function deleteSeries(id: string) {
  await requireAdmin();
  await db.delete(series).where(eq(series.id, id));
  revalidatePath("/");
  revalidatePath("/browse");
}
```

- [ ] **Step 2: Create seed script with genres and sample series**

Create `src/db/seed.ts`:

```ts
import { db } from "./index";
import { genres, series, seriesGenres } from "./schema";

const GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Isekai",
  "Martial Arts",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
];

const SAMPLE_SERIES = [
  {
    title: "Solo Leveling",
    type: "manhwa" as const,
    status: "completed" as const,
    synopsis:
      "Sung Jinwoo, the weakest hunter, gains a mysterious power that lets him level up without limits.",
    coverImage: "https://cdn.myanimelist.net/images/manga/3/222295l.jpg",
    genres: ["Action", "Adventure", "Fantasy"],
  },
  {
    title: "One Piece",
    type: "manga" as const,
    status: "ongoing" as const,
    synopsis:
      "Monkey D. Luffy and his crew search for the ultimate treasure, the One Piece.",
    coverImage: "https://cdn.myanimelist.net/images/manga/2/253146l.jpg",
    genres: ["Action", "Adventure", "Comedy"],
  },
  {
    title: "Jujutsu Kaisen",
    type: "manga" as const,
    status: "completed" as const,
    synopsis:
      "Yuji Itadori joins a secret organization of sorcerers to fight powerful Curses.",
    coverImage: "https://cdn.myanimelist.net/images/manga/3/210341l.jpg",
    genres: ["Action", "Supernatural", "Drama"],
  },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

async function seed() {
  console.log("Seeding genres...");
  const insertedGenres = await db
    .insert(genres)
    .values(
      GENRES.map((name) => ({
        name,
        slug: slugify(name),
      }))
    )
    .onConflictDoNothing()
    .returning();

  const genreMap = new Map(insertedGenres.map((g) => [g.name, g.id]));

  console.log("Seeding series...");
  for (const s of SAMPLE_SERIES) {
    const [newSeries] = await db
      .insert(series)
      .values({
        title: s.title,
        slug: slugify(s.title),
        type: s.type,
        status: s.status,
        synopsis: s.synopsis,
        coverImage: s.coverImage,
      })
      .onConflictDoNothing()
      .returning();

    if (newSeries) {
      const genreLinks = s.genres
        .map((name) => genreMap.get(name))
        .filter(Boolean)
        .map((genreId) => ({
          seriesId: newSeries.id,
          genreId: genreId!,
        }));

      if (genreLinks.length > 0) {
        await db.insert(seriesGenres).values(genreLinks).onConflictDoNothing();
      }
    }
  }

  console.log("Seed complete!");
  process.exit(0);
}

seed();
```

- [ ] **Step 3: Run seed**

```bash
bun run src/db/seed.ts
```

Expected: "Seeding genres...", "Seeding series...", "Seed complete!"

- [ ] **Step 4: Create admin dashboard page**

Create `src/app/admin/page.tsx`:

```tsx
import { requireAdmin } from "@/lib/auth-utils";
import { db } from "@/db";
import { series, spoilers, reports, users } from "@/db/schema";
import { count, eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AdminPage() {
  await requireAdmin();

  const [seriesCount] = await db.select({ count: count() }).from(series);
  const [spoilerCount] = await db.select({ count: count() }).from(spoilers);
  const [userCount] = await db.select({ count: count() }).from(users);
  const [pendingReports] = await db
    .select({ count: count() })
    .from(reports)
    .where(eq(reports.status, "pending"));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Link href="/admin/series/new">
          <Button>Add Series</Button>
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Series
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{seriesCount.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Spoilers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{spoilerCount.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{userCount.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Pending Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingReports.count}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add series management, seed data, and admin dashboard"
```

---

## Task 7: Create Spoiler Page & Action

**Files:**
- Create: `src/actions/spoiler.ts`
- Create: `src/app/(main)/create/page.tsx`
- Create: `src/components/series-search.tsx`

- [ ] **Step 1: Create spoiler server actions**

Create `src/actions/spoiler.ts`:

```ts
"use server";

import { db } from "@/db";
import {
  spoilers,
  bookmarks,
  notifications,
  series as seriesTable,
} from "@/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createId } from "@paralleldrive/cuid2";

export async function createSpoiler(formData: FormData) {
  const session = await requireAuth();

  const seriesId = formData.get("seriesId") as string;
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const chapter = formData.get("chapter") as string;

  // Get series for slug
  const [targetSeries] = await db
    .select()
    .from(seriesTable)
    .where(eq(seriesTable.id, seriesId))
    .limit(1);

  if (!targetSeries) throw new Error("Series not found");

  const shortId = createId().slice(0, 8);
  const slug = `${targetSeries.slug}-ch-${chapter}-${shortId}`;

  const [newSpoiler] = await db
    .insert(spoilers)
    .values({
      seriesId,
      authorId: session.user.id,
      title,
      content,
      chapter,
      slug,
    })
    .returning();

  // Notify users who bookmarked this series
  const seriesBookmarks = await db
    .select()
    .from(bookmarks)
    .where(eq(bookmarks.seriesId, seriesId));

  if (seriesBookmarks.length > 0) {
    await db.insert(notifications).values(
      seriesBookmarks
        .filter((bm) => bm.userId !== session.user.id)
        .map((bm) => ({
          userId: bm.userId,
          type: "new_spoiler" as const,
          referenceType: "spoiler",
          referenceId: newSpoiler.id,
          message: `New spoiler: ${targetSeries.title} chapter ${chapter}`,
        }))
    );
  }

  revalidatePath("/");
  revalidatePath(`/series/${targetSeries.slug}`);
  redirect(`/spoiler/${slug}`);
}

export async function deleteSpoiler(id: string) {
  const session = await requireAuth();

  const [spoiler] = await db
    .select()
    .from(spoilers)
    .where(eq(spoilers.id, id))
    .limit(1);

  if (!spoiler) throw new Error("Spoiler not found");
  if (spoiler.authorId !== session.user.id && session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  await db.delete(spoilers).where(eq(spoilers.id, id));
  revalidatePath("/");
}
```

- [ ] **Step 2: Create series search component**

Create `src/components/series-search.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface SeriesOption {
  id: string;
  title: string;
  type: string;
}

export function SeriesSearch({
  onSelect,
}: {
  onSelect: (series: SeriesOption) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SeriesOption[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const res = await fetch(
        `/api/series/search?q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      setResults(data);
      setOpen(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative">
      <Input
        placeholder="Search series..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
          {results.map((s) => (
            <li
              key={s.id}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-accent"
              onClick={() => {
                onSelect(s);
                setQuery(s.title);
                setOpen(false);
              }}
            >
              <span className="font-medium">{s.title}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {s.type}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create series search API route**

Create `src/app/api/series/search/route.ts`:

```ts
import { db } from "@/db";
import { series } from "@/db/schema";
import { ilike } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const results = await db
    .select({
      id: series.id,
      title: series.title,
      type: series.type,
    })
    .from(series)
    .where(ilike(series.title, `%${q}%`))
    .limit(10);

  return NextResponse.json(results);
}
```

- [ ] **Step 4: Create spoiler creation page**

Create `src/app/(main)/create/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { createSpoiler } from "@/actions/spoiler";
import { SeriesSearch } from "@/components/series-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CreateSpoilerPage() {
  const [selectedSeries, setSelectedSeries] = useState<{
    id: string;
    title: string;
  } | null>(null);

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Write a Spoiler</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createSpoiler} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Series</label>
              <SeriesSearch
                onSelect={(s) => setSelectedSeries({ id: s.id, title: s.title })}
              />
              {selectedSeries && (
                <input
                  type="hidden"
                  name="seriesId"
                  value={selectedSeries.id}
                />
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Chapter / Episode
              </label>
              <Input name="chapter" placeholder="e.g. 385" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Title</label>
              <Input
                name="title"
                placeholder="Brief spoiler headline"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Spoiler Content (Markdown)
              </label>
              <Textarea
                name="content"
                placeholder="Write your spoiler here..."
                rows={10}
                required
              />
            </div>
            <Button type="submit" disabled={!selectedSeries}>
              Post Spoiler
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add create spoiler page with series search and notifications"
```

---

## Task 8: Homepage

**Files:**
- Modify: `src/app/(main)/page.tsx`
- Create: `src/components/spoiler-card.tsx`
- Create: `src/components/type-tabs.tsx`

- [ ] **Step 1: Create spoiler card component**

Create `src/components/spoiler-card.tsx`:

```tsx
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface SpoilerCardProps {
  slug: string;
  title: string;
  chapter: string;
  seriesTitle: string;
  seriesType: string;
  authorName: string | null;
  upvoteCount: number;
  commentCount: number;
  createdAt: Date;
}

const TYPE_COLORS: Record<string, string> = {
  anime: "bg-blue-600",
  manga: "bg-red-600",
  manhwa: "bg-green-600",
  manhua: "bg-yellow-600",
  novel: "bg-purple-600",
  other: "bg-gray-600",
};

export function SpoilerCard({
  slug,
  title,
  chapter,
  seriesTitle,
  seriesType,
  authorName,
  upvoteCount,
  commentCount,
  createdAt,
}: SpoilerCardProps) {
  return (
    <Link href={`/spoiler/${slug}`}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge
                className={`${TYPE_COLORS[seriesType] ?? TYPE_COLORS.other} text-white text-xs`}
              >
                {seriesType}
              </Badge>
              <span className="text-sm font-medium truncate">
                {seriesTitle}
              </span>
              <span className="text-xs text-muted-foreground">
                Ch. {chapter}
              </span>
            </div>
            <p className="mt-1 text-sm truncate">{title}</p>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span>by {authorName ?? "Anonymous"}</span>
              <span>+{upvoteCount}</span>
              <span>{commentCount} comments</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Create type filter tabs**

Create `src/components/type-tabs.tsx`:

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TYPES = [
  { value: "all", label: "All" },
  { value: "anime", label: "Anime" },
  { value: "manga", label: "Manga" },
  { value: "manhwa", label: "Manhwa" },
  { value: "manhua", label: "Manhua" },
  { value: "novel", label: "Novel" },
];

export function TypeTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("type") ?? "all";

  return (
    <Tabs
      value={current}
      onValueChange={(value) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === "all") {
          params.delete("type");
        } else {
          params.set("type", value);
        }
        router.push(`/?${params.toString()}`);
      }}
    >
      <TabsList>
        {TYPES.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
```

- [ ] **Step 3: Build homepage**

Replace `src/app/(main)/page.tsx`:

```tsx
import { db } from "@/db";
import { spoilers, series, users, comments } from "@/db/schema";
import { desc, eq, sql, count } from "drizzle-orm";
import { SpoilerCard } from "@/components/spoiler-card";
import { TypeTabs } from "@/components/type-tabs";
import { Suspense } from "react";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  "use cache";

  const params = await searchParams;
  const typeFilter = params.type;

  const latestSpoilers = await db
    .select({
      id: spoilers.id,
      slug: spoilers.slug,
      title: spoilers.title,
      chapter: spoilers.chapter,
      upvoteCount: spoilers.upvoteCount,
      createdAt: spoilers.createdAt,
      seriesTitle: series.title,
      seriesType: series.type,
      authorName: users.name,
      commentCount: sql<number>`(
        SELECT COUNT(*) FROM comment WHERE comment."spoilerId" = spoiler.id
      )`.as("commentCount"),
    })
    .from(spoilers)
    .innerJoin(series, eq(spoilers.seriesId, series.id))
    .innerJoin(users, eq(spoilers.authorId, users.id))
    .where(typeFilter ? eq(series.type, typeFilter as any) : undefined)
    .orderBy(desc(spoilers.createdAt))
    .limit(20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Latest Spoilers</h1>
        <p className="text-muted-foreground text-sm">
          สปอยล์ตอนล่าสุดจากชุมชน
        </p>
      </div>

      <Suspense fallback={null}>
        <TypeTabs />
      </Suspense>

      <div className="space-y-2">
        {latestSpoilers.map((sp) => (
          <SpoilerCard
            key={sp.id}
            slug={sp.slug}
            title={sp.title}
            chapter={sp.chapter}
            seriesTitle={sp.seriesTitle}
            seriesType={sp.seriesType}
            authorName={sp.authorName}
            upvoteCount={sp.upvoteCount}
            commentCount={Number(sp.commentCount)}
            createdAt={sp.createdAt}
          />
        ))}
        {latestSpoilers.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">
            No spoilers yet. Be the first to write one!
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add homepage with latest spoilers list and type filter tabs"
```

---

## Task 9: Series Detail Page

**Files:**
- Create: `src/app/(main)/series/[slug]/page.tsx`
- Create: `src/components/bookmark-button.tsx`
- Create: `src/actions/bookmark.ts`

- [ ] **Step 1: Create bookmark action**

Create `src/actions/bookmark.ts`:

```ts
"use server";

import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function toggleBookmark(seriesId: string) {
  const session = await requireAuth();

  const existing = await db
    .select()
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.userId, session.user.id),
        eq(bookmarks.seriesId, seriesId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db.delete(bookmarks).where(eq(bookmarks.id, existing[0].id));
  } else {
    await db.insert(bookmarks).values({
      userId: session.user.id,
      seriesId,
    });
  }

  revalidatePath(`/series`);
  revalidatePath(`/bookmarks`);
}
```

- [ ] **Step 2: Create bookmark button**

Create `src/components/bookmark-button.tsx`:

```tsx
"use client";

import { toggleBookmark } from "@/actions/bookmark";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";

export function BookmarkButton({
  seriesId,
  isBookmarked,
}: {
  seriesId: string;
  isBookmarked: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant={isBookmarked ? "default" : "outline"}
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => toggleBookmark(seriesId))}
    >
      {isBookmarked ? "Bookmarked" : "Bookmark"}
    </Button>
  );
}
```

- [ ] **Step 3: Create series detail page**

Create `src/app/(main)/series/[slug]/page.tsx`:

```tsx
import { db } from "@/db";
import {
  series,
  spoilers,
  users,
  seriesGenres,
  genres,
  bookmarks,
} from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { SpoilerCard } from "@/components/spoiler-card";
import { BookmarkButton } from "@/components/bookmark-button";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [s] = await db
    .select()
    .from(series)
    .where(eq(series.slug, slug))
    .limit(1);
  if (!s) return {};
  return {
    title: `${s.title} สปอยล์ตอนล่าสุด`,
    description: s.synopsis ?? `อ่านสปอยล์ ${s.title} ตอนล่าสุด`,
    openGraph: {
      title: s.title,
      description: s.synopsis ?? undefined,
      images: s.coverImage ? [s.coverImage] : undefined,
    },
    alternates: { canonical: `/series/${slug}` },
  };
}

export default async function SeriesDetailPage({ params }: Props) {
  "use cache";

  const { slug } = await params;

  const [s] = await db
    .select()
    .from(series)
    .where(eq(series.slug, slug))
    .limit(1);

  if (!s) notFound();

  const session = await auth();

  const seriesGenreList = await db
    .select({ name: genres.name, slug: genres.slug })
    .from(seriesGenres)
    .innerJoin(genres, eq(seriesGenres.genreId, genres.id))
    .where(eq(seriesGenres.seriesId, s.id));

  const spoilerList = await db
    .select({
      id: spoilers.id,
      slug: spoilers.slug,
      title: spoilers.title,
      chapter: spoilers.chapter,
      upvoteCount: spoilers.upvoteCount,
      createdAt: spoilers.createdAt,
      seriesTitle: sql<string>`${s.title}`.as("seriesTitle"),
      seriesType: sql<string>`${s.type}`.as("seriesType"),
      authorName: users.name,
      commentCount: sql<number>`(
        SELECT COUNT(*) FROM comment WHERE comment."spoilerId" = spoiler.id
      )`.as("commentCount"),
    })
    .from(spoilers)
    .innerJoin(users, eq(spoilers.authorId, users.id))
    .where(eq(spoilers.seriesId, s.id))
    .orderBy(desc(spoilers.createdAt));

  let isBookmarked = false;
  if (session?.user) {
    const [bm] = await db
      .select()
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, session.user.id),
          eq(bookmarks.seriesId, s.id)
        )
      )
      .limit(1);
    isBookmarked = !!bm;
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-6">
        {s.coverImage && (
          <Image
            src={s.coverImage}
            alt={s.title}
            width={200}
            height={300}
            className="rounded-lg object-cover"
          />
        )}
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between">
            <h1 className="text-2xl font-bold">{s.title}</h1>
            {session?.user && (
              <BookmarkButton seriesId={s.id} isBookmarked={isBookmarked} />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{s.type}</Badge>
            <Badge variant="outline">{s.status}</Badge>
            {seriesGenreList.map((g) => (
              <Badge key={g.slug} variant="outline">
                {g.name}
              </Badge>
            ))}
          </div>
          {s.synopsis && (
            <p className="text-sm text-muted-foreground">{s.synopsis}</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Spoilers ({spoilerList.length})
        </h2>
        <div className="space-y-2">
          {spoilerList.map((sp) => (
            <SpoilerCard
              key={sp.id}
              slug={sp.slug}
              title={sp.title}
              chapter={sp.chapter}
              seriesTitle={sp.seriesTitle}
              seriesType={sp.seriesType}
              authorName={sp.authorName}
              upvoteCount={sp.upvoteCount}
              commentCount={Number(sp.commentCount)}
              createdAt={sp.createdAt}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add series detail page with bookmark toggle and spoiler list"
```

---

## Task 10: Spoiler View Page with Warning Gate

**Files:**
- Create: `src/app/(main)/spoiler/[slug]/page.tsx`
- Create: `src/components/spoiler-reveal.tsx`
- Create: `src/app/api/spoiler/[id]/content/route.ts`

- [ ] **Step 1: Create spoiler content API (client-side fetch after reveal)**

Create `src/app/api/spoiler/[id]/content/route.ts`:

```ts
import { db } from "@/db";
import { spoilers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [spoiler] = await db
    .select({ content: spoilers.content })
    .from(spoilers)
    .where(eq(spoilers.id, id))
    .limit(1);

  if (!spoiler) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ content: spoiler.content });
}
```

- [ ] **Step 2: Create spoiler reveal component**

Create `src/components/spoiler-reveal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";

export function SpoilerReveal({
  spoilerId,
  seriesTitle,
  chapter,
}: {
  spoilerId: string;
  seriesTitle: string;
  chapter: string;
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleReveal() {
    setLoading(true);
    const res = await fetch(`/api/spoiler/${spoilerId}/content`);
    const data = await res.json();
    setContent(data.content);
    setShowDialog(false);
    setLoading(false);
  }

  if (content) {
    return (
      <div className="prose prose-invert max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <p className="mb-2 text-lg font-medium">Spoiler content is hidden</p>
        <p className="mb-4 text-sm text-muted-foreground">
          Click to reveal the spoiler for {seriesTitle} Ch. {chapter}
        </p>
        <Button onClick={() => setShowDialog(true)}>View Spoiler</Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Spoiler Warning</DialogTitle>
            <DialogDescription>
              You are about to read the spoiler for{" "}
              <strong>{seriesTitle}</strong> chapter <strong>{chapter}</strong>.
              Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReveal} disabled={loading}>
              {loading ? "Loading..." : "Yes, show me"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 3: Create spoiler view page**

Create `src/app/(main)/spoiler/[slug]/page.tsx`:

```tsx
import { db } from "@/db";
import { spoilers, series, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SpoilerReveal } from "@/components/spoiler-reveal";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [spoiler] = await db
    .select({
      title: spoilers.title,
      chapter: spoilers.chapter,
      seriesTitle: series.title,
    })
    .from(spoilers)
    .innerJoin(series, eq(spoilers.seriesId, series.id))
    .where(eq(spoilers.slug, slug))
    .limit(1);

  if (!spoiler) return {};

  return {
    title: `สปอยล์ ${spoiler.seriesTitle} ตอนที่ ${spoiler.chapter}`,
    description: `${spoiler.title} — อ่านสปอยล์ ${spoiler.seriesTitle} ตอนที่ ${spoiler.chapter}`,
    openGraph: {
      title: `สปอยล์ ${spoiler.seriesTitle} ตอนที่ ${spoiler.chapter}`,
      description: spoiler.title,
      images: [`/api/og?title=${encodeURIComponent(spoiler.seriesTitle)}&chapter=${spoiler.chapter}`],
    },
    alternates: { canonical: `/spoiler/${slug}` },
  };
}

export default async function SpoilerViewPage({ params }: Props) {
  "use cache";

  const { slug } = await params;

  const [spoiler] = await db
    .select({
      id: spoilers.id,
      title: spoilers.title,
      chapter: spoilers.chapter,
      upvoteCount: spoilers.upvoteCount,
      createdAt: spoilers.createdAt,
      seriesTitle: series.title,
      seriesSlug: series.slug,
      seriesType: series.type,
      authorName: users.name,
      authorId: users.id,
    })
    .from(spoilers)
    .innerJoin(series, eq(spoilers.seriesId, series.id))
    .innerJoin(users, eq(spoilers.authorId, users.id))
    .where(eq(spoilers.slug, slug))
    .limit(1);

  if (!spoiler) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/series/${spoiler.seriesSlug}`}
          className="text-sm text-primary hover:underline"
        >
          {spoiler.seriesTitle}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{spoiler.title}</h1>
        <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="secondary">{spoiler.seriesType}</Badge>
          <span>Ch. {spoiler.chapter}</span>
          <span>by {spoiler.authorName}</span>
          <span>+{spoiler.upvoteCount}</span>
        </div>
      </div>

      <SpoilerReveal
        spoilerId={spoiler.id}
        seriesTitle={spoiler.seriesTitle}
        chapter={spoiler.chapter}
      />

      {/* Vote buttons and comments will be added in Tasks 11 & 12 */}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add spoiler view page with warning gate and client-side content reveal"
```

---

## Task 11: Voting System

**Files:**
- Create: `src/actions/vote.ts`
- Create: `src/components/vote-button.tsx`

- [ ] **Step 1: Create vote server action**

Create `src/actions/vote.ts`:

```ts
"use server";

import { db } from "@/db";
import { votes, spoilers, notifications } from "@/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function vote(spoilerId: string, value: 1 | -1) {
  const session = await requireAuth();

  const [existing] = await db
    .select()
    .from(votes)
    .where(
      and(eq(votes.spoilerId, spoilerId), eq(votes.userId, session.user.id))
    )
    .limit(1);

  if (existing) {
    if (existing.value === value) {
      // Same vote — remove it
      await db.delete(votes).where(eq(votes.id, existing.id));
      await db
        .update(spoilers)
        .set({
          upvoteCount: sql`${spoilers.upvoteCount} - ${existing.value}`,
        })
        .where(eq(spoilers.id, spoilerId));
    } else {
      // Different vote — update
      await db
        .update(votes)
        .set({ value })
        .where(eq(votes.id, existing.id));
      await db
        .update(spoilers)
        .set({
          upvoteCount: sql`${spoilers.upvoteCount} + ${value - existing.value}`,
        })
        .where(eq(spoilers.id, spoilerId));
    }
  } else {
    // New vote
    await db.insert(votes).values({
      spoilerId,
      userId: session.user.id,
      value,
    });
    await db
      .update(spoilers)
      .set({ upvoteCount: sql`${spoilers.upvoteCount} + ${value}` })
      .where(eq(spoilers.id, spoilerId));

    // Notify on upvote milestones
    if (value === 1) {
      const [spoiler] = await db
        .select({
          upvoteCount: spoilers.upvoteCount,
          authorId: spoilers.authorId,
        })
        .from(spoilers)
        .where(eq(spoilers.id, spoilerId))
        .limit(1);

      const milestones = [10, 50, 100, 500];
      if (
        spoiler &&
        milestones.includes(spoiler.upvoteCount) &&
        spoiler.authorId !== session.user.id
      ) {
        await db.insert(notifications).values({
          userId: spoiler.authorId,
          type: "upvote",
          referenceType: "spoiler",
          referenceId: spoilerId,
          message: `Your spoiler reached ${spoiler.upvoteCount} upvotes!`,
        });
      }
    }
  }

  revalidatePath(`/spoiler`);
}
```

- [ ] **Step 2: Create vote button component**

Create `src/components/vote-button.tsx`:

```tsx
"use client";

import { vote } from "@/actions/vote";
import { Button } from "@/components/ui/button";
import { useOptimistic, useTransition } from "react";

interface VoteButtonProps {
  spoilerId: string;
  upvoteCount: number;
  userVote: 1 | -1 | null; // null = no vote
}

export function VoteButton({
  spoilerId,
  upvoteCount,
  userVote,
}: VoteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    { count: upvoteCount, vote: userVote },
    (state, newVote: 1 | -1) => {
      if (state.vote === newVote) {
        return { count: state.count - newVote, vote: null };
      }
      const diff = state.vote ? newVote - state.vote : newVote;
      return { count: state.count + diff, vote: newVote };
    }
  );

  function handleVote(value: 1 | -1) {
    startTransition(async () => {
      setOptimistic(value);
      await vote(spoilerId, value);
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant={optimistic.vote === 1 ? "default" : "outline"}
        size="sm"
        onClick={() => handleVote(1)}
        disabled={isPending}
      >
        +
      </Button>
      <span className="min-w-[3ch] text-center text-sm font-medium">
        {optimistic.count}
      </span>
      <Button
        variant={optimistic.vote === -1 ? "destructive" : "outline"}
        size="sm"
        onClick={() => handleVote(-1)}
        disabled={isPending}
      >
        -
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Add VoteButton to spoiler view page**

In `src/app/(main)/spoiler/[slug]/page.tsx`, add the vote button after `SpoilerReveal`. This requires querying the user's current vote and passing it to the component. Add these imports and the vote query inside the page component, then render `<VoteButton>` below `<SpoilerReveal>`.

Add import:
```ts
import { VoteButton } from "@/components/vote-button";
import { votes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { and } from "drizzle-orm";
```

After fetching the spoiler, add:
```ts
const session = await auth();
let userVote: 1 | -1 | null = null;
if (session?.user) {
  const [v] = await db
    .select({ value: votes.value })
    .from(votes)
    .where(
      and(
        eq(votes.spoilerId, spoiler.id),
        eq(votes.userId, session.user.id)
      )
    )
    .limit(1);
  userVote = (v?.value as 1 | -1) ?? null;
}
```

In the JSX, after `<SpoilerReveal>`:
```tsx
<VoteButton
  spoilerId={spoiler.id}
  upvoteCount={spoiler.upvoteCount}
  userVote={userVote}
/>
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add voting system with optimistic UI and milestone notifications"
```

---

## Task 12: Comments System

**Files:**
- Create: `src/actions/comment.ts`
- Create: `src/components/comment-section.tsx`

- [ ] **Step 1: Create comment server action**

Create `src/actions/comment.ts`:

```ts
"use server";

import { db } from "@/db";
import { comments, spoilers, notifications } from "@/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function addComment(spoilerId: string, formData: FormData) {
  const session = await requireAuth();
  const content = formData.get("content") as string;

  if (!content?.trim()) throw new Error("Comment cannot be empty");

  await db.insert(comments).values({
    spoilerId,
    authorId: session.user.id,
    content: content.trim(),
  });

  // Notify spoiler author
  const [spoiler] = await db
    .select({ authorId: spoilers.authorId })
    .from(spoilers)
    .where(eq(spoilers.id, spoilerId))
    .limit(1);

  if (spoiler && spoiler.authorId !== session.user.id) {
    await db.insert(notifications).values({
      userId: spoiler.authorId,
      type: "comment",
      referenceType: "spoiler",
      referenceId: spoilerId,
      message: `${session.user.name ?? "Someone"} commented on your spoiler`,
    });
  }

  revalidatePath(`/spoiler`);
}

export async function deleteComment(commentId: string) {
  const session = await requireAuth();

  const [comment] = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);

  if (!comment) throw new Error("Comment not found");
  if (comment.authorId !== session.user.id && session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  await db.delete(comments).where(eq(comments.id, commentId));
  revalidatePath(`/spoiler`);
}
```

- [ ] **Step 2: Create comment section component**

Create `src/components/comment-section.tsx`:

```tsx
"use client";

import { addComment } from "@/actions/comment";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRef } from "react";

interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  authorName: string | null;
  authorImage: string | null;
}

export function CommentSection({
  spoilerId,
  comments,
  isLoggedIn,
}: {
  spoilerId: string;
  comments: Comment[];
  isLoggedIn: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    await addComment(spoilerId, formData);
    formRef.current?.reset();
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        Comments ({comments.length})
      </h3>

      {isLoggedIn && (
        <form ref={formRef} action={handleSubmit} className="space-y-2">
          <Textarea
            name="content"
            placeholder="Write a comment..."
            rows={3}
            required
          />
          <Button type="submit" size="sm">
            Post Comment
          </Button>
        </form>
      )}

      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={c.authorImage ?? undefined} />
              <AvatarFallback>
                {c.authorName?.charAt(0) ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">
                  {c.authorName ?? "Anonymous"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(c.createdAt).toLocaleDateString("th-TH")}
                </span>
              </div>
              <p className="mt-1 text-sm">{c.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add CommentSection to spoiler view page**

In `src/app/(main)/spoiler/[slug]/page.tsx`, query comments and render the section. Add import:

```ts
import { CommentSection } from "@/components/comment-section";
import { comments as commentsTable } from "@/db/schema";
```

After the vote query, add:
```ts
const commentList = await db
  .select({
    id: commentsTable.id,
    content: commentsTable.content,
    createdAt: commentsTable.createdAt,
    authorName: users.name,
    authorImage: users.image,
  })
  .from(commentsTable)
  .innerJoin(users, eq(commentsTable.authorId, users.id))
  .where(eq(commentsTable.spoilerId, spoiler.id))
  .orderBy(commentsTable.createdAt);
```

In JSX, after `<VoteButton>`:
```tsx
<CommentSection
  spoilerId={spoiler.id}
  comments={commentList}
  isLoggedIn={!!session?.user}
/>
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add comment system with notifications to spoiler author"
```

---

## Task 13: Bookmarks Page

**Files:**
- Create: `src/app/(main)/bookmarks/page.tsx`
- Create: `src/components/series-card.tsx`

- [ ] **Step 1: Create series card component**

Create `src/components/series-card.tsx`:

```tsx
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface SeriesCardProps {
  slug: string;
  title: string;
  type: string;
  status: string;
  coverImage: string | null;
}

export function SeriesCard({
  slug,
  title,
  type,
  status,
  coverImage,
}: SeriesCardProps) {
  return (
    <Link href={`/series/${slug}`}>
      <Card className="overflow-hidden transition-colors hover:bg-accent/50">
        <div className="aspect-[2/3] relative">
          {coverImage ? (
            <Image
              src={coverImage}
              alt={title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-muted text-muted-foreground">
              No Image
            </div>
          )}
        </div>
        <CardContent className="p-3">
          <p className="truncate text-sm font-medium">{title}</p>
          <div className="mt-1 flex gap-1">
            <Badge variant="secondary" className="text-xs">
              {type}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {status}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Create bookmarks page**

Create `src/app/(main)/bookmarks/page.tsx`:

```tsx
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { bookmarks, series } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { SeriesCard } from "@/components/series-card";

export default async function BookmarksPage() {
  const session = await requireAuth();

  const myBookmarks = await db
    .select({
      slug: series.slug,
      title: series.title,
      type: series.type,
      status: series.status,
      coverImage: series.coverImage,
    })
    .from(bookmarks)
    .innerJoin(series, eq(bookmarks.seriesId, series.id))
    .where(eq(bookmarks.userId, session.user.id))
    .orderBy(desc(bookmarks.createdAt));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Bookmarks</h1>
      {myBookmarks.length === 0 ? (
        <p className="text-muted-foreground">No bookmarks yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {myBookmarks.map((s) => (
            <SeriesCard key={s.slug} {...s} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add bookmarks page with series card grid"
```

---

## Task 14: Browse Page with Search & Filter

**Files:**
- Create: `src/app/(main)/browse/page.tsx`
- Create: `src/components/search-bar.tsx`

- [ ] **Step 1: Create search bar component**

Create `src/components/search-bar.tsx`:

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set("q", query);
      } else {
        params.delete("q");
      }
      router.push(`/browse?${params.toString()}`);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <Input
      placeholder="Search series..."
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      className="max-w-md"
    />
  );
}
```

- [ ] **Step 2: Create browse page**

Create `src/app/(main)/browse/page.tsx`:

```tsx
import { db } from "@/db";
import { series, seriesGenres, genres } from "@/db/schema";
import { eq, ilike, and, inArray, desc } from "drizzle-orm";
import { SeriesCard } from "@/components/series-card";
import { SearchBar } from "@/components/search-bar";
import { TypeTabs } from "@/components/type-tabs";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";

interface Props {
  searchParams: Promise<{ q?: string; type?: string; genre?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const type = params.type;
  return {
    title: type
      ? `สปอยล์ ${type} ยอดนิยม`
      : "Browse — สำรวจสปอยล์ทุกเรื่อง",
    description: `สำรวจและค้นหาสปอยล์ anime manga manhwa manhua novel ตอนล่าสุด`,
    alternates: { canonical: "/browse" },
  };
}

export default async function BrowsePage({ searchParams }: Props) {
  const params = await searchParams;
  const { q, type, genre } = params;

  const conditions = [];
  if (q) conditions.push(ilike(series.title, `%${q}%`));
  if (type) conditions.push(eq(series.type, type as any));

  let seriesList = await db
    .select({
      id: series.id,
      slug: series.slug,
      title: series.title,
      type: series.type,
      status: series.status,
      coverImage: series.coverImage,
    })
    .from(series)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(series.createdAt))
    .limit(50);

  // Genre filter (post-query since it requires join)
  if (genre) {
    const genreSeriesIds = await db
      .select({ seriesId: seriesGenres.seriesId })
      .from(seriesGenres)
      .innerJoin(genres, eq(seriesGenres.genreId, genres.id))
      .where(eq(genres.slug, genre));

    const ids = new Set(genreSeriesIds.map((g) => g.seriesId));
    seriesList = seriesList.filter((s) => ids.has(s.id));
  }

  const allGenres = await db.select().from(genres).orderBy(genres.name);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Browse Series</h1>

      <div className="space-y-4">
        <Suspense fallback={null}>
          <SearchBar />
        </Suspense>
        <Suspense fallback={null}>
          <TypeTabs />
        </Suspense>
        <div className="flex flex-wrap gap-2">
          {allGenres.map((g) => (
            <Link key={g.id} href={`/browse?genre=${g.slug}`}>
              <Badge
                variant={genre === g.slug ? "default" : "outline"}
                className="cursor-pointer"
              >
                {g.name}
              </Badge>
            </Link>
          ))}
        </div>
      </div>

      {seriesList.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No series found.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {seriesList.map((s) => (
            <SeriesCard key={s.id} {...s} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add browse page with search, type filter, and genre filter"
```

---

## Task 15: User Profile Page

**Files:**
- Create: `src/app/(main)/profile/[id]/page.tsx`

- [ ] **Step 1: Create profile page**

Create `src/app/(main)/profile/[id]/page.tsx`:

```tsx
import { db } from "@/db";
import { users, spoilers, series, comments, votes } from "@/db/schema";
import { eq, desc, count, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpoilerCard } from "@/components/spoiler-card";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!user) return {};
  return {
    title: `${user.name ?? "User"} — Profile`,
    alternates: { canonical: `/profile/${id}` },
  };
}

export default async function ProfilePage({ params }: Props) {
  "use cache";

  const { id } = await params;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) notFound();

  const [spoilerCount] = await db
    .select({ count: count() })
    .from(spoilers)
    .where(eq(spoilers.authorId, id));

  const [totalUpvotes] = await db
    .select({ total: sql<number>`COALESCE(SUM(${spoilers.upvoteCount}), 0)` })
    .from(spoilers)
    .where(eq(spoilers.authorId, id));

  const userSpoilers = await db
    .select({
      id: spoilers.id,
      slug: spoilers.slug,
      title: spoilers.title,
      chapter: spoilers.chapter,
      upvoteCount: spoilers.upvoteCount,
      createdAt: spoilers.createdAt,
      seriesTitle: series.title,
      seriesType: series.type,
      authorName: sql<string>`${user.name}`.as("authorName"),
      commentCount: sql<number>`(
        SELECT COUNT(*) FROM comment WHERE comment."spoilerId" = spoiler.id
      )`.as("commentCount"),
    })
    .from(spoilers)
    .innerJoin(series, eq(spoilers.seriesId, series.id))
    .where(eq(spoilers.authorId, id))
    .orderBy(desc(spoilers.createdAt))
    .limit(20);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={user.image ?? undefined} />
          <AvatarFallback className="text-lg">
            {user.name?.charAt(0) ?? "U"}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{user.name ?? "Anonymous"}</h1>
          <p className="text-sm text-muted-foreground">
            Joined {new Date(user.createdAt).toLocaleDateString("th-TH")}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Spoilers Written
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{spoilerCount.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Upvotes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalUpvotes.total}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent Spoilers</h2>
        <div className="space-y-2">
          {userSpoilers.map((sp) => (
            <SpoilerCard
              key={sp.id}
              slug={sp.slug}
              title={sp.title}
              chapter={sp.chapter}
              seriesTitle={sp.seriesTitle}
              seriesType={sp.seriesType}
              authorName={sp.authorName}
              upvoteCount={sp.upvoteCount}
              commentCount={Number(sp.commentCount)}
              createdAt={sp.createdAt}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: add user profile page with stats and spoiler list"
```

---

## Task 16: Notifications

**Files:**
- Create: `src/app/(main)/notifications/page.tsx`
- Create: `src/components/notification-badge.tsx`
- Create: `src/actions/notification.ts`

- [ ] **Step 1: Create notification action**

Create `src/actions/notification.ts`:

```ts
"use server";

import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function markAllRead() {
  const session = await requireAuth();

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.userId, session.user.id),
        eq(notifications.isRead, false)
      )
    );

  revalidatePath("/notifications");
}
```

- [ ] **Step 2: Create notification badge for navbar**

Create `src/components/notification-badge.tsx`:

```tsx
import Link from "next/link";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { and, eq, count } from "drizzle-orm";

export async function NotificationBadge({ userId }: { userId: string }) {
  const [result] = await db
    .select({ count: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      )
    );

  const unread = result.count;

  return (
    <Link href="/notifications" className="relative">
      <span className="text-sm text-muted-foreground hover:text-foreground">
        Notifications
      </span>
      {unread > 0 && (
        <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
```

Add this to the navbar inside `UserMenu` or as a separate icon in `Navbar` when user is logged in.

- [ ] **Step 3: Create notifications page**

Create `src/app/(main)/notifications/page.tsx`:

```tsx
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { markAllRead } from "@/actions/notification";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function NotificationsPage() {
  const session = await requireAuth();

  const notifs = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <form action={markAllRead}>
          <Button variant="outline" size="sm" type="submit">
            Mark all read
          </Button>
        </form>
      </div>

      {notifs.length === 0 ? (
        <p className="text-muted-foreground">No notifications.</p>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => (
            <Link
              key={n.id}
              href={
                n.referenceType === "spoiler"
                  ? `/spoiler/${n.referenceId}`
                  : "#"
              }
              className={`block rounded-lg border p-3 transition-colors hover:bg-accent/50 ${
                n.isRead ? "opacity-60" : "border-primary/30 bg-primary/5"
              }`}
            >
              <p className="text-sm">{n.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(n.createdAt).toLocaleDateString("th-TH")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

Note: The notification link uses `referenceId` which is the spoiler ID, not the slug. A quick fix is to query the slug, or store the slug in the notification. For MVP, linking to `/spoiler/${referenceId}` won't work with slug-based routes. Either store the slug in the notification message or add a lookup. For simplicity, change the spoiler route to also accept ID lookups, or store slug in the notification table. Recommended: add a `referenceSlug` field or do a lookup in the page. Keep it simple for now — we can look up the slug:

Update the notification link rendering to do a lookup by querying spoiler slugs in the page query. Or more practically, store spoiler slug in `referenceId` instead of ID when creating notifications. Update `src/actions/spoiler.ts` and `src/actions/vote.ts` to use `newSpoiler.slug` as `referenceId`.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add notifications page with mark-all-read and notification badge"
```

---

## Task 17: Reports & Admin Moderation

**Files:**
- Create: `src/actions/report.ts`
- Create: `src/app/admin/reports/page.tsx`
- Create: `src/components/report-button.tsx`

- [ ] **Step 1: Create report action**

Create `src/actions/report.ts`:

```ts
"use server";

import { db } from "@/db";
import { reports, spoilers, comments } from "@/db/schema";
import { requireAuth, requireAdmin } from "@/lib/auth-utils";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function reportContent(
  targetType: "spoiler" | "comment",
  targetId: string,
  formData: FormData
) {
  const session = await requireAuth();
  const reason = formData.get("reason") as string;

  await db.insert(reports).values({
    reporterId: session.user.id,
    targetType,
    targetId,
    reason,
  });
}

export async function resolveReport(reportId: string) {
  await requireAdmin();
  await db
    .update(reports)
    .set({ status: "resolved" })
    .where(eq(reports.id, reportId));
  revalidatePath("/admin/reports");
}

export async function dismissReport(reportId: string) {
  await requireAdmin();
  await db
    .update(reports)
    .set({ status: "dismissed" })
    .where(eq(reports.id, reportId));
  revalidatePath("/admin/reports");
}
```

- [ ] **Step 2: Create admin reports page**

Create `src/app/admin/reports/page.tsx`:

```tsx
import { requireAdmin } from "@/lib/auth-utils";
import { db } from "@/db";
import { reports, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { resolveReport, dismissReport } from "@/actions/report";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminReportsPage() {
  await requireAdmin();

  const allReports = await db
    .select({
      id: reports.id,
      targetType: reports.targetType,
      targetId: reports.targetId,
      reason: reports.reason,
      status: reports.status,
      createdAt: reports.createdAt,
      reporterName: users.name,
    })
    .from(reports)
    .innerJoin(users, eq(reports.reporterId, users.id))
    .orderBy(desc(reports.createdAt));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reports</h1>
      {allReports.map((r) => (
        <Card key={r.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{r.targetType}</Badge>
                <Badge
                  variant={r.status === "pending" ? "destructive" : "secondary"}
                >
                  {r.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm">{r.reason}</p>
              <p className="text-xs text-muted-foreground">
                by {r.reporterName} —{" "}
                {new Date(r.createdAt).toLocaleDateString("th-TH")}
              </p>
            </div>
            {r.status === "pending" && (
              <div className="flex gap-2">
                <form action={resolveReport.bind(null, r.id)}>
                  <Button size="sm" type="submit">
                    Resolve
                  </Button>
                </form>
                <form action={dismissReport.bind(null, r.id)}>
                  <Button size="sm" variant="outline" type="submit">
                    Dismiss
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add report system and admin reports page"
```

---

## Task 18: SEO — Sitemap, Robots, JSON-LD, OG Images

**Files:**
- Create: `src/app/sitemap.ts`
- Create: `src/app/robots.ts`
- Create: `src/app/api/og/route.tsx`
- Create: `src/components/breadcrumbs.tsx`
- Create: `src/components/json-ld.tsx`

- [ ] **Step 1: Create sitemap**

Create `src/app/sitemap.ts`:

```ts
import { db } from "@/db";
import { series, spoilers } from "@/db/schema";
import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://spoilerhub.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const allSeries = await db
    .select({ slug: series.slug, createdAt: series.createdAt })
    .from(series);

  const allSpoilers = await db
    .select({ slug: spoilers.slug, createdAt: spoilers.createdAt })
    .from(spoilers);

  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "hourly", priority: 1 },
    { url: `${BASE_URL}/browse`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    ...allSeries.map((s) => ({
      url: `${BASE_URL}/series/${s.slug}`,
      lastModified: s.createdAt,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...allSpoilers.map((s) => ({
      url: `${BASE_URL}/spoiler/${s.slug}`,
      lastModified: s.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
```

- [ ] **Step 2: Create robots.txt**

Create `src/app/robots.ts`:

```ts
import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://spoilerhub.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/bookmarks", "/notifications"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
```

- [ ] **Step 3: Create dynamic OG image route**

Create `src/app/api/og/route.tsx`:

```tsx
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get("title") ?? "SpoilerHub";
  const chapter = searchParams.get("chapter");
  const type = searchParams.get("type");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {type && (
          <div
            style={{
              fontSize: 24,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {type}
          </div>
        )}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#f8fafc",
            textAlign: "center",
            maxWidth: "80%",
            marginTop: 12,
          }}
        >
          {title}
        </div>
        {chapter && (
          <div
            style={{
              fontSize: 28,
              color: "#60a5fa",
              marginTop: 12,
            }}
          >
            Chapter {chapter}
          </div>
        )}
        <div
          style={{
            fontSize: 20,
            color: "#475569",
            marginTop: 32,
          }}
        >
          SpoilerHub
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

- [ ] **Step 4: Create breadcrumbs component**

Create `src/components/breadcrumbs.tsx`:

```tsx
import Link from "next/link";

interface Crumb {
  label: string;
  href: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: `${process.env.NEXT_PUBLIC_APP_URL}${item.href}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, i) => (
          <span key={item.href} className="flex items-center gap-1">
            {i > 0 && <span>/</span>}
            {i === items.length - 1 ? (
              <span className="text-foreground">{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:text-foreground">
                {item.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}
```

- [ ] **Step 5: Create JSON-LD helper**

Create `src/components/json-ld.tsx`:

```tsx
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

Add JSON-LD to the homepage layout:

```tsx
// In src/app/(main)/page.tsx, add at top of JSX:
<JsonLd
  data={{
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SpoilerHub",
    url: process.env.NEXT_PUBLIC_APP_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${process.env.NEXT_PUBLIC_APP_URL}/browse?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }}
/>
```

Add `<Breadcrumbs>` to series detail and spoiler view pages with appropriate crumb arrays.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add SEO — sitemap, robots, dynamic OG images, breadcrumbs, JSON-LD"
```

- [ ] **Step 7: Final verification**

```bash
bun run build
```

Expected: Build succeeds with no errors. All pages generate correctly. ISR pages show "Static" or "ISR" in build output.

- [ ] **Step 8: Final commit**

```bash
git add .
git commit -m "chore: verify build succeeds"
```
