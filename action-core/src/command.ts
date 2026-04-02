import * as core from "@actions/core";
import { handleError } from "./error.js";

/**
 * A command handler receives no arguments — it reads inputs via
 * @actions/core and sets outputs via setJsonOutput.
 */
export type CommandHandler = () => Promise<void>;

/**
 * Map of command names to handlers.
 */
export type CommandMap = Record<string, CommandHandler>;

/**
 * Create a command router that dispatches on the `command` input.
 *
 * Usage:
 *   const router = createCommandRouter({
 *     "create-payment": async () => { ... },
 *     "get-payment": async () => { ... },
 *   });
 *   router();  // reads `command` input, dispatches, handles errors
 */
export function createCommandRouter(commands: CommandMap): () => void {
  return () => {
    const command = core.getInput("command", { required: true });

    const handler = commands[command];
    if (!handler) {
      const available = Object.keys(commands).join(", ");
      core.setFailed(
        `Unknown command: '${command}'. Available: ${available}`,
      );
      return;
    }

    handler().catch(handleError);
  };
}
