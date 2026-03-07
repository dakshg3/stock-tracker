import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  YAxis,
} from "recharts";
import { fetchStockHistory } from "../services/stockApi";

export default function StockChart({ symbol }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchStockHistory(symbol)
      .then((d) => !cancelled && setData(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (data.length === 0) {
    return <div className="w-28 h-10 bg-gray-800 rounded animate-pulse" />;
  }

  const first = data[0]?.close ?? 0;
  const last = data[data.length - 1]?.close ?? 0;
  const color = last >= first ? "#22c55e" : "#ef4444";

  return (
    <div className="w-28 h-10">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <Tooltip
            contentStyle={{
              background: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelStyle={{ color: "#9ca3af" }}
            itemStyle={{ color: "#fff" }}
            formatter={(v) => [`₹${v}`, "Close"]}
          />
          <Area
            type="monotone"
            dataKey="close"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#grad-${symbol})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
