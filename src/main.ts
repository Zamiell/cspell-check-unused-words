#!/usr/bin/env node

import sourceMapSupport from "source-map-support";
import { CSPELL_CONFIG_PATH } from "./constants.js";
import { execShell } from "./exec.js";
import { fileExists, readFile, writeFile } from "./file.js";
import { getJSONC } from "./json.js";
import {
  getPackageManagerExecCommand,
  getPackageManagerUsedForExistingProject,
} from "./packageManager.js";
import { error, trimSuffix } from "./utils.js";

main();

function main() {
  sourceMapSupport.install();

  if (!fileExists(CSPELL_CONFIG_PATH)) {
    error(
      `Failed to find your CSpell configuration file at: ${CSPELL_CONFIG_PATH}`,
    );
  }

  const cSpellConfigString = readFile(CSPELL_CONFIG_PATH);
  const cSpellConfig = getJSONC(cSpellConfigString);
  const { words } = cSpellConfig;

  // Do nothing if they do not have a "words" array inside of the config.
  if (words === undefined) {
    return;
  }

  if (!Array.isArray(words)) {
    error(
      `Failed to parse the "words" field in the "${CSPELL_CONFIG_PATH}" file, since it was not an array.`,
    );
  }

  // Do nothing if the "words" array is empty.
  if (words.length === 0) {
    return;
  }

  for (const word of words) {
    if (typeof word !== "string") {
      error(
        `Failed to parse the "words" field in the "${CSPELL_CONFIG_PATH}" file, since one of the entires was of type: ${typeof word}`,
      );
    }
  }

  const wordsStrings = words as string[];
  const lowercaseWords = wordsStrings.map((word) => word.toLowerCase());

  // Delete all of the ignored words from the existing config. (Otherwise, the upcoming CSpell
  // command won't work properly.)
  cSpellConfig["words"] = undefined;
  const cSpellConfigWithoutWords = JSON.stringify(cSpellConfig);
  writeFile(CSPELL_CONFIG_PATH, cSpellConfigWithoutWords);

  // Run CSpell without any of the ignored words.
  const packageManager = getPackageManagerUsedForExistingProject();
  const packageManagerExecCommand =
    getPackageManagerExecCommand(packageManager);
  const args = [
    "cspell",
    "--no-progress",
    "--no-summary",
    "--unique",
    "--words-only",
  ];
  const { stdout } = execShell(packageManagerExecCommand, args);

  const misspelledWords = stdout.split("\n");
  const misspelledLowercaseWords = misspelledWords.map((word) =>
    word.toLowerCase(),
  );
  const misspelledLowercaseWordsSet = new Set(misspelledLowercaseWords);
  const misspelledUniqueWords = [...misspelledLowercaseWordsSet.values()];

  // Sort the words.
  // https://stackoverflow.com/questions/8996963/how-to-perform-case-insensitive-sorting-array-of-string-in-javascript
  misspelledUniqueWords.sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );

  const misspelledWordsWithoutSuffix = misspelledUniqueWords.map((word) =>
    trimSuffix(word, "'s"),
  );

  const misspelledWordsSet = new Set(misspelledWordsWithoutSuffix);

  // Restore the old configuration.
  writeFile(CSPELL_CONFIG_PATH, cSpellConfigString);

  // Check that each ignored word in the configuration file is actually being used.
  let oneOrMoreFailures = false;

  for (const word of lowercaseWords) {
    if (!misspelledWordsSet.has(word)) {
      console.log(
        `The following word in the CSpell config is not being used: ${word}`,
      );
      oneOrMoreFailures = true;
    }
  }

  const exitCode = oneOrMoreFailures ? 1 : 0;
  process.exit(exitCode);
}
