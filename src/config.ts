export const config = {
  name: "Letter Burn",
  tagline: "Every word costs you letters.",
  url: "",
  launchDate: "2026-10-19",
  suggestionFormUrl: "",
  // Scoring weights (brief §5)
  pointsPerPrompt: 100,
  pointsPerUnburned: 5,
  pointsPerBorrow: 8,
  maxBorrows: 3,
} as const;

export type Config = typeof config;
