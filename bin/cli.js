#!/usr/bin/env node

import open from 'open';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { createApp } from './server.js';

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

function openInExistingServer(port, payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/api/open',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.success) {
            resolve(json);
          } else {
            reject(new Error(json.error || 'Failed to open'));
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

const targetFile = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : null;

let pipedContent = '';
if (!process.stdin.isTTY) {
  try {
    for await (const chunk of process.stdin) {
      pipedContent += chunk;
    }
  } catch (err) {
    console.error('Error reading from stdin:', err);
  }
}

const PORT = process.env.PORT || 5050;

// Try pinging existing instance first
const isRunning = await pingServer(PORT);
if (isRunning) {
  try {
    if (targetFile) {
      await openInExistingServer(PORT, { filepath: targetFile });
      console.error(`Opened in existing tpad instance: ${targetFile}`);
    } else if (pipedContent) {
      await openInExistingServer(PORT, { content: pipedContent });
      console.error(`Opened piped content in existing tpad instance.`);
    } else {
      await openInExistingServer(PORT, { content: '' });
      console.error(`Switched to existing tpad instance.`);
    }
    process.exit(0);
  } catch (err) {
    console.error(`Failed to communicate with existing tpad instance: ${err.message}. Starting new instance...`);
  }
}

let initialContent = pipedContent;
let initialFilename = '';

if (targetFile) {
  initialFilename = path.basename(targetFile);
  if (fs.existsSync(targetFile)) {
    initialContent = fs.readFileSync(targetFile, 'utf8');
  }
}

const app = createApp({
  initialContent,
  initialFilename,
  targetFile,
  onSave: async (content, filename) => {
    let savedPath = null;
    if (targetFile) {
      fs.writeFileSync(targetFile, content, 'utf8');
      console.error(`Saved: ${targetFile}`);
      savedPath = targetFile;
    } else if (filename) {
      const newTarget = path.resolve(process.cwd(), filename);
      fs.writeFileSync(newTarget, content, 'utf8');
      console.error(`Saved: ${newTarget}`);
      savedPath = newTarget;
    } else {
      console.error(`Content saved (in-memory only, no file specified)`);
    }
    return savedPath;
  },
  onExit: async (content) => {
    process.stdout.write(content);
    process.exit(0);
  }
});

const server = app.listen(PORT, async () => {
  const address = server.address();
  if (!address) return;
  const url = `http://localhost:${address.port}`;
  console.error(`tpad editor running at ${url}`);
  if (targetFile) {
    console.error(`Editing file: ${targetFile}`);
  } else {
    console.error(`No file specified. Run 'tpad <filename>' to edit a specific file.`);
  }

  try {
    await open(url);
  } catch (err) {
    console.error(`Failed to automatically open browser. Please visit ${url}`);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please close any running tpad instances.`);
  } else {
    console.error(`Failed to start server:`, err);
  }
  process.exit(1);
});

process.on('SIGINT', () => {
  console.error('\nClosing tpad...');
  server.close(() => process.exit(0));
});
