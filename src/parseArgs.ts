import { Command } from "@commander-js/extra-typings";
import path from "node:path";
import { getPackageJSONFieldsMandatory } from "./completeCommon.js";

const packageRoot = path.join(import.meta.dirname, "..");
const { name, version, description } = getPackageJSONFieldsMandatory(
  packageRoot,
  "name",
  "version",
  "description",
);

export const program = new Command()
  .name(name)
  .description(`${description}.`)
  .version(version, "-V, --version", "Output the version number.")
  .helpOption("-h, --help", "Display the list of commands and options.")
  .helpCommand(false)
  .allowExcessArguments(false) // By default, Commander.js will allow extra positional arguments.
  .option("-v, --verbose", "Enable verbose output.", false)
  .option("-s, --simple", "Enable simple output.", false);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const options = program.opts();
export type Options = typeof options;
