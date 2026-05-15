import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { t } from './i18n';
import HistoryItem from './components/HistoryItem';
import { useTpad } from './hooks/useTpad';

import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

const App = () => {
  const historyRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: t('placeholder') }),
    ],
    editorProps: {
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain');
        if (!text) return false;
        const markdownRegex = /^#{1,6}\s|\*\*|__|^[-*+]\s|^>|\[.+\]\(.+\)/m;
        if (markdownRegex.test(text)) {
          if (editor && editor.storage.markdown) {
            const html = editor.storage.markdown.parser.parse(text);
            editor.commands.insertContent(html);
            return true;
          }
        }
        return false;
      }
    },
    content: '',
  });

  const {
    filename, setFilename, status, backups, saveHistory, showHistory, setShowHistory, theme, setTheme,
    loadBackup, deleteBackup, loadFromHistory, clearHistory, removeFromHistory, revealInFinder,
    handleSave, handleOutputAndClose
  } = useTpad(editor);

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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHistory, setShowHistory]);

  return (
    <div className="editor-container">
      <header className="app-header">
        <div ref={historyRef} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>

          {showHistory && (
            <div className="dropdown-menu">
              <div className="dropdown-header">{t('recentFiles')}</div>
              {saveHistory.length === 0 ? (
                <div style={{ padding: '1.5rem', color: 'var(--text-secondary)', opacity: 0.5, fontSize: '0.9rem', textAlign: 'center' }}>
                  {t('noHistory')}
                </div>
              ) : (
                <>
                  {saveHistory.map((filepath) => (
                    <HistoryItem
                      key={filepath}
                      filepath={filepath}
                      onLoad={loadFromHistory}
                      onRemove={removeFromHistory}
                      onReveal={revealInFinder}
                    />
                  ))}
                  <button onClick={clearHistory} className="btn-ghost btn-danger-ghost" style={{ textAlign: 'center', fontWeight: '600' }}>
                    {t('historyClear')}
                  </button>
                </>
              )}
            </div>
          )}

          <input
            className="filename-input"
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder={t('untitled')}
          />

          <button
            className="icon-button"
            onClick={() => setShowHistory(!showHistory)}
            title={t('recentFiles')}
          >
            🕒
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            className="icon-button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={t('toggleTheme')}
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
          {status && <span style={{ fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: '500' }}>{status}</span>}
          <button className="save-button" onClick={handleSave}>{t('save')}</button>
          <button
            className="save-button"
            onClick={handleOutputAndClose}
            style={{ background: 'transparent', border: '1px solid var(--accent-color)', color: 'var(--accent-color)' }}
          >
            {t('finishOutput')}
          </button>
        </div>
      </header>

      {backups.length > 0 && (
        <div className="backup-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffa500' }}>
            <span>⚠️</span>
            <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{t('backupWarning')}</span>
          </div>
          {backups.map(b => (
            <div key={b.id} className="backup-item">
              <span style={{ color: 'var(--text-secondary)' }}>{new Date(b.date).toLocaleString()}</span>
              <button onClick={() => loadBackup(b.id)} className="save-button" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                {t('restore')}
              </button>
              <button onClick={() => deleteBackup(b.id)} className="btn-ghost" style={{ fontSize: '0.75rem', textDecoration: 'underline' }}>
                {t('discard')}
              </button>
            </div>
          ))}
        </div>
      )}

      <main className="editor-main">
        <EditorContent editor={editor} />
      </main>
    </div>
  );
};

export default App;
