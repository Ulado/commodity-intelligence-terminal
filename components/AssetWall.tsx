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

function samePrice(a?: number, b?: number) {
  if (typeof a !== "number" || typeof b !== "number") return false;
  return Math.abs(a - b) < 1e-9;
}

function getWeekdayTimeParts(timeZone: string) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");

  return { weekday, hour, minute };
}

function isWeekday(weekday: string) {
  return !["Sat", "Sun"].includes(weekday);
}

function minutesOfDay(hour: number, minute: number) {
  return hour * 60 + minute;
}

function inRange(nowMin: number, startMin: number, endMin: number) {
  return nowMin >= startMin && nowMin < endMin;
}

function getMarketStatus(a: Asset) {
  const id = a.id;

  if (a.group === "Crypto") {
    return { isOpen: true, label: "交易中" };
  }

  if (["US2Y", "US10Y", "US30Y", "SOFR", "JGB10Y"].includes(id)) {
    return { isOpen: false, label: "休市" };
  }

  if (["SPX", "NDX", "VIX"].includes(id)) {
    const { weekday, hour, minute } = getWeekdayTimeParts("America/New_York");
    if (!isWeekday(weekday)) return { isOpen: false, label: "休市" };
    const nowMin = minutesOfDay(hour, minute);
    return inRange(nowMin, 9 * 60 + 30, 16 * 60)
      ? { isOpen: true, label: "交易中" }
      : { isOpen: false, label: "休市" };
  }

  if (id === "NIKKEI") {
    const { weekday, hour, minute } = getWeekdayTimeParts("Asia/Tokyo");
    if (!isWeekday(weekday)) return { isOpen: false, label: "休市" };
    const nowMin = minutesOfDay(hour, minute);
    return inRange(nowMin, 9 * 60, 15 * 60)
      ? { isOpen: true, label: "交易中" }
      : { isOpen: false, label: "休市" };
  }

  if (a.group === "FX" || a.group === "Commodities") {
    const { weekday } = getWeekdayTimeParts("America/New_York");
    return isWeekday(weekday)
      ? { isOpen: true, label: "交易中" }
      : { isOpen: false, label: "休市" };
  }

  return { isOpen: true, label: "交易中" };
}
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

export default function AssetWall({
    highlightedIds = [],
  }: {
    highlightedIds?: string[];
  }){
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
              const prev24h =
                typeof pc === "number" && isFinite(pc) ? pc : a.prev24h;

              // 只在第一次還沒對齊時，直接把最後價格拉到真實價
              // 不要整條 series 全部重寫
              next[id] = {
                ...a,
                last: ap,
                prev24h,
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

  useEffect(() => {
    setLive((prev) => {
      const next: Record<string, LiveAsset> = { ...prev };
      const now = Date.now();

      for (const id of Object.keys(next)) {
        const cur = next[id];
        const base = anchor[id]?.price;
        const prevClose = anchor[id]?.prevClose;

        if (typeof base !== "number" || !isFinite(base)) continue;

        const priceUnchanged = samePrice(cur.last, base);
        const nextPrev24h =
          typeof prevClose === "number" && isFinite(prevClose)
            ? prevClose
            : cur.prev24h;

        if (priceUnchanged) {
          next[id] = {
            ...cur,
            prev24h: nextPrev24h,
          };
          continue;
        }

        const newSeries = [...cur.series, { t: now, v: base }].slice(-60);
        const approx1h = newSeries[0]?.v ?? base;

        next[id] = {
          ...cur,
          last: base,
          prev1h: approx1h,
          prev24h: nextPrev24h,
          series: newSeries,
        };
      }

      return next;
    });
  }, [anchor]);

  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 60_000);

    return () => clearInterval(timer);
  }, []);

  const list = useMemo(() => {
    const arr = Object.values(live);

    arr.sort((a, b) => {
      const aOpen = getMarketStatus(a.meta).isOpen ? 1 : 0;
      const bOpen = getMarketStatus(b.meta).isOpen ? 1 : 0;

      if (aOpen !== bOpen) return bOpen - aOpen;

      const go = groupOrder(a.meta.group) - groupOrder(b.meta.group);
      if (go !== 0) return go;

      return a.meta.id.localeCompare(b.meta.id);
    });

    return tab === "All" ? arr : arr.filter((x) => x.meta.group === tab);
  }, [live, tab, nowTick]);

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

      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3">
        {list.map((a) => (
          <AssetCard key={a.meta.id} a={a} hasAnchor={!!anchor[a.meta.id]} highlighted={highlightedIds.includes(a.meta.id)} />
        ))}
      </div>
    </div>
  );
}

function AssetCard({ a,hasAnchor,highlighted,}: {
  a: LiveAsset;
  hasAnchor: boolean;
  highlighted?: boolean;
}) {
  const marketStatus = getMarketStatus(a.meta);
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
    <div
    className={[
      "rounded-2xl border p-3 bg-zinc-950 transition",
      highlighted
        ? "border-cyan-400 shadow-[0_0_0_1px_rgba(34,211,238,0.4),0_0_24px_rgba(34,211,238,0.18)]"
        : "border-zinc-800",
    ].join(" ")}
  >
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                {a.meta.group}
              </span>

              <span
                className={[
                  "text-[10px] px-2 py-0.5 rounded-full border",
                  hasAnchor
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-zinc-700 bg-zinc-900 text-zinc-400",
                ].join(" ")}
              >
                {hasAnchor ? "LIVE" : "NO DATA"}
              </span>

              {!marketStatus.isOpen && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300">
                  非交易
                </span>
              )}
            </div>
            <div className="text-base font-semibold text-zinc-100 leading-tight line-clamp-2 min-h-[40px]">
              {a.meta.name}
            </div>

            <div className="text-xs text-zinc-500">{a.meta.id}</div>
          </div>

          <div className="text-right shrink-0 min-w-[110px]">
            {hasAnchor ? (
              <div className="text-xl font-semibold whitespace-nowrap tabular-nums text-zinc-100">
                {fmtPrice(a.meta.id, a.last)}
                {a.meta.unit ? a.meta.unit : ""}
              </div>
            ) : (
              <div className="text-sm font-semibold text-zinc-500 whitespace-nowrap">
                NO DATA
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 text-xs whitespace-nowrap tabular-nums">
          <span className={p1h >= 0 ? "text-emerald-300" : "text-red-300"}>
            1h {p1h >= 0 ? "+" : ""}
            {p1h.toFixed(2)}%
          </span>
          <span className={p24h >= 0 ? "text-emerald-300" : "text-red-300"}>
            24h {p24h >= 0 ? "+" : ""}
            {p24h.toFixed(2)}%
          </span>
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
