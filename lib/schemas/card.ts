/**
 * Zod validators — CranBania equivalent of schema-builder + function-creator args.
 */

import { z } from "zod";

export const cardTypeSchema = z.enum([
  "task",
  "feature",
  "bug",
  "incident",
  "change",
]);

export const prioritySchema = z.enum(["low", "medium", "high", "critical"]);

export const columnIdSchema = z.enum([
  "backlog",
  "planning",
  "in_progress",
  "review",
  "done",
]);

export const createCardSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  columnId: columnIdSchema.optional(),
  assignee: z.string().optional(),
  tags: z.array(z.string()).optional(),
  cardType: cardTypeSchema.optional(),
  priority: prioritySchema.optional(),
  epicId: z.string().uuid().optional(),
  sprintId: z.string().uuid().optional(),
  storyPoints: z.number().int().positive().optional(),
});

export const webhookRegisterSchema = z.object({
  url: z.string().url(),
  enabled: z.boolean().optional().default(true),
  secret: z.string().optional(),
  events: z
    .array(z.enum(["card.in_progress", "card.sla_breach"]))
    .optional()
    .default(["card.in_progress", "card.sla_breach"]),
});
