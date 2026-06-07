#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  createCard,
  deleteCard,
  getBoardSummary,
  getCard,
  listCards,
  moveCard,
  readBoard,
  updateCard,
} from "../lib/board";
import { COLUMN_IDS, type ColumnId } from "../lib/types";

const columnIdSchema = z.enum(COLUMN_IDS as [string, ...string[]]);

const server = new McpServer({
  name: "cranbania",
  version: "0.1.0",
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
    tags: z.array(z.string()).optional(),
  },
  async (input) => {
    const card = await createCard({
      ...input,
      columnId: input.columnId as ColumnId | undefined,
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
    const card = await moveCard(id, columnId as ColumnId, order);
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
