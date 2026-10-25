// Run with:  node tests/engine.test.mjs
import { readFileSync } from "node:fs";
import * as E from "../js/engine.js";
import { CONFIG } from "../js/config.js";

const data = JSON.parse(readFileSync(new URL("../data/words.json", import.meta.url)));
const puzzles = JSON.parse(readFileSync(new URL("../data/puzzles.json", import.meta.url)));
const practice = JSON.parse(readFileSync(new URL("../data/practice.json", import.meta.url)));
const cats = JSON.parse(readFileSync(new URL("../data/categories.json", import.meta.url))).map((c) => c.id);
const ctx = { data, index: E.buildIndex(data), cfg: CONFIG };
let pass = 0, fail = 0;
const t = (name, ok) => { ok ? pass++ : (fail++, console.log("FAIL:", name)); };
const play = (g, w) => E.apply(g, E.analyze(g, w, ctx));

const P = { prompts: ["animal", "food", "clothing", "beach_item", "flies"] };
let g = E.newGame(P);

t("APPLE burns exactly A P L E", (() => { const a = E.analyze(g, "apple", ctx); return a.kind === "ok" && a.fresh.join("") === "aple"; })());
t("'ice cream' ignores the space", E.lettersOf("ice cream").sort().join("") === "aceimr");
t("ice cream is recognised with or without a space", E.lookup(ctx.index, "ice cream") === "ice cream" && E.lookup(ctx.index, "icecream") === "ice cream");
const fish = play(g, "fish");
t("FISH clears animal + food in one go", fish.cleared.animal === "FISH" && fish.cleared.food === "FISH");
t("FISH burns its letters once", fish.burned.length === 4 && fish.answers.length === 1);
const before = { ...E.newGame({ prompts: ["fruit", "country", "sport", "job", "weather"] }), burned: ["a", "p", "l", "e"] };
const pear = E.analyze(before, "pear", ctx);
t("PEAR after APPLE borrows P E A and burns R", pear.kind === "ok" && pear.borrow.sort().join("") === "aep" && pear.fresh.join("") === "r");
const afterPear = E.apply(before, pear);
t("PEAR costs 24 in borrows and uses all 3", afterPear.borrows === 3 && E.score(afterPear, CONFIG) === 100 + 5 * 21 - 24);
let g4 = play(E.newGame(P), "apple"); g4 = play(g4, "bus"); // burn a lot
const four = E.analyze({ ...g4, borrows: 0, burned: [...g4.burned, "t", "o", "r"] }, "tortoise", ctx);
t("a word needing 4 borrows with 3 left is rejected", four.kind === "debt");
t("rejected word changes nothing", E.apply(g4, four) === g4);
const unk = E.analyze(g, "zzqx", ctx);
t("unknown word is unknown and changes nothing", unk.kind === "unknown" && E.apply(g, unk) === g);
const nofit = E.analyze(fish, "salmon", ctx); // animal + food already cleared
t("word matching nothing open changes nothing", nofit.kind === "nofit" && E.apply(fish, nofit) === fish);
t("score: 5 cleared, 9 burned, 0 borrows = 585", E.score({ cleared: { a: 1, b: 1, c: 1, d: 1, e: 1 }, burned: "abcdefghi".split(""), borrows: 0 }, CONFIG) === 585);
t("plurals: shoes and cherries accepted", E.lookup(ctx.index, "cherries") === "cherry" && !!E.lookup(ctx.index, "shoes"));
t("spelling variants: pajamas -> pyjamas", E.lookup(ctx.index, "pajamas") === E.lookup(ctx.index, "pyjamas"));
t("accents and case ignored", E.lookup(ctx.index, "Jalapeño") === "jalapeno");
t("puzzle number from launch date", E.puzzleNumber("2026-11-09", "2026-11-09") === 1 && E.puzzleNumber("2026-12-01", "2026-11-09") === 23);
t("puzzle numbers line up with dates", Object.entries(puzzles).every(([d, p]) => E.puzzleNumber(d, CONFIG.launchDate) === p.number));
t("missing date has no puzzle", puzzles["2031-01-01"] === undefined);
t("addDays crosses months", E.addDays("2026-11-30", 1) === "2026-12-01" && E.addDays("2027-01-01", -1) === "2026-12-31");
t("streak counts back through finished days", E.streak({ "2026-11-09": { done: true }, "2026-11-10": { done: true }, "2026-11-11": {} }, "2026-11-11") === 2);
t("streak breaks on a missed day", E.streak({ "2026-11-08": { done: true }, "2026-11-10": { done: true } }, "2026-11-10") === 1);
t("share text has two rows of 13 and no answers", (() => { const s = E.shareText(fish, 1, CONFIG, "x"); const rows = s.split("\n"); return [...rows[1]].length === 13 && [...rows[2]].length === 13 && !/fish/i.test(s); })());
t("finishing early records a partial game", (() => { const f = E.finish(fish); return f.done && f.endedEarly; })());

// every scheduled puzzle: categories exist, and the stored best route really works with zero borrows
for (const [label, list] of [["daily", Object.values(puzzles)], ["practice", practice]]) {
  for (const p of list) {
    let game = E.newGame(p), ok = p.prompts.every((c) => cats.includes(c));
    for (const w of p.route) {
      const a = E.analyze(game, w, ctx);
      if (a.kind !== "ok" || a.borrow.length) { ok = false; break; }
      game = E.apply(game, a);
    }
    ok = ok && game.done && game.borrows === 0 && E.score(game, CONFIG) === p.par;
    t(`${label} puzzle ${p.number ?? p.prompts.join(",")} is solvable at par`, ok);
  }
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
