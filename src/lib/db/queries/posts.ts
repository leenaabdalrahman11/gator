import { db } from "..";
import { posts, feeds, feedFollows } from "../schema";
import { eq, desc, sql } from "drizzle-orm";

export async function createPost(
  title: string,
  url: string,
  description: string | null,
  publishedAt: Date | null,
  feedId: string
) {
  const [post] = await db.insert(posts)
    .values({
      title,
      url,
      description,
      publishedAt,
      feedId
    })
    .onConflictDoNothing({ target: posts.url })
    .returning();

  return post;
}
export async function getPostsForUser(
  userId: string,
  limit: number
) {
  return await db.select({
    title: posts.title,
    url: posts.url,
    description: posts.description,
    publishedAt: posts.publishedAt,
    feedName: feeds.name
  })
  .from(posts)
  .innerJoin(feeds, eq(posts.feedId, feeds.id))
  .innerJoin(feedFollows, eq(feedFollows.feedId, feeds.id))
  .where(eq(feedFollows.userId, userId))
  .orderBy(
    sql`${posts.publishedAt} DESC NULLS LAST`,
    desc(posts.createdAt)
  )
  .limit(limit);
}