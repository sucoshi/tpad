import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { t } from './i18n';

import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

const HistoryItem = ({ filepath, onLoad, onRemove, onReveal }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const filename = filepath.split('/').pop().replace(/\.md$/, '');

  return (
    <div 
      style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setMenuOpen(false); }}
    >
      <button
        onClick={() => onLoad(filepath)}
        style={{
          flex: 1,
          background: isHovered ? 'var(--hover-bg)' : 'transparent',
          border: 'none',
          borderBottom: '1px solid var(--border-color)',
          padding: '0.8rem 2.5rem 0.8rem 1rem', // extra right padding for menu icon
          color: 'var(--text-color)',
          textAlign: 'left',
          cursor: 'pointer',
          fontSize: '0.9rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {filename}
      </button>
      {isHovered && (
        <div style={{ position: 'absolute', right: '0.5rem' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            style={{
              background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '1rem', fontWeight: 'bold'
            }}
          >
            ⋮
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: '100%',
              background: 'var(--card-bg)', borderRadius: '6px', padding: '0.2rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)', zIndex: 110,
              display: 'flex', flexDirection: 'column', minWidth: '130px',
              border: '1px solid var(--border-color)'
            }}>
              <button 
                onClick={(e) => { e.stopPropagation(); onReveal(filepath); setMenuOpen(false); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-color)', padding: '0.5rem 0.8rem', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', borderRadius: '4px' }}
                onMouseEnter={e => e.target.style.background='var(--hover-bg)'}
                onMouseLeave={e => e.target.style.background='transparent'}
              >
                {t('finderReveal')}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onRemove(filepath); setMenuOpen(false); }}
                style={{ background: 'transparent', border: 'none', color: '#ef4444', padding: '0.5rem 0.8rem', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', borderRadius: '4px' }}
                onMouseEnter={e => e.target.style.background='rgba(239,68,68,0.1)'}
                onMouseLeave={e => e.target.style.background='transparent'}
              >
                {t('historyRemove')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const App = () => {
  const [filename, setFilename] = useState('');
  const [status, setStatus] = useState('');

  const [backups, setBackups] = useState([]);
  const [saveHistory, setSaveHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('tpad-theme') || 'dark');
  const historyRef = useRef(null);

  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-theme' : '';
    localStorage.setItem('tpad-theme', theme);
  }, [theme]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: t('placeholder'),
      }),
    ],
    editorProps: {
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain');
        if (!text) return false;

        // Markdown判定 (行頭の見出し、太字、リンク、リスト開始など)
        const markdownRegex = /^#{1,6}\s|\*\*|__|^[-*+]\s|^>|\[.+\]\(.+\)/m;
        
        if (markdownRegex.test(text)) {
          // tiptap-markdownのパーサーを使ってMarkdownをHTML/ProseMirrorノードに変換して挿入
          if (editor && editor.storage.markdown) {
            const html = editor.storage.markdown.parser.parse(text);
            editor.commands.insertContent(html);
            return true; // デフォルトの貼り付け処理をスキップ
          }
        }
        return false;
      }
    },
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
          setFilename(data.filename.replace(/\.md$/, ''));
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
        setFilename(data.filename.replace(/\.md$/, ''));
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

  const removeFromHistory = async (filepath) => {
    try {
      await fetch('/api/history/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filepath })
      });
      setSaveHistory(prev => prev.filter(p => p !== filepath));
    } catch (err) {
      console.error(err);
    }
  };

  const revealInFinder = async (filepath) => {
    try {
      await fetch('/api/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filepath })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = useCallback(async () => {
    if (!editor) return;

    let currentFilename = filename;
    if (!currentFilename) {
      const inputName = window.prompt(t('enterFilename'), t('untitled'));
      if (!inputName) return; // User cancelled
      currentFilename = inputName;
      setFilename(inputName);
    }

    setStatus(t('saving'));
    try {
      const content = editor.storage.markdown.getMarkdown();
      const filenameWithExt = currentFilename.endsWith('.md') ? currentFilename : `${currentFilename}.md`;
      const res = await fetch('/api/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, filename: filenameWithExt }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || t('saveError'));

      setStatus(t('saved'));
      setTimeout(() => setStatus(''), 2000);
      
      // Refresh history
      const histRes = await fetch('/api/history');
      const histData = await histRes.json();
      if (histData.history) setSaveHistory(histData.history);

    } catch (err) {
      console.error(err);
      setStatus(t('saveError'));
    }
  }, [editor, filename]);

  const handleOutputAndClose = useCallback(async () => {
    if (!editor) return;
    setStatus(t('sending'));
    try {
      const content = editor.storage.markdown.getMarkdown();
      await fetch('/api/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      setStatus(t('doneClose'));
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (historyRef.current && !historyRef.current.contains(event.target)) {
        setShowHistory(false);
      }
    };

    if (showHistory) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHistory]);

  return (
    <div className="editor-container">
      <header className="app-header">
        <div ref={historyRef} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
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
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
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
              <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {t('recentFiles')}
              </div>
              {saveHistory.length === 0 ? (
                <div style={{ padding: '1rem', color: 'var(--text-secondary)', opacity: 0.5, fontSize: '0.9rem', textAlign: 'center' }}>
                  {t('noHistory')}
                </div>
              ) : (
                <>
                  {saveHistory.map((filepath, i) => (
                    <HistoryItem 
                      key={filepath} 
                      filepath={filepath} 
                      onLoad={loadFromHistory} 
                      onRemove={removeFromHistory}
                      onReveal={revealInFinder}
                    />
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
                    {t('historyClear')}
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
            placeholder={t('untitled')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--border-color)',
              color: 'var(--text-color)',
              fontSize: '1rem',
              fontWeight: '600',
              padding: '0.2rem 0.5rem',
              outline: 'none',
              width: '180px',
              textAlign: 'right'
            }}
          />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600', marginLeft: '0.1rem' }}>.md</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={t('toggleTheme')}
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
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
          {status && <span style={{ fontSize: '0.85rem', color: 'var(--accent-color)' }}>{status}</span>}
          <button className="save-button" onClick={handleSave} title="Cmd+S or Ctrl+S to save">
            {t('save')}
          </button>
          <button 
            className="save-button" 
            onClick={handleOutputAndClose} 
            title="Send output to terminal pipe and close"
            style={{ background: 'transparent', border: '1px solid var(--accent-color)', color: 'var(--accent-color)' }}
          >
            {t('finishOutput')}
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
              {t('backupWarning')}
            </span>
          </div>
          {backups.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '1.7rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>{new Date(b.date).toLocaleString()}</span>
              <button 
                onClick={() => loadBackup(b.id)}
                style={{ background: 'transparent', border: '1px solid #ffa500', color: '#ffa500', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                {t('restore')}
              </button>
              <button 
                onClick={() => deleteBackup(b.id)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                {t('discard')}
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
