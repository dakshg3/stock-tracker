import { useState, useRef, useEffect } from "react";
import { searchTickers } from "../services/stockApi";

export default function AddPortfolioStock({ onAdd, existing }) {
  const [ticker, setTicker] = useState("");
  const [qty, setQty] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);
  const timerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleTickerChange = (e) => {
    const v = e.target.value;
    setTicker(v);
    setError("");
    clearTimeout(timerRef.current);
    if (v.trim().length < 1) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      const res = await searchTickers(v.trim());
      setResults(res);
      setShowDropdown(res.length > 0);
    }, 300);
  };

  const pickResult = (symbol) => {
    setTicker(symbol.replace(".NS", ""));
    setShowDropdown(false);
  };

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
        <div className="relative flex-1 min-w-[160px]" ref={wrapperRef}>
          <label className="block text-xs text-gray-500 mb-1">NSE Ticker</label>
          <input
            type="text"
            value={ticker}
            onChange={handleTickerChange}
            onKeyDown={(e) => e.key === "Escape" && setShowDropdown(false)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="e.g. RELIANCE"
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {showDropdown && (
            <ul className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-auto rounded-lg bg-gray-800 border border-gray-700 shadow-lg">
              {results.map((r) => (
                <li
                  key={r.symbol}
                  onClick={() => pickResult(r.symbol)}
                  className="px-4 py-2 flex justify-between items-center hover:bg-gray-700 cursor-pointer text-sm"
                >
                  <span className="text-white font-medium">{r.symbol.replace(".NS", "")}</span>
                  <span className="text-gray-400 text-xs truncate ml-3 max-w-[60%] text-right">{r.shortname}</span>
                </li>
              ))}
            </ul>
          )}
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
