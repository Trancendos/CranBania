#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  addCodeChange,
  addComment,
  createCard,
  deleteCard,
  getBoardSummary,
  getCard,
  getCardJournal,
  listBacklog,
  listCards,
  listCardsByType,
  getPrince2Overview,
  getSlaReport,
  moveCard,
  readBoard,
  updateCard,
} from "../lib/board";
import { exportWorkspace } from "../lib/export";
import { buildAutomationStatus } from "../lib/automation/status";
import { runSlaChecks } from "../lib/sla-monitor";
import { createEpic, createSprint } from "../lib/workspace";
import {
  addVisualEdge,
  addVisualNode,
  createVisualBoard,
  deleteVisualBoard,
  deleteVisualEdge,
  deleteVisualNode,
  getVisualBoard,
  listVisualBoards,
  replaceVisualCanvas,
  updateVisualBoard,
  updateVisualNode,
} from "../lib/visual-board";
import { VISUAL_BOARD_TYPES, VISUAL_NODE_KINDS } from "../lib/visual-types";
import { CARD_TYPES, COLUMN_IDS, type CardType, type ColumnId } from "../lib/types";

const columnIdSchema = z.enum(COLUMN_IDS as [string, ...string[]]);

const server = new McpServer({
  name: "cranbania",
  version: "0.6.0",
});

server.tool(
  "list_board",
  "Return the full Kanban board with all columns and cards",
  {},
  async () => {
    const board = await readBoard();
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(board, null, 2),
        },
      ],
    };
  },
);

server.tool(
  "board_summary",
  "Summarize card counts per column",
  {},
  async () => {
    const summary = await getBoardSummary();
    return {
      content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }],
    };
  },
);

server.tool(
  "list_backlog",
  "List all cards in the Backlog column",
  {},
  async () => {
    const cards = await listBacklog();
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ cards }, null, 2) }],
    };
  },
);

server.tool(
  "get_journal",
  "Get the full audit journal for a card",
  { id: z.string() },
  async ({ id }) => {
    const journal = await getCardJournal(id);
    if (!journal) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Not found" }) }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ journal }, null, 2) }],
    };
  },
);

server.tool(
  "add_comment",
  "Add a comment/note to a card",
  {
    id: z.string(),
    message: z.string().min(1),
    actor: z.string().optional(),
  },
  async ({ id, message, actor }) => {
    const card = await addComment(id, message, actor);
    if (!card) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Not found" }) }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ card }, null, 2) }],
    };
  },
);

server.tool(
  "add_code_change",
  "Record code added, edited, or deleted on a card",
  {
    id: z.string(),
    filePath: z.string().min(1),
    changeType: z.enum(["added", "edited", "deleted"]),
    content: z.string(),
    previousContent: z.string().optional(),
    language: z.string().optional(),
    actor: z.string().optional(),
  },
  async ({ id, ...input }) => {
    const card = await addCodeChange(id, input);
    if (!card) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Not found" }) }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ card }, null, 2) }],
    };
  },
);

server.tool(
  "list_cards",
  "List cards, optionally filtered by column",
  {
    columnId: columnIdSchema.optional().describe("Filter by column id"),
  },
  async ({ columnId }) => {
    const cards = await listCards(columnId as ColumnId | undefined);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ cards }, null, 2) }],
    };
  },
);

server.tool(
  "get_card",
  "Get a single card by id",
  { id: z.string().describe("Card UUID") },
  async ({ id }) => {
    const card = await getCard(id);
    if (!card) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Not found" }) }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ card }, null, 2) }],
    };
  },
);

server.tool(
  "create_card",
  "Create a new Kanban card",
  {
    title: z.string().min(1),
    description: z.string().optional(),
    columnId: columnIdSchema.optional().describe("Defaults to backlog"),
    assignee: z.string().optional().describe("e.g. claude, cursor, human"),
    cardType: z.enum(CARD_TYPES as [string, ...string[]]).optional(),
    sprintId: z.string().optional(),
    epicId: z.string().optional(),
  },
  async (input) => {
    const card = await createCard({
      ...input,
      columnId: input.columnId as ColumnId | undefined,
      cardType: input.cardType as CardType | undefined,
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ card }, null, 2) }],
    };
  },
);

