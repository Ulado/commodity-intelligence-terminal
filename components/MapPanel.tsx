"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

export default function MapPanel({
  focus,
}: {
  focus?: { lng: number; lat: number; zoom?: number } | null;
}) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [20, 20],
      zoom: 1.6,
      attributionControl: false,
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!focus || !mapRef.current) return;

    mapRef.current.flyTo({
      center: [focus.lng, focus.lat],
      zoom: focus.zoom ?? 4,
      speed: 0.8,
      curve: 1.2,
      essential: true,
    });
  }, [focus]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="text-sm text-zinc-200">Geo Map</div>
        <div className="text-xs text-zinc-400">MapLibre • Dark</div>
      </div>

      <div ref={mapContainer} className="h-[calc(100vh-180px)] min-h-[520px] w-full" />
    </div>
  );
}