"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown, Search } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import styles from "./report-layout.module.css";

function usePicker() {
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const close = (restore = true) => {
    popup.current?.hidePopover();
    setOpen(false);
    if (restore) trigger.current?.focus();
  };
  const position = () => {
    const anchor = trigger.current,
      panel = popup.current;
    if (!anchor || !panel) return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 300), window.innerWidth - 24);
    panel.style.width = `${width}px`;
    panel.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
    panel.style.maxHeight = `${Math.max(160, window.innerHeight - 24)}px`;
    const height = panel.getBoundingClientRect().height;
    panel.style.top = `${Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - height - 12))}px`;
  };
  useEffect(() => {
    if (!open) return;
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open]);
  return {
    trigger,
    popup,
    open,
    close,
    setOpen,
    show() {
      popup.current?.showPopover();
      position();
      setOpen(true);
    },
  };
}

export function ReportSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const picker = usePicker();
  const id = useId();
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  );
  function select(value: string) {
    onChange(value);
    picker.close();
  }
  useEffect(() => {
    if (picker.open) search.current?.focus();
  }, [picker.open]);
  useEffect(() => {
    picker.popup.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, picker.open]);
  return (
    <div className={styles.picker}>
      <button
        type="button"
        ref={picker.trigger}
        className={styles.pickerTrigger}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={picker.open}
        aria-controls={id}
        onClick={() => {
          if (picker.open) picker.close();
          else {
            setQuery("");
            setActive(
              Math.max(
                0,
                options.findIndex((o) => o.value === value),
              ),
            );
            picker.show();
          }
        }}
      >
        <span>
          {options.find((option) => option.value === value)?.label ||
            "Select an option"}
        </span>
        <ChevronDown size={16} />
      </button>
      <div
        ref={picker.popup}
        popover="auto"
        className={styles.pickerPopup}
        onToggle={(event) => picker.setOpen(event.newState === "open")}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            picker.close();
          }
          if (event.key === "Tab") picker.close(false);
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) =>
              Math.max(
                0,
                Math.min(
                  filtered.length - 1,
                  index + (event.key === "ArrowDown" ? 1 : -1),
                ),
              ),
            );
          }
          if (event.key === "Enter") {
            event.preventDefault();
            if (filtered[active]) select(filtered[active].value);
          }
        }}
      >
        <div className={styles.pickerSearch}>
          <Search size={16} />
          <input
            ref={search}
            role="combobox"
            aria-label={`Search ${label.toLowerCase()}`}
            aria-expanded={picker.open}
            aria-controls={id}
            aria-autocomplete="list"
            aria-activedescendant={
              filtered[active] ? `${id}-${active}` : undefined
            }
            value={query}
            placeholder="Search options…"
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
          />
        </div>
        <div
          id={id}
          role="listbox"
          aria-label={label}
          className={styles.pickerOptions}
        >
          {filtered.map((option, index) => (
            <button
              type="button"
              role="option"
              tabIndex={-1}
              id={`${id}-${index}`}
              data-index={index}
              key={option.value}
              aria-selected={value === option.value}
              data-active={index === active}
              onClick={() => select(option.value)}
            >
              {option.label}
              {value === option.value && <Check size={16} />}
            </button>
          ))}
          {!filtered.length && (
            <p className={styles.muted}>No matching options.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReportDate({
  label,
  value,
  onChange,
  withTime = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  withTime?: boolean;
}) {
  const picker = usePicker();
  const id = useId();
  const day = value ? new Date(`${value.slice(0, 10)}T12:00:00`) : undefined;
  const selected = day && !Number.isNaN(day.getTime()) ? day : undefined;
  const dateLabel = selected
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(selected)
    : "Choose date";
  return (
    <div className={styles.dateControl}>
      <button
        type="button"
        ref={picker.trigger}
        className={styles.pickerTrigger}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={picker.open}
        aria-controls={id}
        onClick={() => (picker.open ? picker.close() : picker.show())}
      >
        <span>{dateLabel}</span>
        <CalendarDays size={17} />
      </button>
      <div
        ref={picker.popup}
        id={id}
        role="dialog"
        aria-label={`Choose ${label.toLowerCase()}`}
        popover="auto"
        className={`${styles.pickerPopup} ${styles.calendar}`}
        onToggle={(event) => picker.setOpen(event.newState === "open")}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            picker.close();
          }
        }}
      >
        {picker.open && (
          <DayPicker
            mode="single"
            autoFocus
            selected={selected}
            defaultMonth={selected}
            onSelect={(date) => {
              if (!date) return;
              const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
              onChange(
                withTime ? `${iso}T${value.split("T")[1] || "12:00:00"}` : iso,
              );
              picker.close();
            }}
          />
        )}
      </div>
      {withTime && (
        <input
          aria-label="Enquiry time (Africa/Lagos, 24-hour HH:MM)"
          inputMode="numeric"
          placeholder="HH:MM"
          required
          pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
          value={(value.split("T")[1] || "").slice(0, 5)}
          onChange={(event) =>
            onChange(`${value.slice(0, 10)}T${event.target.value}`)
          }
        />
      )}
    </div>
  );
}
