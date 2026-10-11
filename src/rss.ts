import { XMLParser } from "fast-xml-parser";

export type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

export type RSSFeed = {
  channel: {
    title: string;
    link: string;
    description: string;
    item: RSSItem[];
  };
};
export async function fetchFeed(feedURL: string): Promise<RSSFeed> {
  const response = await fetch(feedURL, {
    headers: {
      "User-Agent": "gator"
    }
  });

  if (!response.ok) {
    throw new Error("Failed to fetch RSS");
  }

  const xml = await response.text();

  const parser = new XMLParser({
    processEntities: false
  });

  const data = parser.parse(xml);
  const channel = data?.rss?.channel;

  if (!channel) {
    throw new Error("Channel not found");
  }

  const { title, link, description } = channel;

  if (
    typeof title !== "string" ||
    typeof link !== "string" ||
    typeof description !== "string"
  ) {
    throw new Error("Invalid channel data");
  }

  const rawItems = channel.item
    ? Array.isArray(channel.item)
      ? channel.item
      : [channel.item]
    : [];

  const items: RSSItem[] = [];

  for (const item of rawItems) {
    if (
      typeof item?.title !== "string" ||
      typeof item?.link !== "string" ||
      typeof item?.description !== "string" ||
      typeof item?.pubDate !== "string"
    ) {
      continue;
    }

    items.push({
      title: item.title,
      link: item.link,
      description: item.description,
      pubDate: item.pubDate
    });
  }

  return {
    channel: {
      title,
      link,
      description,
      item: items
    }
  };
}