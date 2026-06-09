/**
 * Zero-cost workshop populate — no LLM API keys.
 * Derives zone stickies from card title, description, and tags.
 */

import type { Card } from "./types";
import type { WorkshopTemplate } from "./workshop-templates";

function splitContent(text: string): string[] {
  return text
    .split(/\n+|(?:\s*[-•*]\s+)|(?:\.\s+(?=[A-Z]))/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

const ZONE_KEYWORDS: Record<string, RegExp> = {
  strengths: /\b(strength|win|good|pro|advantage|asset)\b/i,
  weaknesses: /\b(weak|bad|con|risk|gap|problem|issue)\b/i,
  opportunities: /\b(opportun|growth|upside|market|expand)\b/i,
  threats: /\b(threat|blocker|competitor|regulat|downside)\b/i,
  why: /\b(because|cause|reason|why|root)\b/i,
  actions: /\b(action|todo|next|must|should|fix|implement)\b/i,
  ideas: /\b(idea|brainstorm|option|suggest|could|might)\b/i,
  context: /\b(context|problem|challenge|goal|scope)\b/i,
  "must-have": /\b(must|critical|p0|required)\b/i,
  "should-have": /\b(should|important|p1)\b/i,
  "could-have": /\b(could|nice|p2|optional)\b/i,
  "wont-have": /\b(won't|wont|defer|later|out of scope)\b/i,
};

function scoreLineForZone(line: string, zoneId: string): number {
  const pattern = ZONE_KEYWORDS[zoneId];
  if (!pattern) return 0;
  return pattern.test(line) ? 2 : 0;
}

function assignLinesToZones(
  lines: string[],
  zoneIds: string[],
): Record<string, string[]> {
  const result: Record<string, string[]> = Object.fromEntries(
    zoneIds.map((id) => [id, []]),
  );
  if (lines.length === 0 || zoneIds.length === 0) return result;

  const used = new Set<number>();

  for (const zoneId of zoneIds) {
    let bestIdx = -1;
    let bestScore = 0;
    lines.forEach((line, idx) => {
      if (used.has(idx)) return;
      const score = scoreLineForZone(line, zoneId);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    });
    if (bestIdx >= 0) {
      result[zoneId].push(lines[bestIdx]);
      used.add(bestIdx);
    }
  }

  const remaining = lines.filter((_, idx) => !used.has(idx));
  let z = 0;
  for (const line of remaining) {
    while (z < zoneIds.length && result[zoneIds[z]].length >= 3) z++;
    if (z >= zoneIds.length) z = zoneIds.length - 1;
    result[zoneIds[z]].push(line);
    z++;
  }

  return result;
}

/** Build workshop zone content from card fields only (no external AI). */
export function heuristicZonesFromCard(
  card: Card,
  template: WorkshopTemplate,
): Record<string, string[]> {
  const zoneIds = template.zones.map((z) => z.id);
  const lines = splitContent(`${card.title}. ${card.description ?? ""}`);
  if (card.tags.length) {
    lines.push(...card.tags.map((t) => `Tag: ${t}`));
  }

  const assigned = assignLinesToZones(lines, zoneIds);

  if (zoneIds.includes("context") && assigned.context.length === 0) {
    assigned.context = [card.title];
    if (card.description?.trim()) {
      assigned.context.push(card.description.trim().slice(0, 280));
    }
  }

  if (zoneIds.includes("ideas") && assigned.ideas.length === 0 && lines.length > 0) {
    assigned.ideas = lines.slice(0, 5);
  }

  for (const zoneId of zoneIds) {
    if (assigned[zoneId].length === 0) {
      const hint = template.zones.find((z) => z.id === zoneId)?.hint;
      if (hint) assigned[zoneId] = [`(${hint} — add detail via MCP or canvas)`];
    }
  }

  return assigned;
}
