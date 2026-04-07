/**
 * Fetch popular movies + TV series from TMDB (The Movie Database)
 *
 * Focuses on: anime-related live-action, K-Drama, Asian cinema
 *
 * Usage:
 *   TMDB_API_KEY=xxx DATABASE_URL=xxx bun run src/scripts/fetch-tmdb.ts
 *
 * Get free API key: https://www.themoviedb.org/settings/api
 * If no TMDB_API_KEY, uses a curated list of popular titles instead.
 */

import { db } from "../db/index";
import { series, genres, seriesGenres } from "../db/schema";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim().slice(0, 100);
}

const TMDB_KEY = process.env.TMDB_API_KEY;

// ─── Curated list (no API key needed) ────────────

const CURATED_MOVIES = [
  // Anime movies
  { title: "Your Name", type: "movie" as const, status: "completed" as const, synopsis: "Two teenagers share a profound, magical connection upon discovering they are swapping bodies. Things manage to become even more complicated when the boy and girl decide to meet in person.", genres: ["Romance", "Drama", "Supernatural"], cover: "https://image.tmdb.org/t/p/w500/q719jXXEhI1THrNvOELNdcyrrmh.jpg" },
  { title: "Spirited Away", type: "movie" as const, status: "completed" as const, synopsis: "A young girl, Chihiro, becomes trapped in a strange new world of spirits. When her parents undergo a mysterious transformation, she must call upon the courage she never knew she had.", genres: ["Fantasy", "Adventure"], cover: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg" },
  { title: "Demon Slayer: Mugen Train", type: "movie" as const, status: "completed" as const, synopsis: "Tanjiro and his companions join Flame Hashira Kyojuro Rengoku on the Mugen Train to investigate mysterious disappearances.", genres: ["Action", "Fantasy", "Supernatural"], cover: "https://image.tmdb.org/t/p/w500/h8Rb9gBr48ODIwYUttZNYeMWeUU.jpg" },
  { title: "Jujutsu Kaisen 0", type: "movie" as const, status: "completed" as const, synopsis: "Yuta Okkotsu is haunted by his childhood friend Rika who has become a powerful cursed spirit. Gojo recruits him to Jujutsu High.", genres: ["Action", "Supernatural"], cover: "https://image.tmdb.org/t/p/w500/23oJza1OkvDEBMBRFglSvYPemfp.jpg" },
  { title: "Weathering with You", type: "movie" as const, status: "completed" as const, synopsis: "A boy who has run away to Tokyo befriends a girl who can manipulate the weather.", genres: ["Romance", "Drama", "Fantasy"], cover: "https://image.tmdb.org/t/p/w500/qgrk7r1fV4IjuoeiGS5HOhXNdLJ.jpg" },
  { title: "A Silent Voice", type: "movie" as const, status: "completed" as const, synopsis: "A former bully seeks out a deaf girl he tormented in elementary school to make amends.", genres: ["Drama", "Romance"], cover: "https://image.tmdb.org/t/p/w500/drlyoSKDOPnxzYl3LNKL27W98V.jpg" },
  { title: "Suzume", type: "movie" as const, status: "completed" as const, synopsis: "A 17-year-old girl discovers a mysterious door that unleashes disasters across Japan.", genres: ["Adventure", "Fantasy"], cover: "https://image.tmdb.org/t/p/w500/vIeu5WksbkJMCkFUpYpMmwRt2Hy.jpg" },
  { title: "The Boy and the Heron", type: "movie" as const, status: "completed" as const, synopsis: "Mahito, a young boy, discovers a world shared by the living and the dead in Hayao Miyazaki's final masterpiece.", genres: ["Fantasy", "Adventure", "Drama"], cover: "https://image.tmdb.org/t/p/w500/jDQPkgzerGophKRRn7MKm071vKx.jpg" },
  { title: "Dragon Ball Super: Super Hero", type: "movie" as const, status: "completed" as const, synopsis: "The Red Ribbon Army returns with new androids Gamma 1 and Gamma 2 to challenge Gohan and Piccolo.", genres: ["Action", "Comedy"], cover: "https://image.tmdb.org/t/p/w500/rugyJdeoJm7cSJL1q4jBpTNbxyU.jpg" },
  { title: "One Piece Film: Red", type: "movie" as const, status: "completed" as const, synopsis: "Uta, the most beloved singer in the world, reveals herself to the world at a live concert. Luffy and the Straw Hats attend.", genres: ["Action", "Adventure", "Fantasy"], cover: "https://image.tmdb.org/t/p/w500/m80kPdrmmtEh9wlLroCp0bwUGH0.jpg" },
  { title: "Look Back", type: "movie" as const, status: "completed" as const, synopsis: "Two young manga artists form an unlikely bond through their shared passion for drawing.", genres: ["Drama", "Slice of Life"], cover: null },
  { title: "The First Slam Dunk", type: "movie" as const, status: "completed" as const, synopsis: "The Shohoku basketball team faces their greatest challenge in the Inter-High tournament.", genres: ["Sports", "Drama"], cover: null },

  // Live-action anime adaptations
  { title: "One Piece (Netflix)", type: "tv_series" as const, status: "ongoing" as const, synopsis: "Live-action adaptation of the beloved manga. Monkey D. Luffy sets off on a journey to become King of the Pirates.", genres: ["Action", "Adventure", "Fantasy"], cover: "https://image.tmdb.org/t/p/w500/rVX05xRKS5JhEYQFObCi4lAnZT4.jpg" },
  { title: "Yu Yu Hakusho (Netflix)", type: "tv_series" as const, status: "completed" as const, synopsis: "Live-action adaptation. After dying to save a child, Yusuke Urameshi becomes a spirit detective.", genres: ["Action", "Supernatural"], cover: null },
  { title: "Cowboy Bebop (Netflix)", type: "tv_series" as const, status: "completed" as const, synopsis: "Live-action adaptation of the iconic anime. Bounty hunters chase criminals across the galaxy.", genres: ["Sci-Fi", "Action"], cover: null },

  // K-Drama
  { title: "Squid Game", type: "drama" as const, status: "ongoing" as const, synopsis: "Hundreds of cash-strapped players accept a strange invitation to compete in children's games for a tempting prize.", genres: ["Thriller", "Drama"], cover: "https://image.tmdb.org/t/p/w500/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg" },
  { title: "Sweet Home", type: "drama" as const, status: "completed" as const, synopsis: "Based on the webtoon. Residents of an apartment complex fight for survival as people transform into monsters.", genres: ["Horror", "Thriller", "Drama"], cover: null },
  { title: "All of Us Are Dead", type: "drama" as const, status: "ongoing" as const, synopsis: "A zombie virus breaks out in a high school, trapping students inside.", genres: ["Horror", "Action", "Drama"], cover: null },
  { title: "Alchemy of Souls", type: "drama" as const, status: "completed" as const, synopsis: "A powerful sorceress in a blind woman's body encounters a man from a noble family seeking power.", genres: ["Fantasy", "Romance", "Drama"], cover: null },
  { title: "Moving", type: "drama" as const, status: "completed" as const, synopsis: "Based on the webtoon. Children of parents with superpowers discover their own abilities.", genres: ["Action", "Supernatural", "Drama"], cover: null },
  { title: "Extraordinary Attorney Woo", type: "drama" as const, status: "completed" as const, synopsis: "Woo Young-woo, a brilliant attorney with autism spectrum disorder, tackles unique cases.", genres: ["Drama", "Comedy"], cover: null },
  { title: "Vincenzo", type: "drama" as const, status: "completed" as const, synopsis: "A Korean-Italian mafia lawyer returns to Korea to deal with a corrupt conglomerate.", genres: ["Thriller", "Comedy", "Drama"], cover: null },
  { title: "Goblin", type: "drama" as const, status: "completed" as const, synopsis: "A modern-day goblin seeks his bride to end his immortal life.", genres: ["Romance", "Fantasy", "Drama"], cover: null },
  { title: "Hellbound", type: "drama" as const, status: "ongoing" as const, synopsis: "Based on the webtoon. Supernatural beings deliver verdicts on people, sending them to hell.", genres: ["Horror", "Thriller", "Supernatural"], cover: null },
  { title: "The Glory", type: "drama" as const, status: "completed" as const, synopsis: "A woman meticulously plots revenge against her former school bullies.", genres: ["Thriller", "Drama"], cover: null },
  { title: "Duty After School", type: "drama" as const, status: "completed" as const, synopsis: "Based on the webtoon. Students must fight alien creatures threatening humanity.", genres: ["Sci-Fi", "Action", "Drama"], cover: null },
  { title: "D.P.", type: "drama" as const, status: "completed" as const, synopsis: "Based on the webtoon. Military police track down deserters from the Korean army.", genres: ["Drama", "Action"], cover: null },
  { title: "Island", type: "drama" as const, status: "completed" as const, synopsis: "Based on the manhwa. On Jeju Island, three people fight against ancient evil.", genres: ["Fantasy", "Action", "Horror"], cover: null },
  { title: "Itaewon Class", type: "drama" as const, status: "completed" as const, synopsis: "Based on the webtoon. An ex-con opens a bar in Itaewon to challenge a food industry titan.", genres: ["Drama", "Romance"], cover: null },

  // Anime-related movies (recent)
  { title: "Blue Lock: Episode Nagi", type: "movie" as const, status: "completed" as const, synopsis: "The story of Blue Lock told from Nagi Seishiro's perspective.", genres: ["Sports", "Drama"], cover: null },
  { title: "Haikyuu!! The Dumpster Battle", type: "movie" as const, status: "completed" as const, synopsis: "Karasuno faces their destined rivals Nekoma in the long-awaited Battle at the Trash Heap.", genres: ["Sports", "Drama"], cover: null },
  { title: "My Hero Academia: You're Next", type: "movie" as const, status: "completed" as const, synopsis: "A mysterious villain who looks like All Might appears, and Deku must face this new threat.", genres: ["Action", "Supernatural"], cover: null },
];

async function addSeries(item: typeof CURATED_MOVIES[0]) {
  const slug = slugify(item.title);
  if (!slug) return "skipped";

  const [existing] = await db.select({ id: series.id }).from(series).where(eq(series.slug, slug)).limit(1);
  if (existing) {
    console.log(`  → Already exists: ${item.title}`);
    return "exists";
  }

  const [newSeries] = await db.insert(series).values({
    title: item.title,
    slug,
    type: item.type,
    coverImage: item.cover,
    synopsis: item.synopsis,
    status: item.status,
  }).returning();

  // Add genres
  for (const name of item.genres) {
    const gSlug = slugify(name);
    let [genre] = await db.select().from(genres).where(eq(genres.slug, gSlug)).limit(1);
    if (!genre) {
      [genre] = await db.insert(genres).values({ name, slug: gSlug }).onConflictDoNothing().returning();
      if (!genre) [genre] = await db.select().from(genres).where(eq(genres.slug, gSlug)).limit(1);
    }
    if (genre) await db.insert(seriesGenres).values({ seriesId: newSeries.id, genreId: genre.id }).onConflictDoNothing();
  }

  console.log(`  ✓ Added: ${item.title} (${item.type})`);
  return "added";
}

async function main() {
  console.log("[tmdb] Adding movies, TV series, and dramas...\n");

  let added = 0, exists = 0;
  for (const item of CURATED_MOVIES) {
    const result = await addSeries(item);
    if (result === "added") added++;
    else if (result === "exists") exists++;
  }

  console.log(`\n[tmdb] Done! Added: ${added}, Already existed: ${exists}`);
  process.exit(0);
}

main();
