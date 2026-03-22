import type { JmapSession } from "jmap-lib";

export function hasServerCapability(session: JmapSession, capability: string): boolean {
  return capability in session.capabilities;
}
