import { useGame } from "../state/useGame";
import { config } from "../config";
import puzzles from "../data/puzzles.json";
import { localDateString } from "../engine/daily";
import type { GameRecord } from "../state/storage";

export default function Results() {
  const { app, setScreen, msUntilMidnight } = useGame();
  const history = app.stored.history;
  const latest = history[0] as GameRecord | undefined;
  if (!latest) return <div className="screen">No results.</div>;

  const puzzle = (puzzles as Record<string, { number: number; prompts: string[]; par?: number }>)[
    latest.date
  ];
  const par = puzzle?.par;

  const burned = new Set(latest.burned);
  const saved = 26 - burned.size;
  const share = buildShare(latest, burned, saved);

  const msLeft = msUntilMidnight();
  const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const wordsByPrompt = latest.prompts
    .map((pr) => {
      const cat = (categories as { id: string; prompt: string }[]).find(
        (c) => c.id === pr.id,
      );
      return { label: cat?.prompt ?? pr.id, word: pr.word };
    })
    .filter((w) => w.word);

  return (
    <div className="screen surface min-h-screen">
      <div className="p-3">
        <h2 className="font-display text-2xl mb-2">Results</h2>
        <p className="text-muted mb-4">
          Puzzle #{latest.number} · {localDateString(new Date(latest.date + "T00:00:00"))}
        </p>
        <div className="mb-4">
          <div className="font-display text-xl">Score {latest.score}</div>
          <p className="text-sm text-muted">
            {latest.cleared}/5 · {latest.unburned} saved · {latest.borrows} borrowed ·
            {latest.doubleDuties} double
          </p>
          {par != null && (
            <p className="text-sm text-muted">
              Today's best possible: {par}. You got {latest.score}.
            </p>
          )}
        </div>

        {wordsByPrompt.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm text-muted mb-2">Words used</h3>
            <ul className="mb-2">
              {wordsByPrompt.map((w, i) => (
                <li key={i}>{w.label}: {w.word}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-4">
          <div className="share">{share}</div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-muted">
            Next puzzle in {minutes}m {seconds}s · Streak {app.stored.streak.current}
          </p>
          <div className="row gap-2">
            <button
              type="button"
              className="button button-text focus-ring flex-1"
              onClick={() => setScreen("history")}
            >
              Past results
            </button>
            <button
              type="button"
              className="button button-text focus-ring flex-1"
              onClick={() => setScreen("practice")}
            >
              Practice
            </button>
          </div>
          <button
            type="button"
            className="button button-text focus-ring mt-2 block w-full"
            onClick={() => setScreen("home")}
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
}

const categories: { id: string; prompt: string }[] = [
  { id: "animal", prompt: "Animal" },
  { id: "mammal", prompt: "Mammal" },
  { id: "bird", prompt: "Bird" },
  { id: "insect", prompt: "Insect" },
  { id: "fish", prompt: "Fish or sea creature" },
  { id: "pet", prompt: "Pet" },
  { id: "fruit", prompt: "Fruit" },
  { id: "vegetable", prompt: "Vegetable" },
  { id: "food", prompt: "Something edible" },
  { id: "drink", prompt: "Drink" },
  { id: "dessert", prompt: "Dessert" },
  { id: "breakfast", prompt: "Breakfast food" },
  { id: "snack", prompt: "Snack" },
  { id: "meat", prompt: "Meat" },
  { id: "dairy", prompt: "Dairy product" },
  { id: "grain", prompt: "Grain" },
  { id: "seafood", prompt: "Seafood" },
  { id: "spice", prompt: "Spice or herb" },
  { id: "clothing", prompt: "Something you wear" },
  { id: "footwear", prompt: "Footwear" },
  { id: "headwear", prompt: "Headwear" },
  { id: "outerwear", prompt: "Outerwear" },
  { id: "accessory", prompt: "Accessory" },
  { id: "jewelry", prompt: "Jewelry" },
  { id: "furniture", prompt: "Furniture" },
  { id: "appliance", prompt: "Appliance" },
  { id: "kitchen_item", prompt: "Kitchen item" },
  { id: "cleaning_tool", prompt: "Cleaning tool" },
  { id: "room", prompt: "Room" },
  { id: "electronic", prompt: "Electronic device" },
  { id: "vehicle", prompt: "Vehicle" },
  { id: "beach_item", prompt: "Beach item" },
  { id: "luggage", prompt: "Luggage" },
  { id: "place", prompt: "Place" },
  { id: "city", prompt: "City" },
  { id: "country", prompt: "Country" },
  { id: "building", prompt: "Building" },
  { id: "store", prompt: "Store" },
  { id: "sport", prompt: "Sport" },
  { id: "sport_equipment", prompt: "Sports equipment" },
  { id: "toy", prompt: "Toy" },
  { id: "game", prompt: "Game" },
  { id: "musical_instrument", prompt: "Musical instrument" },
  { id: "weather", prompt: "Weather" },
  { id: "season", prompt: "Season" },
  { id: "job", prompt: "Job" },
  { id: "profession", prompt: "Profession" },
  { id: "activity", prompt: "Activity" },
  { id: "hobby", prompt: "Hobby" },
  { id: "action", prompt: "Action" },
  { id: "body_part", prompt: "Body part" },
  { id: "color", prompt: "Color" },
  { id: "shape", prompt: "Shape" },
  { id: "flies", prompt: "Something that can fly" },
];

function buildShare(
  record: GameRecord,
  burned: Set<string>,
  saved: number,
): string {
  const rows: string[] = [];
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  for (let r = 0; r < 2; r++) {
    const slice = alphabet.slice(r * 13, (r + 1) * 13);
    rows.push(
      slice
        .map((l) => (burned.has(l.toLowerCase()) ? "⬛" : "🟧"))
        .join(""),
    );
  }
  const lines = [
    `Letter Burn #${record.number} · ${record.score}`,
    rows[0],
    rows[1],
    `${record.cleared}/5 · ${saved} saved · ${record.doubleDuties} double · ${record.borrows} borrowed`,
    config.url,
  ].filter(Boolean);
  return lines.join("\n");
}
