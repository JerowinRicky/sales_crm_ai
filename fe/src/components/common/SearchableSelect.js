import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, X, Check, Plus } from 'lucide-react';

/**
 * SearchableSelect / Combobox Component
 *
 * Single-box input with dropdown: clicking opens options, and typing directly in the box searches/filters.
 * Uses React Portal to avoid clipping inside tables or scrollable containers.
 */
export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  disabled = false,
  required = false,
  className = '',
  size = 'normal',
  name,
  id,
  allowClear = false,
  allowCustom = false,
  emptyMessage = 'No matching options found',
  onDisabledClick,
}) {
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, openUpward: false });

  // Normalize options into { value, label, group, subtext, original, ...rest }
  const normalizedOptions = useMemo(() => {
    return (options || []).map(opt => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { value: opt, label: String(opt), original: opt };
      }
      return {
        ...opt,
        value: opt.value !== undefined ? opt.value : '',
        label: opt.label !== undefined ? String(opt.label) : String(opt.value || ''),
        group: opt.group,
        subtext: opt.subtext,
        original: opt,
      };
    });
  }, [options]);

  // Find currently selected option object
  const selectedOption = useMemo(() => {
    if (value === undefined || value === null || value === '') return null;
    return (
      normalizedOptions.find(
        o =>
          String(o.value) === String(value) ||
          (o.label && String(o.label).toLowerCase() === String(value).toLowerCase())
      ) || null
    );
  }, [normalizedOptions, value]);

  // Filter options based on user typing
  const filteredOptions = useMemo(() => {
    if (!isTyping || !query || !query.trim()) {
      return normalizedOptions;
    }
    const q = query.trim().toLowerCase();
    return normalizedOptions.filter(opt => {
      if (opt.value === '' && opt.label.toLowerCase().includes('select')) {
        return false;
      }
      const labelMatch = opt.label.toLowerCase().includes(q);
      const subtextMatch = opt.subtext && String(opt.subtext).toLowerCase().includes(q);
      const groupMatch = opt.group && String(opt.group).toLowerCase().includes(q);
      return labelMatch || subtextMatch || groupMatch;
    });
  }, [normalizedOptions, isTyping, query]);

  // Check if query exactly matches an existing option
  const exactMatchExists = useMemo(() => {
    if (!query || !query.trim()) return true;
    const q = query.trim().toLowerCase();
    return normalizedOptions.some(o => o.label.toLowerCase() === q);
  }, [normalizedOptions, query]);

  // Position calculation for portal
  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;

    setCoords({
      top: openUpward ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 160),
      openUpward,
    });
  };

  // Recalculate position on scroll/resize while open
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = (e) => {
      if (listRef.current && listRef.current.contains(e?.target)) return;
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  const handleSelectOption = (opt) => {
    setIsOpen(false);
    setIsTyping(false);
    setQuery('');
    onChange?.(opt.value, opt);
  };

  const handleBlurOrClose = () => {
    if (allowCustom && isTyping && query.trim()) {
      const q = query.trim();
      const existing = normalizedOptions.find(o => o.label.toLowerCase() === q.toLowerCase());
      if (existing) {
        handleSelectOption(existing);
      } else {
        handleSelectOption({ value: q, label: q, isCustom: true });
      }
    } else {
      setIsOpen(false);
      setIsTyping(false);
      setQuery('');
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        (!listRef.current || !listRef.current.contains(e.target))
      ) {
        handleBlurOrClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, allowCustom, isTyping, query, normalizedOptions]);

  // Keep highlightedIndex in bounds when filteredOptions changes
  useEffect(() => {
    if (highlightedIndex >= filteredOptions.length) {
      setHighlightedIndex(Math.max(0, filteredOptions.length - 1));
    }
  }, [filteredOptions, highlightedIndex]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const itemEl = listRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
      if (itemEl) {
        itemEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleOpen = () => {
    if (disabled) {
      onDisabledClick?.();
      return;
    }
    updatePosition();
    setIsOpen(true);
    setIsTyping(false);
    setQuery('');

    if (selectedOption) {
      const idx = normalizedOptions.findIndex(o => String(o.value) === String(selectedOption.value));
      setHighlightedIndex(idx >= 0 ? idx : 0);
    } else {
      setHighlightedIndex(0);
    }

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.select();
      }
    }, 15);
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    if (disabled) {
      onDisabledClick?.();
      return;
    }
    if (isOpen) {
      handleBlurOrClose();
    } else {
      handleOpen();
      if (inputRef.current) inputRef.current.focus();
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.('', null);
    setIsTyping(false);
    setQuery('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        handleOpen();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % Math.max(1, filteredOptions.length));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + filteredOptions.length) % Math.max(1, filteredOptions.length));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions.length > 0 && filteredOptions[highlightedIndex]) {
          handleSelectOption(filteredOptions[highlightedIndex]);
        } else if (allowCustom && query.trim()) {
          handleBlurOrClose();
        }
        break;
      case 'Escape':
      case 'Tab':
        handleBlurOrClose();
        break;
      default:
        break;
    }
  };

  const isSm = size === 'sm';
  const displayValue = isTyping
    ? query
    : selectedOption
    ? selectedOption.label
    : value
    ? String(value)
    : '';

  const dropdownMenu = isOpen && typeof document !== 'undefined' ? (
    <div
      ref={listRef}
      style={{
        position: 'fixed',
        top: coords.openUpward ? undefined : coords.top,
        bottom: coords.openUpward ? `${Math.max(10, window.innerHeight - coords.top)}px` : undefined,
        left: coords.left,
        width: coords.width,
        zIndex: 99999,
        maxHeight: '260px',
      }}
      className="overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-2xl py-1 text-gray-900"
    >
      {filteredOptions.length === 0 ? (
        <div>
          <div className="px-3 py-3 text-xs sm:text-sm text-gray-500 text-center italic">
            {emptyMessage}
          </div>
          {allowCustom && query.trim() && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleSelectOption({ value: query.trim(), label: query.trim(), isCustom: true });
              }}
              className="px-3 py-2 text-xs sm:text-sm cursor-pointer flex items-center gap-1.5 text-blue-600 hover:bg-blue-50 border-t border-gray-100 font-medium"
            >
              <Plus size={14} /> Use &ldquo;{query.trim()}&rdquo;
            </div>
          )}
        </div>
      ) : (
        <>
          {filteredOptions.map((opt, idx) => {
            const isSelected = selectedOption && String(selectedOption.value) === String(opt.value);
            const isHighlighted = idx === highlightedIndex;

            const prevOpt = idx > 0 ? filteredOptions[idx - 1] : null;
            const showGroupHeader = opt.group && (!prevOpt || prevOpt.group !== opt.group);

            return (
              <React.Fragment key={`${opt.value}-${idx}`}>
                {showGroupHeader && (
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-t border-b border-gray-100">
                    {opt.group}
                  </div>
                )}
                <div
                  data-index={idx}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectOption(opt);
                  }}
                  className={`px-3 py-2 text-xs sm:text-sm cursor-pointer flex items-center justify-between transition-colors ${
                    isHighlighted ? 'bg-blue-50 text-blue-900 font-medium' : 'text-gray-800'
                  } ${isSelected ? 'font-semibold text-blue-600 bg-blue-50/70' : ''}`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="truncate">{opt.label}</span>
                    {opt.subtext && (
                      <span className="text-[11px] text-gray-400 font-normal truncate">
                        {opt.subtext}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check size={14} className="text-blue-600 flex-shrink-0" />
                  )}
                </div>
              </React.Fragment>
            );
          })}

          {allowCustom && query.trim() && !exactMatchExists && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleSelectOption({ value: query.trim(), label: query.trim(), isCustom: true });
              }}
              className="px-3 py-2 text-xs sm:text-sm cursor-pointer flex items-center gap-1.5 text-blue-600 hover:bg-blue-50 border-t border-gray-100 font-medium"
            >
              <Plus size={14} /> Use &ldquo;{query.trim()}&rdquo;
            </div>
          )}
        </>
      )}
    </div>
  ) : null;

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${disabled ? 'cursor-not-allowed opacity-90' : ''}`}
    >
      {/* Exactly ONE input box */}
      <input
        ref={inputRef}
        type="text"
        name={name}
        id={id}
        readOnly={disabled}
        required={required}
        value={displayValue}
        onChange={(e) => {
          if (!isOpen) {
            updatePosition();
            setIsOpen(true);
          }
          setIsTyping(true);
          setQuery(e.target.value);
          setHighlightedIndex(0);
        }}
        onClick={handleOpen}
        onFocus={handleOpen}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={`w-full border rounded-lg bg-white transition-all cursor-pointer text-gray-900 placeholder-gray-400 ${
          disabled
            ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
            : isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
            : 'border-gray-300 hover:border-gray-400'
        } ${
          isSm
            ? 'min-h-[38px] px-3 py-2 text-sm pr-8'
            : 'min-h-[42px] px-3 py-2.5 text-sm sm:text-base pr-8'
        } ${className}`}
      />

      {/* Trailing icons (Chevron & Clear) positioned inside the one box */}
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-400 pointer-events-none">
        {allowClear && selectedOption && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 hover:text-gray-600 rounded transition pointer-events-auto"
            title="Clear selection"
          >
            <X size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={handleToggle}
          tabIndex={-1}
          className="p-0.5 hover:text-gray-600 focus:outline-none pointer-events-auto"
        >
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`}
          />
        </button>
      </div>

      {/* Dropdown Menu via Portal */}
      {dropdownMenu && ReactDOM.createPortal(dropdownMenu, document.body)}
    </div>
  );
}
