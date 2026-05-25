import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { t } from './i18n';
import HistoryItem from './components/HistoryItem';
import { useTpad } from './hooks/useTpad';
import {
  ClockIcon, SunIcon, MoonIcon, TableIcon, AddColumnLeftIcon, AddColumnRightIcon, DeleteColumnIcon, AddRowAboveIcon, AddRowBelowIcon, DeleteRowIcon, TrashIcon,
  LinkIcon, ExternalLinkIcon, UnlinkIcon, PencilIcon
} from './components/Icons';

import { BubbleMenu } from '@tiptap/react/menus';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import SaveDialog from './components/SaveDialog';

// Check browser support for CSS field-sizing
const isFieldSizingSupported = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('field-sizing', 'content');

// Helper to determine the width of the filename input when field-sizing is not supported (e.g. Firefox)
const getFilenameWidth = (name) => {
  if (isFieldSizingSupported) {
    return 'auto';
  }
  
  let visualLength = 0;
  for (let i = 0; i < name.length; i++) {
    const code = name.charCodeAt(i);
    if (code > 255) {
      visualLength += 1.8; // Kanji, Hiragana, Katakana, and other full-width characters
    } else {
      visualLength += 1.0;
    }
  }
  return `${Math.max(120, Math.min(350, visualLength * 8 + 20))}px`;
};

