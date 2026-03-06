"use client";

import { useState } from "react";
import AssetWall from "@/components/AssetWall";
import MapPanel from "@/components/MapPanel";
import NewsPanel from "@/components/NewsPanel";
import { LinkedEvent } from "@/lib/news-linking";

export default function Page() {
  const [selectedEvent, setSelectedEvent] = useState<LinkedEvent | null>(null);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/85 backdrop-blur">
        <div className="mx-auto max-w-[1800px] px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-2xl font-semibold tracking-tight">
              Commodity Intelligence Terminal
            </div>
            <div className="text-sm text-zinc-400">
              Real-time prices + commodity news + geo context
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1800px] px-4 py-5 grid grid-cols-12 gap-4 items-start">
        <section className="col-span-12 xl:col-span-5 min-w-0">
          <Panel title="Market Watch" subtitle="Commodities first • then macro">
            <div className="max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
              <AssetWall highlightedIds={selectedEvent?.affectedAssets ?? []} />
            </div>
          </Panel>
        </section>

        <section className="col-span-12 xl:col-span-4 min-w-0">
          <div className="max-h-[calc(100vh-180px)] overflow-y-auto space-y-4">
            <NewsPanel onSelectEvent={setSelectedEvent} />

            {selectedEvent && (
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                <div className="text-sm font-semibold text-cyan-200">Selected Event</div>
                <div className="mt-2 text-sm text-zinc-100">{selectedEvent.title}</div>
                <div className="mt-2 text-xs text-zinc-400">
                  Affected: {(selectedEvent.affectedAssets ?? []).join(", ") || "N/A"}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="col-span-12 xl:col-span-3 min-w-0">
          <MapPanel focus={selectedEvent?.focus ?? null} />
        </section>
      </div>
    </main>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900">
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="text-lg font-semibold text-zinc-100">{title}</div>
        {subtitle && <div className="text-sm text-zinc-400 mt-1">{subtitle}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}