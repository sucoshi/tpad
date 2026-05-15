import React, { useState } from 'react';
import { t } from '../i18n';

const HistoryItem = ({ filepath, onLoad, onRemove, onReveal }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const filename = filepath.split('/').pop().replace(/\.md$/, '');

  return (
    <div 
      className="history-item-container"
      style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setMenuOpen(false); }}
    >
      <button
        onClick={() => onLoad(filepath)}
        className="btn-ghost"
        style={{
          flex: 1,
          borderBottom: '1px solid var(--border-color)',
          padding: '0.8rem 2.5rem 0.8rem 1rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          borderRadius: 0
        }}
      >
        {filename}
      </button>
      {isHovered && (
        <div style={{ position: 'absolute', right: '0.5rem' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="icon-button"
            style={{ fontSize: '1rem', padding: '0.2rem 0.5rem' }}
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="dropdown-menu" style={{ right: 0, minWidth: '130px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
              <button 
                onClick={(e) => { e.stopPropagation(); onReveal(filepath); setMenuOpen(false); }}
                className="btn-ghost"
              >
                {t('finderReveal')}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onRemove(filepath); setMenuOpen(false); }}
                className="btn-ghost btn-danger-ghost"
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

export default HistoryItem;
