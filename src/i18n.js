const translations = {
  ja: {
    save: '保存',
    finishOutput: '完了して出力',
    recentFiles: '最近のファイル',
    historyClear: '履歴をクリア',
    finderReveal: 'Finderで表示',
    historyRemove: '履歴から削除',
    backupWarning: '前回のセッションの未保存バックアップが見つかりました。',
    restore: '復元',
    discard: '破棄',
    placeholder: 'Markdownを入力...',
    untitled: '無題',
    saving: '保存中...',
    saved: '保存完了！',
    saveError: '保存エラー',
    sending: 'ターミナルに送信中...',
    doneClose: '完了！このタブを閉じても大丈夫です。',
    noHistory: '履歴はありません。',
    enterFilename: '保存するファイル名を入力してください:',
    toggleTheme: 'テーマを切り替え',
    insertTable: '表を挿入',
    addColumnBefore: '左に列を追加',
    addColumnAfter: '右に列を追加',
    deleteColumn: '列を削除',
    addRowAbove: '上に行を追加',
    addRowBelow: '下に行を追加',
    deleteRow: '行を削除',
    deleteTable: '表を削除',
  },
  en: {
    save: 'Save',
    finishOutput: 'Finish & Output',
    recentFiles: 'Recent Files',
    historyClear: 'Clear History',
    finderReveal: 'Reveal in Finder',
    historyRemove: 'Remove from History',
    backupWarning: 'Unsaved backup(s) found from previous sessions.',
    restore: 'Restore',
    discard: 'Discard',
    placeholder: 'Write something amazing... (Markdown supported)',
    untitled: 'Untitled',
    saving: 'Saving...',
    saved: 'Saved!',
    saveError: 'Error saving',
    sending: 'Sending to terminal...',
    doneClose: 'Done! You can close this tab.',
    noHistory: 'No history found.',
    enterFilename: 'Enter filename to save:',
    toggleTheme: 'Toggle theme',
    insertTable: 'Insert Table',
    addColumnBefore: 'Add Column Before',
    addColumnAfter: 'Add Column After',
    deleteColumn: 'Delete Column',
    addRowAbove: 'Add Row Above',
    addRowBelow: 'Add Row Below',
    deleteRow: 'Delete Row',
    deleteTable: 'Delete Table',
  }
};

const getLanguage = () => {
  const lang = navigator.language || navigator.userLanguage;
  return lang.startsWith('ja') ? 'ja' : 'en';
};

const currentLang = getLanguage();

export const t = (key) => {
  return translations[currentLang][key] || translations['en'][key] || key;
};

export default translations;
