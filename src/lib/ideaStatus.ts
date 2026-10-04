/**
 * Idea status vocabularies. The static seed in fleet.ts uses new / scoped /
 * backlog / shipped; the board (fil_ideas) and the UI use the pipeline stages
 * backlog / planned / building / shipped / archived. One map, shared by the web
 * route and the agent API so they cannot drift apart.
 */
export const STATUS_MAP: Record<string, string> = {
  new: "backlog",
  backlog: "backlog",
  scoped: "planned",
  shipped: "shipped",
};

/** A seed status expressed in the pipeline vocabulary (unknown values read as backlog). */
export function seedToPipeline(seed: string): string {
  return STATUS_MAP[seed] ?? "backlog";
}

/**
 * The status a consumer should read: the persisted board status when the idea has
 * a board row, otherwise its seed mapped into the same vocabulary.
 */
export function effectiveStatus(seed: string, board: { status: string } | null | undefined): string {
  return board?.status ?? seedToPipeline(seed);
}
