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
 * Search the user's gists for one that contains our data file.
 * This ensures all devices find and reuse the same gist.
 * Returns the gist ID if found, or null.
 */
async function findExistingGist() {
  // Check up to 3 pages (30 gists per page = 90 gists)
  for (let page = 1; page <= 3; page++) {
    const { data } = await axios.get(GIST_API, {
      headers: headers(),
      params: { per_page: 30, page },
    });

    if (data.length === 0) break;

    for (const gist of data) {
      if (gist.files?.[FILENAME]) {
        setGistId(gist.id);
        return gist.id;
      }
    }
  }
  return null;
}

/**
 * Push local data to Gist. Finds an existing gist first, creates a
 * new private Gist only if none exists across any device.
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
    // Try to find an existing gist before creating a new one
    const existingId = await findExistingGist();
    if (existingId) {
      return pushToGist(watchlist, portfolio); // retry, now with gistId set
    }

    // Create new private gist only if none exists anywhere
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
  let gistId = getGistId();

  // If no gist ID stored locally, try to discover one
  if (!gistId) {
    gistId = await findExistingGist();
    if (!gistId) return null;
  }

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
