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

export const runWorkshopSchema = z.object({
  cardId: z.string().uuid(),
  templateId: z.enum(WORKSHOP_TEMPLATE_IDS as [string, ...string[]]).optional(),
  title: z.string().min(1).optional(),
  actor: z.string().optional(),
  zones: z.record(z.string(), z.array(z.string())).optional(),
  wireframeComponents: z
    .array(
      z.object({
        kind: z.enum([
          "wire_heading",
          "wire_label",
          "wire_button",
          "wire_input",
          "wire_checkbox",
          "wire_nav",
          "wire_image",
          "wire_card",
          "wire_divider",
        ]),
        text: z.string().optional(),
        x: z.number().optional(),
        y: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
      }),
    )
    .optional(),
  wireframeZoneId: z.string().optional(),
  replacePlaceholders: z.boolean().optional(),
  record: z.boolean().optional(),
  createFollowUpCards: z.boolean().optional(),
  emitWebhook: z.boolean().optional(),
  updateDescription: z.boolean().optional(),
  appendTags: z.boolean().optional(),
});

export const populateWireframeSchema = z.object({
  zoneId: z.string().optional(),
  components: z.array(
    z.object({
      kind: z.enum([
        "wire_heading",
        "wire_label",
        "wire_button",
        "wire_input",
        "wire_checkbox",
        "wire_nav",
        "wire_image",
        "wire_card",
        "wire_divider",
      ]),
      text: z.string().optional(),
      x: z.number().optional(),
      y: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    }),
  ),
  actor: z.string().optional(),
  replaceExisting: z.boolean().optional(),
});

export const recordWorkshopSchema = z.object({
  cardId: z.string().uuid().optional(),
  actor: z.string().optional(),
  updateDescription: z.boolean().optional(),
  appendTags: z.boolean().optional(),
  markComplete: z.boolean().optional(),
  createFollowUpCards: z.boolean().optional(),
  emitWebhook: z.boolean().optional(),
});

export const suggestWorkshopSchema = z.object({
  cardId: z.string().uuid(),
  limit: z.number().int().min(1).max(20).optional(),
});
