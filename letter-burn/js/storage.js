// Saved progress lives in this browser only. Versioned so the format can change later.
const KEY = "letterburn";
const VERSION = 1;

const fresh = () => ({ v: VERSION, tutorialSeen: false, games: {}, rejected: [] });

function migrate(s) {
  if (!s || typeof s !== "object") return fresh();
  // v0 (never shipped) had no version field; keep anything recognisable
  if (!s.v) s = { ...fresh(), games: s.games || {}, tutorialSeen: !!s.tutorialSeen };
  // future versions: if (s.v === 1) { ...; s.v = 2; }
  return { ...fresh(), ...s, v: VERSION };
}

export function load() {
  try {
    return migrate(JSON.parse(localStorage.getItem(KEY)));
  } catch {
    return fresh();
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode or storage full: the game still works, it just won't remember */
  }
}

export function reset() {
  try { localStorage.removeItem(KEY); } catch {}
}
