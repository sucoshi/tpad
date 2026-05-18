import { useState, useEffect, useCallback } from 'react';
import { t, getCurrentLanguage, setLanguage } from '../i18n';

export const useTpad = (editor) => {
  const [filename, setFilename] = useState('');
  const [status, setStatus] = useState('');
  const [backups, setBackups] = useState([]);
  const [saveHistory, setSaveHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('tpad-theme') || 'dark');
  const [language, setLanguageState] = useState(getCurrentLanguage());

  const toggleLanguage = () => {
    const nextLang = language === 'ja' ? 'en' : 'ja';
    setLanguage(nextLang);
    setLanguageState(nextLang);
  };

  // Theme Sync
  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-theme' : '';
    localStorage.setItem('tpad-theme', theme);
  }, [theme]);

  // Initial Load
  useEffect(() => {
    if (!editor) return;

    fetch('/api/file')
      .then((res) => res.json())
      .then((data) => {
        if (data.content) editor.commands.setContent(data.content);
        if (data.filename) setFilename(data.filename.replace(/\.md$/, ''));
      })
      .catch(console.error);

    fetch('/api/backups')
      .then((res) => res.json())
      .then((data) => {
        if (data.backups) setBackups(data.backups);
      })
      .catch(console.error);

    fetch('/api/history')
      .then((res) => res.json())
      .then((data) => {
        if (data.history) setSaveHistory(data.history);
      })
      .catch(console.error);
  }, [editor]);

  // Auto-backup
  useEffect(() => {
    if (!editor) return;
    
    let timeout;
    const onUpdate = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const content = editor.storage.markdown.getMarkdown();
        fetch('/api/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        }).catch(console.error);
      }, 1000);
    };

    editor.on('update', onUpdate);
    return () => {
      editor.off('update', onUpdate);
      clearTimeout(timeout);
    };
  }, [editor]);

  const loadBackup = async (id) => {
    if (!editor) return;
    try {
      const res = await fetch(`/api/backup/${id}`);
      const data = await res.json();
      if (data.content) {
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

  const refreshHistory = async () => {
    const res = await fetch('/api/history');
    const data = await res.json();
    if (data.history) setSaveHistory(data.history);
  };

  const loadFromHistory = async (filepath) => {
    if (!editor) return;
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
        refreshHistory();
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
      if (!inputName) return;
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
      refreshHistory();
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

  return {
    filename, setFilename,
    status, setStatus,
    backups, setBackups,
    saveHistory, setSaveHistory,
    showHistory, setShowHistory,
    theme, setTheme,
    language, toggleLanguage,
    loadBackup, deleteBackup,
    loadFromHistory, clearHistory, removeFromHistory, revealInFinder,
    handleSave, handleOutputAndClose
  };
};
