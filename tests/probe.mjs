// Checks that everyday answers are accepted for every category.
// Run with:  node tests/probe.mjs              (all probe files; prints anything missing, exits 1 if something is)
//            node tests/probe.mjs probe6.txt   (just one file)
import { readFileSync, readdirSync } from "node:fs";
import * as E from "../js/engine.js";
import { CONFIG } from "../js/config.js";

const data = JSON.parse(readFileSync(new URL("../data/words.json", import.meta.url)));
const ctx = { data, index: E.buildIndex(data), cfg: CONFIG,
  modifiers: E.parseModifiers(readFileSync(new URL("../data/modifiers.txt", import.meta.url), "utf8")),
  frames: JSON.parse(readFileSync(new URL("../data/frames.json", import.meta.url), "utf8")) };
// with no argument, runs every probe*.txt file in this folder
const files = process.argv[2] ? [process.argv[2]]
  : readdirSync(new URL(".", import.meta.url)).filter((f) => /^probe\d*\.txt$/.test(f)).sort();
const text = files.map((f) => readFileSync(new URL("./" + f, import.meta.url), "utf8")).join("\n");

let total = 0;
const missing = {};
for (const line of text.split("\n")) {
  if (!line.trim() || line.startsWith("#")) continue;
  const [cat, list] = line.split(/:(.*)/s);
  for (const raw of list.split(",")) {
    const w = raw.trim();
    if (!w) continue;
    total++;
    if (!E.tagsFor(ctx, w).includes(cat.trim())) (missing[cat.trim()] ||= []).push(w);
  }
}
const n = Object.values(missing).flat().length;
for (const [c, ws] of Object.entries(missing)) console.log(`${c} (${ws.length}): ${ws.join(", ")}`);
console.log(`${total - n} of ${total} likely answers accepted, ${n} missing`);
process.exit(n ? 1 : 0);
