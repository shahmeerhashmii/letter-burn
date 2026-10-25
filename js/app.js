import { CONFIG } from "./config.js";
import * as E from "./engine.js";
import * as Store from "./storage.js";

const $ = (id) => document.getElementById(id);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
const MAX_TYPED = 22;

const S = {
  ctx: null,          // { data, index, cfg }
  cats: {},           // id -> { prompt, ... }
  puzzles: {},
  practice: [],
  store: Store.load(),
  today: E.dateKey(),
  cur: null,          // { mode, date, num, puzzle, game, typed, busy }
  lastPractice: -1,
  practiceRound: 0,
};

// ---------- boot ----------
async function init() {
  const q = new URLSearchParams(location.search);
  if (q.has("reset")) { Store.reset(); S.store = Store.load(); }
  if (/^\d{4}-\d{2}-\d{2}$/.test(q.get("date") || "")) S.today = q.get("date"); // testing: ?date=2026-11-12

  document.querySelectorAll('[data-text="tagline"]').forEach((el) => (el.textContent = CONFIG.tagline));
  document.title = CONFIG.name;

  try {
    const [words, cats, puzzles, practice] = await Promise.all(
      ["words", "categories", "puzzles", "practice"].map((f) => fetch(`data/${f}.json`).then((r) => {
        if (!r.ok) throw new Error(f);
        return r.json();
      })),
    );
    const [mods, frames] = await Promise.all([
      fetch("data/modifiers.txt").then((r) => (r.ok ? r.text() : "")),
      fetch("data/frames.json").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    S.ctx = { data: words, index: E.buildIndex(words), cfg: CONFIG, modifiers: E.parseModifiers(mods), frames };
    for (const c of cats) S.cats[c.id] = c;
    S.puzzles = puzzles;
    S.practice = practice;
  } catch (err) {
    document.body.innerHTML = `<p style="padding:24px;font-family:sans-serif;color:#F5F5F5">Couldn't load the game files (${err.message}).
      If you opened index.html straight from your computer, run it from GitHub Pages or a local server instead.</p>`;
    return;
  }

  buildKeyboard();
  wireUp();
  showHome();
  if (!S.store.tutorialSeen) openOverlay("howto");
  setInterval(tick, 1000);
  tick();
}

// ---------- screens ----------
function showScreen(id) {
  for (const s of document.querySelectorAll(".screen")) s.hidden = s.id !== id;
  window.scrollTo(0, 0);
}

function showHome() {
  closeOverlays();
  S.cur = null;
  const launch = CONFIG.launchDate;
  const pre = E.daysBetween(launch, S.today) < 0;
  const pz = S.puzzles[S.today];
  const g = S.store.games[S.today];
  const play = $("playBtn");
  $("homeCountdownLine").hidden = true;

  if (pre) {
    $("homeNum").textContent = "Coming soon";
    $("homeDate").textContent = "";
    $("homeNote").textContent = `Puzzle #1 lands ${prettyDate(launch, true)}. Get some practice in first.`;
    play.textContent = "Practice";
    play.onclick = startPractice;
  } else if (!pz) {
    $("homeNum").textContent = `#${E.puzzleNumber(S.today, launch)}`;
    $("homeDate").textContent = prettyDate(S.today);
    $("homeNote").textContent = "No puzzle today, we're restocking. Practice is open.";
    play.textContent = "Practice";
    play.onclick = startPractice;
  } else {
    $("homeNum").textContent = `#${pz.number}`;
    $("homeDate").textContent = prettyDate(S.today);
    if (g?.done) {
      $("homeNote").textContent = `Done for today. You scored ${E.score(g, CONFIG)}.`;
      play.textContent = "See results";
      $("homeCountdownLine").hidden = false;
    } else if (g?.answers?.length) {
      $("homeNote").textContent = E.allCleared(g) ? "All five cleared. Lock it in to finish."
        : `${E.clearedCount(g)} of 5 cleared, ${E.savedCount(g)} letters left.`;
      play.textContent = "Keep going";
    } else {
      $("homeNote").textContent = "";
      play.textContent = "Play";
    }
    play.onclick = startDaily;
  }

  const done = Object.values(S.store.games).filter((x) => x.done);
  $("hsStreak").textContent = E.streak(S.store.games, S.today);
  $("hsPlayed").textContent = done.length;
  $("hsBest").textContent = done.length ? Math.max(...done.map((x) => E.score(x, CONFIG))) : "–";
  showScreen("home");
}

function startDaily() {
  const pz = S.puzzles[S.today];
  if (!pz) return showHome();
  const game = S.store.games[S.today] || E.newGame(pz);
  S.cur = { mode: "daily", date: S.today, num: pz.number, puzzle: pz, game, typed: "", busy: false };
  enterGame();
  if (game.done) openResults();
}

function startPractice() {
  let i;
  do { i = Math.floor(Math.random() * S.practice.length); } while (S.practice.length > 1 && i === S.lastPractice);
  S.lastPractice = i;
  S.practiceRound++;
  const pz = S.practice[i];
  S.cur = { mode: "practice", date: null, num: S.practiceRound, puzzle: pz, game: E.newGame(pz), typed: "", busy: false };
  closeOverlays();
  enterGame();
}

function enterGame() {
  const c = S.cur;
  if (c.mode === "daily") {
    $("gNum").textContent = `#${c.num}`;
    $("gSub").textContent = prettyDate(c.date);
  } else {
    $("gNum").innerHTML = `<span class="tag">Practice</span>`;
    $("gSub").textContent = `Round ${c.num}`;
  }
  buildPrompts();
  showScreen("game");
  render();
}

// ---------- game rendering ----------
function matchSvg(burnt) {
  const head = burnt ? "var(--char)" : "var(--warn)";
  const stick = burnt ? "#3B3F48" : "var(--wood)";
  return `<svg width="12" height="30" viewBox="0 0 12 30" aria-hidden="true"><rect x="4" y="8" width="4" height="22" rx="1" fill="${stick}"/>${
    burnt ? '<rect x="4" y="8" width="4" height="6" fill="#1a1c21"/>' : ""}<ellipse cx="6" cy="6" rx="5" ry="6" fill="${head}"/></svg>`;
}

function buildPrompts() {
  const box = $("prompts");
  box.querySelectorAll(".row").forEach((r) => r.remove());
  for (const id of S.cur.game.prompts) {
    const r = document.createElement("div");
    r.className = "row";
    r.dataset.id = id;
    r.innerHTML = `<span class="m"></span><span class="pt"></span><span class="ans"></span>`;
    r.querySelector(".pt").textContent = S.cats[id]?.prompt || id;
    box.insertBefore(r, $("stamp"));
  }
}

function buildKeyboard() {
  const kb = $("kb");
  kb.innerHTML = "";
  ROWS.forEach((row, i) => {
    const r = document.createElement("div");
    r.className = "kr";
    if (i === 2) r.append(keyBtn("Burn", "key wide go", submit, "kGo"));
    for (const l of row) r.append(keyBtn(l.toUpperCase(), "key", () => type(l), `k-${l}`));
    if (i === 2) r.append(keyBtn("⌫", "key wide del", back, "kDel", "Delete"));
    kb.append(r);
  });
  const r = document.createElement("div");
  r.className = "kr util";
  const u = keyBtn("", "key tool undo", () => S.cur && takeBack(S.cur.game.answers.length - 1), "undoBtn", "Undo last word");
  u.innerHTML = '<span aria-hidden="true">↺</span> Undo';
  r.append(u, keyBtn("space", "key space", () => type(" "), "kSpace", "Space"), keyBtn("I'm done", "key tool done", iAmDone, "doneBtn"));
  kb.append(r);
}

function keyBtn(label, cls, fn, id, aria) {
  const b = document.createElement("button");
  b.className = cls;
  b.textContent = label;
  b.id = id;
  b.type = "button";
  b.addEventListener("click", fn);
  if (aria) b.setAttribute("aria-label", aria);
  return b;
}

const up = (l) => l.toUpperCase();
const andList = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
const promptShort = (id) => {
  const p = (S.cats[id]?.prompt || id).replace(/^Name /i, "");
  return p.charAt(0).toLowerCase() + p.slice(1);
};
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function render() {
  const c = S.cur;
  if (!c) return;
  const g = c.game;
  const a = E.analyze(g, c.typed, S.ctx);

  $("sCleared").textContent = `${E.clearedCount(g)}/5`;
  setNumber($("sScore"), E.score(g, CONFIG));
  $("sBorrows").innerHTML = Array.from({ length: CONFIG.maxBorrows }, (_, i) => `<i class="${i < g.borrows ? "used" : ""}"></i>`).join("");
  $("sBorrows").setAttribute("aria-label", `${CONFIG.maxBorrows - g.borrows} borrows left`);

  for (const r of document.querySelectorAll("#prompts .row")) {
    const id = r.dataset.id;
    const done = g.cleared[id];
    const will = a.kind === "ok" && a.matches.includes(id);
    r.classList.toggle("done", !!done);
    r.classList.toggle("will", will);
    r.querySelector(".m").innerHTML = matchSvg(!!done);
    const ans = r.querySelector(".ans");
    if (done && !g.done) {
      ans.innerHTML = `${esc(done)} <button class="take" type="button" aria-label="Take back ${esc(done)}" title="Take it back">↺</button>`;
    } else {
      ans.textContent = done ? `${done} ✓` : will ? "Clears" : "";
    }
  }

  const burned = new Set(g.burned);
  const t = $("typed");
  t.classList.toggle("long", c.typed.length > 10);
  t.innerHTML = [...c.typed].map((l) => (l === " " ? '<span class="t sp"></span>'
    : `<span class="t ${burned.has(l) ? "b" : ""}">${up(l)}</span>`)).join("") + (c.busy || g.done || E.allCleared(g) ? "" : '<span class="caret"></span>');

  $("hint").innerHTML = hintFor(a, g);

  for (const l of E.ALPHABET) {
    const k = $(`k-${l}`);
    const isB = burned.has(l);
    k.classList.toggle("burned", isB);
    k.classList.toggle("in", a.letters.includes(l));
    k.setAttribute("aria-label", `${up(l)}${isB ? ", burned" : ""}`);
  }
  const go = $("kGo");
  const ready = E.allCleared(g) && !g.done;
  go.textContent = ready ? "Lock in" : "Burn";
  go.classList.toggle("lock", ready);
  go.disabled = c.busy || g.done || (!ready && a.kind !== "ok");

  // these keep their space when unavailable so the keyboard never shifts
  const doneBtn = $("doneBtn");
  doneBtn.classList.toggle("off", g.done || ready || !g.answers.length);
  doneBtn.classList.toggle("loud", g.borrows >= CONFIG.maxBorrows);
  const undoBtn = $("undoBtn");
  undoBtn.classList.toggle("off", g.done || !g.answers.length);
  undoBtn.disabled = c.busy;
}

function hintFor(a, g) {
  const typed = esc(a.typed || "");
  if (g.done) return E.clearedCount(g) === 5 ? "All five cleared and locked in." : "Game over.";
  if (E.allCleared(g)) return `<span class="good">All five cleared.</span> Hit <b>Lock in</b> to finish, or take a word back and go for a better score.`;
  switch (a.kind) {
    case "empty":
      if (!g.answers.length) return "Type a word. Every letter you use burns.";
      if (g.borrows >= CONFIG.maxBorrows) return "No borrows left. Use fresh letters, undo a word, or call it.";
      return g.answers.length === 1 ? "Next word. Changed your mind? Undo is free until you lock in." : "Next word.";
    case "unknown": {
      const form = CONFIG.suggestFormUrl
        ? ` <a href="${CONFIG.suggestFormUrl}" target="_blank" rel="noopener">Think it should count?</a>` : "";
      return `We don't have <b>${cap(typed)}</b> for any of today's prompts yet.${form}`;
    }
    case "nofit":
      return E.clearedCount(g) ? `<b>${cap(typed)}</b> doesn't fit anything left.` : `<b>${cap(typed)}</b> doesn't fit any of today's prompts.`;
    case "debt":
      return `<span class="warn">That needs ${a.borrow.length} borrow${a.borrow.length > 1 ? "s" : ""}. You've got ${CONFIG.maxBorrows - g.borrows}.</span>`;
    case "ok": {
      let s = `Clears <b>${esc(andList(a.matches.map(promptShort)))}</b>.`;
      if (a.fresh.length) s += ` Burns ${a.fresh.map(up).join(" ")}.`;
      if (a.borrow.length) s += ` <span class="warn">Borrows ${andList(a.borrow.map(up))}. −${a.borrow.length * CONFIG.points.borrow} points.</span>`;
      if (a.matches.length > 1) s = `<span class="good">${a.matches.length > 2 ? "Triple" : "Double"} duty.</span> ${s}`;
      return s;
    }
  }
  return "";
}

function setNumber(el, to) {
  const from = Number(el.dataset.v ?? to);
  el.dataset.v = to;
  if (reduceMotion || from === to) { el.textContent = to; return; }
  const t0 = performance.now(), dur = 350;
  const step = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    el.textContent = Math.round(from + (to - from) * (1 - (1 - p) ** 3));
    if (p < 1 && el.dataset.v == to) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------- input ----------
function type(ch) {
  const c = S.cur;
  if (!c || c.busy || c.game.done || E.allCleared(c.game)) return;
  if (ch === " " && (!c.typed || c.typed.endsWith(" "))) return;
  if (c.typed.length >= MAX_TYPED) return;
  c.typed += ch;
  render();
}

function back() {
  const c = S.cur;
  if (!c || c.busy || c.game.done) return;
  c.typed = c.typed.slice(0, -1);
  render();
}

function submit() {
  const c = S.cur;
  if (!c || c.busy || c.game.done) return;
  if (E.allCleared(c.game)) return lockIn();
  const a = E.analyze(c.game, c.typed, S.ctx);
  if (a.kind !== "ok") {
    if (a.kind === "unknown") rememberRejected(a.typed);
    if (a.kind !== "empty") shake();
    return;
  }
  c.busy = true;
  render();
  const step = reduceMotion ? 0 : 55;
  a.fresh.forEach((l, i) => setTimeout(() => {
    const k = $(`k-${l}`);
    k.classList.remove("in");
    k.classList.add("flaring");
    sparks(k);
  }, i * step));
  for (const l of a.borrow) $(`k-${l}`).classList.add("borrowing");
  setTimeout(() => commit(a), reduceMotion ? 0 : a.fresh.length * step + 500);
}

function commit(a) {
  const c = S.cur;
  for (const l of a.fresh) $(`k-${l}`).classList.remove("flaring");
  for (const l of a.borrow) $(`k-${l}`).classList.remove("borrowing");
  c.game = E.apply(c.game, a);
  c.typed = "";
  c.busy = false;
  persist();
  render();
  for (const id of a.matches) {
    const r = document.querySelector(`#prompts .row[data-id="${id}"]`);
    r.classList.remove("just"); void r.offsetWidth; r.classList.add("just");
  }
  if (a.matches.length > 1) stamp(a.matches.length);
  announce(`${a.typed.toUpperCase()} cleared ${andList(a.matches.map(promptShort))}.${
    a.fresh.length ? ` Burned ${a.fresh.map(up).join(", ")}.` : ""}${a.borrow.length ? ` Borrowed ${a.borrow.map(up).join(", ")}.` : ""}`);
}

function lockIn() {
  const c = S.cur;
  if (!c || c.busy || c.game.done) return;
  c.game = E.finish(c.game);
  persist();
  render();
  openResults();
}

function takeBack(index) {
  const c = S.cur;
  if (!c || c.busy || c.game.done || !c.game.answers[index]) return;
  const word = c.game.answers[index].word;
  const before = new Set(c.game.burned);
  c.game = E.undo(c.game, index, S.ctx);
  c.typed = "";
  persist();
  render();
  const back = [...before].filter((l) => !c.game.burned.includes(l));
  if (!reduceMotion) {
    for (const l of back) {
      const k = $(`k-${l}`);
      k.classList.remove("restored"); void k.offsetWidth; k.classList.add("restored");
    }
  }
  announce(`Took back ${word}. ${back.length ? `${back.map(up).join(", ")} back in play.` : ""}`);
}

function shake() {
  if (reduceMotion) return;
  const t = $("typed");
  t.classList.remove("shake"); void t.offsetWidth; t.classList.add("shake");
}

function sparks(el) {
  if (reduceMotion) return;
  for (let i = 0; i < 5; i++) {
    const s = document.createElement("span");
    s.className = "spark";
    s.style.setProperty("--dx", `${Math.random() * 36 - 18}px`);
    s.style.setProperty("--dy", `${-(18 + Math.random() * 30)}px`);
    s.style.animationDelay = `${Math.random() * 90}ms`;
    el.append(s);
    setTimeout(() => s.remove(), 800);
  }
}

function stamp(n) {
  const s = $("stamp");
  s.textContent = n === 2 ? "Double Duty" : "Triple Duty";
  s.classList.remove("go"); void s.offsetWidth; s.classList.add("go");
  if (reduceMotion) setTimeout(() => s.classList.remove("go"), 1200);
}

let doneArmed = 0;
function iAmDone() {
  const c = S.cur;
  if (!c || c.game.done || c.busy) return;
  if (!doneArmed) {
    doneArmed = setTimeout(() => { doneArmed = 0; $("doneBtn").textContent = "I'm done"; }, 3000);
    $("doneBtn").textContent = "Sure?";
    return;
  }
  clearTimeout(doneArmed);
  doneArmed = 0;
  $("doneBtn").textContent = "I'm done";
  c.game = E.finish(c.game);
  persist();
  render();
  openResults();
}

function persist() {
  const c = S.cur;
  if (c.mode !== "daily") return;
  S.store.games[c.date] = { ...c.game, num: c.num };
  Store.save(S.store);
}

function rememberRejected(w) {
  const list = S.store.rejected;
  if (!list.includes(w)) list.push(w);
  if (list.length > 300) list.shift();
  Store.save(S.store);
}

function announce(msg) {
  const el = $("announce");
  el.textContent = "";
  setTimeout(() => (el.textContent = msg), 30);
}

// ---------- results ----------
function openResults(view) {
  // view: optional { mode, date, num, puzzle, game } for a past day
  const v = view || S.cur;
  const g = v.game;
  const daily = v.mode === "daily";
  const sc = E.score(g, CONFIG);
  const saved = E.savedCount(g);
  const n = E.clearedCount(g);

  $("rNum").textContent = daily ? `${CONFIG.name.toUpperCase()} #${v.num} · ${prettyDate(v.date).toUpperCase()}` : `PRACTICE · ROUND ${v.num}`;
  $("rScore").textContent = sc;
  $("rLine").textContent = n === 5 ? `All five. ${saved} letters left standing.` : `${n} of 5. Tomorrow's a new box of matches.`;
  const par = v.puzzle?.par;
  $("rPar").innerHTML = !par ? "" : sc > par ? `You beat the best score we found (<b>${par}</b>). Nice.`
    : sc === par ? `That's the best possible score. <b>${par}</b>.`
    : `Best possible today: <b>${par}</b>. You got ${sc}.`;
  const burned = new Set(g.burned);
  $("rGrid").innerHTML = E.ALPHABET.map((l) => `<div class="${burned.has(l) ? "x2" : "s"}">${up(l)}</div>`).join("");
  $("rSaved").textContent = saved;
  $("rDouble").textContent = E.doubles(g);
  $("rBorrow").textContent = g.borrows;
  $("rStreak").textContent = daily ? E.streak(S.store.games, S.today) : "–";
  $("rWords").innerHTML = g.prompts.map((id) => g.cleared[id]
    ? `<li><span>${esc(S.cats[id]?.prompt || id)}</span><b>${esc(g.cleared[id])}</b></li>`
    : `<li class="miss"><span>${esc(S.cats[id]?.prompt || id)}</span><b>not cleared</b></li>`).join("");
  const route = v.puzzle?.route;
  $("rRoute").innerHTML = route?.length ? `One way to get ${par}: <b>${route.map((w) => esc(w.toUpperCase())).join(" · ")}</b>` : "";

  const share = $("shareBtn");
  share.hidden = !daily;
  share.textContent = "Share";
  share.onclick = () => doShare(g, v.num, share);
  const sec = $("sheetSecondary");
  sec.textContent = daily ? "Practice" : "Another round";
  sec.onclick = startPractice;
  $("rCountdown").hidden = !daily || v.date !== S.today;
  $("sheetHistory").hidden = !daily;
  openOverlay("results");
}

async function doShare(g, num, btn) {
  const url = CONFIG.url || location.origin + location.pathname;
  const text = E.shareText(g, num, CONFIG, url);
  try {
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      await navigator.share({ text });
      return;
    }
    await navigator.clipboard.writeText(text);
    btn.textContent = "Copied";
  } catch (err) {
    if (err?.name === "AbortError") return;
    prompt("Copy your result:", text);
  }
}

// ---------- history ----------
function showHistory() {
  closeOverlays();
  const days = Object.entries(S.store.games).filter(([, g]) => g.done).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const list = $("historyList");
  list.innerHTML = "";
  $("historyEmpty").hidden = days.length > 0;
  for (const [date, g] of days) {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.innerHTML = `<span class="n">#${g.num ?? ""}</span><span class="d">${prettyDate(date)}<small>${E.clearedCount(g)}/5 cleared · ${E.savedCount(g)} saved</small></span><span class="sc">${E.score(g, CONFIG)}</span>`;
    b.onclick = () => openResults({ mode: "daily", date, num: g.num, puzzle: S.puzzles[date], game: g });
    li.append(b);
    list.append(li);
  }
  showScreen("history");
}

// ---------- overlays ----------
function openOverlay(id) {
  closeOverlays();
  const o = $(id);
  o.hidden = false;
  const sheet = o.querySelector(".sheet");
  sheet.tabIndex = -1;
  sheet.focus({ preventScroll: true });
}
function closeOverlays() {
  for (const o of document.querySelectorAll(".over")) {
    if (o.id === "howto" && !o.hidden && !S.store.tutorialSeen) {
      S.store.tutorialSeen = true;
      Store.save(S.store);
    }
    o.hidden = true;
  }
}
const overlayOpen = () => [...document.querySelectorAll(".over")].some((o) => !o.hidden);

// ---------- time ----------
function prettyDate(key, long) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-CA", long
    ? { weekday: "long", month: "long", day: "numeric" } : { weekday: "short", month: "short", day: "numeric" });
}

