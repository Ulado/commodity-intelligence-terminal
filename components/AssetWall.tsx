"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ASSETS, Asset } from "@/lib/assets";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";

type Point = { t: number; v: number };

type LiveAsset = {
  meta: Asset;
  last: number;
  prev1h: number;
  prev24h: number;
  series: Point[];
};

type Anchor = Record<string, { price: number; prevClose?: number }>;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function fmtPrice(id: string, v: number) {
  if (id === "EURUSD" || id === "AUDUSD" || id === "GBPUSD") return v.toFixed(4);
  if (id === "USDJPY") return v.toFixed(2);
  if (id === "USDCNH") return v.toFixed(3);
  if (id === "US2Y" || id === "US10Y" || id === "US30Y" || id === "JGB10Y" || id === "SOFR") return v.toFixed(2);
  if (id === "GOLD") return v.toFixed(0);
  if (id === "SPX" || id === "NDX" || id === "NIKKEI") return v.toFixed(0);
  if (id === "BTC") return v.toFixed(0);
  return v.toFixed(2);
}

function pct(a: number, b: number) {
  if (!isFinite(a) || !isFinite(b) || b === 0) return 0;
  return ((a - b) / b) * 100;
}

function groupOrder(g: Asset["group"]) {
  return ["FX", "Rates", "Commodities", "Equity", "Crypto"].indexOf(g);
}

