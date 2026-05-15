#!/usr/bin/env node

import open from 'open';
import fs from 'fs';
import path from 'path';
import { createApp } from './server.js';

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

const PORT = process.env.PORT || 5050;

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