function tick() {
  const now = new Date();
  const real = E.dateKey(now);
  const mid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const s = Math.max(0, Math.floor((mid - now) / 1000));
  const txt = `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  for (const el of document.querySelectorAll("[data-countdown]")) el.textContent = txt;
  // the day rolled over while the page was open
  if (!new URLSearchParams(location.search).has("date") && real !== S.today) {
    S.today = real;
    if (!$("home").hidden) showHome();
  }
}

// ---------- wiring ----------
function wireUp() {
  $("practiceLink").onclick = startPractice;
  $("historyLink").onclick = showHistory;
  $("sheetHistory").onclick = showHistory;
  $("homeBtn").onclick = showHome;
  $("prompts").addEventListener("click", (e) => {
    const btn = e.target.closest(".take");
    if (!btn || !S.cur) return;
    const word = S.cur.game.cleared[btn.closest(".row").dataset.id];
    const i = S.cur.game.answers.findIndex((a) => a.word === word);
    takeBack(i);
  });
  for (const b of document.querySelectorAll("[data-home]")) b.onclick = showHome;
  for (const b of document.querySelectorAll("[data-open]")) b.onclick = () => openOverlay(b.dataset.open);
  for (const b of document.querySelectorAll("[data-close]")) b.onclick = closeOverlays;
  for (const o of document.querySelectorAll(".over")) o.addEventListener("click", (e) => { if (e.target === o) closeOverlays(); });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlayOpen()) return closeOverlays();
    if (overlayOpen() || $("game").hidden || e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.activeElement?.closest?.("#kb") && (e.key === "Enter" || e.key === " ")) e.preventDefault();
    if (/^[a-z]$/i.test(e.key)) type(e.key.toLowerCase());
    else if (e.key === " ") { e.preventDefault(); type(" "); }
    else if (e.key === "Backspace") { e.preventDefault(); back(); }
    else if (e.key === "Enter") { e.preventDefault(); submit(); }
  });
}

init();
