# 📈 Indian Stock Tracker

A simple personal stock tracker for Indian (NSE) stocks. Runs entirely as a static React app — no backend, no database. Watchlist is persisted in your browser's `localStorage`.

![Tech Stack](https://img.shields.io/badge/React-Vite-blue) ![Styling](https://img.shields.io/badge/TailwindCSS-4-06B6D4) ![Deploy](https://img.shields.io/badge/GitHub%20Pages-ready-green)

## Features

- **Dashboard table** — Ticker, Company Name, Price, Day Change, % Change, Market Cap, Volume, 52-Week High/Low
- **5-day sparkline charts** per stock (via Recharts)
- **Add / Remove** stocks from your watchlist
- **Auto-refresh** prices every 30 seconds
- **Green / Red** coloring for gains / losses
- **Responsive** dark-mode UI
- **localStorage** persistence — your watchlist survives page reloads
- **Zero backend** — deployable on GitHub Pages

## Data Source

Live data from Yahoo Finance endpoints using NSE tickers with `.NS` suffix:

| Endpoint | URL |
|----------|-----|
| Quote | `https://query1.finance.yahoo.com/v7/finance/quote?symbols=TCS.NS` |
| Chart | `https://query1.finance.yahoo.com/v8/finance/chart/TCS.NS?range=5d&interval=1d` |

A CORS proxy (`corsproxy.io`) is used to make requests from the browser.

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

## Deploying to GitHub Pages

1. **Edit `package.json`** — replace `<your-github-username>` in the `homepage` field:
   ```json
   "homepage": "https://YOUR_USERNAME.github.io/stock-tracker"
   ```

2. **Edit `vite.config.js`** — the `base` is already set to `/stock-tracker/`. Change it if your repo name differs.

3. **Deploy**:
   ```bash
   npm run deploy
   ```
   This builds the project and pushes the `dist/` folder to the `gh-pages` branch.

4. **Enable GitHub Pages** — go to your repo → Settings → Pages → Source: **Deploy from a branch** → Branch: `gh-pages` / `/ (root)`.

## Project Structure

```
stock-tracker/
├── src/
│   ├── components/
│   │   ├── AddStock.jsx      # Input field + quick-add suggestions
│   │   ├── StockChart.jsx    # 5-day sparkline area chart
│   │   └── StockTable.jsx    # Main dashboard table
│   ├── services/
│   │   └── stockApi.js       # Yahoo Finance API + localStorage helpers
│   ├── App.jsx               # Root component with state management
│   ├── main.jsx              # Entry point
│   └── index.css             # Tailwind import
├── index.html
├── vite.config.js
└── package.json
```

## Example localStorage Format

```json
{
  "watchlist": ["RELIANCE.NS", "TCS.NS", "INFY.NS"]
}
```

## Sample Tickers

| Company | Ticker |
|---------|--------|
| Reliance Industries | `RELIANCE.NS` |
| Tata Consultancy Services | `TCS.NS` |
| Infosys | `INFY.NS` |
| HDFC Bank | `HDFCBANK.NS` |
| State Bank of India | `SBIN.NS` |

## Tech Stack

- **React 19** + **Vite 7**
- **Axios** for HTTP requests
- **Recharts** for sparkline charts
- **Tailwind CSS 4** for styling
- **gh-pages** for deployment

## License

MIT