function median(arr: number[]) {
  const a = [...arr].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

export default function AssetWall() {
  const [tab, setTab] = useState<Asset["group"] | "All">("All");
  const [live, setLive] = useState<Record<string, LiveAsset>>({});
  const [anchor, setAnchor] = useState<Anchor>({});

  // 1) 初始化：先用 seed + 小波動生成 60 點（讓圖有東西）
  useEffect(() => {
    const now = Date.now();
    const init: Record<string, LiveAsset> = {};

    for (const a of ASSETS) {
      const series: Point[] = [];
      let price = a.seedPrice;

      for (let i = 60; i >= 1; i--) {
        price = price + (Math.random() - 0.5) * a.vol;
        series.push({ t: now - i * 60_000, v: price });
      }

      init[a.id] = {
        meta: a,
        last: price,
        prev1h: series[0]?.v ?? price,
        prev24h: series[0]?.v ?? price,
        series,
      };
    }

    setLive(init);
  }, []);

  // 2) 每 30 秒拉真實價格（若 API 還沒準備好也沒關係，不會炸）
  useEffect(() => {
    let alive = true;

    const pull = async () => {
      try {
        const res = await fetch("/api/prices", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (!alive) return;

        const data: Anchor = json?.data ?? {};
        setAnchor(data);

        // 抓到 anchor 後，把 last 拉近真實價（避免一開始差太大）
        setLive((prev) => {
          const next = { ...prev };
          for (const id of Object.keys(next)) {
            const a = next[id];
            const ap = data[id]?.price;
            const pc = data[id]?.prevClose;

            if (typeof ap === "number" && isFinite(ap)) {
              // 直接把 last anchor 到真實價附近
              const adjusted = a.last * 0.2 + ap * 0.8;

              // 24h% 用 prevClose（有的話）
              const prev24h = typeof pc === "number" && isFinite(pc) ? pc : a.prev24h;

              // 同步 series 末端往真實價靠一下（不然圖會落差很怪）
              const series = a.series.map((p) => ({ ...p, v: p.v * 0.2 + ap * 0.8 }));

              next[id] = {
                ...a,
                last: adjusted,
                prev24h,
                series,
              };
            }
          }
          return next;
        });
      } catch {
        // ignore
      }
    };

    pull();
    const t = setInterval(pull, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // 3) 每 2 秒更新：靠近 anchor 的小抖動（爽感＋不失真）
  useEffect(() => {
    const timer = setInterval(() => {
      setLive((prev) => {
        const next: Record<string, LiveAsset> = { ...prev };
        const now = Date.now();

        for (const id of Object.keys(next)) {
          const cur = next[id];
          const vol = cur.meta.vol;

          const base = anchor[id]?.price; // 真實價中心（可能沒有）
          const prevClose = anchor[id]?.prevClose;

          // 噪音幅度：用 vol 的 10~15%（避免亂跳）
          const noise = (Math.random() - 0.5) * (vol * 0.15);

          let newPrice: number;

          if (typeof base === "number" && isFinite(base)) {
            // 往 base 收斂：70% base + 30% 自己（避免瞬間跳針）
            newPrice = Math.max(0.0001, cur.last * 0.3 + base * 0.7 + noise);
          } else {
            // 沒真實價：維持原本 random walk
            const drift = (Math.random() - 0.5) * vol;
            newPrice = Math.max(0.0001, cur.last + drift);
          }

          const newSeries = [...cur.series, { t: now, v: newPrice }].slice(-60);

          // 1h：用 series 的最舊點當近似（MVP）
          const approx1h = newSeries[0]?.v ?? newPrice;

          // 24h：若有 prevClose 用 prevClose，否則沿用舊邏輯
          const approx24h =
            typeof prevClose === "number" && isFinite(prevClose)
              ? prevClose
              : cur.prev24h;

          next[id] = {
            ...cur,
            last: newPrice,
            prev1h: approx1h,
            prev24h: approx24h,
            series: newSeries,
          };
        }

        return next;
      });
    }, 2000);

    return () => clearInterval(timer);
  }, [anchor]);

  const list = useMemo(() => {
    const arr = Object.values(live);
    arr.sort((a, b) => {
      const go = groupOrder(a.meta.group) - groupOrder(b.meta.group);
      if (go !== 0) return go;
      return a.meta.id.localeCompare(b.meta.id);
    });
    return tab === "All" ? arr : arr.filter((x) => x.meta.group === tab);
  }, [live, tab]);

  const tabs: Array<Asset["group"] | "All"> = [
    "All",
    "FX",
    "Rates",
    "Commodities",
    "Equity",
    "Crypto",
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "px-3 py-1 rounded-full text-sm border transition",
              tab === t
                ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                : "bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-600 hover:text-zinc-100",
            ].join(" ")}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
        {list.map((a) => (
          <AssetCard key={a.meta.id} a={a} hasAnchor={!!anchor[a.meta.id]} />
        ))}
      </div>
    </div>
  );
}

function AssetCard({ a, hasAnchor }: { a: LiveAsset; hasAnchor: boolean }) {
  const p1h = pct(a.last, a.prev1h);
  const p24h = pct(a.last, a.prev24h);
  const up =
    a.series.length >= 2
      ? a.series[a.series.length - 1].v >= a.series[a.series.length - 2].v
      : true;

  const values = a.series.map((x) => x.v);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);

  // 更穩的 padding：用中位數附近伸縮（避免少數尖峰讓圖太扁）
  const mid = median(values);
  const span = Math.max(1e-6, maxV - minV);
  const pad = span * 0.15 || Math.max(1, Math.abs(mid) * 0.01);

  return (
    <div className="rounded-2xl border border-zinc-800 p-3 bg-zinc-950">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm text-zinc-400 flex items-center gap-2">
            {a.meta.group}
            <span className={`text-[10px] px-2 py-[2px] rounded-full border ${hasAnchor ? "bg-green-50" : "bg-gray-50"}`}>
              {hasAnchor ? "LIVE" : "SIM"}
            </span>
          </div>
          <div className="text-lg font-semibold">{a.meta.name}</div>
          <div className="text-xs text-gray-500">{a.meta.id}</div>
        </div>

        <div className="text-right shrink-0 min-w-[120px]">
          <div className="text-xl font-semibold whitespace-nowrap tabular-nums">
            {fmtPrice(a.meta.id, a.last)}{a.meta.unit ? a.meta.unit : ""}
          </div>
          <div className="flex gap-2 justify-end text-xs whitespace-nowrap tabular-nums">
            <span className={p1h >= 0 ? "text-emerald-300" : "text-red-300"}>
              1h {p1h >= 0 ? "+" : ""}{p1h.toFixed(2)}%
            </span>
            <span className={p24h >= 0 ? "text-emerald-300" : "text-red-300"}>
              24h {p24h >= 0 ? "+" : ""}{p24h.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 h-16">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={a.series}>
            <YAxis
              domain={[
                clamp(minV - pad, -1e12, 1e12),
                clamp(maxV + pad, -1e12, 1e12),
              ]}
              hide
            />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(v: any) => [fmtPrice(a.meta.id, Number(v))]}
              labelFormatter={() => ""}
            />
            <Line type="monotone" dataKey="v" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        tick:{" "}
        <span className={up ? "text-green-600" : "text-red-600"}>
          {up ? "up" : "down"}
        </span>
      </div>
    </div>
  );
}