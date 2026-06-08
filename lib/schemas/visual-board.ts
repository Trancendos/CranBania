import { z } from "zod";
import { VISUAL_BOARD_TYPES, VISUAL_NODE_KINDS } from "../visual-types";

export const createVisualBoardSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  boardType: z.enum(VISUAL_BOARD_TYPES as [string, ...string[]]).optional(),
  linkedCardId: z.string().uuid().optional(),
  linkedEpicId: z.string().uuid().optional(),
});

export const updateVisualBoardSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  viewport: z
    .object({
      x: z.number(),
      y: z.number(),
      zoom: z.number().positive(),
    })
    .optional(),
  linkedCardId: z.string().uuid().nullable().optional(),
  linkedEpicId: z.string().uuid().nullable().optional(),
});

export const addVisualNodeSchema = z.object({
  kind: z.enum(VISUAL_NODE_KINDS as [string, ...string[]]),
  x: z.number(),
  y: z.number(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  text: z.string().optional(),
  color: z.string().optional(),
  cardId: z.string().uuid().optional(),
  parentFrameId: z.string().uuid().optional(),
});

export const updateVisualNodeSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  text: z.string().optional(),
  color: z.string().optional(),
  cardId: z.string().uuid().nullable().optional(),
});

export const addVisualEdgeSchema = z.object({
  fromNodeId: z.string().uuid(),
  toNodeId: z.string().uuid(),
  label: z.string().optional(),
  style: z.enum(["solid", "dashed", "dotted"]).optional(),
});

export const replaceCanvasSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string().uuid(),
      kind: z.enum(VISUAL_NODE_KINDS as [string, ...string[]]),
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
      text: z.string(),
      color: z.string().optional(),
      cardId: z.string().uuid().optional(),
      parentFrameId: z.string().uuid().optional(),
    }),
  ),
  edges: z.array(
    z.object({
      id: z.string().uuid(),
      fromNodeId: z.string().uuid(),
      toNodeId: z.string().uuid(),
      label: z.string().optional(),
      style: z.enum(["solid", "dashed", "dotted"]).optional(),
    }),
  ),
});