const App = () => {
  const isMcp = useMemo(() => new URLSearchParams(window.location.search).get('mcp') === 'true', []);
  const historyRef = useRef(null);

  const [isEditingLink, setIsEditingLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

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
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'tiptap-link',
        },
      }),
    ],
    editorProps: {
      handleClick: (view, pos, event) => {
        const { target } = event;
        if (target && target.tagName === 'A') {
          event.preventDefault();
          return true;
        }
        return false;
      },
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

  const handleOpenLinkEdit = () => {
    if (!editor) return;
    const attrs = editor.getAttributes('link');
    setLinkUrl(attrs.href || '');
    setIsEditingLink(true);
  };

  const handleSaveLink = () => {
    if (!editor) return;
    if (linkUrl.trim()) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    setIsEditingLink(false);
  };

  const handleUnlink = () => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setIsEditingLink(false);
  };

  const {
    filename, setFilename, status, backups, saveHistory, showHistory, setShowHistory, theme, setTheme,
    language, toggleLanguage,
    loadBackup, deleteBackup, loadFromHistory, clearHistory, removeFromHistory, revealInFinder,
    handleSave, handleSaveConfirm, handleOutputAndClose,
    showSaveDialog, setShowSaveDialog,
    hasUserEditedFilename, setHasUserEditedFilename,
    setHasSavedToDisk
  } = useTpad(editor);

  // Sync first H1 to filename when filename is not manually edited
  useEffect(() => {
    if (!editor || hasUserEditedFilename) return;

    const updateHandler = () => {
      if (hasUserEditedFilename) return;

      let h1Text = '';
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'heading' && node.attrs.level === 1 && !h1Text) {
          h1Text = node.textContent;
        }
      });

      if (h1Text && h1Text.trim()) {
        const sanitized = h1Text.trim().replace(/[/\\?%*:|"<>\s]+/g, '_');
        setFilename(sanitized);
      }
    };

    editor.on('update', updateHandler);
    return () => {
      editor.off('update', updateHandler);
    };
  }, [editor, hasUserEditedFilename, setFilename]);

  // Handle browser tab/window close
  useEffect(() => {
    const handleUnload = () => {
      if (!editor) return;
      try {
        const content = editor.storage.markdown.getMarkdown();
        const blob = new Blob([JSON.stringify({ content })], { type: 'application/json' });
        navigator.sendBeacon('/api/exit', blob);
      } catch (e) {
        console.error('sendBeacon failed:', e);
      }
    };
    window.addEventListener('unload', handleUnload);
    return () => window.removeEventListener('unload', handleUnload);
  }, [editor]);

  // Heartbeat loop to keep Express server alive
  useEffect(() => {
    const pingHeartbeat = () => {
      fetch('/api/heartbeat', { method: 'POST' }).catch(() => {});
    };
    pingHeartbeat();
    const interval = setInterval(pingHeartbeat, 1000);
    return () => clearInterval(interval);
  }, []);

  // Server-Sent Events (SSE) listener for live updates
  useEffect(() => {
    if (!editor) return;

    let eventSource;
    
    const connectSSE = () => {
      eventSource = new EventSource('/api/events');

      eventSource.addEventListener('file-changed', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.content !== undefined) {
            // Only update if the content has actually changed to prevent cursor jumps
            const currentMarkdown = editor.storage.markdown.getMarkdown();
            if (data.content !== currentMarkdown) {
              const { from, to } = editor.state.selection;
              editor.commands.setContent(data.content, false, { preserveState: true });
              try {
                editor.commands.setTextSelection({ from, to });
              } catch (e) {
                // ignore out of bounds
              }
            }
          }
        } catch (err) {
          console.error('Failed to parse file-changed SSE data:', err);
        }
      });

      eventSource.addEventListener('file-opened', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.content !== undefined) {
            editor.commands.setContent(data.content);
            if (data.filename) {
              setFilename(data.filename.replace(/\.md$/, ''));
              setHasUserEditedFilename(true);
              setHasSavedToDisk(true);
            } else {
              setFilename('');
              setHasUserEditedFilename(false);
              setHasSavedToDisk(false);
            }
          }
        } catch (err) {
          console.error('Failed to parse file-opened SSE data:', err);
        }
      });

      eventSource.onerror = () => {
        eventSource.close();
        setTimeout(connectSSE, 2000);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [editor, setFilename, setHasUserEditedFilename, setHasSavedToDisk]);

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
            onChange={(e) => {
              setFilename(e.target.value);
              setHasUserEditedFilename(true);
            }}
            style={{ width: getFilenameWidth(filename) }}
            placeholder={t('untitled')}
          />
        </div>

        {/* Right Side Groups */}
        <div className="header-right-groups">
          {/* Table Island */}
          <div className="island island-table">
            <button
              className="icon-button-minimal"
              onClick={() => editor && editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              title={t('insertTable')}
            >
              <TableIcon size={14} />
            </button>
          </div>

          {/* Tools Island */}
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

          {/* Actions Island */}
          <div className="island island-actions">
            <button className="btn-save-pill-secondary" onClick={handleOutputAndClose}>
              {isMcp ? (language === 'ja' ? 'Claude Codeに返す' : 'Return to Claude Code') : t('finishOutput')}
            </button>
            <button className="btn-save-pill" onClick={handleSave}>{t('save')}</button>
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
              <button onClick={() => editor.chain().focus().deleteColumn().run()} title={t('deleteColumn')}>
                <DeleteColumnIcon size={14} />
              </button>
              <span style={{ width: '1px', background: 'var(--border-color)', margin: '0.2rem 0.1rem' }} />
              <button onClick={() => editor.chain().focus().addRowAbove().run()} title={t('addRowAbove')}>
                <AddRowAboveIcon size={14} />
              </button>
              <button onClick={() => editor.chain().focus().addRowBelow().run()} title={t('addRowBelow')}>
                <AddRowBelowIcon size={14} />
              </button>
              <button onClick={() => editor.chain().focus().deleteRow().run()} title={t('deleteRow')}>
                <DeleteRowIcon size={14} />
              </button>
              <span style={{ width: '1px', background: 'var(--border-color)', margin: '0.2rem 0.1rem' }} />
              <button onClick={() => editor.chain().focus().deleteTable().run()} title={t('deleteTable')}>
                <TrashIcon size={14} />
                <span>{t('deleteTable')}</span>
              </button>
            </div>
          </BubbleMenu>
        )}

        {editor && (
          <BubbleMenu
            editor={editor}
            tippyOptions={{
              duration: 150,
              onDestroy: () => setIsEditingLink(false),
            }}
            shouldShow={({ editor }) => editor.isActive('link')}
          >
            <div className="link-bubble-menu">
              {isEditingLink ? (
                <div className="link-bubble-editor">
                  <input
                    type="text"
                    placeholder="URL"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="link-input"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveLink()}
                    autoFocus
                  />
                  <div className="link-editor-actions">
                    <button onClick={handleSaveLink} className="btn-save-pill-small">
                      {t('save')}
                    </button>
                    <button onClick={() => setIsEditingLink(false)} className="btn-ghost-small">
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <div className="link-bubble-viewer">
                  <a
                    href={editor.getAttributes('link').href || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-preview-url"
                  >
                    <LinkIcon size={12} style={{ marginRight: 4 }} />
                    <span className="url-text">{editor.getAttributes('link').href || ''}</span>
                    <ExternalLinkIcon size={10} style={{ marginLeft: 4, opacity: 0.7 }} />
                  </a>
                  <span style={{ width: '1px', background: 'var(--border-color)', margin: '0 0.3rem' }} />
                  <button onClick={handleOpenLinkEdit} title="編集">
                    <PencilIcon size={14} />
                  </button>
                  <button onClick={handleUnlink} className="btn-danger" title="リンク解除">
                    <UnlinkIcon size={14} />
                  </button>
                </div>
              )}
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

      {status === t('doneClose') && (
        <div className="exit-fullscreen-overlay">
          <div className="exit-card">
            <div className="exit-icon-circle">✓</div>
            <h2>{isMcp ? (language === 'ja' ? 'Claude Codeに送信完了！' : 'Sent to Claude Code!') : t('doneClose')}</h2>
            <p className="exit-subtitle">
              {isMcp 
                ? (language === 'ja' 
                    ? '内容を送信しました。ターミナル（Claude Code）に戻り、「編集完了」や「確定して」と入力して指示を継続してください。' 
                    : 'Content sent. Please return to your terminal (Claude Code) and type "Done" or "Proceed" to continue.')
                : (language === 'ja' ? 'ターミナルに戻って作業を継続できます。' : 'You can return to your terminal to continue.')}
            </p>
          </div>
        </div>
      )}

      <SaveDialog
        isOpen={showSaveDialog}
        initialFilename={filename}
        onSave={handleSaveConfirm}
        onCancel={() => setShowSaveDialog(false)}
      />
    </div>
  );
};

export default App;
