/**
 * Add trending manhwa from April 2026 research
 */
import { db } from "../db/index";
import { series, genres, seriesGenres } from "../db/schema";
import { eq } from "drizzle-orm";
import { mapToStatus, cleanDescription, type AniListMedia } from "../lib/anilist";

const ANILIST_API = "https://graphql.anilist.co";
const QUERY = `query ($search: String) { Media(search: $search, type: MANGA, isAdult: false) { id title { romaji english } coverImage { extraLarge large } description(asHtml: false) chapters status genres format countryOfOrigin } }`;

function slugify(t: string) { return t.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim().slice(0, 100); }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function add(search: string) {
  const res = await fetch(ANILIST_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: QUERY, variables: { search } }) });
  if (!res.ok) { console.log(`  ✗ API error: ${search}`); return; }
  const d = await res.json();
  const m = d?.data?.Media;
  if (!m) { console.log(`  ✗ Not found: ${search}`); return; }
  const title = m.title.english || m.title.romaji;
  const slug = slugify(title);
  const [existing] = await db.select({ id: series.id }).from(series).where(eq(series.slug, slug)).limit(1);
  if (existing) { console.log(`  → Exists: ${title}`); return; }
  if (m.status === "FINISHED") { console.log(`  → Completed (skip): ${title}`); return; }
  const type = m.countryOfOrigin === "KR" ? "manhwa" as const : m.countryOfOrigin === "CN" ? "manhua" as const : m.format === "NOVEL" ? "novel" as const : "manga" as const;
  const [ns] = await db.insert(series).values({ title, slug, type, coverImage: m.coverImage.extraLarge || m.coverImage.large, synopsis: cleanDescription(m.description), status: mapToStatus(m.status) }).returning();
  for (const name of m.genres) {
    const gs = slugify(name); if (!gs) continue;
    let [g] = await db.select().from(genres).where(eq(genres.slug, gs)).limit(1);
    if (!g) { [g] = await db.insert(genres).values({ name, slug: gs }).onConflictDoNothing().returning(); if (!g) [g] = await db.select().from(genres).where(eq(genres.slug, gs)).limit(1); }
    if (g) await db.insert(seriesGenres).values({ seriesId: ns.id, genreId: g.id }).onConflictDoNothing();
  }
  console.log(`  ✓ Added: ${title} (${type})`);
  await sleep(1200);
}

const MANHWA = [
  "Surviving Romance", "Be a Bad Boy", "Our Walk Home", "Love Me Knot",
  "The Dawn to Come", "I Was the Final Boss", "Only Hope",
  "They All Live in the Little Lady's Garden", "I Will Become the Villain's Poison Taster",
  "The Mafia Nanny", "Operation True Love", "Down to Earth",
  "Teenage Mercenary", "The Boxer", "Doctor's Rebirth",
  "Dark Moon: The Blood Altar", "Terror Man",
  "A Returner's Magic Should Be Special", "Doom Breaker",
];

async function main() {
  console.log(`[add-manhwa] Adding ${MANHWA.length} trending manhwa...\n`);
  for (const s of MANHWA) await add(s);
  console.log("\nDone!");
  process.exit(0);
}
main();
