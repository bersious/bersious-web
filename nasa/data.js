/* ============================================================
   data.js — loads ../data/*.json
   Owner: shared. Read-only for @bersious; @tranminhngoc171-bot
   owns the numbers inside those JSON files.
   ------------------------------------------------------------
   RULE (from src/README.md): no numbers live in code.
   If you find a hard-coded mass, cost, watt or day anywhere in
   src/*.js, it is a bug — it belongs in data/*.json.
   ============================================================ */

const FILES = ['scenarios', 'instruments', 'orbits', 'launch_vehicles', 'events'];

/* Two layouts are supported on purpose:
     1. inside the team repo, src/ sits one level below data/  → ../data/
     2. deployed to bersious.io.vn/nasa, the page is the root  → data/
   Do not collapse this to a single path; that silently breaks one environment.
   See docs/10-DEPLOY-TARGET.md §3. */
const BASES = ['../data/', 'data/'];

export const DB = {
  scenarios: null,
  instruments: null,
  orbits: null,
  launch_vehicles: null,
  events: null,
};

// Flat lookup tables built once so the UI never searches by string.
export const INDEX = {
  instrument: {},
  orbit: {},
  launcher: {},
  event: {},
};

let loaded = false;

export async function loadData() {
  if (loaded) return DB;

  /* Try each base until one works. Whichever answers first is the one we keep,
     so the same file works in the repo and on the deployed site. */
  let base = null;
  let payload = null;
  let lastError = null;

  for (const candidate of BASES) {
    try {
      const results = await Promise.all(
        FILES.map(async (name) => {
          const res = await fetch(`${candidate}${name}.json`, { cache: 'no-store' });
          if (!res.ok) throw new Error(`${candidate}${name}.json → HTTP ${res.status}`);
          return [name, await res.json()];
        })
      );
      base = candidate;
      payload = results;
      break;
    } catch (err) {
      lastError = err;
    }
  }

  if (!payload) {
    throw new Error(
      `Cannot load balance data from any of: ${BASES.join(', ')}. ` +
      `Last error: ${lastError?.message ?? 'unknown'}. ` +
      `If you opened this file directly (file://), run a local server instead — see docs/08 §6.`
    );
  }

  for (const [name, json] of payload) {
    DB[name] = json;
  }
  DB._base = base;

  for (const it of DB.instruments.instruments) INDEX.instrument[it.id] = it;
  for (const it of DB.orbits.orbits) INDEX.orbit[it.id] = it;
  for (const it of DB.launch_vehicles.launchers) INDEX.launcher[it.id] = it;
  for (const it of DB.events.events ?? []) INDEX.event[it.id] = it;

  loaded = true;
  return DB;
}

/* Buses and power sources are NOT defined here.
   They contain numbers (mass, cost, watts) and therefore belong in
   data/buses.json and data/power.json — see docs/08-FRAMEWORK-AND-STRUCTURE.md §5.
   Until those files exist, the UI cannot offer bus/power selection.
   Do not re-add them to this file. */
