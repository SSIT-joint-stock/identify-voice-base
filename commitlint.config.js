// @ts-check

/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Type must be one of the following
    "type-enum": [
      2,
      "always",
      [
        "feat", // New feature
        "fix", // Bug fix
        "docs", // Documentation changes
        "style", // Code style (formatting, missing semi, etc)
        "refactor", // Code refactor (neither fixes a bug nor adds a feature)
        "perf", // Performance improvements
        "test", // Adding/updating tests
        "build", // Changes to build system or dependencies
        "ci", // CI/CD configuration changes
        "chore", // Maintenance tasks
        "revert", // Reverting a previous commit
      ],
    ],
    "type-case": [2, "always", "lower-case"],
    "subject-case": [0],
    "subject-empty": [2, "never"],
    "subject-full-stop": [0],
    "header-max-length": [0],
    "body-max-line-length": [0],
    "body-leading-blank": [1, "always"],
    "footer-leading-blank": [1, "always"],
  },
};
