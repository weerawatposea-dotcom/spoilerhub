/**
 * Generate realistic Thai comments for spoilers in SpoilerHub DB
 *
 * Usage:
 *   bun run src/scripts/generate-comments.ts                    # local DB
 *   DATABASE_URL=xxx bun run src/scripts/generate-comments.ts   # production DB
 *
 * Flow:
 *   1. Ensure 10 auto-users exist (auto-user-0 through auto-user-9)
 *   2. Find all spoilers with < 2 comments
 *   3. Generate 2-5 random Thai comments for each spoiler
 *   4. Batch insert comments using random users
 */

import { db } from "../db/index";
import { comments, spoilers, users } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// Thai comment templates
const COMMENT_TEMPLATES_TH = [
  // Positive reactions
  "ตอนนี้มันส์มากเลย! รอตอนต่อไปไม่ไหวแล้ว 🔥",
  "เนื้อเรื่องพัฒนาขึ้นเรื่อยๆ ชอบมาก",
  "อ่านแล้วขนลุกเลย ดีมากจริงๆ",
  "ยอดเยี่ยมมาก! ผู้แต่งเก่งจริงๆ",
  "ตอนนี้คือไฮไลท์ของอาร์คเลย 💯",
  // Analytical
  "สังเกตไหมว่าฉากนี้ foreshadow มาตั้งแต่ตอนแรกๆ เลย",
  "ถ้าวิเคราะห์จาก pattern ของผู้แต่ง ตอนต่อไปน่าจะมี plot twist แน่นอน",
  "Power scaling ตอนนี้เริ่มพังแล้วนะ แต่ยังสนุกอยู่",
  "Character development ของตัวละครนี้ทำได้ดีมากเลย",
  "World building ของเรื่องนี้ละเอียดมากจริงๆ",
  // Emotional
  "ร้องไห้เลย ตอนนี้ทำได้ดีมาก 😭",
  "ใจสลายเลย ทำไมต้องเป็นตัวละครนี้ด้วย 💔",
  "ตอนนี้ทำเอาน้ำตาไหลเลย อารมณ์ดีมาก",
  "เศร้ามาก แต่เนื้อเรื่องสมจริงดี",
  "สะเทือนใจมากเลยตอนนี้",
  // Funny/Casual
  "555 ตอนนี้ฮาสุดๆ",
  "แม่งโคตรเท่เลย!! 🤯",
  "OP มากพี่ OP เกิน!",
  "ไม่เชื่อว่าจะเป็นแบบนี้ จอแตกเลย",
  "กรี๊ดดดด!! ในที่สุดก็มาถึงตอนนี้ 🎉",
  // Questions/Discussion
  "มีใครสังเกตรายละเอียดในหน้า xx ไหม?",
  "ทฤษฎี: ตัวละครนี้น่าจะเป็นตัวร้ายตัวจริง",
  "คิดว่าตอนต่อไปจะเป็นยังไง? แชร์ทฤษฎีกันหน่อย",
  "ใครที่ยังไม่ได้อ่านรีบไปอ่านเลย!",
  "รอไม่ไหวแล้ว อยากรู้ต่อ!! 😤",
  // Ratings
  "ให้ 10/10 เลยตอนนี้",
  "ตอนนี้ 9/10 ขาดนิดเดียว",
  "เรื่องนี้ underrated มากเลยนะ ควรมีคนอ่านเยอะกว่านี้",
  "Top tier เลยตอนนี้ ไม่ผิดหวัง",
  "ดีขึ้นเรื่อยๆ จากตอนแรกที่ไม่ค่อยชอบ ตอนนี้ติดงอมแงมเลย",
];

async function ensureAutoUsers() {
  console.log("[setup] Ensuring 10 auto-users exist...");

  const autoUserIds = [];
  for (let i = 0; i < 10; i++) {
    const userId = `auto-user-${i}`;
    autoUserIds.push(userId);

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingUser) {
      await db.insert(users).values({
        id: userId,
        name: `AutoUser${i}`,
        email: `auto-user-${i}@spoilerhub.local`,
        role: "user",
      });
      console.log(`  ✓ Created ${userId}`);
    }
  }

  return autoUserIds;
}

function getRandomComment(): string {
  const idx = Math.floor(Math.random() * COMMENT_TEMPLATES_TH.length);
  return COMMENT_TEMPLATES_TH[idx];
}

function getRandomCommentCount(): number {
  // Pick 2-5 comments
  return Math.floor(Math.random() * 4) + 2;
}

function getRandomUser(autoUserIds: string[]): string {
  const idx = Math.floor(Math.random() * autoUserIds.length);
  return autoUserIds[idx];
}

function getRandomPastDate(): Date {
  // Random time within last 7 days
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 7);
  const hoursAgo = Math.floor(Math.random() * 24);
  const minutesAgo = Math.floor(Math.random() * 60);

  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(date.getHours() - hoursAgo);
  date.setMinutes(date.getMinutes() - minutesAgo);

  return date;
}

async function main() {
  try {
    console.log("Starting comment generation...\n");

    // Step 1: Ensure auto-users exist
    const autoUserIds = await ensureAutoUsers();
    console.log(`\n[setup] ${autoUserIds.length} auto-users ready\n`);

    // Step 2: Find spoilers with < 2 comments
    console.log("[query] Finding spoilers with < 2 comments...");
    const spoilersWithCommentCounts = await db
      .select({
        id: spoilers.id,
        title: spoilers.title,
        commentCount: sql<number>`COUNT(${comments.id})`.as("comment_count"),
      })
      .from(spoilers)
      .leftJoin(comments, eq(comments.spoilerId, spoilers.id))
      .groupBy(spoilers.id);

    const targetSpoilers = spoilersWithCommentCounts.filter(
      (s) => (s.commentCount ?? 0) < 2
    );

    console.log(
      `Found ${targetSpoilers.length} spoilers with < 2 comments\n`
    );

    // Step 3: Generate and batch insert comments
    let totalCommentsCreated = 0;
    const batchSize = 50;
    let currentBatch: Array<{
      id: string;
      spoilerId: string;
      authorId: string;
      content: string;
      createdAt: Date;
    }> = [];

    for (let i = 0; i < targetSpoilers.length; i++) {
      const spoiler = targetSpoilers[i];
      const commentCount = getRandomCommentCount();

      console.log(
        `[${i + 1}/${targetSpoilers.length}] ${spoiler.title} → adding ${commentCount} comments`
      );

      for (let j = 0; j < commentCount; j++) {
        const newComment = {
          id: createId(),
          spoilerId: spoiler.id,
          authorId: getRandomUser(autoUserIds),
          content: getRandomComment(),
          createdAt: getRandomPastDate(),
        };

        currentBatch.push(newComment);

        // Insert batch when reaching batch size
        if (currentBatch.length >= batchSize) {
          await db.insert(comments).values(currentBatch);
          totalCommentsCreated += currentBatch.length;
          console.log(
            `  ✓ Inserted batch of ${currentBatch.length} comments`
          );
          currentBatch = [];
        }
      }
    }

    // Insert remaining comments
    if (currentBatch.length > 0) {
      await db.insert(comments).values(currentBatch);
      totalCommentsCreated += currentBatch.length;
      console.log(
        `  ✓ Inserted final batch of ${currentBatch.length} comments`
      );
    }

    console.log(`\n✅ Complete! Generated ${totalCommentsCreated} comments`);
    console.log(`   Across ${targetSpoilers.length} spoilers`);
    console.log(`   Using ${autoUserIds.length} auto-users`);

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
