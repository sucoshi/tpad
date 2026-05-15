#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import open from 'open';
import { createApp } from './server.js';

const server = new Server(
  {
    name: "tpad-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "open_in_tpad",
        description: "Open the given markdown content in the tpad WYSIWYG editor. The user will edit it in their browser. This tool blocks until the user clicks 'Finish & Output' in the browser, and then returns the user's edited markdown.",
        inputSchema: {
          type: "object",
          properties: {
            markdown_content: {
              type: "string",
              description: "The markdown text to open in the editor."
            }
          },
          required: ["markdown_content"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
  if (request.params.name === "open_in_tpad") {
    const { markdown_content } = request.params.arguments;
    
    return new Promise((resolve, reject) => {
      let isDone = false;
      let expressServer;
      
      const cleanup = () => {
        if (expressServer) {
          expressServer.close();
        }
      };

      const app = createApp({
        initialContent: markdown_content || '',
        onSave: async () => {}, // mock success for save
        onExit: async (content) => {
          isDone = true;
          cleanup();
          resolve({
            content: [{ type: "text", text: content }]
          });
        }
      });

      // Try dynamically assigning a port (0 means random free port)
      expressServer = app.listen(0, async () => {
        const port = expressServer.address().port;
        const url = `http://localhost:${port}`;
        try {
          await open(url);
        } catch (err) {
          // ignore
        }
      });

      // Handle MCP cancellation token
      if (extra?.signal) {
        extra.signal.addEventListener("abort", () => {
          if (!isDone) {
            cleanup();
            reject(new Error("Operation cancelled (likely via Ctrl+C in Claude)."));
          }
        });
      }
    });
  }
  
  throw new Error(`Unknown tool: ${request.params.name}`);
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
