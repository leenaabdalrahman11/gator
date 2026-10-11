import { db } from "..";
import { feeds } from "../schema";
import { users } from "../schema";
import { eq, sql } from "drizzle-orm";
export async function createFeed(
  name: string,
  url: string,
  userId: string
) {
  const [feed] = await db.insert(feeds)
    .values({ name, url, userId })
    .returning();

  return feed;
}
export async function getFeeds() {
  return await db
    .select({
      name: feeds.name,
      url: feeds.url,
      userName: users.name
    })
    .from(feeds)
    .innerJoin(users, eq(feeds.userId, users.id));
}
export async function getFeedByURL(url: string) {
  const [feed] = await db
    .select()
    .from(feeds)
    .where(eq(feeds.url, url));

  return feed;
}
export async function markFeedFetched(feedId: string) {
  await db.update(feeds)
    .set({
      lastFetchedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(feeds.id, feedId));
}
export async function getNextFeedToFetch() {
  const [feed] = await db.select()
    .from(feeds)
    .orderBy(sql`${feeds.lastFetchedAt} ASC NULLS FIRST`)
    .limit(1);

  return feed;
}