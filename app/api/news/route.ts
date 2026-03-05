import { NextResponse } from "next/server";
import Parser from "rss-parser";

const parser = new Parser();

const FEEDS: Record<string, string[]> = {
  Metals: [
    "https://www.kitco.com/rss/news",
    "https://www.mining.com/feed/",
    "https://www.investing.com/rss/news_285.rss", // commodities news
  ],
  Oil: [
    "https://www.investing.com/rss/news_301.rss",
    "https://www.oilprice.com/rss/main",
  ],
  Gas: [
    "https://www.investing.com/rss/news_301.rss",
  ],
};

function guessImpact(title: string) {
  const t = title.toLowerCase();
  if (/(war|attack|missile|sanction|shutdown|strike|explosion|blockade)/.test(t)) return "High";
  if (/(opec|inventory|fed|tariff|rate|export|ban|shipping)/.test(t)) return "Med";
  return "Low";
}

function guessTags(title: string, topic: string) {
  const t = title.toLowerCase();
  const tags: string[] = [];
  if (topic) tags.push(topic);
  if (/(china|beijing)/.test(t)) tags.push("China");
  if (/(inventory|stockpile)/.test(t)) tags.push("Inventory");
  if (/(shipping|red sea|suez|strait|hormuz)/.test(t)) tags.push("Shipping");
  if (/(gold)/.test(t)) tags.push("Gold");
  if (/(silver)/.test(t)) tags.push("Silver");
  if (/(copper)/.test(t)) tags.push("Copper");
  if (/(iron|steel)/.test(t)) tags.push("Steel");
  if (/(sanction)/.test(t)) tags.push("Sanctions");
  return Array.from(new Set(tags)).slice(0, 4);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const topic = searchParams.get("topic") || "Metals";
  const sources = FEEDS[topic] ?? FEEDS.Metals;

  const items: any[] = [];

  await Promise.all(
    sources.map(async (url) => {
      try {
        const feed = await parser.parseURL(url);
        for (const it of feed.items.slice(0, 12)) {
          const title = (it.title || "").trim();
          if (!title) continue;

          // Metals 主題：做一點 keyword filter
          if (topic === "Metals") {
            const tt = title.toLowerCase();
            if (!/(gold|silver|copper|metal|mining|iron|steel|nickel|aluminum|zinc)/.test(tt)) continue;
          }

          items.push({
            title,
            link: it.link,
            pubDate: it.pubDate || it.isoDate || null,
            source: (feed.title || "").slice(0, 40),
            impact: guessImpact(title),
            tags: guessTags(title, topic),
          });
        }
      } catch {
        // ignore a broken feed
      }
    })
  );

  // 排序：新到舊
  items.sort((a, b) => {
    const ta = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const tb = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return tb - ta;
  });

  return NextResponse.json({ topic, items: items.slice(0, 30) });
}