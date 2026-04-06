import { db } from "./index";
import { genres, series, seriesGenres } from "./schema";

const GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Isekai",
  "Martial Arts", "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Sports",
  "Supernatural", "Thriller",
];

const SAMPLE_SERIES = [
  {
    title: "Solo Leveling",
    type: "manhwa" as const,
    status: "completed" as const,
    synopsis: "Sung Jinwoo, the weakest hunter, gains a mysterious power that lets him level up without limits.",
    coverImage: "https://cdn.myanimelist.net/images/manga/3/222295l.jpg",
    genres: ["Action", "Adventure", "Fantasy"],
  },
  {
    title: "One Piece",
    type: "manga" as const,
    status: "ongoing" as const,
    synopsis: "Monkey D. Luffy and his crew search for the ultimate treasure, the One Piece.",
    coverImage: "https://cdn.myanimelist.net/images/manga/2/253146l.jpg",
    genres: ["Action", "Adventure", "Comedy"],
  },
  {
    title: "Jujutsu Kaisen",
    type: "manga" as const,
    status: "completed" as const,
    synopsis: "Yuji Itadori joins a secret organization of sorcerers to fight powerful Curses.",
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
    .values(GENRES.map((name) => ({ name, slug: slugify(name) })))
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
        .map((genreId) => ({ seriesId: newSeries.id, genreId: genreId! }));

      if (genreLinks.length > 0) {
        await db.insert(seriesGenres).values(genreLinks).onConflictDoNothing();
      }
    }
  }

  console.log("Seed complete!");
  process.exit(0);
}

seed();
