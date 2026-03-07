import { useState } from "react";

export default function AddPortfolioStock({ onAdd, existing }) {
  const [ticker, setTicker] = useState("");
  const [qty, setQty] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const t = ticker.trim().toUpperCase();
    if (!t) return;

    const symbol = t.endsWith(".NS") ? t : `${t}.NS`;
    const qtyNum = parseFloat(qty);
    const priceNum = parseFloat(avgPrice);

    if (existing.some((h) => h.symbol === symbol)) {
      setError("Already in portfolio — edit it from the table");
      return;
    }
    if (!qtyNum || qtyNum <= 0) {
      setError("Enter a valid quantity");
      return;
    }
    if (!priceNum || priceNum <= 0) {
      setError("Enter a valid avg buy price");
      return;
    }

    onAdd({ symbol, qty: qtyNum, avgPrice: priceNum });
    setTicker("");
    setQty("");
    setAvgPrice("");
    setError("");
  };

  return (
    <div className="mb-6">
      <form onSubmit={handleSubmit} className="flex gap-2 items-end flex-wrap mb-2">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-gray-500 mb-1">NSE Ticker</label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => { setTicker(e.target.value); setError(""); }}
            placeholder="e.g. RELIANCE"
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="w-28">
          <label className="block text-xs text-gray-500 mb-1">Quantity</label>
          <input
            type="number"
            step="any"
            min="0"
            value={qty}
            onChange={(e) => { setQty(e.target.value); setError(""); }}
            placeholder="Qty"
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="w-36">
          <label className="block text-xs text-gray-500 mb-1">Avg Buy Price (₹)</label>
          <input
            type="number"
            step="any"
            min="0"
            value={avgPrice}
            onChange={(e) => { setAvgPrice(e.target.value); setError(""); }}
            placeholder="₹ Price"
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
        >
          + Add Holding
        </button>
      </form>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