server.tool(
  "update_card",
  "Update card fields (title, description, assignee, tags)",
  {
    id: z.string(),
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    assignee: z.string().optional(),
    tags: z.array(z.string()).optional(),
  },
  async ({ id, ...input }) => {
    const card = await updateCard(id, input);
    if (!card) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Not found" }) }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ card }, null, 2) }],
    };
  },
);

server.tool(
  "move_card",
  "Move a card to another column (backlog, planning, in_progress, review, done)",
  {
    id: z.string(),
    columnId: columnIdSchema,
    order: z.number().int().min(0).optional(),
  },
  async ({ id, columnId, order }) => {
    const card = await moveCard(id, columnId as ColumnId, order, {
      actor: "mcp",
    });
    if (!card) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Not found" }) }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ card }, null, 2) }],
    };
  },
);

server.tool(
  "delete_card",
  "Delete a card from the board",
  { id: z.string() },
  async ({ id }) => {
    const ok = await deleteCard(id);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(ok ? { deleted: id } : { error: "Not found" }),
        },
      ],
      isError: !ok,
    };
  },
);

server.tool(
  "export_workspace",
  "Export full workspace JSON (board + epics + sprints) — zero-cost backup",
  {},
  async () => {
    const data = await exportWorkspace();
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  },
);

server.tool(
  "create_epic",
  "Create an Agile epic (free, built-in)",
  { title: z.string().min(1), description: z.string().optional() },
  async ({ title, description }) => {
    const epic = await createEpic(title, description);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ epic }, null, 2) }],
    };
  },
);

server.tool(
  "create_sprint",
  "Create a sprint; optionally activate it",
  {
    name: z.string().min(1),
    goal: z.string().optional(),
    startDate: z.string(),
    endDate: z.string(),
    activate: z.boolean().optional(),
  },
  async (input) => {
    const sprint = await createSprint(input);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ sprint }, null, 2) }],
    };
  },
);

server.tool(
  "list_incidents",
  "ITSM-lite: list incident cards with SLA status (no ServiceNow)",
  {},
  async () => {
    const incidents = await listCardsByType("incident");
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ incidents }, null, 2) }],
    };
  },
);

server.tool(
  "get_sla_report",
  "All cards with SLA timers and breach status",
  {},
  async () => {
    const sla = await getSlaReport();
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ sla }, null, 2) }],
    };
  },
);

server.tool(
  "get_prince2_overview",
  "Prince2-lite stage counts across cards",
  {},
  async () => {
    const overview = await getPrince2Overview();
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ overview }, null, 2) }],
    };
  },
);

server.tool(
  "get_automation_status",
  "Automation health: scheduler, webhooks, Forgejo/Woodpecker integration config",
  {},
  async () => {
    const status = await buildAutomationStatus();
    return {
      content: [{ type: "text" as const, text: JSON.stringify(status, null, 2) }],
    };
  },
);

server.tool(
  "run_sla_check",
  "Scan all cards for SLA warnings/breaches and fire webhooks (same as POST /api/itsm/sla/check)",
  {},
  async () => {
    const { breaches, warnings } = await runSlaChecks();
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              ok: true,
              cardsNotified: breaches,
              warningsNotified: warnings,
              checkedAt: new Date().toISOString(),
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.tool(
  "list_visual_boards",
  "List Lucid/Miro-style visual boards (whiteboard, flowchart, mindmap, retro, architecture)",
  {
    boardType: z
      .enum(VISUAL_BOARD_TYPES as [string, ...string[]])
      .optional()
      .describe("Filter by board template type"),
    linkedCardId: z.string().uuid().optional().describe("Filter boards linked to a Kanban card"),
  },
  async (filters) => {
    const boards = await listVisualBoards(filters);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ boards }, null, 2) }],
    };
  },
);

server.tool(
  "get_visual_board",
  "Get a visual board with all nodes and edges",
  { id: z.string().uuid() },
  async ({ id }) => {
    const board = await getVisualBoard(id);
    if (!board) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Not found" }) }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ board }, null, 2) }],
    };
  },
);

