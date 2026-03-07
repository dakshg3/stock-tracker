import { useState, useEffect, useCallback, useRef } from "react";
import AddStock from "./components/AddStock";
import StockTable from "./components/StockTable";
import StockDetail from "./components/StockDetail";
import CsvManager from "./components/CsvManager";
import AddPortfolioStock from "./components/AddPortfolioStock";
import PortfolioTable from "./components/PortfolioTable";
import SyncSettings from "./components/SyncSettings";
import {
  fetchStockQuotes,
  loadWatchlist,
  saveWatchlist,
  loadPortfolio,
  savePortfolio,
} from "./services/stockApi";
import { isSyncConfigured, pushToGist, pullFromGist } from "./services/gistSync";

const REFRESH_INTERVAL = 30_000; // 30 seconds

/* ── Simple hash-based routing ── */
function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const stockMatch = hash.match(/^#\/stock\/(.+)$/);
  const isPortfolio = hash === "#/portfolio";

  let page = "watchlist";
  if (stockMatch) page = "detail";
  else if (isPortfolio) page = "portfolio";

  return {
    page,
    symbol: stockMatch ? decodeURIComponent(stockMatch[1]) : null,
    goToStock: (sym) => (window.location.hash = `#/stock/${encodeURIComponent(sym)}`),
    goToWatchlist: () => (window.location.hash = ""),
    goToPortfolio: () => (window.location.hash = "#/portfolio"),
  };
}

