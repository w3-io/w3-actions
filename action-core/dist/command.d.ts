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
export declare function createCommandRouter(commands: CommandMap): () => void;
