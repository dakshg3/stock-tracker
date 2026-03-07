import { useState, useEffect } from "react";
import {
  getToken,
  setToken,
  clearToken,
  getGistId,
  verifyToken,
  isSyncConfigured,
} from "../services/gistSync";

export default function SyncSettings({ onClose, onTokenChange }) {
  const [token, setTokenLocal] = useState("");
  const [maskedToken, setMaskedToken] = useState("");
  const [gistId, setGistIdLocal] = useState("");
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState(""); // idle | verifying | verified | error
  const [message, setMessage] = useState("");
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    const saved = getToken();
    if (saved) {
      setMaskedToken(`${saved.slice(0, 6)}••••••••${saved.slice(-4)}`);
      setConfigured(true);
      setGistIdLocal(getGistId());
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
      setMessage(`Connected as ${login} — sync is now automatic!`);
      onTokenChange?.();
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
    setMessage("Disconnected — data stays in localStorage only");
    onTokenChange?.();
  };

  const isBusy = status === "verifying";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span>☁️</span> Cloud Sync
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
          Once connected, sync is <span className="text-green-400 font-medium">fully automatic</span> —
          every add/remove/edit is pushed to the cloud instantly.
        </p>

        {/* Connected state */}
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

            {/* Auto-sync info */}
            <div className="bg-green-500/5 border border-green-500/20 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <p className="text-xs text-green-400 font-medium">Auto-sync active</p>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Changes are automatically pushed to the cloud within 2 seconds.
                Data is pulled from the cloud when you open the app on any device.
              </p>
            </div>

            {/* View Gist link */}
            {gistId && (
              <a
                href={`https://gist.github.com/${gistId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between bg-gray-800 hover:bg-gray-750 rounded-lg px-4 py-3 group transition-colors"
              >
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Your synced data</p>
                  <p className="text-xs text-blue-400 group-hover:text-blue-300 font-mono">
                    gist.github.com/{gistId.slice(0, 12)}…
                  </p>
                </div>
                <span className="text-gray-500 group-hover:text-blue-400 transition-colors">
                  ↗
                </span>
              </a>
            )}

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
                "Connect & Enable Auto-Sync"
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
