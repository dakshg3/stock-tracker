import { useState } from "react";
import StockChart from "./StockChart";

function fmt(n) {
  if (n == null) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function PortfolioTable({ holdings, quotes, onRemove, onEdit, onSelect, loading }) {
  const [editingSymbol, setEditingSymbol] = useState(null);
  const [editQty, setEditQty] = useState("");
  const [editPrice, setEditPrice] = useState("");

  if (loading && quotes.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <div className="animate-spin inline-block w-8 h-8 border-2 border-gray-600 border-t-emerald-500 rounded-full mb-4" />
        <p>Fetching portfolio data…</p>
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-4xl mb-3">💼</p>
        <p className="text-lg">Your portfolio is empty</p>
        <p className="text-sm">Add holdings above to track your investments</p>
      </div>
    );
  }

  // Build enriched rows
  const rows = holdings.map((h) => {
    const q = quotes.find((qu) => qu.symbol === h.symbol);
    const currentPrice = q?.regularMarketPrice ?? 0;
    const invested = h.qty * h.avgPrice;
    const currentValue = h.qty * currentPrice;
    const pnl = currentValue - invested;
    const pnlPct = invested ? (pnl / invested) * 100 : 0;
    const dayChange = q?.regularMarketChange ?? 0;
    const dayChangePct = q?.regularMarketChangePercent ?? 0;

    return { ...h, q, currentPrice, invested, currentValue, pnl, pnlPct, dayChange, dayChangePct };
  });

  // Totals
  const totalInvested = rows.reduce((s, r) => s + r.invested, 0);
  const totalCurrent = rows.reduce((s, r) => s + r.currentValue, 0);
  const totalPnl = totalCurrent - totalInvested;
  const totalPnlPct = totalInvested ? (totalPnl / totalInvested) * 100 : 0;

  const startEdit = (h) => {
    setEditingSymbol(h.symbol);
    setEditQty(String(h.qty));
    setEditPrice(String(h.avgPrice));
  };

  const saveEdit = (symbol) => {
    const q = parseFloat(editQty);
    const p = parseFloat(editPrice);
    if (q > 0 && p > 0) {
      onEdit(symbol, q, p);
    }
    setEditingSymbol(null);
  };

  const cancelEdit = () => setEditingSymbol(null);

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total Invested" value={`₹${fmt(totalInvested)}`} />
        <SummaryCard label="Current Value" value={`₹${fmt(totalCurrent)}`} />
        <SummaryCard
          label="Total P&L"
          value={`${totalPnl >= 0 ? "+" : ""}₹${fmt(totalPnl)}`}
          sub={`${totalPnl >= 0 ? "+" : ""}${fmt(totalPnlPct)}%`}
          up={totalPnl >= 0}
        />
        <SummaryCard label="Holdings" value={holdings.length} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-800/60 text-gray-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Ticker</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Avg Price</th>
              <th className="px-4 py-3 text-right">CMP</th>
              <th className="px-4 py-3 text-right">Invested</th>
              <th className="px-4 py-3 text-right">Current</th>
              <th className="px-4 py-3 text-right">P&L</th>
              <th className="px-4 py-3 text-right">Day Chg</th>
              <th className="px-4 py-3 text-center">5D</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {rows.map((r) => {
              const pnlUp = r.pnl >= 0;
              const pnlColor = pnlUp ? "text-green-400" : "text-red-400";
              const dayUp = r.dayChange >= 0;
              const dayColor = dayUp ? "text-green-400" : "text-red-400";
              const isEditing = editingSymbol === r.symbol;

              return (
                <tr
                  key={r.symbol}
                  onClick={() => !isEditing && onSelect(r.symbol)}
                  className="hover:bg-gray-800/40 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-semibold text-white">
                    {r.symbol.replace(".NS", "")}
                  </td>
                  <td className="px-4 py-3 text-gray-300 max-w-[160px] truncate">
                    {r.q?.shortName ?? r.q?.longName ?? "—"}
                  </td>

                  {/* Qty & Avg Price — editable */}
                  {isEditing ? (
                    <>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          step="any"
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          className="w-20 px-2 py-1 rounded bg-gray-700 border border-gray-600 text-white text-right text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          step="any"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-24 px-2 py-1 rounded bg-gray-700 border border-gray-600 text-white text-right text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-right text-white">{r.qty}</td>
                      <td className="px-4 py-3 text-right text-gray-300">₹{fmt(r.avgPrice)}</td>
                    </>
                  )}

                  <td className="px-4 py-3 text-right font-medium text-white">
                    ₹{fmt(r.currentPrice)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    ₹{fmt(r.invested)}
                  </td>
                  <td className="px-4 py-3 text-right text-white font-medium">
                    ₹{fmt(r.currentValue)}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${pnlColor}`}>
                    <div>{pnlUp ? "+" : ""}₹{fmt(r.pnl)}</div>
                    <div className="text-xs opacity-75">
                      {pnlUp ? "+" : ""}{fmt(r.pnlPct)}%
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-right text-xs ${dayColor}`}>
                    {dayUp ? "+" : ""}{fmt(r.dayChange)}
                    <br />
                    {dayUp ? "+" : ""}{fmt(r.dayChangePct)}%
                  </td>
                  <td className="px-4 py-3 flex justify-center">
                    <StockChart symbol={r.symbol} />
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveEdit(r.symbol)}
                            title="Save"
                            className="text-emerald-400 hover:text-emerald-300 cursor-pointer text-xs font-medium"
                          >
                            ✓
                          </button>
                          <button
                            onClick={cancelEdit}
                            title="Cancel"
                            className="text-gray-500 hover:text-gray-300 cursor-pointer text-xs"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(r)}
                            title="Edit"
                            className="text-gray-500 hover:text-blue-400 cursor-pointer"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => onRemove(r.symbol)}
                            title="Remove"
                            className="text-gray-500 hover:text-red-400 cursor-pointer"
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Totals row */}
          <tfoot className="bg-gray-800/40 border-t border-gray-700">
            <tr className="font-semibold">
              <td className="px-4 py-3 text-white" colSpan={5}>
                TOTAL
              </td>
              <td className="px-4 py-3 text-right text-gray-300">₹{fmt(totalInvested)}</td>
              <td className="px-4 py-3 text-right text-white">₹{fmt(totalCurrent)}</td>
              <td className={`px-4 py-3 text-right ${totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                <div>{totalPnl >= 0 ? "+" : ""}₹{fmt(totalPnl)}</div>
                <div className="text-xs opacity-75">
                  {totalPnl >= 0 ? "+" : ""}{fmt(totalPnlPct)}%
                </div>
              </td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, up }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3">
      <p className="text-xs text-gray-500 uppercase mb-1">{label}</p>
      <p className={`text-lg font-bold ${up != null ? (up ? "text-green-400" : "text-red-400") : "text-white"}`}>
        {value}
      </p>
      {sub && (
        <p className={`text-xs font-medium ${up ? "text-green-400" : "text-red-400"}`}>{sub}</p>
      )}
    </div>
  );
}
