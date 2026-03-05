"use client";

import * as React from "react";
import Map, { Marker, Popup } from "react-map-gl/maplibre";

type Hotspot = {
  name: string;
  kind: "Copper" | "Iron" | "Logistics" | "Demand" | "Market";
  lon: number;
  lat: number;
};

const HOTSPOTS: Hotspot[] = [
  { name: "Chile (Copper)", kind: "Copper", lon: -70.65, lat: -33.45 },
  { name: "Peru (Copper)", kind: "Copper", lon: -77.03, lat: -12.05 },
  { name: "DRC (Cobalt/Cu)", kind: "Copper", lon: 27.48, lat: -11.66 },
  { name: "Australia (Iron Ore)", kind: "Iron", lon: 118.62, lat: -20.31 },
  { name: "China (Demand/Smelting)", kind: "Demand", lon: 116.4, lat: 39.9 },
  { name: "Singapore (Shipping)", kind: "Logistics", lon: 103.82, lat: 1.35 },
  { name: "London (LME)", kind: "Market", lon: -0.1, lat: 51.5 },
];

function badge(k: Hotspot["kind"]) {
  if (k === "Copper") return "Cu";
  if (k === "Iron") return "Fe";
  if (k === "Logistics") return "Ship";
  if (k === "Demand") return "Demand";
  return "Mkt";
}

export default function MapPanel() {
  const [selected, setSelected] = React.useState<Hotspot | null>(null);

  const styleUrl =
    "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="text-sm text-zinc-200">Geo Map</div>
        <div className="text-xs text-zinc-400">Metals hotspots • MapLibre</div>
      </div>

      <div className="h-[520px] w-full">
        <Map
          initialViewState={{ longitude: 40, latitude: 15, zoom: 1.8 }}
          mapStyle={styleUrl}
          attributionControl={false}
          onClick={() => setSelected(null)}
        >
          {HOTSPOTS.map((h) => (
            <Marker key={h.name} longitude={h.lon} latitude={h.lat} anchor="center">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelected(h);
                }}
                className="px-2 py-1 rounded-full text-[10px] border border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-zinc-500"
              >
                {badge(h.kind)}
              </button>
            </Marker>
          ))}

          {selected && (
            <Popup
              longitude={selected.lon}
              latitude={selected.lat}
              anchor="top"
              onClose={() => setSelected(null)}
              closeButton
              closeOnClick={false}
            >
              <div style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 600 }}>{selected.name}</div>
                <div style={{ opacity: 0.7 }}>{selected.kind}</div>
              </div>
            </Popup>
          )}
        </Map>
      </div>

      <div className="px-3 py-2 border-t border-zinc-800 text-xs text-zinc-400">
        Next: 新聞點擊 → 地圖 flyTo + 左側商品高亮
      </div>
    </div>
  );
}