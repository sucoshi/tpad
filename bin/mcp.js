#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import open from 'open';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { createApp } from './server.js';

const server = new Server(
  {
    name: "tpad-mcp-server",
    version: "1.2.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

let expressServer = null;
let currentPort = null;
const PORT = process.env.PORT || 5050;

function pingServer(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/ping`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.success && json.app === 'tpad');
        } catch {
          resolve(false);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

function sendIpcRequest(port, method, apiPath, payload) {
  return new Promise((resolve, reject) => {
    const postData = payload ? JSON.stringify(payload) : '';
    const options = {
      hostname: 'localhost',
      port: port,
      path: apiPath,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (payload) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (payload) {
      req.write(postData);
    }
    req.end();
  });
}

async function startPersistentServer(initialContent) {
  if (expressServer) {
    return currentPort;
  }

  // Check if a tpad server is already running on the fixed port
  const isRunning = await pingServer(PORT);
  if (isRunning) {
    currentPort = PORT;
    return PORT;
  }

  return new Promise((resolve) => {
    const app = createApp({
      initialContent: initialContent || '',
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
        if (expressServer) {
          expressServer.close();
          expressServer = null;
          currentPort = null;
        }
      }
    });

    // Try starting on PORT 5050
    expressServer = app.listen(PORT, () => {
      currentPort = PORT;
      const url = `http://localhost:${PORT}/?mcp=true`;
      open(url).catch(() => {}); // Do NOT await to prevent blocking!
      resolve(PORT);
    });

    expressServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Fallback to a random port if 5050 is in use by a non-tpad app
        expressServer = app.listen(0, () => {
          currentPort = expressServer.address().port;
          const url = `http://localhost:${currentPort}/?mcp=true`;
          open(url).catch(() => {});
          resolve(currentPort);
        });
      } else {
        console.error('Failed to start server in MCP:', err);
        resolve(null);
      }
    });
  });
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "tpad_open",
        description: "RECOMMENDED: Non-blocking tool to open or update content in the browser-based WYSIWYG Markdown Editor. It opens a tab in the user's browser and returns immediately, allowing you to receive further instructions while the user views the live page. If tpad is already open, calling this updates the editor content in real-time. CRITICAL: Before calling this to update content, you MUST FIRST call 'tpad_read' to retrieve the latest text, as the user might have made direct edits in their browser. Never overwrite without reading first!",
        inputSchema: {
          type: "object",
          properties: {
            markdown_content: {
              type: "string",
              description: "The raw markdown content to display in the editor."
            },
            filepath: {
              type: "string",
              description: "Optional absolute path of a file to bind/sync to."
            }
          },
          required: ["markdown_content"]
        }
      },
      {
        name: "tpad_read",
        description: "Read the current active markdown content from the running tpad editor tab. CRITICAL: You MUST call this tool before making any modifications to the draft, to ensure you are editing the user's latest manual changes made directly in the browser editor. Never assume the text in your chat history is up-to-date.",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "tpad",
        description: "LEGACY: WYSIWYG Markdown Editor tool. Blocks execution until the user manually clicks 'Finish & Output' in the browser editor. Returns the finalized markdown text as the tool response. For interactive multi-turn chat edits, use 'tpad_open' instead.",
        inputSchema: {
          type: "object",
          properties: {
            markdown_content: {
              type: "string",
              description: "The raw markdown text to open in the editor."
            }
          },
          required: ["markdown_content"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
  const { name } = request.params;
  
  if (name === "tpad_open") {
    const { markdown_content, filepath } = request.params.arguments;
    const port = await startPersistentServer(markdown_content);
    
    await sendIpcRequest(port, 'POST', '/api/open', {
      filepath: filepath || null,
      content: markdown_content || ''
    });
    
    return {
      content: [{ type: "text", text: "tpad editor successfully opened/updated in your browser. You can now view the content and continue chatting with me." }]
    };
  }
  
  if (name === "tpad_read") {
    if (!expressServer && !currentPort) {
      // Try to see if there is already a global tpad server running on port 5050
      const isRunning = await pingServer(PORT);
      if (isRunning) {
        currentPort = PORT;
      }
    }
    
    if (!currentPort) {
      return {
        content: [{ type: "text", text: "Error: No active tpad session is running. Please open it using 'tpad_open' first." }]
      };
    }
    
    try {
      const fileData = await sendIpcRequest(currentPort, 'GET', '/api/file');
      return {
        content: [{ type: "text", text: fileData.content || '' }]
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error reading active tpad editor: ${err.message}` }]
      };
    }
  }

  if (name === "tpad") {
    const { markdown_content } = request.params.arguments;
    
    return new Promise((resolve, reject) => {
      let isDone = false;
      let tempExpressServer;
      
      const cleanup = () => {
        if (tempExpressServer) {
          tempExpressServer.close();
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
      tempExpressServer = app.listen(0, async () => {
        const port = tempExpressServer.address().port;
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
  
  throw new Error(`Unknown tool: ${name}`);
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
