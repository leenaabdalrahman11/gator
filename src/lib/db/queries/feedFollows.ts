import { db } from "..";
import { feedFollows, feeds, users } from "../schema";
import { and, eq } from "drizzle-orm";
import { getFeedByURL } from "./feeds";
export async function createFeedFollow(
  userId: string,
  feedId: string
) {
  const [newFollow] = await db.insert(feedFollows)
    .values({ userId, feedId })
    .returning();

  const [result] = await db.select({
    id: feedFollows.id,
    createdAt: feedFollows.createdAt,
    updatedAt: feedFollows.updatedAt,
    userId: feedFollows.userId,
    feedId: feedFollows.feedId,
    feedName: feeds.name,
    userName: users.name
  })
  .from(feedFollows)
  .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
  .innerJoin(users, eq(feedFollows.userId, users.id))
  .where(eq(feedFollows.id, newFollow.id));

  return result;
}
export async function getFeedFollowsForUser(userId: string) {
  return await db.select({
    feedName: feeds.name,
    userName: users.name
  })
  .from(feedFollows)
  .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
  .innerJoin(users, eq(feedFollows.userId, users.id))
  .where(eq(feedFollows.userId, userId));
}
export async function deleteFeedFollow(
  userId: string,
  url: string
) {
  const feed = await getFeedByURL(url);

  if (!feed) {
    throw new Error("Feed not found");
  }

  const [deleted] = await db.delete(feedFollows)
    .where(
      and(
        eq(feedFollows.userId, userId),
        eq(feedFollows.feedId, feed.id)
      )
    )
    .returning();

  if (!deleted) {
    throw new Error("You are not following this feed");
  }
}