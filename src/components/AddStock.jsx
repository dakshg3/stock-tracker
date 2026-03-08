import { useState, useRef, useEffect } from "react";
import { searchTickers } from "../services/stockApi";

const SUGGESTIONS = [
  "RELIANCE",
  "TCS",
  "INFY",
  "HDFCBANK",
  "SBIN",
  "ICICIBANK",
  "BHARTIARTL",
  "ITC",
  "LT",
  "WIPRO",
];

export default function AddStock({ onAdd, existing }) {
  const [value, setValue] = useState("");
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

  const handleChange = (e) => {
    const v = e.target.value;
    setValue(v);
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
    setShowDropdown(false);
    setValue("");
    if (existing.includes(symbol)) {
      setError("Already in watchlist");
      return;
    }
    onAdd(symbol);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const ticker = value.trim().toUpperCase();
    if (!ticker) return;

    const symbol = ticker.endsWith(".NS") ? ticker : `${ticker}.NS`;

    if (existing.includes(symbol)) {
      setError("Already in watchlist");
      return;
    }

    onAdd(symbol);
    setValue("");
    setError("");
  };

  const addSuggestion = (name) => {
    const symbol = `${name}.NS`;
    if (!existing.includes(symbol)) onAdd(symbol);
  };

  return (
    <div className="mb-6">
      <form onSubmit={handleSubmit} className="flex gap-2 items-center mb-3">
        <div className="relative flex-1" ref={wrapperRef}>
          <input
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={(e) => e.key === "Escape" && setShowDropdown(false)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="Search NSE ticker (e.g. RELIANCE)"
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <button
          type="submit"
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
        >
          + Add
        </button>
      </form>

      {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.filter((s) => !existing.includes(`${s}.NS`)).map((s) => (
          <button
            key={s}
            onClick={() => addSuggestion(s)}
            className="px-3 py-1 text-xs rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors cursor-pointer"
          >
            + {s}
          </button>
        ))}
      </div>
    </div>
  );
}
