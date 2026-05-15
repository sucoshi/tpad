import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';

import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

const App = () => {
  const [filename, setFilename] = useState('');
  const [status, setStatus] = useState('');

  const [backups, setBackups] = useState([]);
  const [saveHistory, setSaveHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: 'Write something amazing... (Markdown supported)',
      }),
    ],
    content: '',
  });

  // Fetch initial file content and backups
  useEffect(() => {
    fetch('/api/file')
      .then((res) => res.json())
      .then((data) => {
        if (data.content && editor) {
          editor.commands.setContent(data.content);
        }
        if (data.filename) {
          setFilename(data.filename);
        }
      })
      .catch((err) => console.error('Failed to load file:', err));

    fetch('/api/backups')
      .then((res) => res.json())
      .then((data) => {
        if (data.backups && data.backups.length > 0) {
          setBackups(data.backups);
        }
      })
      .catch((err) => console.error('Failed to load backups:', err));

    fetch('/api/history')
      .then((res) => res.json())
      .then((data) => {
        if (data.history) setSaveHistory(data.history);
      })
      .catch(console.error);
  }, [editor]);

  // Auto-backup debounce
  useEffect(() => {
    if (!editor) return;
    
    const handleUpdate = () => {
      const content = editor.storage.markdown.getMarkdown();
      fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      }).catch(console.error);
    };

    let timeout;
    const onUpdate = () => {
      clearTimeout(timeout);
      timeout = setTimeout(handleUpdate, 1000);
    };

    editor.on('update', onUpdate);
    return () => {
      editor.off('update', onUpdate);
      clearTimeout(timeout);
    };
  }, [editor]);

  const loadBackup = async (id) => {
    try {
      const res = await fetch(`/api/backup/${id}`);
      const data = await res.json();
      if (data.content && editor) {
        editor.commands.setContent(data.content);
        setBackups([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteBackup = async (id) => {
    try {
      await fetch(`/api/backup/${id}`, { method: 'DELETE' });
      setBackups(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const loadFromHistory = async (filepath) => {
    try {
      const res = await fetch('/api/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filepath })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        editor.commands.setContent(data.content);
        setFilename(data.filename);
        setShowHistory(false);
      } else {
        alert(data.error || 'Failed to load file');
        // Refresh history as it might have been removed
        const histRes = await fetch('/api/history');
        const histData = await histRes.json();
        if (histData.history) setSaveHistory(histData.history);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const clearHistory = async () => {
    try {
      await fetch('/api/history', { method: 'DELETE' });
      setSaveHistory([]);
      setShowHistory(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = useCallback(async () => {
    if (!editor) return;

    let currentFilename = filename;
    if (!currentFilename) {
      const inputName = window.prompt('Enter filename to save:', 'Untitled.md');
      if (!inputName) return; // User cancelled
      currentFilename = inputName;
      setFilename(inputName);
    }

    setStatus('Saving...');
    try {
      const content = editor.storage.markdown.getMarkdown();
      const res = await fetch('/api/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, filename: currentFilename }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save');

      setStatus('Saved!');
      setTimeout(() => setStatus(''), 2000);
      
      // Refresh history
      const histRes = await fetch('/api/history');
      const histData = await histRes.json();
      if (histData.history) setSaveHistory(histData.history);

    } catch (err) {
      console.error(err);
      setStatus('Error saving');
    }
  }, [editor, filename]);

  const handleOutputAndClose = useCallback(async () => {
    if (!editor) return;
    setStatus('Sending to terminal...');
    try {
      const content = editor.storage.markdown.getMarkdown();
      await fetch('/api/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      setStatus('Done! You can close this tab.');
    } catch (err) {
      console.error(err);
      setStatus('Error');
    }
  }, [editor]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  return (
    <div className="editor-container">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            title="Recent Files"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.2rem',
              color: 'var(--text-color)',
              opacity: 0.8,
              padding: '0.2rem',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            🕒
          </button>
          
          {showHistory && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '0.5rem',
              background: '#1e293b',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              minWidth: '300px',
              maxWidth: '500px',
              maxHeight: '400px',
              overflowY: 'auto',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: '600', fontSize: '0.9rem', color: '#94a3b8' }}>
                Recent Files
              </div>
              {saveHistory.length === 0 ? (
                <div style={{ padding: '1rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', textAlign: 'center' }}>
                  No history found.
                </div>
              ) : (
                <>
                  {saveHistory.map((filepath, i) => (
                    <button
                      key={i}
                      onClick={() => loadFromHistory(filepath)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        padding: '0.8rem 1rem',
                        color: '#f8fafc',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        wordBreak: 'break-all'
                      }}
                      onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={e => e.target.style.background = 'transparent'}
                    >
                      {filepath}
                    </button>
                  ))}
                  <button
                    onClick={clearHistory}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '0.8rem 1rem',
                      color: '#ef4444',
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500'
                    }}
                    onMouseEnter={e => e.target.style.background = 'rgba(239,68,68,0.1)'}
                    onMouseLeave={e => e.target.style.background = 'transparent'}
                  >
                    Clear History
                  </button>
                </>
              )}
            </div>
          )}

          <span style={{ fontSize: '1.2rem', marginLeft: '0.5rem' }}>📄</span>
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="Untitled.md"
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.2)',
              color: '#f8fafc',
              fontSize: '1rem',
              fontWeight: '600',
              padding: '0.2rem 0.5rem',
              outline: 'none',
              width: '200px',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {status && <span style={{ fontSize: '0.9rem', color: 'var(--accent-color)' }}>{status}</span>}
          <button className="save-button" onClick={handleSave} title="Cmd+S or Ctrl+S to save">
            Save
          </button>
          <button 
            className="save-button" 
            onClick={handleOutputAndClose} 
            title="Send output to terminal pipe and close"
            style={{ background: 'transparent', border: '1px solid var(--accent-color)', color: 'var(--accent-color)' }}
          >
            Finish & Output
          </button>
        </div>
      </header>

      {backups.length > 0 && (
        <div style={{
          background: 'rgba(255, 165, 0, 0.1)',
          borderBottom: '1px solid rgba(255, 165, 0, 0.3)',
          padding: '0.5rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffa500' }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <span style={{ fontWeight: '500', fontSize: '0.95rem' }}>
              Unsaved backup(s) found from previous sessions.
            </span>
          </div>
          {backups.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '1.7rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>{new Date(b.date).toLocaleString()}</span>
              <button 
                onClick={() => loadBackup(b.id)}
                style={{ background: 'transparent', border: '1px solid #ffa500', color: '#ffa500', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Restore
              </button>
              <button 
                onClick={() => deleteBackup(b.id)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Discard
              </button>
            </div>
          ))}
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
};

export default App;
