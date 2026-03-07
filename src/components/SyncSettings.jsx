import { useState, useEffect } from "react";
import {
  getToken,
  setToken,
  clearToken,
  getGistId,
  verifyToken,
  pushToGist,
  pullFromGist,
  isSyncConfigured,
} from "../services/gistSync";

export default function SyncSettings({ watchlist, portfolio, onPull, onClose }) {
  const [token, setTokenLocal] = useState("");
  const [maskedToken, setMaskedToken] = useState("");
  const [gistId, setGistIdLocal] = useState("");
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState(""); // idle | verifying | verified | error | pushing | pulling
  const [message, setMessage] = useState("");
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    const saved = getToken();
    if (saved) {
      setMaskedToken(`${saved.slice(0, 6)}••••••••${saved.slice(-4)}`);
      setConfigured(true);
      setGistIdLocal(getGistId());
      // Auto-verify
      verifyToken()
        .then((login) => {
          setUsername(login);
          setStatus("verified");
        })
        .catch(() => {
          setStatus("error");
          setMessage("Token invalid or expired");
        });
    }
  }, []);

  const handleSaveToken = async () => {
    if (!token.trim()) return;
    setStatus("verifying");
    setMessage("");
    setToken(token.trim());

    try {
      const login = await verifyToken();
      setUsername(login);
      setMaskedToken(`${token.slice(0, 6)}••••••••${token.slice(-4)}`);
      setConfigured(true);
      setTokenLocal("");
      setStatus("verified");
      setMessage(`Connected as ${login}`);
    } catch {
      clearToken();
      setConfigured(false);
      setStatus("error");
      setMessage("Invalid token — check permissions (needs Gist scope)");
    }
  };

  const handleDisconnect = () => {
    clearToken();
    setConfigured(false);
    setUsername("");
    setMaskedToken("");
    setGistIdLocal("");
    setStatus("");
    setMessage("Disconnected");
  };

  const handlePush = async () => {
    setStatus("pushing");
    setMessage("");
    try {
      const result = await pushToGist(watchlist, portfolio);
      setGistIdLocal(result.gistId);
      setStatus("verified");
      setMessage(`Data ${result.action} successfully ✓`);
    } catch (err) {
      setStatus("error");
      setMessage(`Push failed: ${err.message}`);
    }
  };

  const handlePull = async () => {
    setStatus("pulling");
    setMessage("");
    try {
      const data = await pullFromGist();
      if (data) {
        onPull(data);
        setStatus("verified");
        setMessage(`Loaded ${data.watchlist.length} watchlist + ${data.portfolio.length} portfolio items ✓`);
      } else {
        setStatus("verified");
        setMessage("No data found in Gist — push first");
      }
    } catch (err) {
      setStatus("error");
      setMessage(`Pull failed: ${err.message}`);
    }
  };

  const isBusy = status === "verifying" || status === "pushing" || status === "pulling";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span>⚙️</span> Cloud Sync Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors cursor-pointer text-xl"
          >
            ✕
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-400 mb-5 leading-relaxed">
          Sync your watchlist & portfolio across devices using a{" "}
          <span className="text-gray-300 font-medium">private GitHub Gist</span>.
          Your token is stored only in this browser's localStorage.
        </p>

        {/* Token input or status */}
        {configured ? (
          <div className="mb-5 space-y-3">
            <div className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Connected as</p>
                <p className="text-sm font-medium text-white">
                  {username || "verifying…"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-0.5">Token</p>
                <p className="text-xs text-gray-400 font-mono">{maskedToken}</p>
              </div>
            </div>

            {gistId && (
              <div className="bg-gray-800 rounded-lg px-4 py-2">
                <p className="text-xs text-gray-500 mb-0.5">Gist ID</p>
                <a
                  href={`https://gist.github.com/${gistId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 font-mono"
                >
                  {gistId}
                </a>
              </div>
            )}

            {/* Sync buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handlePush}
                disabled={isBusy}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {status === "pushing" ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full" />
                    Pushing…
                  </span>
                ) : (
                  "↑ Push to Cloud"
                )}
              </button>
              <button
                onClick={handlePull}
                disabled={isBusy || !gistId}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {status === "pulling" ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full" />
                    Pulling…
                  </span>
                ) : (
                  "↓ Pull from Cloud"
                )}
              </button>
            </div>

            <button
              onClick={handleDisconnect}
              className="w-full px-4 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
            >
              Disconnect & Clear Token
            </button>
          </div>
        ) : (
          <div className="mb-5 space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                GitHub Personal Access Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setTokenLocal(e.target.value)}
                placeholder="ghp_xxxx or github_pat_xxxx"
                className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === "Enter" && handleSaveToken()}
              />
            </div>

            <button
              onClick={handleSaveToken}
              disabled={!token.trim() || isBusy}
              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {status === "verifying" ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full" />
                  Verifying…
                </span>
              ) : (
                "Connect"
              )}
            </button>

            {/* How to get a token */}
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-300 transition-colors">
                How to create a token →
              </summary>
              <ol className="mt-2 space-y-1 pl-4 list-decimal text-gray-400 leading-relaxed">
                <li>
                  Go to{" "}
                  <a
                    href="https://github.com/settings/tokens?type=beta"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    GitHub → Settings → Fine-grained tokens
                  </a>
                </li>
                <li>Click <strong className="text-gray-300">Generate new token</strong></li>
                <li>Name: <code className="text-gray-300">stock-tracker</code></li>
                <li>Expiration: 90 days</li>
                <li>
                  Account permissions → <strong className="text-gray-300">Gists → Read and write</strong>
                </li>
                <li>Generate & paste above</li>
              </ol>
            </details>
          </div>
        )}

        {/* Status message */}
        {message && (
          <div
            className={`text-xs px-3 py-2 rounded-lg ${
              status === "error"
                ? "bg-red-500/10 text-red-400"
                : "bg-green-500/10 text-green-400"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
