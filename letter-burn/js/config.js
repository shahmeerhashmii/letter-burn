// Everything you might want to change lives here.
export const CONFIG = {
  name: "Letter Burn",
  tagline: "Every word costs you letters.",
  // Shown in the share text. Leave empty to use the page's own address.
  url: "",
  // Puzzle #1 is this date. The day flips at each player's local midnight.
  launchDate: "2026-11-09",
  points: { prompt: 100, letter: 5, borrow: 8 }, // borrow must stay above letter
  maxBorrows: 3,
  // Paste a Google Form link here to show "Think it should count?" on unknown words.
  suggestFormUrl: "",
};
