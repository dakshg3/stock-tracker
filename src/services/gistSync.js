import axios from "axios";

const GIST_API = "https://api.github.com/gists";
const FILENAME = "stock-tracker-data.json";
const TOKEN_KEY = "stock-tracker-gh-token";
const GIST_ID_KEY = "stock-tracker-gist-id";
const LAST_SYNC_KEY = "stock-tracker-last-sync-ts";

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
  localStorage.removeItem(LAST_SYNC_KEY);
}

export function getGistId() {
  return localStorage.getItem(GIST_ID_KEY) ?? "";
}

function setGistId(id) {
  localStorage.setItem(GIST_ID_KEY, id);
}

/** Get the last-known remote timestamp this device synced to */
function getLastSyncTs() {
  return Number(localStorage.getItem(LAST_SYNC_KEY) || 0);
}

function setLastSyncTs(ts) {
  localStorage.setItem(LAST_SYNC_KEY, String(ts));
}

function headers() {
  const token = getToken();
  if (!token) throw new Error("No GitHub token configured");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
  };
}

/* ── Helpers ── */

function now() {
  return Date.now();
}

/**
 * Build the canonical data payload with a timestamp.
 */
function buildPayload(watchlist, portfolio) {
  return {
    lastModified: now(),
    watchlist,
    portfolio,
  };
}

/**
 * Merge local and remote data.
 *
 * Strategy – "remote wins on conflicts, union otherwise":
 *  • Watchlist: If the remote explicitly removed a symbol (it was there at
 *    last-sync time but is now gone), honour the delete. Otherwise, union
 *    of both lists preserving remote ordering first.
 *  • Portfolio: keyed by symbol. Remote entry wins when remote is newer.
 *    If remote removed a holding that existed at last sync, honour the
 *    delete. New local holdings that aren't in remote are kept.
 */
function merge(local, remote, lastSyncTs) {
  const remoteIsNewer = remote.lastModified > lastSyncTs;

  // ── Watchlist merge ──
  const remoteWatchSet = new Set(remote.watchlist);
  const localWatchSet = new Set(local.watchlist);
  const mergedWatch = [...remote.watchlist]; // start with remote

  for (const sym of local.watchlist) {
    if (!remoteWatchSet.has(sym)) {
      // Symbol is in local but not remote.
      // If remote is newer, that means remote intentionally deleted it → skip.
      // If remote is older/same, local added it → keep.
      if (!remoteIsNewer) {
        mergedWatch.push(sym);
      }
    }
  }

  // If a symbol is in remote but not local, and local is newer, local deleted it → remove.
  const filteredWatch = mergedWatch.filter((sym) => {
    if (!localWatchSet.has(sym) && !remoteIsNewer) {
      return false; // local deleted it
    }
    return true;
  });

  // ── Portfolio merge ──
  const remotePortMap = new Map(remote.portfolio.map((h) => [h.symbol, h]));
  const localPortMap = new Map(local.portfolio.map((h) => [h.symbol, h]));
  const mergedPort = [];

  // Start with remote holdings
  for (const h of remote.portfolio) {
    // If local removed it and local is newer, skip
    if (!localPortMap.has(h.symbol) && !remoteIsNewer) continue;
    mergedPort.push(h);
  }

  // Add local-only holdings (not in remote)
  for (const h of local.portfolio) {
    if (!remotePortMap.has(h.symbol)) {
      // If remote is newer, remote intentionally deleted it → skip
      if (remoteIsNewer) continue;
      mergedPort.push(h);
    }
  }

  return {
    watchlist: filteredWatch,
    portfolio: mergedPort,
  };
}

/* ── Gist discovery ── */

/**
 * Search the user's gists for one that contains our data file.
 * Returns the gist ID if found, or null.
 */
async function findExistingGist() {
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

/** Read the raw remote payload from the gist. Returns parsed object or null. */
async function fetchRemotePayload(gistId) {
  try {
    const { data } = await axios.get(`${GIST_API}/${gistId}`, {
      headers: headers(),
    });
    const file = data.files?.[FILENAME];
    if (!file) return null;
    return JSON.parse(file.content);
  } catch (err) {
    if (err.response?.status === 404) {
      localStorage.removeItem(GIST_ID_KEY);
      return null;
    }
    throw err;
  }
}

/* ── Sync operations ── */

/**
 * Push local data to Gist with timestamp-based merge.
 *
 * 1. Read remote payload.
 * 2. If remote is newer than our last sync, merge instead of overwrite.
 * 3. Write merged result with a new timestamp.
 * 4. Return { action, gistId, merged } — `merged` is non-null when the
 *    local state should be updated to reflect the merge.
 */
export async function pushToGist(watchlist, portfolio) {
  let gistId = getGistId();

  // ── Ensure we have a gist ──
  if (!gistId) {
    gistId = await findExistingGist();
  }

  if (!gistId) {
    // First-ever push — create a new private gist
    const payload = buildPayload(watchlist, portfolio);
    const content = JSON.stringify(payload, null, 2);
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
    setLastSyncTs(payload.lastModified);
    return { action: "created", gistId: data.id, merged: null };
  }

  // ── Read remote ──
  const remote = await fetchRemotePayload(gistId);
  const lastSyncTs = getLastSyncTs();
  let finalWatchlist = watchlist;
  let finalPortfolio = portfolio;
  let merged = null;

  if (remote && remote.lastModified && remote.lastModified > lastSyncTs) {
    // Remote changed since we last synced — merge
    const local = { watchlist, portfolio };
    const result = merge(local, remote, lastSyncTs);
    finalWatchlist = result.watchlist;
    finalPortfolio = result.portfolio;
    merged = result; // tell the caller to update local state
  }

  // ── Write ──
  const payload = buildPayload(finalWatchlist, finalPortfolio);
  const content = JSON.stringify(payload, null, 2);

  try {
    await axios.patch(
      `${GIST_API}/${gistId}`,
      { files: { [FILENAME]: { content } } },
      { headers: headers() }
    );
    setLastSyncTs(payload.lastModified);
    return { action: "updated", gistId, merged };
  } catch (err) {
    if (err.response?.status === 404) {
      localStorage.removeItem(GIST_ID_KEY);
      return pushToGist(watchlist, portfolio);
    }
    throw err;
  }
}

/**
 * Pull data from Gist. Returns { watchlist, portfolio, lastModified } or null.
 */
export async function pullFromGist() {
  let gistId = getGistId();
  if (!gistId) {
    gistId = await findExistingGist();
    if (!gistId) return null;
  }

  const remote = await fetchRemotePayload(gistId);
  if (!remote) return null;

  // Update our sync timestamp so future pushes know what we've seen
  if (remote.lastModified) {
    setLastSyncTs(remote.lastModified);
  }

  return {
    watchlist: remote.watchlist ?? [],
    portfolio: remote.portfolio ?? [],
  };
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
 * Check if sync is configured (token present).
 */
export function isSyncConfigured() {
  return !!getToken();
}
