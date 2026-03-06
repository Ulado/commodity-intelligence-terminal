import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

type PriceMap = Record<string, number>;

let CACHE: {
  data: PriceMap;
  ts: number;
} | null = null;

const CACHE_TTL = 60 * 1000; // 1分鐘

// symbol mapping
const YAHOO_SYMBOLS: Record<string, string> = {
  USDJPY: "JPY=X",
  EURUSD: "EURUSD=X",
  GBPUSD: "GBPUSD=X",
  AUDUSD: "AUDUSD=X",
  USDCNH: "CNH=X",

  GOLD: "GC=F",
  SILVER: "SI=F",
  COPPER: "HG=F",
  WTI: "CL=F",
  BRENT: "BZ=F",
  NATGAS: "NG=F",

  SPX: "^GSPC",
  NDX: "^NDX",
  NIKKEI: "^N225",
  VIX: "^VIX",

  BTC: "BTC-USD",
  ETH: "ETH-USD",
  SOL: "SOL-USD",
};

// Rates 先用 proxy
async function fetchRates(): Promise<PriceMap> {
  try {
    const res = await fetch(
      "https://api.stlouisfed.org/fred/series/observations?series_id=DGS10&api_key=YOUR_FRED_KEY&file_type=json",
      { cache: "no-store" }
    );

    const json = await res.json();

    const latest = json.observations?.at(-1)?.value;

    return {
      US10Y: parseFloat(latest),
    };
  } catch {
    return {};
  }
}

async function fetchYahoo(): Promise<PriceMap> {
  const symbols = Object.values(YAHOO_SYMBOLS);

  try {
    const quotes = await yahooFinance.quote(symbols);

    const map: PriceMap = {};

    for (const q of quotes) {
      const entry = Object.entries(YAHOO_SYMBOLS).find(
        ([, s]) => s === q.symbol
      );

      if (!entry) continue;

      const id = entry[0];

      map[id] = q.regularMarketPrice ?? q.postMarketPrice ?? q.preMarketPrice;
    }

    return map;
  } catch (e) {
    console.error("Yahoo fetch error", e);
    return {};
  }
}

export async function GET() {
  const now = Date.now();

  if (CACHE && now - CACHE.ts < CACHE_TTL) {
    return NextResponse.json({
      data: CACHE.data,
      cached: true,
    });
  }

  const [yahoo, rates] = await Promise.all([
    fetchYahoo(),
    fetchRates(),
  ]);

  const merged = {
    ...yahoo,
    ...rates,
  };

  CACHE = {
    data: merged,
    ts: now,
  };

  return NextResponse.json({
    data: merged,
    cached: false,
  });
}