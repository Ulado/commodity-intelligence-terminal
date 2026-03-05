export type Asset = "WTI" | "GOLD" | "USDJPY" | "US10Y" | "VIX" | "CNH" | "COPPER" | "SPX" | "BTC";

export const RULES: Array<{
  match: RegExp;
  assets: Asset[];
  score: number; // 事件基礎分
  tag: string;
}> = [
  { match: /red sea|houthi|suez|blockade|tanker/i, assets: ["WTI", "GOLD", "VIX"], score: 70, tag: "Shipping/Oil shock" },
  { match: /iran|israel|gaza|airstrike|missile|hezbollah/i, assets: ["WTI", "GOLD", "VIX"], score: 75, tag: "MENA conflict" },
  { match: /earthquake|tsunami|japan|fukushima/i, assets: ["USDJPY", "VIX"], score: 60, tag: "Japan disaster" },
  { match: /fed|cpi|inflation|rate hike|rate cut|powell/i, assets: ["US10Y", "VIX", "SPX"], score: 65, tag: "US macro" },
  { match: /sanction|export control|chip|taiwan|china/i, assets: ["CNH", "COPPER", "VIX"], score: 68, tag: "Geo-trade tension" },
  { match: /ransomware|ddos|outage|breach|cyber/i, assets: ["VIX"], score: 55, tag: "Cyber" },
];