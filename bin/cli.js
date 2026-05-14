#!/usr/bin/env node

import express from 'express';
import open from 'open';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the filename from the first argument (e.g. `tpad memo.md`)
const targetFile = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : null;

const app = express();
app.use(cors());
app.use(express.json());

// API to get file contents
app.get('/api/file', (req, res) => {
  let content = '';
  let filename = '';

  if (targetFile) {
    filename = path.basename(targetFile);
    if (fs.existsSync(targetFile)) {
      content = fs.readFileSync(targetFile, 'utf8');
    }
  }

  res.json({ content, filename });
});

// API to save file contents
app.post('/api/file', (req, res) => {
  const { content, filename } = req.body;
  
  if (targetFile) {
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log(`Saved: ${targetFile}`);
    return res.json({ success: true });
  } 
  
  if (filename) {
    const newTarget = path.resolve(process.cwd(), filename);
    fs.writeFileSync(newTarget, content, 'utf8');
    console.log(`Saved: ${newTarget}`);
    return res.json({ success: true });
  }

  // If no filename is provided at all
  console.log(`Content saved (in-memory only, no file specified):\n${content}`);
  res.json({ success: true });
});

// Serve the built static files
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA routing (if any)
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start server on a free port (or 5050 as default)
const PORT = process.env.PORT || 5050;

const server = app.listen(PORT, async () => {
  const url = `http://localhost:${server.address().port}`;
  console.log(`tpad editor running at ${url}`);
  if (targetFile) {
    console.log(`Editing file: ${targetFile}`);
  } else {
    console.log(`No file specified. Run 'tpad <filename>' to edit a specific file.`);
  }

  try {
    await open(url);
  } catch (err) {
    console.error(`Failed to automatically open browser. Please visit ${url}`);
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nClosing tpad...');
  server.close(() => process.exit(0));
});
