import React, { useState, useEffect } from 'react';
import { FolderIcon, FolderUpIcon } from './Icons';

const SaveDialog = ({ isOpen, initialFilename, onSave, onCancel }) => {
  const [filename, setFilename] = useState(initialFilename || '');
  const [currentPath, setCurrentPath] = useState('');
  const [parentPath, setParentPath] = useState('');
  const [directories, setDirectories] = useState([]);
  const [selectedDir, setSelectedDir] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFilename(initialFilename || '');
      fetchDirs(null);
    }
  }, [isOpen, initialFilename]);

  const fetchDirs = async (pathStr) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/dirs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPath: pathStr })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentPath(data.currentPath);
        setParentPath(data.parentPath);
        setDirectories(data.directories || []);
        setSelectedDir(null);
      }
    } catch (err) {
      console.error('Failed to load directories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSaveClick = () => {
    if (!filename.trim()) return;
    onSave(filename, currentPath);
  };

  const navigateUp = () => {
    if (parentPath && parentPath !== currentPath) {
      fetchDirs(parentPath);
    }
  };

  // Split paths into breadcrumbs
  const pathParts = currentPath.split('/').filter(Boolean);

  return (
    <div className="save-dialog-overlay" onClick={onCancel}>
      <div className="save-dialog-window" onClick={(e) => e.stopPropagation()}>
        <div className="save-dialog-header">
          <h3>新規ファイルとして保存</h3>
        </div>

        <div className="save-dialog-body">
          {/* File Name Field */}
          <div className="dialog-field">
            <label className="dialog-label">ファイル名</label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="filename.md"
              className="dialog-input"
              autoFocus
            />
          </div>

          {/* Directory Navigator */}
          <div className="dialog-field">
            <label className="dialog-label">保存先フォルダ</label>
            
            {/* Breadcrumbs */}
            <div className="dialog-breadcrumbs">
              <span className="breadcrumb-root" onClick={() => fetchDirs('/')}>/</span>
              {pathParts.map((part, index) => {
                const fullPartPath = '/' + pathParts.slice(0, index + 1).join('/');
                return (
                  <React.Fragment key={index}>
                    <span className="breadcrumb-separator">/</span>
                    <span 
                      className="breadcrumb-part"
                      onClick={() => fetchDirs(fullPartPath)}
                    >
                      {part}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Folder browser box */}
            <div className="dialog-folder-box">
              <div className="folder-box-header">
                <button 
                  onClick={navigateUp} 
                  disabled={currentPath === '/' || isLoading}
                  className="btn-navigate-up"
                  title="上のフォルダへ移動"
                >
                  <FolderUpIcon size={14} style={{ marginRight: 6 }} />
                  <span>親フォルダへ</span>
                </button>
              </div>

              <div className="folder-list">
                {isLoading ? (
                  <div className="folder-loading">読み込み中...</div>
                ) : directories.length === 0 ? (
                  <div className="folder-empty">このフォルダ内にはサブフォルダがありません</div>
                ) : (
                  directories.map((dir) => (
                    <div
                      key={dir}
                      className={`folder-item ${selectedDir === dir ? 'selected' : ''}`}
                      onClick={() => setSelectedDir(dir)}
                      onDoubleClick={() => fetchDirs(currentPath + '/' + dir)}
                    >
                      <FolderIcon size={16} className="folder-icon" />
                      <span className="folder-name">{dir}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            {selectedDir && (
              <div className="selected-dir-info">
                選択中: <code>{selectedDir}</code> (ダブルクリックで開く)
              </div>
            )}
          </div>
        </div>

        <div className="save-dialog-footer">
          <button onClick={onCancel} className="btn-save-dialog-cancel">
            キャンセル
          </button>
          <button 
            onClick={handleSaveClick}
            disabled={!filename.trim() || isLoading}
            className="btn-save-dialog-confirm"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveDialog;
