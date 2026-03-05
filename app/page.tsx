import AssetWall from "@/components/AssetWall";
import MapPanel from "@/components/MapPanel";
import NewsPanel from "@/components/NewsPanel";

export default function Page() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto max-w-[1500px] px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold tracking-tight">
              Commodity Intelligence Terminal
            </div>
            <div className="text-xs text-zinc-400">
              Real-time prices + commodity news + geo context
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs px-2 py-1 rounded-full border border-zinc-800 bg-zinc-900 text-zinc-300">
              Dark Mode
            </div>
            <div className="text-xs px-2 py-1 rounded-full border border-zinc-800 bg-zinc-900 text-zinc-300">
              MapLibre
            </div>
          </div>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="mx-auto max-w-[1500px] px-4 py-5 grid grid-cols-12 gap-4">
        {/* Left: Prices */}
        <section className="col-span-12 lg:col-span-4">
          <Panel title="Market Watch" subtitle="Commodities first • then macro">
            {/* 你之後可以改成只顯示 Commodities + 選幾個 FX/Rates */}
            <AssetWall />
          </Panel>
        </section>

        {/* Middle: News */}
        <section className="col-span-12 lg:col-span-4">
          <NewsPanel />
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
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-semibold text-zinc-100">{title}</div>
            {subtitle && <div className="text-xs text-zinc-400 mt-0.5">{subtitle}</div>}
          </div>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs px-2 py-1 rounded-full border border-zinc-800 bg-zinc-950 text-zinc-300">
      {children}
    </span>
  );
}

function NewsCard({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 hover:bg-zinc-900 transition">
      <div className="text-sm text-zinc-100 leading-snug">{title}</div>
      <div className="mt-2 text-xs text-zinc-400">{meta}</div>
    </div>
  );
}