server.tool(
  "create_visual_board",
  "Create a visual board with optional template (flowchart, mindmap, retro, architecture, whiteboard)",
  {
    title: z.string().min(1),
    description: z.string().optional(),
    boardType: z.enum(VISUAL_BOARD_TYPES as [string, ...string[]]).optional(),
    linkedCardId: z.string().uuid().optional(),
    linkedEpicId: z.string().uuid().optional(),
  },
  async (input) => {
    const board = await createVisualBoard(input);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ board }, null, 2) }],
    };
  },
);

server.tool(
  "update_visual_board",
  "Update board metadata or viewport (pan/zoom)",
  {
    id: z.string().uuid(),
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    viewport: z
      .object({ x: z.number(), y: z.number(), zoom: z.number().positive() })
      .optional(),
    linkedCardId: z.string().uuid().nullable().optional(),
    linkedEpicId: z.string().uuid().nullable().optional(),
  },
  async ({ id, ...input }) => {
    const board = await updateVisualBoard(id, input);
    if (!board) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Not found" }) }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ board }, null, 2) }],
    };
  },
);

server.tool(
  "delete_visual_board",
  "Delete a visual board",
  { id: z.string().uuid() },
  async ({ id }) => {
    const ok = await deleteVisualBoard(id);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(ok ? { deleted: id } : { error: "Not found" }),
        },
      ],
      isError: !ok,
    };
  },
);

server.tool(
  "add_visual_node",
  "Add a shape or sticky to a visual board (rectangle, diamond, ellipse, sticky, frame, etc.)",
  {
    boardId: z.string().uuid(),
    kind: z.enum(VISUAL_NODE_KINDS as [string, ...string[]]),
    x: z.number(),
    y: z.number(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    text: z.string().optional(),
    color: z.string().optional(),
    cardId: z.string().uuid().optional().describe("Link node to a Kanban card"),
  },
  async ({ boardId, ...input }) => {
    const board = await addVisualNode(boardId, input);
    if (!board) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Not found" }) }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ board }, null, 2) }],
    };
  },
);

server.tool(
  "update_visual_node",
  "Move or edit a node on a visual board",
  {
    boardId: z.string().uuid(),
    nodeId: z.string().uuid(),
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    text: z.string().optional(),
    color: z.string().optional(),
    cardId: z.string().uuid().nullable().optional(),
  },
  async ({ boardId, nodeId, ...input }) => {
    const board = await updateVisualNode(boardId, nodeId, input);
    if (!board) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Not found" }) }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ board }, null, 2) }],
    };
  },
);

server.tool(
  "delete_visual_node",
  "Remove a node and its connected edges from a visual board",
  {
    boardId: z.string().uuid(),
    nodeId: z.string().uuid(),
  },
  async ({ boardId, nodeId }) => {
    const board = await deleteVisualNode(boardId, nodeId);
    if (!board) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Not found" }) }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ board }, null, 2) }],
    };
  },
);

server.tool(
  "add_visual_edge",
  "Connect two nodes with an arrow/line (flowchart style)",
  {
    boardId: z.string().uuid(),
    fromNodeId: z.string().uuid(),
    toNodeId: z.string().uuid(),
    label: z.string().optional(),
    style: z.enum(["solid", "dashed", "dotted"]).optional(),
  },
  async ({ boardId, ...input }) => {
    const board = await addVisualEdge(boardId, input);
    if (!board) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: "Board or node not found" }),
          },
        ],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ board }, null, 2) }],
    };
  },
);

server.tool(
  "delete_visual_edge",
  "Remove a connector between nodes",
  {
    boardId: z.string().uuid(),
    edgeId: z.string().uuid(),
  },
  async ({ boardId, edgeId }) => {
    const board = await deleteVisualEdge(boardId, edgeId);
    if (!board) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Not found" }) }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ board }, null, 2) }],
    };
  },
);

server.tool(
  "replace_visual_canvas",
  "Replace all nodes and edges at once (batch diagram updates for AI agents)",
  {
    boardId: z.string().uuid(),
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
  },
  async ({ boardId, nodes, edges }) => {
    const board = await replaceVisualCanvas(boardId, nodes, edges);
    if (!board) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Not found" }) }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ board }, null, 2) }],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
