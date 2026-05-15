import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp({ initialContent = '', initialFilename = '', onSave, onExit }) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  let currentContent = initialContent;
  let currentFilename = initialFilename;

  app.get('/api/file', (req, res) => {
    res.json({ content: currentContent, filename: currentFilename });
  });

  app.post('/api/file', async (req, res) => {
    const { content, filename } = req.body;
    try {
      if (onSave) {
        await onSave(content, filename);
      }
      currentContent = content ?? currentContent;
      currentFilename = filename ?? currentFilename;
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/exit', async (req, res) => {
    const { content } = req.body;
    try {
      res.json({ success: true });
      if (onExit) {
        // Give Express a moment to send the response before resolving
        setTimeout(() => {
          onExit(content);
        }, 50);
      }
    } catch (err) {
      console.error(err);
    }
  });

  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));

  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  return app;
}
