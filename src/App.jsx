import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';

const App = () => {
  const [filename, setFilename] = useState('');
  const [status, setStatus] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
      Placeholder.configure({
        placeholder: 'Write something amazing... (Markdown supported)',
      }),
    ],
    content: '',
  });

  useEffect(() => {
    // Fetch initial file content
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
  }, [editor]);

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
    } catch (err) {
      console.error(err);
      setStatus('Error saving');
    }
  }, [editor, filename]);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>📄</span>
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
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          {status && <span style={{fontSize: '0.9rem', color: 'var(--accent-color)'}}>{status}</span>}
          <button className="save-button" onClick={handleSave} title="Cmd+S or Ctrl+S to save">
            Save
          </button>
        </div>
      </header>
      <EditorContent editor={editor} style={{ display: 'flex', flexDirection: 'column', flex: 1 }} />
    </div>
  );
};

export default App;
