import axios from "axios";

const CORS_PROXY = "https://corsproxy.io/?url=";
const BASE = "https://query1.finance.yahoo.com";

/**
 * Fetch chart data for a single symbol from the v8 chart endpoint.
 * The `meta` field contains live quote-like data (no auth required).
 */
async function fetchChart(symbol, range = "1d", interval = "1d") {
  const url = `${BASE}/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;
  const { data } = await axios.get(`${CORS_PROXY}${encodeURIComponent(url)}`);
  return data?.chart?.result?.[0] ?? null;
}

/**
 * Fetch live quotes for one or more symbols.
 * Uses the v8 chart endpoint (meta field) since v7/quote now requires auth.
 * Returns an array of quote-like objects.
 */
export async function fetchStockQuotes(symbols) {
  const results = await Promise.allSettled(
    symbols.map(async (symbol) => {
      const result = await fetchChart(symbol, "1d", "1d");
      if (!result) return null;

      const meta = result.meta;
      const quote = result.indicators?.quote?.[0] ?? {};

      const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? 0;
      const price = meta.regularMarketPrice ?? 0;
      const change = price - prevClose;
      const changePct = prevClose ? (change / prevClose) * 100 : 0;

      return {
        symbol: meta.symbol,
        shortName: meta.shortName ?? meta.longName ?? symbol.replace(".NS", ""),
        longName: meta.longName,
        regularMarketPrice: price,
        regularMarketChange: +change.toFixed(2),
        regularMarketChangePercent: +changePct.toFixed(2),
        regularMarketVolume: meta.regularMarketVolume ?? quote.volume?.[0] ?? null,
        regularMarketDayHigh: meta.regularMarketDayHigh ?? quote.high?.[0] ?? null,
        regularMarketDayLow: meta.regularMarketDayLow ?? quote.low?.[0] ?? null,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
        previousClose: prevClose,
        regularMarketOpen: meta.regularMarketOpen ?? quote.open?.[0] ?? null,
        currency: meta.currency,
      };
    })
  );

  return results
    .filter((r) => r.status === "fulfilled" && r.value !== null)
    .map((r) => r.value);
}

/**
 * Fetch historical chart data for a single symbol with configurable range.
 * Returns an array of { date, close, high, low, open, volume } objects.
 */
export async function fetchStockHistory(symbol, range = "5d", interval = "1d") {
  const result = await fetchChart(symbol, range, interval);
  if (!result) return [];

  const timestamps = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  const closes = q.close ?? [];
  const highs = q.high ?? [];
  const lows = q.low ?? [];
  const opens = q.open ?? [];
  const volumes = q.volume ?? [];

  return timestamps.map((ts, i) => ({
    date: new Date(ts * 1000).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    }),
    timestamp: ts,
    close: closes[i] != null ? +closes[i].toFixed(2) : null,
    high: highs[i] != null ? +highs[i].toFixed(2) : null,
    low: lows[i] != null ? +lows[i].toFixed(2) : null,
    open: opens[i] != null ? +opens[i].toFixed(2) : null,
    volume: volumes[i] ?? null,
  }));
}

/* ── localStorage helpers ── */

const STORAGE_KEY = "stock-tracker-watchlist";

export function loadWatchlist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw).watchlist : [];
  } catch {
    return [];
  }
}

export function saveWatchlist(watchlist) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ watchlist }));
}

/* ── Portfolio localStorage helpers ── */

const PORTFOLIO_KEY = "stock-tracker-portfolio";

/**
 * Portfolio entry: { symbol: string, qty: number, avgPrice: number }
 */
export function loadPortfolio() {
  try {
    const raw = localStorage.getItem(PORTFOLIO_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePortfolio(portfolio) {
  localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(portfolio));
}

/* ── Ticker search / autocomplete ── */

/**
 * Search Yahoo Finance for tickers matching a query string.
 * Uses /v1/finance/search which works without auth.
 * Returns [{ symbol, shortname }] filtered to NSE (.NS) results.
 */
export async function searchTickers(query) {
  if (!query || query.length < 1) return [];
  const url = `${BASE}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&listsCount=0`;
  try {
    const { data } = await axios.get(`${CORS_PROXY}${encodeURIComponent(url)}`);
    const quotes = data?.quotes ?? [];
    return quotes
      .filter((q) => q.symbol?.endsWith(".NS") || q.exchange === "NSI")
      .map((q) => ({
        symbol: q.symbol.endsWith(".NS") ? q.symbol : `${q.symbol}.NS`,
        shortname: q.shortname || q.longname || q.symbol,
      }));
  } catch {
    return [];
  }
}
