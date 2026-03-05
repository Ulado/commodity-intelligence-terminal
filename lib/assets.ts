export type QuoteSource = "yahoo" | "fred";

export type Asset = {
  id: string;
  name: string;
  group: "FX" | "Rates" | "Commodities" | "Equity" | "Crypto";
  unit?: string;

  source: QuoteSource;
  symbol: string; // yahoo symbol 或 fred series_id

  seedPrice: number;
  vol: number;
};

export const ASSETS: Asset[] = [
  // FX (Yahoo)
  { id: "USDJPY", name: "USD/JPY", group: "FX", seedPrice: 147.2, vol: 0.08, source: "yahoo", symbol: "JPY=X" },
  { id: "EURUSD", name: "EUR/USD", group: "FX", seedPrice: 1.086, vol: 0.0015, source: "yahoo", symbol: "EURUSD=X" },
  { id: "USDCNH", name: "USD/CNH", group: "FX", seedPrice: 7.18, vol: 0.01, source: "yahoo", symbol: "CNH=X" },
  { id: "AUDUSD", name: "AUD/USD", group: "FX", seedPrice: 0.655, vol: 0.0018, source: "yahoo", symbol: "AUDUSD=X" },
  { id: "GBPUSD", name: "GBP/USD", group: "FX", seedPrice: 1.27, vol: 0.002, source: "yahoo", symbol: "GBPUSD=X" },

  // Rates (FRED) — unit 仍用 %
  { id: "US2Y", name: "US 2Y", group: "Rates", seedPrice: 4.35, vol: 0.02, unit: "%", source: "fred", symbol: "DGS2" },
  { id: "US10Y", name: "US 10Y", group: "Rates", seedPrice: 4.10, vol: 0.02, unit: "%", source: "fred", symbol: "DGS10" },
  { id: "US30Y", name: "US 30Y", group: "Rates", seedPrice: 4.25, vol: 0.015, unit: "%", source: "fred", symbol: "DGS30" },
  { id: "SOFR", name: "SOFR", group: "Rates", seedPrice: 5.30, vol: 0.005, unit: "%", source: "fred", symbol: "SOFR" },

  // JGB10Y：真實但資料源取捨（建議先用 proxy 或改成「日本10Y殖利率指標」）
  // 選項 A：先用 Yahoo proxy（較即時但不是官方 series）
  { id: "JGB10Y", name: "JGB 10Y (proxy)", group: "Rates", seedPrice: 0.95, vol: 0.01, unit: "%", source: "yahoo", symbol: "^TNX" },
  // ↑ 這行只是先讓你全 LIVE（但 ^TNX 是美國10Y指數 proxy，不是日本）
  // 如果你要「真的日本10Y」：我可以再幫你換成較穩的官方/公開來源（但會多一個資料源 adapter）

  // Commodities (Yahoo Futures)
  { id: "WTI", name: "WTI", group: "Commodities", seedPrice: 79.5, vol: 0.35, source: "yahoo", symbol: "CL=F" },
  { id: "BRENT", name: "Brent", group: "Commodities", seedPrice: 83.0, vol: 0.35, source: "yahoo", symbol: "BZ=F" }, // 若不行再改 BRN=F（看可用性）
  { id: "GOLD", name: "Gold", group: "Commodities", seedPrice: 2140, vol: 3.5, source: "yahoo", symbol: "GC=F" },
  { id: "SILVER", name: "Silver", group: "Commodities", seedPrice: 24.5, vol: 0.12, source: "yahoo", symbol: "SI=F" },
  { id: "COPPER", name: "Copper", group: "Commodities", seedPrice: 3.85, vol: 0.03, source: "yahoo", symbol: "HG=F" },
  { id: "NATGAS", name: "NatGas", group: "Commodities", seedPrice: 2.15, vol: 0.04, source: "yahoo", symbol: "NG=F" },

  // Equity / Vol (Yahoo)
  { id: "SPX", name: "S&P 500", group: "Equity", seedPrice: 5150, vol: 18, source: "yahoo", symbol: "^GSPC" },
  { id: "NDX", name: "Nasdaq 100", group: "Equity", seedPrice: 18100, vol: 60, source: "yahoo", symbol: "^NDX" },
  { id: "NIKKEI", name: "Nikkei", group: "Equity", seedPrice: 39200, vol: 120, source: "yahoo", symbol: "^N225" },
  { id: "VIX", name: "VIX", group: "Equity", seedPrice: 15.2, vol: 0.35, source: "yahoo", symbol: "^VIX" },

  // Crypto (Yahoo 也可，或你要照 worldmonitor 用 CoinGecko 也行)
  { id: "BTC", name: "Bitcoin", group: "Crypto", seedPrice: 68000, vol: 250, source: "yahoo", symbol: "BTC-USD" },
  { id: "ETH", name: "Ethereum", group: "Crypto", seedPrice: 3600, vol: 18, source: "yahoo", symbol: "ETH-USD" },
  { id: "SOL", name: "Solana", group: "Crypto", seedPrice: 140, vol: 1.2, source: "yahoo", symbol: "SOL-USD" },
];