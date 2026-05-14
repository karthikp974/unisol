import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type SearchableSelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

type OptionInput = SearchableSelectOption | [string, string];

type SearchableSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: OptionInput[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loading?: boolean;
  disabled?: boolean;
  required?: boolean;
  clearable?: boolean;
  className?: string;
  inputMode?: boolean;
  searchable?: boolean;
};

export function SearchableSelect({
  className = "",
  clearable = true,
  disabled = false,
  emptyMessage = "No options found",
  inputMode = false,
  loading = false,
  onChange,
  options,
  placeholder = "Select",
  required = false,
  searchable = true,
  searchPlaceholder = "Search options...",
  value
}: SearchableSelectProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; value: string } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const normalizedOptions = useMemo(
    () =>
      options.map((option) =>
        Array.isArray(option)
          ? { value: option[0], label: option[1] }
          : option
      ),
    [options]
  );

  const selectedOption = normalizedOptions.find((option) => option.value === value);
  const filteredOptions = useMemo(() => {
    if (!searchable) return normalizedOptions;
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return normalizedOptions;
    return normalizedOptions
      .map((option) => ({ option, score: matchScore(option, normalizedQuery) }))
      .filter((item) => item.score < Number.POSITIVE_INFINITY)
      .sort((a, b) => a.score - b.score || a.option.label.localeCompare(b.option.label))
      .map((item) => item.option);
  }, [normalizedOptions, query, searchable]);

  useEffect(() => {
    if (!isOpen || !searchable) return;
    window.setTimeout(() => searchRef.current?.focus(), 0);
  }, [isOpen, searchable]);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  function choose(option: SearchableSelectOption) {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
    setQuery(inputMode ? option.label : "");
    if (inputMode) {
      window.setTimeout(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }, 0);
    }
  }

  function handleInputChange(nextQuery: string) {
    setQuery(nextQuery);
    setIsOpen(true);
    if (value) {
      onChange("");
    }
  }

  function moveActive(direction: 1 | -1) {
    if (!filteredOptions.length) return;
    let nextIndex = activeIndex;
    for (let step = 0; step < filteredOptions.length; step += 1) {
      nextIndex = (nextIndex + direction + filteredOptions.length) % filteredOptions.length;
      if (!filteredOptions[nextIndex]?.disabled) {
        setActiveIndex(nextIndex);
        return;
      }
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        moveActive(1);
      }
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        moveActive(-1);
      }
    }

    if (event.key === "Enter" && isOpen) {
      event.preventDefault();
      const option = filteredOptions[activeIndex] ?? filteredOptions.find((item) => !item.disabled);
      if (option) choose(option);
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      setQuery("");
    }
  }

  const displayValue = inputMode ? (isOpen || query ? query : selectedOption?.label ?? "") : selectedOption?.label ?? placeholder;

  return (
    <div className={`erp-searchable-select ${className}`} ref={rootRef} onKeyDown={handleKeyDown}>
      {inputMode ? (
        <div className={`erp-select-trigger erp-select-search-trigger ${isOpen ? "open" : ""}`}>
          <Search size={17} aria-hidden="true" />
          <input
            aria-controls={`${id}-listbox`}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            autoComplete="off"
            disabled={disabled}
            onBlur={() => {
              if (!value) return;
              window.setTimeout(() => setQuery(""), 120);
            }}
            onChange={(event) => handleInputChange(event.target.value)}
            onFocus={() => {
              setIsOpen(true);
              setQuery(selectedOption?.label ?? "");
            }}
            placeholder={placeholder}
            role="combobox"
            value={displayValue}
          />
          {clearable && (value || query) ? (
            <span
              aria-label="Clear selection"
              className="erp-select-clear"
              onClick={(event) => {
                event.stopPropagation();
                onChange("");
                setQuery("");
                setIsOpen(false);
              }}
              role="button"
              tabIndex={-1}
            >
              <X size={15} />
            </span>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          className={`erp-select-trigger ${isOpen ? "open" : ""}`}
          aria-controls={`${id}-listbox`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          disabled={disabled}
          onClick={() => setIsOpen((current) => !current)}
          role="combobox"
        >
          <span className={selectedOption ? "erp-select-value" : "erp-select-placeholder"}>
            {displayValue}
          </span>
          <span className="erp-select-actions">
            {clearable && value ? (
              <span
                aria-label="Clear selection"
                className="erp-select-clear"
                onClick={(event) => {
                  event.stopPropagation();
                  onChange("");
                  setQuery("");
                }}
                role="button"
                tabIndex={-1}
              >
                <X size={15} />
              </span>
            ) : null}
            <ChevronDown className="erp-select-chevron" size={18} aria-hidden="true" />
          </span>
        </button>
      )}
      {required && !value ? <input tabIndex={-1} className="erp-select-required" value="" required onChange={() => undefined} aria-hidden="true" /> : null}
      {isOpen ? (
        <div className="erp-select-panel">
          {searchable && !inputMode ? (
            <div className="erp-select-search">
              <Search size={16} aria-hidden="true" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                autoComplete="off"
              />
            </div>
          ) : null}
          <div className="erp-select-list" id={`${id}-listbox`} role="listbox">
            {loading ? <div className="erp-select-state">Loading options...</div> : null}
            {!loading && filteredOptions.length === 0 ? <div className="erp-select-state">{emptyMessage}</div> : null}
            {!loading
              ? filteredOptions.map((option, index) => (
                  <button
                    type="button"
                    aria-selected={option.value === value}
                    className={`erp-select-option ${option.value === value ? "selected" : ""}`}
                    disabled={option.disabled}
                    key={option.value}
                    onMouseEnter={() => setActiveIndex(index)}
                    onPointerDown={(event) => {
                      if (event.pointerType === "touch") {
                        touchStartRef.current = { x: event.clientX, y: event.clientY, value: option.value };
                        return;
                      }
                      event.preventDefault();
                      choose(option);
                    }}
                    onPointerMove={(event) => {
                      const start = touchStartRef.current;
                      if (!start) return;
                      const moved = Math.abs(event.clientX - start.x) > 8 || Math.abs(event.clientY - start.y) > 8;
                      if (moved) touchStartRef.current = null;
                    }}
                    onPointerUp={(event) => {
                      const start = touchStartRef.current;
                      touchStartRef.current = null;
                      if (!start || start.value !== option.value) return;
                      event.preventDefault();
                      choose(option);
                    }}
                    onClick={() => choose(option)}
                    role="option"
                  >
                    <span>
                      <strong>{option.label}</strong>
                      {option.description ? <small>{option.description}</small> : null}
                    </span>
                    {option.value === value ? <Check size={16} aria-hidden="true" /> : null}
                  </button>
                ))
              : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function matchScore(option: SearchableSelectOption, normalizedQuery: string) {
  const label = option.label.toLowerCase();
  const description = option.description?.toLowerCase() ?? "";
  const haystack = `${label} ${description}`.trim();
  if (label === normalizedQuery) return 0;
  if (label.startsWith(normalizedQuery)) return 1;
  if (label.split(/[^a-z0-9]+/).some((part) => part.startsWith(normalizedQuery))) return 2;
  const labelIndex = label.indexOf(normalizedQuery);
  if (labelIndex >= 0) return 3 + labelIndex / 100;
  const descriptionIndex = description.indexOf(normalizedQuery);
  if (descriptionIndex >= 0) return 5 + descriptionIndex / 100;
  if (haystack.includes(normalizedQuery)) return 8;
  return Number.POSITIVE_INFINITY;
}
