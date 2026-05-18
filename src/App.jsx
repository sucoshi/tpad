import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { t } from './i18n';
import HistoryItem from './components/HistoryItem';
import { useTpad } from './hooks/useTpad';
import { ClockIcon, SunIcon, MoonIcon, TableIcon, AddColumnLeftIcon, AddColumnRightIcon, DeleteColumnIcon, AddRowAboveIcon, AddRowBelowIcon, DeleteRowIcon, TrashIcon } from './components/Icons';

import { BubbleMenu } from '@tiptap/react/menus';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
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
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
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
    language, toggleLanguage,
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
      <header className="app-header-floating">
        {/* Title Island (Left) */}
        <div className="island island-title">
          <input
            className="filename-input-minimal"
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder={t('untitled')}
          />
        </div>

        {/* Right Side Groups */}
        <div className="header-right-groups">
          {/* Tools Island (Right 1) */}
          <div ref={historyRef} className="island island-tools">
            <button
              className="icon-button-minimal"
              onClick={() => setShowHistory(!showHistory)}
              title={t('recentFiles')}
            >
              <ClockIcon size={14} />
            </button>
            <button
              className="icon-button-minimal"
              onClick={() => editor && editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              title={t('insertTable')}
            >
              <TableIcon size={14} />
            </button>
            <button
              className="icon-button-minimal"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={t('toggleTheme')}
            >
              {theme === 'dark' ? <MoonIcon size={14} /> : <SunIcon size={14} />}
            </button>
            <button
              className="icon-button-minimal"
              onClick={toggleLanguage}
              title={language === 'ja' ? 'Switch to English' : '日本語に切り替え'}
              style={{ fontSize: '10px', fontWeight: '800', minWidth: '24px', height: '24px', justifyContent: 'center' }}
            >
              {language === 'ja' ? 'JA' : 'EN'}
            </button>

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
          </div>

          {/* Actions Island (Right 2) */}
          <div className="island island-actions">
            <button className="btn-save-pill" onClick={handleSave}>{t('save')}</button>
            <button className="btn-save-pill-secondary" onClick={handleOutputAndClose}>{t('finishOutput')}</button>
          </div>
        </div>
      </header>

      <main className="editor-main">
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

        {editor && (
          <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 150 }}
            shouldShow={({ editor }) => editor.isActive('table')}
          >
            <div className="table-bubble-menu">
              <button onClick={() => editor.chain().focus().addColumnBefore().run()} title={t('addColumnBefore')}>
                <AddColumnLeftIcon size={14} />
              </button>
              <button onClick={() => editor.chain().focus().addColumnAfter().run()} title={t('addColumnAfter')}>
                <AddColumnRightIcon size={14} />
              </button>
              <button onClick={() => editor.chain().focus().deleteColumn().run()} className="btn-danger" title={t('deleteColumn')}>
                <DeleteColumnIcon size={14} />
              </button>
              <span style={{ width: '1px', background: 'var(--border-color)', margin: '0.2rem 0.1rem' }} />
              <button onClick={() => editor.chain().focus().addRowAbove().run()} title={t('addRowAbove')}>
                <AddRowAboveIcon size={14} />
              </button>
              <button onClick={() => editor.chain().focus().addRowBelow().run()} title={t('addRowBelow')}>
                <AddRowBelowIcon size={14} />
              </button>
              <button onClick={() => editor.chain().focus().deleteRow().run()} className="btn-danger" title={t('deleteRow')}>
                <DeleteRowIcon size={14} />
              </button>
              <span style={{ width: '1px', background: 'var(--border-color)', margin: '0.2rem 0.1rem' }} />
              <button onClick={() => editor.chain().focus().deleteTable().run()} className="btn-danger" title={t('deleteTable')}>
                <TrashIcon size={14} />
                <span>{t('deleteTable')}</span>
              </button>
            </div>
          </BubbleMenu>
        )}
        <EditorContent editor={editor} />
      </main>

      {status && (
        <div className="status-toast">
          {status.includes('中') || status.includes('ing') ? (
            <span className="toast-spinner" />
          ) : status.includes('エラー') || status.toLowerCase().includes('error') ? (
            <span className="toast-dot toast-dot-error" />
          ) : (
            <span className="toast-dot toast-dot-success" />
          )}
          <span>{status}</span>
        </div>
      )}
    </div>
  );
};

export default App;
