/**
 * One JSON line per agent call on stdout (Vercel runtime logs).
 * Never the key, never a request body, never a response body.
 */
export type AuditEntry = {
  ts: string;
  surface: "rest" | "mcp";
  op: string;
  keyId: string;
  status: number;
  ms: number;
};

export function audit(entry: Omit<AuditEntry, "ts">): void {
  const line: AuditEntry = { ts: new Date().toISOString(), ...entry };
  console.log(JSON.stringify({ agent_surface: line }));
}
