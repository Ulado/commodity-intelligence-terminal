import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

type PricePoint = {
  price: number;
  prevClose?: number;
};

type PriceMap = Record<string, PricePoint>;

let CACHE: {
  data: PriceMap;
  ts: number;
} | null = null;

const CACHE_TTL = 60 * 1000; // 1 分鐘

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

async function fetchYahoo(): Promise<PriceMap> {
  const entries = Object.entries(YAHOO_SYMBOLS);

  const results = await Promise.all(
    entries.map(async ([id, symbol]) => {
      try {
        console.log(`[Yahoo] fetching ${id} -> ${symbol}`);

        const q: any = await yahooFinance.quote(symbol);

        console.log(`[Yahoo] raw result for ${id}:`, {
          symbol,
          regularMarketPrice: q?.regularMarketPrice,
          postMarketPrice: q?.postMarketPrice,
          preMarketPrice: q?.preMarketPrice,
          regularMarketPreviousClose: q?.regularMarketPreviousClose,
        });

        const price =
          q?.regularMarketPrice ??
          q?.postMarketPrice ??
          q?.preMarketPrice;

        const prevClose = q?.regularMarketPreviousClose;

        if (typeof price !== "number") {
          console.log(`[Yahoo] no valid price for ${id}`);
          return null;
        }

        return [
          id,
          {
            price,
            prevClose:
              typeof prevClose === "number" ? prevClose : undefined,
          },
        ] as const;
      } catch (err: any) {
        console.error(`[Yahoo] failed ${id} -> ${symbol}`, err);
        return null;
      }
    })
  );

  return Object.fromEntries(
    results.filter(Boolean) as Array<readonly [string, PricePoint]>
  );
}

async function fetchFRED(): Promise<PriceMap> {
  const key = process.env.FRED_API_KEY;
  if (!key) {
    console.error("[FRED] missing FRED_API_KEY");
    return {};
  }

  const seriesMap: Record<string, string> = {
    US2Y: "DGS2",
    US10Y: "DGS10",
    US30Y: "DGS30",
    SOFR: "SOFR",
  };

  const results = await Promise.all(
    Object.entries(seriesMap).map(async ([id, seriesId]) => {
      try {
        const url =
          `https://api.stlouisfed.org/fred/series/observations` +
          `?series_id=${encodeURIComponent(seriesId)}` +
          `&api_key=${encodeURIComponent(key)}` +
          `&file_type=json&sort_order=desc&limit=2`;

        console.log(`[FRED] fetching ${id} -> ${seriesId}`);

        const res = await fetch(url, { cache: "no-store" });
        console.log(`[FRED] response ${id}:`, res.status, res.statusText);

        if (!res.ok) return null;

        const json: any = await res.json();
        const obs = json?.observations;

        if (!Array.isArray(obs) || obs.length === 0) {
          console.log(`[FRED] no observations for ${id}`);
          return null;
        }

        const latest = parseFloat(obs[0]?.value);
        const prev = obs.length > 1 ? parseFloat(obs[1]?.value) : NaN;

        console.log(`[FRED] parsed ${id}: latest=${latest}, prev=${prev}`);

        if (!isFinite(latest)) return null;

        return [
          id,
          {
            price: latest,
            prevClose: isFinite(prev) ? prev : undefined,
          },
        ] as const;
      } catch (err: any) {
        console.error(`[FRED] failed ${id} -> ${seriesId}`, err);
        return null;
      }
    })
  );

  return Object.fromEntries(
    results.filter(Boolean) as Array<readonly [string, PricePoint]>
  );
}

export async function GET() {
  const now = Date.now();

  if (CACHE && now - CACHE.ts < CACHE_TTL) {
    return NextResponse.json({
      data: CACHE.data,
      cached: true,
    });
  }

  const [yahooData, fredData] = await Promise.all([
    fetchYahoo(),
    fetchFRED(),
  ]);

  const merged: PriceMap = {
    ...yahooData,
    ...fredData,
  };

  if (Object.keys(merged).length > 0) {
    CACHE = {
      data: merged,
      ts: now,
    };
  }

  CACHE = {
    data: merged,
    ts: now,
  };

  return NextResponse.json({
    data: merged,
    cached: false,
    failed: {
      yahoo: Object.keys(YAHOO_SYMBOLS).filter((id) => !merged[id]),
      fred: ["US2Y", "US10Y", "US30Y", "SOFR"].filter((id) => !merged[id]),
    },
  });
}