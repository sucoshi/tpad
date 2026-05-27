import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp({ initialContent = '', initialFilename = '', targetFile: initialTargetFile = null, onSave, onExit }) {
  const app = express();
  
  // Safe CORS configuration: Only allow localhost origins
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (isLocalhost) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  }));
  app.use(express.json());

  const backupDir = path.join(os.homedir(), '.tpad-backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const sessionId = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
  const backupFile = path.join(backupDir, `backup-${sessionId}.md`);

  let lastHeartbeat = Date.now();
  let hasReceivedFirstHeartbeat = false;

  const historyFile = path.join(os.homedir(), '.tpad-history.json');
  const maxHistory = 20;

  const readHistory = () => {
    try {
      if (fs.existsSync(historyFile)) {
        return JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      }
    } catch (err) {
      console.error('Failed to read history:', err);
    }
    return [];
  };

  const writeHistory = (history) => {
    try {
      fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to write history:', err);
    }
  };

  const removeFromHistory = (filePath) => {
    let history = readHistory();
    history = history.filter(p => p !== filePath);
    writeHistory(history);
  };

  const addToHistory = (filePath) => {
    if (!filePath) return;
    let history = readHistory();
    // Remove if exists to bring it to top
    history = history.filter(p => p !== filePath);
    history.unshift(filePath);
    if (history.length > maxHistory) {
      history = history.slice(0, maxHistory);
    }
    writeHistory(history);
  };

  let currentContent = initialContent;
  let currentFilename = initialFilename;
  let targetFile = initialTargetFile;
  let sseClients = [];
  let watcher = null;
  let isSaving = false;

  // SSE support
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.push(res);

    req.on('close', () => {
      sseClients = sseClients.filter(client => client !== res);
    });
  });

  function broadcast(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    sseClients.forEach(client => {
      try {
        client.write(payload);
      } catch (err) {
        // ignore dead connections
      }
    });
  }

  // File Watching logic
  function startWatching() {
    if (watcher) {
      watcher.close();
      watcher = null;
    }

    if (!targetFile) return;

    try {
      watcher = fs.watch(targetFile, (eventType) => {
        if (eventType === 'change') {
          if (isSaving) return;
          
          // Debounce and read file
          setTimeout(() => {
            if (isSaving) return;
            try {
              if (fs.existsSync(targetFile)) {
                const updatedContent = fs.readFileSync(targetFile, 'utf8');
                if (updatedContent !== currentContent) {
                  currentContent = updatedContent;
                  broadcast('file-changed', { content: updatedContent });
                }
              }
            } catch (err) {
              console.error('Error reading watched file:', err);
            }
          }, 150);
        }
      });
    } catch (err) {
      console.error(`Failed to watch file ${targetFile}:`, err);
    }
  }

  // Ping endpoint to detect running server
  app.get('/api/ping', (req, res) => {
    res.json({ success: true, app: 'tpad', currentFilename });
  });

  // Open file or content endpoint (IPC)
  app.post('/api/open', (req, res) => {
    const { filepath, content } = req.body;
    
    if (filepath) {
      const resolvedPath = path.resolve(filepath);
      try {
        if (fs.existsSync(resolvedPath)) {
          currentContent = fs.readFileSync(resolvedPath, 'utf8');
        } else {
          currentContent = content || '';
          fs.writeFileSync(resolvedPath, currentContent, 'utf8');
        }
        currentFilename = path.basename(resolvedPath);
        targetFile = resolvedPath;
        
        startWatching();
        
        broadcast('file-opened', { content: currentContent, filename: currentFilename });
        res.json({ success: true, filename: currentFilename, filepath: targetFile });
      } catch (err) {
        res.status(500).json({ error: `Failed to open file: ${err.message}` });
      }
    } else if (content !== undefined) {
      // In-memory content update
      currentContent = content;
      currentFilename = '';
      targetFile = null;
      if (watcher) {
        watcher.close();
        watcher = null;
      }
      broadcast('file-opened', { content: currentContent, filename: currentFilename });
      res.json({ success: true, filename: currentFilename });
    } else {
      res.status(400).json({ error: 'No filepath or content provided' });
    }
  });

  app.get('/api/file', (req, res) => {
    res.json({ content: currentContent, filename: currentFilename });
  });

  app.post('/api/dirs', (req, res) => {
    const { currentPath } = req.body;
    try {
      let targetPath = currentPath ? path.resolve(currentPath) : process.cwd();
      if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isDirectory()) {
        targetPath = process.cwd();
      }

      const files = fs.readdirSync(targetPath);
      const directories = [];

      for (const file of files) {
        if (file.startsWith('.')) continue; // Skip hidden dirs/files
        try {
          const fullPath = path.join(targetPath, file);
          if (fs.statSync(fullPath).isDirectory()) {
            directories.push(file);
          }
        } catch (e) {
          // ignore permission errors
        }
      }

      // Sort alphabetically
      directories.sort((a, b) => a.localeCompare(b));

      res.json({
        currentPath: targetPath,
        parentPath: targetPath === '/' ? '/' : path.dirname(targetPath),
        directories
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/check-exists', (req, res) => {
    const { filename, directory } = req.body;
    try {
      if (!filename) {
        return res.json({ exists: false });
      }
      let resolvedFilename = filename;
      if (directory) {
        resolvedFilename = path.isAbsolute(filename) ? filename : path.resolve(directory, filename);
      }
      const filenameWithExt = resolvedFilename.endsWith('.md') ? resolvedFilename : `${resolvedFilename}.md`;
      const exists = fs.existsSync(filenameWithExt);
      res.json({ exists });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/file', async (req, res) => {
    const { content, filename, directory } = req.body;
    try {
      let resolvedFilename = filename;
      if (directory && filename) {
        resolvedFilename = path.isAbsolute(filename) ? filename : path.resolve(directory, filename);
      }
      
      isSaving = true; // Block file watcher from triggering on this save
      
      if (onSave) {
        const savedPath = await onSave(content, resolvedFilename);
        if (savedPath) {
          addToHistory(savedPath);
        }
      }
      currentContent = content ?? currentContent;
      currentFilename = resolvedFilename ?? currentFilename;
      
      // Clean up backup after successful save
      if (fs.existsSync(backupFile)) {
        fs.unlinkSync(backupFile);
      }

      res.json({ success: true, filename: resolvedFilename });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    } finally {
      setTimeout(() => {
        isSaving = false;
      }, 500);
    }
  });

  app.post('/api/exit', async (req, res) => {
    const { content } = req.body;
    try {
      // Clean up backup if exiting normally
      if (fs.existsSync(backupFile)) {
        fs.unlinkSync(backupFile);
      }
      res.json({ success: true });
      if (onExit) {
        setTimeout(() => {
          onExit(content);
        }, 50);
      }
    } catch (err) {
      console.error(err);
    }
  });

  app.post('/api/heartbeat', (req, res) => {
    lastHeartbeat = Date.now();
    hasReceivedFirstHeartbeat = true;
    res.json({ success: true });
  });

  app.post('/api/browse-finder', (req, res) => {
    const script = `osascript -e "POSIX path of (choose folder with prompt \\"保存先フォルダを選択してください:\\")"`;
    exec(script, (error, stdout, stderr) => {
      if (error) {
        return res.json({ cancelled: true });
      }
      const chosenPath = stdout.trim();
      res.json({ chosenPath });
    });
  });

  // Backup endpoints
  app.post('/api/backup', (req, res) => {
    const { content } = req.body;
    try {
      if (content && content.trim() !== '') {
        fs.writeFileSync(backupFile, content, 'utf8');
        currentContent = content;
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/backups', (req, res) => {
    try {
      const backups = [];
      if (fs.existsSync(backupDir)) {
        const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.md') && f !== `backup-${sessionId}.md`);
        for (const f of files) {
          const filePath = path.join(backupDir, f);
          const stat = fs.statSync(filePath);
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.trim() !== '') {
            backups.push({
              id: f,
              date: stat.mtime,
              preview: content.substring(0, 100) + (content.length > 100 ? '...' : '')
            });
          } else {
            // Delete empty backups
            fs.unlinkSync(filePath);
          }
        }
      }
      res.json({ backups: backups.sort((a, b) => b.date - a.date) });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/backup/:id', (req, res) => {
    try {
      const filePath = path.join(backupDir, req.params.id);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        res.json({ content });
      } else {
        res.status(404).json({ error: 'Not found' });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/backup/:id', (req, res) => {
    try {
      const filePath = path.join(backupDir, req.params.id);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // History endpoints
  app.get('/api/history', (req, res) => {
    res.json({ history: readHistory() });
  });

  app.delete('/api/history', (req, res) => {
    try {
      writeHistory([]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/history/remove', (req, res) => {
    const { filepath } = req.body;
    try {
      removeFromHistory(filepath);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/reveal', (req, res) => {
    const { filepath } = req.body;
    console.error(`Attempting to reveal in Finder: ${filepath}`);
    try {
      if (!filepath) {
        return res.status(400).json({ success: false, error: 'No filepath provided' });
      }
      // macOS specific command to reveal in Finder
      exec(`open -R "${filepath.replace(/"/g, '\\"')}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
        }
      });
      res.json({ success: true });
    } catch (err) {
      console.error(`Catch error: ${err.message}`);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/load', (req, res) => {
    const { filepath } = req.body;
    try {
      if (!fs.existsSync(filepath)) {
        // If file no longer exists, remove it from history
        let history = readHistory();
        history = history.filter(p => p !== filepath);
        writeHistory(history);
        return res.status(404).json({ success: false, error: 'File not found on disk. Removed from history.' });
      }
      const content = fs.readFileSync(filepath, 'utf8');
      const filename = path.basename(filepath);
      currentContent = content;
      currentFilename = filename;
      res.json({ success: true, content, filename });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));

  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  // Heartbeat checker for browser connection
  const startupTime = Date.now();
  const heartbeatInterval = setInterval(() => {
    if (hasReceivedFirstHeartbeat) {
      if (Date.now() - lastHeartbeat > 30000) {
        clearInterval(heartbeatInterval);
        console.error("tpad: Connection lost (browser tab closed). Exiting...");
        if (fs.existsSync(backupFile)) {
          try {
            fs.unlinkSync(backupFile);
          } catch (e) {}
        }
        if (onExit) {
          onExit(currentContent);
        } else {
          process.exit(0);
        }
      }
    } else {
      if (Date.now() - startupTime > 30000) {
        clearInterval(heartbeatInterval);
        console.error("tpad: Initial browser connection timed out. Exiting...");
        if (fs.existsSync(backupFile)) {
          try {
            fs.unlinkSync(backupFile);
          } catch (e) {}
        }
        process.exit(0);
      }
    }
  }, 1000);

  startWatching();

  return app;
}
