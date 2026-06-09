import { z } from "zod";
import { WORKSHOP_TEMPLATE_IDS } from "../workshop-templates";

export const startWorkshopSchema = z.object({
  cardId: z.string().uuid(),
  templateId: z.enum(WORKSHOP_TEMPLATE_IDS as [string, ...string[]]),
  title: z.string().min(1).optional(),
  actor: z.string().optional(),
});

export const populateWorkshopSchema = z.object({
  zones: z.record(z.string(), z.array(z.string())),
  actor: z.string().optional(),
  replacePlaceholders: z.boolean().optional(),
});

export const recordWorkshopSchema = z.object({
  cardId: z.string().uuid().optional(),
  actor: z.string().optional(),
  updateDescription: z.boolean().optional(),
  appendTags: z.boolean().optional(),
  markComplete: z.boolean().optional(),
});

export const suggestWorkshopSchema = z.object({
  cardId: z.string().uuid(),
  limit: z.number().int().min(1).max(20).optional(),
});
