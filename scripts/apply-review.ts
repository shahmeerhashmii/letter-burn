import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd());
const CSV_PATH = join(ROOT, "review", "needs-review.csv");
const WORDS_PATH = join(ROOT, "src", "data", "words.json");

type WordEntry = { display: string; tags: string[]; variants?: string[] };

// Minimal CSV parser that handles quoted fields.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  while (i < text.length) {
    const row: string[] = [];
    while (true) {
      let field = "";
      if (text[i] === '"') {
        i++; // skip opening quote
        while (i < text.length) {
          if (text[i] === '"') {
            if (i + 1 < text.length && text[i + 1] === '"') {
              field += '"';
              i += 2;
            } else {
              i++; // skip closing quote
              break;
            }
          } else {
            field += text[i];
            i++;
          }
        }
      } else {
        while (i < text.length && text[i] !== "," && text[i] !== "\n" && text[i] !== "\r") {
          field += text[i];
          i++;
        }
      }
      row.push(field);
      if (i < text.length && text[i] === ",") {
        i++;
        continue;
      }
      break;
    }
    if (row.some((f) => f !== "") || rows.length === 0) rows.push(row);
    if (i < text.length && (text[i] === "\n" || text[i] === "\r")) {
      i++;
      if (i < text.length && text[i - 1] === "\r" && text[i] === "\n") i++;
    }
  }
  return rows;
}

const words: Record<string, WordEntry> = JSON.parse(
  readFileSync(WORDS_PATH, "utf8"),
);

let changed = 0;
const text = readFileSync(CSV_PATH, "utf8");
const rows = parseCsv(text);
if (rows.length < 2) {
  console.log("No review rows to apply.");
  process.exit(0);
}
const header = rows[0].map((h) => h.trim().toLowerCase());
const idx = (name: string) => header.indexOf(name);
const iWord = idx("word");
const iTag = idx("tag");
const iDecision = idx("decision");
if (iWord < 0 || iTag < 0 || iDecision < 0) {
  console.error(
    "needs-review.csv must have columns: word, tag, decision, reason",
  );
  process.exit(1);
}

for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  const word = row[iWord]?.trim().toLowerCase();
  const tag = row[iTag]?.trim();
  const decision = row[iDecision]?.trim().toLowerCase();
  if (!word || !tag || !decision) continue;
  const entry = words[word];
  if (decision === "keep") {
    if (entry) {
      if (!entry.tags.includes(tag)) {
        entry.tags.push(tag);
        changed++;
      }
    } else {
      words[word] = { display: word, tags: [tag] };
      changed++;
    }
  } else if (decision === "drop") {
    if (entry) {
      entry.tags = entry.tags.filter((t) => t !== tag);
      if (entry.tags.length === 0) delete words[word];
      changed++;
    }
  }
}

const out: Record<string, WordEntry> = {};
for (const [k, v] of Object.entries(words).sort((a, b) => a.localeCompare(b))) {
  out[k] = v;
}
writeFileSync(WORDS_PATH, JSON.stringify(out, null, 2) + "\n");
console.log(`Applied ${changed} change(s) to words.json.`);
