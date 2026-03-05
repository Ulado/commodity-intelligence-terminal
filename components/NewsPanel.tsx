"use client";

import React, { useEffect, useState } from "react";

type NewsItem = {
  title: string;
  link?: string;
  pubDate?: string | null;
  source?: string;
  impact?: "High" | "Med" | "Low";
  tags?: string[];
};

const TOPICS = ["Metals", "Oil", "Gas", "Shipping", "OPEC"] as const;
// Shipping / OPEC 先暫時也打 Metals 的 feed，後面再細分
function normalizeTopic(t: string) {
  if (t === "Shipping" || t === "OPEC") return "Metals";
  return t;
}

export default function NewsPanel() {
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>("Metals");
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/news?topic=${encodeURIComponent(normalizeTopic(topic))}`, { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        setItems(json.items ?? []);
      } catch {
        if (!alive) return;
        setItems([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, [topic]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900">
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="text-sm font-semibold text-zinc-100">News Feed</div>
        <div className="text-xs text-zinc-400 mt-0.5">Metals first • multi-source RSS</div>
      </div>

      <div className="p-4">
        <div className="flex gap-2 flex-wrap mb-3">
          {TOPICS.map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className={[
                "text-xs px-3 py-1 rounded-full border transition",
                topic === t
                  ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                  : "bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-600 hover:text-zinc-100",
              ].join(" ")}
            >
              {t}
            </button>
          ))}
          <div className="ml-auto text-xs text-zinc-500">
            {loading ? "loading..." : `${items.length} items`}
          </div>
        </div>

        <div className="space-y-3">
          {items.map((it, idx) => (
            <a
              key={idx}
              href={it.link || "#"}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl border border-zinc-800 bg-zinc-950 p-3 hover:bg-zinc-900 transition"
            >
              <div className="flex items-start gap-2">
                <ImpactBadge impact={it.impact || "Low"} />
                <div className="min-w-0">
                  <div className="text-sm text-zinc-100 leading-snug truncate">
                    {it.title}
                  </div>
                  <div className="mt-2 text-xs text-zinc-400 flex gap-2 flex-wrap">
                    <span className="text-zinc-500">{it.source || "RSS"}</span>
                    {it.tags?.map((t) => (
                      <span key={t} className="px-2 py-[2px] rounded-full border border-zinc-800 bg-zinc-900 text-zinc-300">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </a>
          ))}

          {!loading && items.length === 0 && (
            <div className="text-sm text-zinc-400">
              目前抓不到新聞（可能某些 RSS 擋爬或暫時掛掉）。我可以幫你換一組更穩的來源。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ImpactBadge({ impact }: { impact: "High" | "Med" | "Low" }) {
  const cls =
    impact === "High"
      ? "border-red-500/30 bg-red-500/15 text-red-300"
      : impact === "Med"
      ? "border-amber-500/30 bg-amber-500/15 text-amber-300"
      : "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";

  return (
    <span className={`shrink-0 text-[10px] px-2 py-1 rounded-full border ${cls}`}>
      {impact}
    </span>
  );
}