export default function App() {
  const [watchlist, setWatchlist] = useState(() => loadWatchlist());
  const [portfolio, setPortfolio] = useState(() => loadPortfolio());
  const [quotes, setQuotes] = useState([]);
  const [portfolioQuotes, setPortfolioQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [syncStatus, setSyncStatus] = useState(""); // "" | "syncing" | "synced" | "error"
  const [syncConfigured, setSyncConfigured] = useState(() => isSyncConfigured());
  const timerRef = useRef(null);
  const syncTimerRef = useRef(null);
  const { page, symbol, goToStock, goToWatchlist, goToPortfolio } = useHashRoute();

  // ── Fetch watchlist quotes ──
  const refreshWatchlist = useCallback(async () => {
    if (watchlist.length === 0) { setQuotes([]); return; }
    try {
      const data = await fetchStockQuotes(watchlist);
      const ordered = watchlist.map((s) => data.find((q) => q.symbol === s)).filter(Boolean);
      setQuotes(ordered);
    } catch (err) {
      console.error("Failed to fetch watchlist quotes:", err);
    }
  }, [watchlist]);

  // ── Fetch portfolio quotes ──
  const refreshPortfolio = useCallback(async () => {
    if (portfolio.length === 0) { setPortfolioQuotes([]); return; }
    const symbols = portfolio.map((h) => h.symbol);
    try {
      const data = await fetchStockQuotes(symbols);
      setPortfolioQuotes(data);
    } catch (err) {
      console.error("Failed to fetch portfolio quotes:", err);
    }
  }, [portfolio]);

  // ── Combined refresh ──
  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([refreshWatchlist(), refreshPortfolio()]);
    setLastUpdated(new Date());
    setLoading(false);
  }, [refreshWatchlist, refreshPortfolio]);

  // ── Auto-refresh (only on list pages) ──
  useEffect(() => {
    if (page === "detail") return;
    refresh();
    timerRef.current = setInterval(refresh, REFRESH_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [refresh, page]);

  // ── Persist ──
  useEffect(() => { saveWatchlist(watchlist); }, [watchlist]);
  useEffect(() => { savePortfolio(portfolio); }, [portfolio]);

  // ── Auto-push to Gist (debounced) ──
  useEffect(() => {
    if (!syncConfigured) return;
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      try {
        setSyncStatus("syncing");
        await pushToGist(watchlist, portfolio);
        setSyncStatus("synced");
        // fade the "synced" indicator after 3s
        setTimeout(() => setSyncStatus(""), 3000);
      } catch {
        setSyncStatus("error");
      }
    }, 2000); // 2s debounce
    return () => clearTimeout(syncTimerRef.current);
  }, [watchlist, portfolio, syncConfigured]);

  // ── Auto-pull from Gist on first load ──
  useEffect(() => {
    if (!syncConfigured) return;
    setSyncStatus("syncing");
    pullFromGist()
      .then((data) => {
        if (data) {
          if (data.watchlist.length > 0) setWatchlist(data.watchlist);
          if (data.portfolio.length > 0) setPortfolio(data.portfolio);
        }
        setSyncStatus("synced");
        setTimeout(() => setSyncStatus(""), 3000);
      })
      .catch(() => setSyncStatus("error"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Watchlist handlers ──
  const addStock = (symbol) => setWatchlist((prev) => [...prev, symbol]);
  const removeStock = (symbol) => {
    setWatchlist((prev) => prev.filter((s) => s !== symbol));
    setQuotes((prev) => prev.filter((q) => q.symbol !== symbol));
  };
  const importCSV = (symbols) => {
    setWatchlist((prev) => {
      const merged = [...prev];
      for (const s of symbols) { if (!merged.includes(s)) merged.push(s); }
      return merged;
    });
  };

  // ── Portfolio handlers ──
  const addHolding = (entry) => setPortfolio((prev) => [...prev, entry]);
  const removeHolding = (symbol) => {
    setPortfolio((prev) => prev.filter((h) => h.symbol !== symbol));
    setPortfolioQuotes((prev) => prev.filter((q) => q.symbol !== symbol));
  };
  const editHolding = (symbol, qty, avgPrice) => {
    setPortfolio((prev) =>
      prev.map((h) => (h.symbol === symbol ? { ...h, qty, avgPrice } : h))
    );
  };
  const importPortfolioCSV = (entries) => {
    setPortfolio((prev) => {
      const merged = [...prev];
      for (const e of entries) {
        if (!merged.some((h) => h.symbol === e.symbol)) merged.push(e);
      }
      return merged;
    });
  };

  const isDashboard = page === "watchlist" || page === "portfolio";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={goToWatchlist}
            className="flex items-center gap-3 cursor-pointer"
          >
            <span className="text-2xl">📈</span>
            <h1 className="text-xl font-bold tracking-tight">
              Indian Stock Tracker
            </h1>
          </button>
          <div className="flex items-center gap-4">
            {isDashboard && (
              <CsvManager
                watchlist={watchlist}
                onImport={importCSV}
                portfolio={portfolio}
                onImportPortfolio={importPortfolioCSV}
                mode={page}
              />
            )}
            <button
              onClick={() => setShowSettings(true)}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                syncConfigured
                  ? "text-green-400 hover:bg-green-500/10"
                  : "text-gray-500 hover:bg-gray-800 hover:text-gray-300"
              }`}
              title={syncConfigured ? "Cloud Sync — connected" : "Set up Cloud Sync"}
            >
              {syncStatus === "syncing" ? (
                <span className="inline-block w-4 h-4 border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin" />
              ) : syncStatus === "synced" ? (
                <span className="text-green-400 text-sm">☁️ ✓</span>
              ) : syncStatus === "error" ? (
                <span className="text-red-400 text-sm">☁️ ✕</span>
              ) : (
                <span className="text-lg">☁️</span>
              )}
            </button>
            <div className="text-xs text-gray-500 flex items-center gap-2">
              {lastUpdated && (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Updated {lastUpdated.toLocaleTimeString("en-IN")}
                </>
              )}
              <span className="text-gray-700">• refreshes every 30s</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {page === "detail" && symbol ? (
          <StockDetail symbol={symbol} onBack={() => window.history.back()} />
        ) : (
          <>
            {/* Tab bar */}
            <div className="flex gap-1 mb-6 bg-gray-900 rounded-lg p-1 w-fit">
              <button
                onClick={goToWatchlist}
                className={`px-5 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                  page === "watchlist"
                    ? "bg-gray-800 text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                👁 Watchlist
              </button>
              <button
                onClick={goToPortfolio}
                className={`px-5 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                  page === "portfolio"
                    ? "bg-gray-800 text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                💼 Portfolio
              </button>
            </div>

            {page === "watchlist" && (
              <>
                <AddStock onAdd={addStock} existing={watchlist} />
                <StockTable
                  quotes={quotes}
                  onRemove={removeStock}
                  onSelect={goToStock}
                  loading={loading}
                />
              </>
            )}

            {page === "portfolio" && (
              <>
                <AddPortfolioStock onAdd={addHolding} existing={portfolio} />
                <PortfolioTable
                  holdings={portfolio}
                  quotes={portfolioQuotes}
                  onRemove={removeHolding}
                  onEdit={editHolding}
                  onSelect={goToStock}
                  loading={loading}
                />
              </>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-600 py-6 border-t border-gray-800">
        Data sourced from Yahoo Finance • Prices may be delayed up to 15 min
      </footer>

      {/* Sync settings modal */}
      {showSettings && (
        <SyncSettings
          onClose={() => setShowSettings(false)}
          onTokenChange={() => setSyncConfigured(isSyncConfigured())}
        />
      )}
    </div>
  );
}
