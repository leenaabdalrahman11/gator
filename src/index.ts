import { setUser, readConfig } from "./config";
import { fetchFeed } from "./rss";
import type { Feed, User } from "./lib/db/schema";
import { createFeed, getFeeds } from "./lib/db/queries/feeds";
import {
  createUser,
  getUserByName,
  deleteAllUsers,
  getUsers
} from "./lib/db/queries/users";
import { getFeedByURL } from "./lib/db/queries/feeds";
import {
  getNextFeedToFetch,
  markFeedFetched
} from "./lib/db/queries/feeds";
import {
  createFeedFollow,
  getFeedFollowsForUser
} from "./lib/db/queries/feedFollows";
import process from "process";
import { deleteFeedFollow } from "./lib/db/queries/feedFollows";
import { createPost, getPostsForUser } from "./lib/db/queries/posts";

type CommandHandler = (
  cmdName: string,
  ...args: string[]
) => Promise<void>;
type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;
type CommandsRegistry = Record<string, CommandHandler>;

async function handlerRegister(
  cmdName: string,
  ...args: string[]
): Promise<void> {

  if (args.length === 0) {
    throw new Error("Username is required");
  }

  const username = args[0];

  const existingUser = await getUserByName(username);

  if (existingUser) {
    throw new Error("User already exists");
  }

  const user = await createUser(username);

  setUser(username);

  console.log(`User ${username} created`);
  console.log(user);
}


