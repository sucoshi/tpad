#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import open from 'open';
import fs from 'fs';
import path from 'path';
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
        name: "tpad",
        description: "WYSIWYG Markdown Editor tool. If the user wants to write, edit, or open any generated markdown/text in 'tpad', you MUST use THIS tool. DO NOT create or write to any .md files on the disk. DO NOT use the Bash tool. Just pass the raw markdown string directly into the 'markdown_content' parameter. IMPORTANT: When this tool finishes, it means the user has provided their edited text. You MUST explicitly tell the user something like 'I have received your edited text from tpad' in your final response.",
        inputSchema: {
          type: "object",
          properties: {
            markdown_content: {
              type: "string",
              description: "The raw markdown text to open in the editor. Pass the content directly here, no files needed."
            }
          },
          required: ["markdown_content"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
  if (request.params.name === "tpad") {
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
        onSave: async (content, filename) => {
          if (!filename) return null;
          try {
            const savedPath = path.resolve(process.cwd(), filename);
            fs.writeFileSync(savedPath, content, 'utf8');
            return savedPath;
          } catch (err) {
            console.error('Failed to save from MCP session:', err);
            return null;
          }
        },
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
        const url = `http://localhost:${port}/?mcp=true`;
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
