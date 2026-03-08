import { useRef } from "react";
import {
  exportWatchlistCSV,
  parseWatchlistCSV,
  exportPortfolioCSV,
  parsePortfolioCSV,
} from "../services/stockApi";

export default function CsvManager({ watchlist, onImport, portfolio, onImportPortfolio, mode }) {
  const fileRef = useRef(null);

  const isPortfolio = mode === "portfolio";

  const handleExport = () => {
    if (isPortfolio) {
      if (portfolio?.length > 0) exportPortfolioCSV(portfolio);
    } else {
      if (watchlist?.length > 0) exportWatchlistCSV(watchlist);
    }
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      if (isPortfolio) {
        const entries = parsePortfolioCSV(evt.target.result);
        if (entries.length > 0) onImportPortfolio(entries);
      } else {
        const symbols = parseWatchlistCSV(evt.target.result);
        if (symbols.length > 0) onImport(symbols);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const isEmpty = isPortfolio ? !portfolio?.length : !watchlist?.length;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExport}
        disabled={isEmpty}
        className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        ↓ Export CSV
      </button>
      <button
        onClick={() => fileRef.current?.click()}
        className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors cursor-pointer"
      >
        ↑ Import CSV
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleImport}
        className="hidden"
      />
    </div>
  );
}
