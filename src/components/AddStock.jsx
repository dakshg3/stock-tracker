import { useState } from "react";

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
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
          }}
          placeholder="Enter NSE ticker (e.g. RELIANCE)"
          className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
