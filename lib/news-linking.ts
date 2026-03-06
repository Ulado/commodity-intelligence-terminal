export type LinkedEvent = {
  title: string;
  source?: string;
  impact?: "High" | "Med" | "Low";
  tags?: string[];
  link?: string;
  summary?: string;
  focus?: {
    lng: number;
    lat: number;
    zoom?: number;
  };
  affectedAssets?: string[];
};

export function inferEventLinking(title: string): Pick<LinkedEvent, "focus" | "affectedAssets"> {
  const t = title.toLowerCase();

  if (/(copper|chile|peru|mining)/.test(t)) {
    return {
      focus: { lng: -72, lat: -20, zoom: 3.2 },
      affectedAssets: ["COPPER", "GOLD", "SILVER"],
    };
  }

  if (/(china|beijing|steel|demand|smelting)/.test(t)) {
    return {
      focus: { lng: 105, lat: 35, zoom: 3.5 },
      affectedAssets: ["COPPER", "SILVER", "USDCNH"],
    };
  }

  if (/(gold|silver|inflation|real yield|rates)/.test(t)) {
    return {
      focus: { lng: -0.1, lat: 51.5, zoom: 3 },
      affectedAssets: ["GOLD", "SILVER", "US10Y"],
    };
  }

  if (/(shipping|singapore|red sea|suez|hormuz)/.test(t)) {
    return {
      focus: { lng: 103.8, lat: 1.35, zoom: 4 },
      affectedAssets: ["BRENT", "WTI", "COPPER"],
    };
  }

  return {
    focus: { lng: 20, lat: 20, zoom: 1.8 },
    affectedAssets: [],
  };
}