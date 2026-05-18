import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../i18n';
import { MoreVerticalIcon } from './Icons';

const HistoryItem = ({ filepath, onLoad, onRemove, onReveal }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const filename = filepath.split('/').pop().replace(/\.md$/, '');
  const triggerRef = useRef(null);

  const handleMenuToggle = (e) => {
    e.stopPropagation();
    if (!menuOpen) {
      const rect = e.currentTarget.getBoundingClientRect();
      const menuWidth = 140;
      
      // Calculate horizontal position: popover to the right of the dropdown if space permits
      let left = rect.right + window.scrollX + 6;
      if (rect.right + menuWidth > window.innerWidth) {
        // Fallback to the left of the button if screen boundary reached
        left = rect.left + window.scrollX - menuWidth - 6;
      }

      setCoords({
        top: rect.top + window.scrollY - 4, // slightly offset vertically for alignment
        left: left
      });
    }
    setMenuOpen(!menuOpen);
  };

  // Close menu on click anywhere
  useEffect(() => {
    if (!menuOpen) return;
    const handleGlobalClick = () => {
      setMenuOpen(false);
    };
    // Delay adding the event listener to avoid immediate triggering from the click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleGlobalClick);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleGlobalClick);
    };
  }, [menuOpen]);

  const showOptionButton = isHovered || menuOpen;

  return (
    <div 
      className="history-item-container"
      style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
      
      {showOptionButton && (
        <div style={{ position: 'absolute', right: '0.5rem' }}>
          <button
            ref={triggerRef}
            onClick={handleMenuToggle}
            className="icon-button"
            style={{ 
              padding: '0.2rem',
              background: menuOpen ? 'var(--hover-bg)' : 'transparent',
              opacity: 1
            }}
          >
            <MoreVerticalIcon size={16} />
          </button>
          
          {menuOpen && createPortal(
            <div 
              className="dropdown-menu" 
              style={{ 
                position: 'absolute',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                minWidth: '140px', 
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                margin: 0,
                zIndex: 9999, // Ensure it is on top of everything
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.25rem',
                display: 'flex',
                flexDirection: 'column'
              }}
              onMouseDown={(e) => e.stopPropagation()} // Prevent closing when clicking inside the popover itself
            >
              <button 
                onClick={(e) => { e.stopPropagation(); onReveal(filepath); setMenuOpen(false); }}
                className="btn-ghost"
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '6px' }}
              >
                {t('finderReveal')}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onRemove(filepath); setMenuOpen(false); }}
                className="btn-ghost btn-danger-ghost"
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '6px' }}
              >
                {t('historyRemove')}
              </button>
            </div>,
            document.body
          )}
        </div>
      )}
    </div>
  );
};

export default HistoryItem;
