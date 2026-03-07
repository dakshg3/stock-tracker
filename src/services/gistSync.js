import axios from "axios";

const GIST_API = "https://api.github.com/gists";
const FILENAME = "stock-tracker-data.json";
const TOKEN_KEY = "stock-tracker-gh-token";
const GIST_ID_KEY = "stock-tracker-gist-id";

/* ── Token management ── */

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token.trim());
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(GIST_ID_KEY);
}

export function getGistId() {
  return localStorage.getItem(GIST_ID_KEY) ?? "";
}

function setGistId(id) {
  localStorage.setItem(GIST_ID_KEY, id);
}

function headers() {
  const token = getToken();
  if (!token) throw new Error("No GitHub token configured");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
  };
}

/* ── Sync operations ── */

/**
 * Push local data to Gist. Creates a new private Gist if none exists,
 * otherwise updates the existing one.
 */
export async function pushToGist(watchlist, portfolio) {
  const content = JSON.stringify({ watchlist, portfolio }, null, 2);
  const gistId = getGistId();

  if (gistId) {
    // Update existing gist
    try {
      await axios.patch(
        `${GIST_API}/${gistId}`,
        { files: { [FILENAME]: { content } } },
        { headers: headers() }
      );
      return { action: "updated", gistId };
    } catch (err) {
      // If 404 (gist was deleted), create a new one
      if (err.response?.status === 404) {
        localStorage.removeItem(GIST_ID_KEY);
        return pushToGist(watchlist, portfolio);
      }
      throw err;
    }
  } else {
    // Create new private gist
    const { data } = await axios.post(
      GIST_API,
      {
        description: "Stock Tracker — watchlist & portfolio data",
        public: false,
        files: { [FILENAME]: { content } },
      },
      { headers: headers() }
    );
    setGistId(data.id);
    return { action: "created", gistId: data.id };
  }
}

/**
 * Pull data from Gist. Returns { watchlist, portfolio } or null if
 * no gist exists yet.
 */
export async function pullFromGist() {
  const gistId = getGistId();
  if (!gistId) return null;

  try {
    const { data } = await axios.get(`${GIST_API}/${gistId}`, {
      headers: headers(),
    });

    const file = data.files?.[FILENAME];
    if (!file) return null;

    const parsed = JSON.parse(file.content);
    return {
      watchlist: parsed.watchlist ?? [],
      portfolio: parsed.portfolio ?? [],
    };
  } catch (err) {
    if (err.response?.status === 404) {
      localStorage.removeItem(GIST_ID_KEY);
      return null;
    }
    throw err;
  }
}

/**
 * Verify token is valid by calling the /user endpoint.
 * Returns the GitHub username or throws.
 */
export async function verifyToken() {
  const { data } = await axios.get("https://api.github.com/user", {
    headers: headers(),
  });
  return data.login;
}

/**
 * Check if sync is configured (token + gist id present).
 */
export function isSyncConfigured() {
  return !!getToken();
}