async function handlerLogin(
  cmdName: string,
  ...args: string[]
): Promise<void> {

  if (args.length === 0) {
    throw new Error("Username is required");
  }

  const username = args[0];

  const user = await getUserByName(username);

  if (!user) {
    throw new Error("User does not exist");
  }

  setUser(username);

  console.log(`User set to ${username}`);
}
async function scrapeFeeds(): Promise<void> {
  const feed = await getNextFeedToFetch();

  if (!feed) {
    console.log("No feeds found");
    return;
  }

  console.log(`Fetching feed: ${feed.name}`);

  const rss = await fetchFeed(feed.url);

  let savedCount = 0;

  for (const item of rss.channel.item) {
    const date = new Date(item.pubDate);

    const publishedAt = Number.isNaN(date.getTime())
      ? null
      : date;

    const post = await createPost(
      item.title,
      item.link,
      item.description,
      publishedAt,
      feed.id
    );

    if (post) {
      savedCount++;
    }
  }

  await markFeedFetched(feed.id);

  console.log(`Saved ${savedCount} new posts`);
}
async function handlerBrowse(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {

  const limit = args.length === 0 ? 2 : Number(args[0]);

  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error("Limit must be a positive integer");
  }

  const posts = await getPostsForUser(user.id, limit);

  for (const post of posts) {
    console.log(`Title: ${post.title}`);
    console.log(`URL: ${post.url}`);
    console.log(`Feed: ${post.feedName}`);
    console.log(`Description: ${post.description ?? ""}`);
    console.log(`Published: ${post.publishedAt ?? "Unknown"}`);
    console.log("--------------------");
  }
}
function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);

  if (!match) {
    throw new Error("Invalid duration");
  }

  const number = Number(match[1]);
  const unit = match[2];

  if (number <= 0) {
    throw new Error("Duration must be greater than zero");
  }

  if (unit === "ms") return number;
  if (unit === "s") return number * 1000;
  if (unit === "m") return number * 60 * 1000;
  if (unit === "h") return number * 60 * 60 * 1000;

  throw new Error("Invalid unit");
}
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h${minutes % 60}m${seconds % 60}s`;
  }

  if (minutes > 0) {
    return `${minutes}m${seconds % 60}s`;
  }

  return `${seconds}s`;
}
async function handlerAgg(
  cmdName: string,
  ...args: string[]
): Promise<void> {

  if (args.length !== 1) {
    throw new Error("Duration is required");
  }

  const timeBetweenRequests = parseDuration(args[0]);

  console.log(
    `Collecting feeds every ${formatDuration(timeBetweenRequests)}`
  );

  let isScraping = false;

  async function runScrape() {
    if (isScraping) return;

    isScraping = true;

    try {
      await scrapeFeeds();
    } catch (error) {
      console.error(error);
    } finally {
      isScraping = false;
    }
  }

  void runScrape();

  const interval = setInterval(() => {
    void runScrape();
  }, timeBetweenRequests);

  await new Promise<void>((resolve) => {
    process.once("SIGINT", () => {
      console.log("Shutting down feed aggregator...");
      clearInterval(interval);
      resolve();
    });
  });
}
function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler
): void {
  registry[cmdName] = handler;
}

async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
): Promise<void> {

  const handler = registry[cmdName];

  if (!handler) {
    throw new Error("Unknown command");
  }

  await handler(cmdName, ...args);
}

async function handlerReset(cmdName: string): Promise<void> {
  await deleteAllUsers();

  console.log("Database reset successfully");
}
function printFeed(feed: Feed, user: User): void {
  console.log("Feed added successfully!");

  console.log(`ID: ${feed.id}`);
  console.log(`Name: ${feed.name}`);
  console.log(`URL: ${feed.url}`);
  console.log(`User ID: ${feed.userId}`);
  console.log(`Created At: ${feed.createdAt}`);
  console.log(`Updated At: ${feed.updatedAt}`);
  console.log(`Added By: ${user.name}`);
}
async function handlerUsers(cmdName: string): Promise<void> {
  const users = await getUsers();
  const config = readConfig();

  for (const user of users) {
    if (user.name === config.currentUserName) {
      console.log(`* ${user.name} (current)`);
    } else {
      console.log(`* ${user.name}`);
    }
  }
}
async function handlerAddFeed(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {

  if (args.length < 2) {
    throw new Error("Name and URL are required");
  }

  const name = args[0];
  const url = args[1];

  const feed = await createFeed(name, url, user.id);

  const follow = await createFeedFollow(user.id, feed.id);

  printFeed(feed, user);

  console.log(`Following: ${follow.feedName}`);
  console.log(`User: ${follow.userName}`);
}

function middlewareLoggedIn(
  handler: UserCommandHandler
): CommandHandler {

  return async (cmdName, ...args) => {
    const config = readConfig();

    if (!config.currentUserName) {
      throw new Error("No user logged in");
    }

    const user = await getUserByName(config.currentUserName);

    if (!user) {
      throw new Error("User not found");
    }

    await handler(cmdName, user, ...args);
  };
}
async function getCurrentUser() {
  const config = readConfig();

  if (!config.currentUserName) {
    throw new Error("No current user");
  }

  const user = await getUserByName(config.currentUserName);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}
async function handlerFollow(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {

  if (args.length === 0) {
    throw new Error("URL is required");
  }

  const feed = await getFeedByURL(args[0]);

  if (!feed) {
    throw new Error("Feed not found");
  }

  const follow = await createFeedFollow(user.id, feed.id);

  console.log(`Feed: ${follow.feedName}`);
  console.log(`User: ${follow.userName}`);
}
async function handlerFollowing(
  cmdName: string,
  user: User
): Promise<void> {

  const follows = await getFeedFollowsForUser(user.id);

  for (const follow of follows) {
    console.log(follow.feedName);
  }
}
async function handlerFeeds(cmdName: string): Promise<void> {
  const feeds = await getFeeds();

  for (const feed of feeds) {
    console.log(`Name: ${feed.name}`);
    console.log(`URL: ${feed.url}`);
    console.log(`User: ${feed.userName}`);
    console.log("------------------");
  }
}
async function handlerUnfollow(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {

  if (args.length === 0) {
    throw new Error("URL is required");
  }

  await deleteFeedFollow(user.id, args[0]);

  console.log("Feed unfollowed successfully");
}
async function main() {
  const registry: CommandsRegistry = {};

  registerCommand(registry, "login", handlerLogin);
  registerCommand(registry, "register", handlerRegister);
  registerCommand(registry, "reset", handlerReset);
  registerCommand(registry, "users", handlerUsers);
registerCommand(registry, "feeds", handlerFeeds);
registerCommand(registry, "addfeed", middlewareLoggedIn(handlerAddFeed));
registerCommand(
  registry,
  "browse",
  middlewareLoggedIn(handlerBrowse)
);
registerCommand(registry, "follow", middlewareLoggedIn(handlerFollow));
registerCommand(registry, "agg", handlerAgg);
registerCommand(registry, "following", middlewareLoggedIn(handlerFollowing));
registerCommand(
  registry,
  "unfollow",
  middlewareLoggedIn(handlerUnfollow)
);
const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Not enough arguments");
    process.exit(1);
  }

  const [cmdName, ...cmdArgs] = args;

  try {
    await runCommand(registry, cmdName, ...cmdArgs);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

main();