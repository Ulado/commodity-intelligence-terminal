import { NextResponse } from "next/server";
import Parser from "rss-parser";
import { RULES } from "../../../lib/riskMap";

const parser = new Parser();

// 先挑少量來源，跑順再加
const FEEDS = [
  "https://feeds.reuters.com/reuters/worldNews",
  "https://www.aljazeera.com/xml/rss/all.xml",
];

export async function GET() {
  const items: any[] = [];

  for (const url of FEEDS) {
    try {
      const feed = await parser.parseURL(url);
      for (const it of feed.items.slice(0, 30)) {
        const title = it.title ?? "";
        const matched = RULES.filter(r => r.match.test(title));
        const riskScore = matched.reduce((a, r) => a + r.score, 0);

        items.push({
          title,
          link: it.link,
          pubDate: it.pubDate,
          tags: matched.map(m => m.tag),
          assets: Array.from(new Set(matched.flatMap(m => m.assets))),
          riskScore: Math.min(100, Math.round(riskScore / Math.max(1, matched.length))), // 簡單縮放
          source: feed.title ?? url,
        });
      }
    } catch (e) {
      // ignore single feed failure
    }
  }

  // 風險分高的排前面
  items.sort((a, b) => (b.riskScore - a.riskScore));

  return NextResponse.json({ items });
}