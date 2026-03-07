import { useEffect, useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { fetchStockQuotes, fetchStockHistory } from "../services/stockApi";

const RANGES = [
  { label: "5D", range: "5d", interval: "1d" },
  { label: "1M", range: "1mo", interval: "1d" },
  { label: "3M", range: "3mo", interval: "1d" },
  { label: "6M", range: "6mo", interval: "1wk" },
  { label: "1Y", range: "1y", interval: "1wk" },
  { label: "5Y", range: "5y", interval: "1mo" },
];

function fmt(n) {
  if (n == null) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function StockDetail({ symbol, onBack }) {
  const [quote, setQuote] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeRange, setActiveRange] = useState(RANGES[0]);
  const [loading, setLoading] = useState(true);

  // Fetch quote
  useEffect(() => {
    let cancelled = false;
    fetchStockQuotes([symbol]).then((data) => {
      if (!cancelled && data.length > 0) setQuote(data[0]);
    });
    return () => { cancelled = true; };
  }, [symbol]);

  // Fetch history when range changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchStockHistory(symbol, activeRange.range, activeRange.interval)
      .then((data) => {
        if (!cancelled) setHistory(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [symbol, activeRange]);

  const priceChange = useMemo(() => {
    if (history.length < 2) return { change: 0, pct: 0, up: true };
    const first = history[0]?.close ?? 0;
    const last = history[history.length - 1]?.close ?? 0;
    const change = last - first;
    const pct = first ? (change / first) * 100 : 0;
    return { change: +change.toFixed(2), pct: +pct.toFixed(2), up: change >= 0 };
  }, [history]);

  const color = priceChange.up ? "#22c55e" : "#ef4444";

  const up = (quote?.regularMarketChange ?? 0) >= 0;
  const changeColor = up ? "text-green-400" : "text-red-400";

  return (
    <div>
      {/* Back button + header */}
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
      >
        <span>←</span>
        <span>Back to Watchlist</span>
      </button>

      {/* Quote summary */}
      {quote ? (
        <div className="mb-8">
          <div className="flex items-baseline gap-3 mb-1">
            <h2 className="text-3xl font-bold">
              {symbol.replace(".NS", "")}
            </h2>
            <span className="text-gray-400 text-lg">
              {quote.shortName ?? quote.longName}
            </span>
          </div>
          <div className="flex items-baseline gap-4">
            <span className="text-4xl font-bold">
              ₹{fmt(quote.regularMarketPrice)}
            </span>
            <span className={`text-xl font-semibold ${changeColor}`}>
              {up ? "+" : ""}{fmt(quote.regularMarketChange)}{" "}
              ({up ? "+" : ""}{fmt(quote.regularMarketChangePercent)}%)
            </span>
          </div>
        </div>
      ) : (
        <div className="mb-8 h-24 bg-gray-800 rounded-xl animate-pulse" />
      )}

      {/* Range selector */}
      <div className="flex gap-2 mb-4">
        {RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setActiveRange(r)}
            className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors cursor-pointer ${
              activeRange.label === r.label
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Chart area + period change badge */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 mb-8">
        {loading ? (
          <div className="h-72 flex items-center justify-center text-gray-500">
            <div className="animate-spin w-6 h-6 border-2 border-gray-600 border-t-blue-500 rounded-full" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs text-gray-500 uppercase font-medium">
                {activeRange.label} Performance
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  priceChange.up
                    ? "bg-green-500/10 text-green-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {priceChange.up ? "+" : ""}{fmt(priceChange.change)} (
                {priceChange.up ? "+" : ""}{fmt(priceChange.pct)}%)
              </span>
            </div>

            {/* Price chart */}
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="detailGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#374151" }}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${v}`}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111827",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                    labelStyle={{ color: "#9ca3af" }}
                    itemStyle={{ color: "#fff" }}
                    formatter={(v) => [`₹${fmt(v)}`, "Close"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke={color}
                    strokeWidth={2}
                    fill="url(#detailGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Volume chart */}
            <div className="h-24 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={history}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: "#111827",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#9ca3af" }}
                    itemStyle={{ color: "#fff" }}
                    formatter={(v) => [v?.toLocaleString("en-IN"), "Volume"]}
                  />
                  <Bar dataKey="volume" fill="#3b82f6" opacity={0.4} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* Stats grid */}
      {quote && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { label: "Open", value: `₹${fmt(quote.regularMarketOpen)}` },
            { label: "Previous Close", value: `₹${fmt(quote.previousClose)}` },
            { label: "Day High", value: `₹${fmt(quote.regularMarketDayHigh)}` },
            { label: "Day Low", value: `₹${fmt(quote.regularMarketDayLow)}` },
            { label: "52 Week High", value: `₹${fmt(quote.fiftyTwoWeekHigh)}` },
            { label: "52 Week Low", value: `₹${fmt(quote.fiftyTwoWeekLow)}` },
            { label: "Volume", value: quote.regularMarketVolume?.toLocaleString("en-IN") ?? "—" },
            { label: "Currency", value: quote.currency ?? "INR" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3"
            >
              <p className="text-xs text-gray-500 uppercase mb-1">{stat.label}</p>
              <p className="text-lg font-semibold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
