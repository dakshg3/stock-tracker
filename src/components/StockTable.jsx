import StockChart from "./StockChart";

function fmt(n) {
  if (n == null) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function fmtLarge(n) {
  if (n == null) return "—";
  if (n >= 1e12) return `₹${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `₹${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  return `₹${fmt(n)}`;
}

export default function StockTable({ quotes, onRemove, onSelect, loading }) {
  if (loading && quotes.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <div className="animate-spin inline-block w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full mb-4" />
        <p>Fetching stock data…</p>
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-4xl mb-3">📈</p>
        <p className="text-lg">Your watchlist is empty</p>
        <p className="text-sm">Add stocks above to start tracking</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-800/60 text-gray-400 uppercase text-xs">
          <tr>
            <th className="px-4 py-3">Ticker</th>
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3 text-right">Price</th>
            <th className="px-4 py-3 text-right">Change</th>
            <th className="px-4 py-3 text-right">% Change</th>
            <th className="px-4 py-3 text-right">Day High</th>
            <th className="px-4 py-3 text-right">Day Low</th>
            <th className="px-4 py-3 text-right">Volume</th>
            <th className="px-4 py-3 text-right">52W H</th>
            <th className="px-4 py-3 text-right">52W L</th>
            <th className="px-4 py-3 text-center">5D Chart</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {quotes.map((q) => {
            const up = (q.regularMarketChange ?? 0) >= 0;
            const changeColor = up ? "text-green-400" : "text-red-400";

            return (
              <tr
                key={q.symbol}
                onClick={() => onSelect(q.symbol)}
                className="hover:bg-gray-800/40 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3 font-semibold text-white">
                  {q.symbol?.replace(".NS", "")}
                </td>
                <td className="px-4 py-3 text-gray-300 max-w-[200px] truncate">
                  {q.shortName ?? q.longName ?? "—"}
                </td>
                <td className="px-4 py-3 text-right font-medium text-white">
                  ₹{fmt(q.regularMarketPrice)}
                </td>
                <td className={`px-4 py-3 text-right font-medium ${changeColor}`}>
                  {up ? "+" : ""}
                  {fmt(q.regularMarketChange)}
                </td>
                <td className={`px-4 py-3 text-right font-medium ${changeColor}`}>
                  {up ? "+" : ""}
                  {fmt(q.regularMarketChangePercent)}%
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  ₹{fmt(q.regularMarketDayHigh)}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  ₹{fmt(q.regularMarketDayLow)}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {q.regularMarketVolume?.toLocaleString("en-IN") ?? "—"}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  ₹{fmt(q.fiftyTwoWeekHigh)}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  ₹{fmt(q.fiftyTwoWeekLow)}
                </td>
                <td className="px-4 py-3 flex justify-center">
                  <StockChart symbol={q.symbol} />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(q.symbol);
                    }}
                    title="Remove"
                    className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
