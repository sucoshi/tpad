import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp({ initialContent = '', initialFilename = '', onSave, onExit }) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const backupDir = path.join(os.homedir(), '.tpad-backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const sessionId = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
  const backupFile = path.join(backupDir, `backup-${sessionId}.md`);

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

  app.get('/api/file', (req, res) => {
    res.json({ content: currentContent, filename: currentFilename });
  });

  app.post('/api/file', async (req, res) => {
    const { content, filename } = req.body;
    try {
      if (onSave) {
        const savedPath = await onSave(content, filename);
        if (savedPath) {
          addToHistory(savedPath);
        }
      }
      currentContent = content ?? currentContent;
      currentFilename = filename ?? currentFilename;
      
      // Clean up backup after successful save
      if (fs.existsSync(backupFile)) {
        fs.unlinkSync(backupFile);
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
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

  // Backup endpoints
  app.post('/api/backup', (req, res) => {
    const { content } = req.body;
    try {
      if (content && content.trim() !== '') {
        fs.writeFileSync(backupFile, content, 'utf8');
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

  return app;
}
