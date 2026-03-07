import axios from "axios";

const GIST_API = "https://api.github.com/gists";
const FILENAME = "stock-tracker-data.json";
const TOKEN_KEY = "stock-tracker-gh-token";
const GIST_ID_KEY = "stock-tracker-gist-id";
const LAST_SYNC_KEY = "stock-tracker-last-sync-ts";
const BASELINE_KEY = "stock-tracker-sync-baseline";

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
  localStorage.removeItem(BASELINE_KEY);
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

/**
 * Baseline = the snapshot of data at the time of last successful sync.
 * This lets us compute what each side *changed* since the last common state.
 */
function getBaseline() {
  try {
    return JSON.parse(localStorage.getItem(BASELINE_KEY) || "null");
  } catch {
    return null;
  }
}

function setBaseline(watchlist, portfolio) {
  localStorage.setItem(
    BASELINE_KEY,
    JSON.stringify({ watchlist, portfolio })
  );
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
 * 3-way merge using the baseline (last-synced snapshot).
 *
 * For each item we compute:
 *   localAdded   = in local but NOT in baseline  → local added it
 *   localRemoved = in baseline but NOT in local   → local deleted it
 *   remoteAdded  = in remote but NOT in baseline  → remote added it
 *   remoteRemoved= in baseline but NOT in remote  → remote deleted it
 *
 * Result = (baseline ∪ localAdded ∪ remoteAdded) − localRemoved − remoteRemoved
 *
 * For portfolio holdings that exist on both sides with different qty/avgPrice,
 * the side with the newer timestamp wins.
 */
function merge(local, remote, baseline) {
  // ── Watchlist 3-way merge ──
  const baseWatchSet = new Set(baseline?.watchlist ?? []);
  const localWatchSet = new Set(local.watchlist);
  const remoteWatchSet = new Set(remote.watchlist);

  const localAdded = local.watchlist.filter((s) => !baseWatchSet.has(s));
  const localRemoved = [...baseWatchSet].filter((s) => !localWatchSet.has(s));
  const remoteAdded = remote.watchlist.filter((s) => !baseWatchSet.has(s));
  const remoteRemoved = [...baseWatchSet].filter((s) => !remoteWatchSet.has(s));

  const removedSet = new Set([...localRemoved, ...remoteRemoved]);
  // Start from baseline, add new items from both sides, remove deleted items
  const mergedWatchSet = new Set([
    ...(baseline?.watchlist ?? []),
    ...localAdded,
    ...remoteAdded,
  ]);
  for (const s of removedSet) mergedWatchSet.delete(s);

  // Preserve ordering: remote order first, then any local-only additions
  const mergedWatch = [];
  // Items that exist in remote, in remote order
  for (const s of remote.watchlist) {
    if (mergedWatchSet.has(s)) {
      mergedWatch.push(s);
      mergedWatchSet.delete(s);
    }
  }
  // Remaining items (local-only additions not in remote)
  for (const s of local.watchlist) {
    if (mergedWatchSet.has(s)) {
      mergedWatch.push(s);
      mergedWatchSet.delete(s);
    }
  }
  // Any leftovers from baseline (shouldn't happen, but be safe)
  for (const s of mergedWatchSet) mergedWatch.push(s);

  // ── Portfolio 3-way merge ──
  const basePortMap = new Map((baseline?.portfolio ?? []).map((h) => [h.symbol, h]));
  const localPortMap = new Map(local.portfolio.map((h) => [h.symbol, h]));
  const remotePortMap = new Map(remote.portfolio.map((h) => [h.symbol, h]));

  const allSymbols = new Set([
    ...basePortMap.keys(),
    ...localPortMap.keys(),
    ...remotePortMap.keys(),
  ]);

  const mergedPort = [];
  for (const sym of allSymbols) {
    const inBase = basePortMap.has(sym);
    const inLocal = localPortMap.has(sym);
    const inRemote = remotePortMap.has(sym);

    // Both sides deleted → skip
    if (!inLocal && !inRemote) continue;

    // Local deleted (was in base, now gone locally) → honour delete
    if (inBase && !inLocal) continue;

    // Remote deleted (was in base, now gone remotely) → honour delete
    if (inBase && !inRemote) continue;

    // Both have it → pick the one that changed (or remote if both changed)
    if (inLocal && inRemote) {
      const localH = localPortMap.get(sym);
      const remoteH = remotePortMap.get(sym);
      const baseH = basePortMap.get(sym);

      // If local changed from baseline and remote didn't → use local
      // If remote changed from baseline and local didn't → use remote
      // If both changed → use remote (remote wins ties)
      const localChanged = !baseH ||
        localH.qty !== baseH.qty || localH.avgPrice !== baseH.avgPrice;
      const remoteChanged = !baseH ||
        remoteH.qty !== baseH.qty || remoteH.avgPrice !== baseH.avgPrice;

      if (localChanged && !remoteChanged) {
        mergedPort.push(localH);
      } else {
        mergedPort.push(remoteH); // remote wins ties
      }
      continue;
    }

    // Only in local (new local add) → keep
    if (inLocal && !inRemote && !inBase) {
      mergedPort.push(localPortMap.get(sym));
      continue;
    }

    // Only in remote (new remote add) → keep
    if (inRemote && !inLocal && !inBase) {
      mergedPort.push(remotePortMap.get(sym));
      continue;
    }
  }

  return {
    watchlist: mergedWatch,
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
    setBaseline(watchlist, portfolio);
    return { action: "created", gistId: data.id, merged: null };
  }

  // ── Read remote ──
  const remote = await fetchRemotePayload(gistId);
  const lastSyncTs = getLastSyncTs();
  const baseline = getBaseline();
  let finalWatchlist = watchlist;
  let finalPortfolio = portfolio;
  let merged = null;

  if (remote && remote.lastModified && remote.lastModified > lastSyncTs) {
    // Remote changed since we last synced — 3-way merge using baseline
    const local = { watchlist, portfolio };
    const result = merge(local, remote, baseline);
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
    setBaseline(finalWatchlist, finalPortfolio);
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

  const watchlist = remote.watchlist ?? [];
  const portfolio = remote.portfolio ?? [];

  // Update our sync timestamp and baseline so future pushes know what we've seen
  if (remote.lastModified) {
    setLastSyncTs(remote.lastModified);
  }
  setBaseline(watchlist, portfolio);

  return { watchlist, portfolio };
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
