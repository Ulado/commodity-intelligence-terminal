import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";
import { ASSETS } from "@/lib/assets";

async function fetchYahoo(symbol: string) {
  const q: any = await yahooFinance.quote(symbol);
  const price = q?.regularMarketPrice;
  const prevClose = q?.regularMarketPreviousClose;
  if (typeof price !== "number") return null;
  return { price, prevClose: typeof prevClose === "number" ? prevClose : undefined };
}

async function fetchFRED(seriesId: string) {
  const key = process.env.FRED_API_KEY;
  if (!key) return null;

  const url =
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=${encodeURIComponent(seriesId)}` +
    `&api_key=${encodeURIComponent(key)}` +
    `&file_type=json&sort_order=desc&limit=2`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;

  const json: any = await res.json();
  const obs = json?.observations;
  if (!Array.isArray(obs) || obs.length === 0) return null;

  const latest = parseFloat(obs[0]?.value);
  const prev = obs.length > 1 ? parseFloat(obs[1]?.value) : NaN;

  if (!isFinite(latest)) return null;
  return { price: latest, prevClose: isFinite(prev) ? prev : undefined };
}

export async function GET() {
  const out: Record<string, { price: number; prevClose?: number }> = {};

  await Promise.all(
    ASSETS.map(async (a) => {
      try {
        if (a.source === "yahoo") {
          const r = await fetchYahoo(a.symbol);
          if (r) out[a.id] = r;
        } else if (a.source === "fred") {
          const r = await fetchFRED(a.symbol);
          if (r) out[a.id] = r;
        }
      } catch {
        // ignore single failure
      }
    })
  );

  return NextResponse.json({ data: out, ts: Date.now() });
}