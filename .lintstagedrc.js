module.exports = {
  "apps/**/*.ts": ["pnpm --filter nest exec eslint --fix", "prettier --write"],
  "apps/**/*.{json,md}": ["prettier --write"],
};
