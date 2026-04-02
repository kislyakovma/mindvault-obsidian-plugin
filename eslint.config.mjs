import obsidianmd from "./node_modules/eslint-plugin-obsidianmd/dist/lib/index.js";

// Use only non-typed rules
const recommended = obsidianmd.configs.recommended;
const filteredRules = recommended.flatMap(c => {
  if (!c.rules) return [c];
  const rules = {};
  for (const [k, v] of Object.entries(c.rules)) {
    // Only keep sentence-case and settings-tab rules (don't need type info)
    if (k.includes('sentence-case') || k.includes('settings-tab') || 
        k.includes('no-problematic') || k.includes('no-manual') ||
        k.includes('prefer-sentence') || k.includes('no-forbidden')) {
      rules[k] = v;
    }
  }
  return [{ ...c, rules }];
});

export default [
  ...filteredRules,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
    },
  },
];
