import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import {
  loadEntries,
  saveEntry as dbSaveEntry,
  deleteEntry as dbDeleteEntry,
  loadSettings,
  saveSettings,
} from "./db";

const CATEGORIES = [
  { id: "eucharist", label: "Holy Eucharist" },
  { id: "reserved", label: "Reserved Sacrament" },
  { id: "baptism", label: "Baptism" },
  { id: "confirmation", label: "Confirmation" },
  { id: "wedding", label: "Wedding" },
  { id: "funeral", label: "Funeral" },
];
const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const FONT_SIZES = [
  { id: "small", label: "Small", scale: 0.9 },
  { id: "medium", label: "Medium", scale: 1.0 },
  { id: "large", label: "Large", scale: 1.15 },
  { id: "xlarge", label: "Extra Large", scale: 1.3 },
];

function sz(sc, base) {
  return `${(parseFloat(base) * sc).toFixed(3)}rem`;
}
function getDayName(ds) {
  if (!ds) return "";
  return DAYS[new Date(ds + "T00:00:00").getDay()] || "";
}
function fmtDate(ds) {
  if (!ds) return "";
  const d = new Date(ds + "T00:00:00");
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtDateLong(ds) {
  if (!ds) return "Select date";
  const d = new Date(ds + "T00:00:00");
  return `${getDayName(ds)}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}
function toDateStr(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function easterSunday(year) {
  const a = year % 19,
    b = Math.floor(year / 100),
    cc = year % 100,
    d = Math.floor(b / 4),
    e = b % 4;
  const f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(cc / 4),
    k = cc % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31),
    day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}
function easterSaturday(yr) {
  const es = easterSunday(yr);
  const s = new Date(es);
  s.setDate(s.getDate() + 6);
  return s;
}
function adventSundayDate(yr) {
  const n = new Date(yr, 10, 30);
  const dow = n.getDay();
  return new Date(yr, 10, 30 + (dow <= 3 ? -dow : 7 - dow));
}
function sundayBeforeAdvent(yr) {
  const a = adventSundayDate(yr);
  const s = new Date(a);
  s.setDate(s.getDate() - 7);
  return s;
}
function eveOfAdvent(yr) {
  const a = adventSundayDate(yr);
  const e = new Date(a);
  e.setDate(e.getDate() - 1);
  return e;
}
function dateToStr(d) {
  return d.toISOString().slice(0, 10);
}

function generateReport(entries, year) {
  const start = dateToStr(eveOfAdvent(year - 1)),
    end = dateToStr(eveOfAdvent(year));
  const f = entries.filter((e) => e.date >= start && e.date <= end);
  const eu = f.filter((e) => e.category === "eucharist"),
    rs = f.filter((e) => e.category === "reserved"),
    ba = f.filter((e) => e.category === "baptism");
  const esA = easterSunday(year - 1),
    esatA = easterSaturday(year - 1),
    esB = easterSunday(year),
    esatB = easterSaturday(year);
  let easterStart, easterEnd;
  if (dateToStr(esA) >= start && dateToStr(esatA) <= end) {
    easterStart = dateToStr(esA);
    easterEnd = dateToStr(esatA);
  } else {
    easterStart = dateToStr(esB);
    easterEnd = dateToStr(esatB);
  }
  const easterEu = eu.filter(
    (e) => e.date >= easterStart && e.date <= easterEnd,
  );
  const snbaStr = dateToStr(sundayBeforeAdvent(year)),
    snbaEu = eu.filter((e) => e.date === snbaStr);
  return {
    startDate: fmtDate(start),
    endDate: fmtDate(end),
    totalEntries: f.length,
    easterDates: `${fmtDate(easterStart)} – ${fmtDate(easterEnd)}`,
    field3: ba.reduce((s, e) => s + (e.baptisedUnder6 || 0), 0),
    field4: ba.reduce((s, e) => s + (e.baptisedOver6 || 0), 0),
    field6: f
      .filter((e) => e.category === "confirmation")
      .reduce((s, e) => s + (e.numberConfirmed || 0), 0),
    field7: f.filter((e) => e.category === "wedding").length,
    field8: f.filter((e) => e.category === "funeral").length,
    field9: eu.length,
    field10: easterEu.reduce((s, e) => s + (e.communicants || 0), 0),
    field11: snbaEu.reduce((s, e) => s + (e.communicants || 0), 0),
    field12: snbaEu.reduce((s, e) => s + (e.under16 || 0) + (e.over16 || 0), 0),
    field13: eu.reduce((s, e) => s + (e.communicants || 0), 0),
    field14: rs.reduce((s, e) => s + (e.communicants || 0), 0),
    snbaDate: fmtDate(snbaStr),
  };
}

const P = (dk) => ({
  bg: dk ? "#1a1a1e" : "#faf9f7",
  card: dk ? "#27272b" : "#ffffff",
  bdr: dk ? "#3a3a40" : "#e8e6e1",
  text: dk ? "#e8e6e1" : "#2c2c2c",
  muted: dk ? "#8a8a8e" : "#7a7a7e",
  accent: dk ? "#c9a96e" : "#8b6914",
  aBg: dk ? "rgba(201,169,110,0.12)" : "rgba(139,105,20,0.08)",
  aBdr: dk ? "rgba(201,169,110,0.25)" : "rgba(139,105,20,0.2)",
  iBg: dk ? "#2f2f34" : "#f5f4f0",
  iBdr: dk ? "#404046" : "#ddd9d0",
  danger: "#c0392b",
  success: dk ? "#6bbd6b" : "#2d7a2d",
  calToday: dk ? "rgba(201,169,110,0.2)" : "rgba(139,105,20,0.1)",
});

/** Fixed input height so date pickers and number inputs match exactly */
const INPUT_H = 48;

const mkInput = (c, sc) => ({
  width: "100%",
  padding: "0 14px",
  height: INPUT_H,
  border: `1px solid ${c.iBdr}`,
  borderRadius: 10,
  background: c.iBg,
  color: c.text,
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: sz(sc, "1.1"),
  outline: "none",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
});

const mkLabel = (c, sc) => ({
  display: "block",
  fontSize: sz(sc, "0.75"),
  fontWeight: 600,
  color: c.muted,
  marginBottom: 5,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontFamily: "-apple-system, sans-serif",
});

const Dot = ({ c }) => (
  <span
    style={{
      display: "inline-block",
      width: 5,
      height: 5,
      borderRadius: "50%",
      background: c.accent,
      marginLeft: 5,
      verticalAlign: "middle",
      opacity: 0.7,
    }}
  />
);

const GearIcon = ({ color, size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const PersonIcon = ({ color, size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill={color}
    style={{ verticalAlign: "middle" }}
  >
    <circle cx="8" cy="4.5" r="2.8" />
    <path d="M2.5 14.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
  </svg>
);

/** Wafer/host icon — filled circle with cross "cut out" using background-coloured strokes.
 *  bgColor should be the card or page background so the cross lines appear to punch through. */
const WaferIcon = ({ color, bgColor, size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    style={{ verticalAlign: "middle" }}
  >
    <circle cx="8" cy="8" r="7" fill={color} />
    <line x1="8" y1="1" x2="8" y2="15" stroke={bgColor} strokeWidth="1.5" />
    <line x1="1" y1="8" x2="15" y2="8" stroke={bgColor} strokeWidth="1.5" />
  </svg>
);

/* ── NumInput ────────────────────────────────────────────────────────── */

function NumInput({ value, onChange, c, sc, style }) {
  const displayVal = value === "" || value === 0 ? "" : String(value);
  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    onChange(raw === "" ? "" : parseInt(raw));
  };
  const inc = () => onChange((value === "" ? 0 : Number(value)) + 1);
  const dec = () => {
    const n = value === "" ? 0 : Number(value);
    if (n > 0) onChange(n - 1);
  };
  const chevronBtn = (top) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    flex: 1,
    background: "none",
    border: "none",
    borderBottom: top ? `1px solid ${c.iBdr}` : "none",
    color: c.muted,
    fontSize: "0.6rem",
    cursor: "pointer",
    fontFamily: "-apple-system, sans-serif",
    lineHeight: 1,
    userSelect: "none",
    WebkitUserSelect: "none",
    padding: 0,
  });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        border: `1px solid ${c.iBdr}`,
        borderRadius: 10,
        background: c.iBg,
        overflow: "hidden",
        height: INPUT_H,
        boxSizing: "border-box",
        ...style,
      }}
    >
      <input
        type="text"
        inputMode="numeric"
        value={displayVal}
        onChange={handleChange}
        style={{
          flex: 1,
          border: "none",
          background: "transparent",
          color: c.text,
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: sz(sc, "1.1"),
          textAlign: "center",
          outline: "none",
          minWidth: 0,
          padding: "0 8px",
          boxSizing: "border-box",
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderLeft: `1px solid ${c.iBdr}`,
          width: 36,
          flexShrink: 0,
        }}
      >
        <button onClick={inc} style={chevronBtn(true)} type="button">
          ▲
        </button>
        <button onClick={dec} style={chevronBtn(false)} type="button">
          ▼
        </button>
      </div>
    </div>
  );
}

/* ── DatePicker ──────────────────────────────────────────────────────── */

function DatePicker({ value, onChange, c, sc, compact }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = value ? new Date(value + "T00:00:00") : new Date();
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [open]);
  useEffect(() => {
    if (open && value) {
      const d = new Date(value + "T00:00:00");
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [open, value]);
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else setViewMonth(viewMonth + 1);
  };
  const startOffset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);
  const weeks = [];
  let day = 1 - startOffset;
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(day > 0 && day <= daysInMonth ? day : null);
      day++;
    }
    if (week.some((d) => d !== null)) weeks.push(week);
  }
  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        flex: compact ? 1 : undefined,
        minWidth: 0,
      }}
    >
      <div
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "0 14px",
          height: INPUT_H,
          border: `1px solid ${c.iBdr}`,
          borderRadius: 10,
          background: c.iBg,
          color: value ? c.text : c.muted,
          fontSize: compact ? sz(sc, "0.95") : sz(sc, "1.1"),
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          boxSizing: "border-box",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          userSelect: "none",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value
            ? compact
              ? fmtDate(value)
              : fmtDateLong(value)
            : "Select date"}
        </span>
        <span
          style={{
            fontSize: "0.8rem",
            color: c.muted,
            opacity: 0.6,
            flexShrink: 0,
          }}
        >
          ▾
        </span>
      </div>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: compact ? undefined : 0,
            right: 0,
            background: c.card,
            border: `1px solid ${c.bdr}`,
            borderRadius: 12,
            zIndex: 70,
            padding: "12px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            minWidth: 290,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <button
              onClick={prevMonth}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: c.muted,
                fontSize: "1.1rem",
                padding: "4px 10px",
              }}
            >
              ‹
            </button>
            <span
              style={{
                fontSize: sz(sc, "1"),
                fontWeight: 500,
                color: c.text,
                fontFamily: "'Cormorant Garamond', Georgia, serif",
              }}
            >
              {MONTHS_FULL[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: c.muted,
                fontSize: "1.1rem",
                padding: "4px 10px",
              }}
            >
              ›
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7,1fr)",
              gap: 2,
              marginBottom: 4,
            }}
          >
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div
                key={i}
                style={{
                  textAlign: "center",
                  fontSize: sz(sc, "0.65"),
                  fontWeight: 600,
                  color: c.muted,
                  fontFamily: "-apple-system, sans-serif",
                  padding: "2px 0",
                }}
              >
                {d}
              </div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div
              key={wi}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7,1fr)",
                gap: 2,
              }}
            >
              {week.map((d, di) => {
                if (d === null) return <div key={di} />;
                const ds = toDateStr(viewYear, viewMonth, d),
                  isSel = ds === value,
                  isToday = ds === todayStr;
                return (
                  <div
                    key={di}
                    onClick={() => {
                      onChange(ds);
                      setOpen(false);
                    }}
                    style={{
                      textAlign: "center",
                      padding: "8px 0",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: sz(sc, "0.95"),
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontWeight: isSel ? 600 : 400,
                      color: isSel ? "#fff" : isToday ? c.accent : c.text,
                      background: isSel
                        ? c.accent
                        : isToday
                          ? c.calToday
                          : "transparent",
                    }}
                  >
                    {d}
                  </div>
                );
              })}
            </div>
          ))}
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <button
              onClick={() => {
                onChange(todayStr);
                setOpen(false);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: c.accent,
                fontSize: sz(sc, "0.78"),
                fontWeight: 600,
                fontFamily: "-apple-system, sans-serif",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── CustomSelect ────────────────────────────────────────────────────── */

function CustomSelect({
  value,
  options,
  onChange,
  placeholder,
  placeholderItalic,
  c,
  sc,
  showAll,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [open]);
  const hasValue = value !== "" && value !== null && value !== undefined;
  const displayText = (() => {
    if (!hasValue) return placeholder || "Select…";
    for (const opt of options) {
      if (typeof opt === "object" && opt.id === value) return opt.label;
    }
    return value;
  })();
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "0 14px",
          height: INPUT_H,
          border: `1px solid ${c.iBdr}`,
          borderRadius: 10,
          background: c.iBg,
          color: hasValue ? c.text : c.muted,
          fontSize: sz(sc, "1.1"),
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          boxSizing: "border-box",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          userSelect: "none",
          fontStyle: !hasValue && placeholderItalic ? "italic" : "normal",
        }}
      >
        <span>{displayText}</span>
        <span style={{ fontSize: "0.55rem", color: c.muted, marginLeft: 8 }}>
          {open ? "▲" : "▼"}
        </span>
      </div>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: c.card,
            border: `1px solid ${c.bdr}`,
            borderRadius: 10,
            maxHeight: showAll ? "none" : 220,
            overflowY: showAll ? "visible" : "auto",
            zIndex: 60,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          }}
        >
          {options.map((opt, idx) => {
            const optVal = typeof opt === "object" ? opt.id : opt,
              optLabel = typeof opt === "object" ? opt.label : opt,
              isLast = idx === options.length - 1;
            return (
              <div
                key={optVal}
                onClick={() => {
                  onChange(optVal);
                  setOpen(false);
                }}
                style={{
                  padding: "12px 14px",
                  fontSize: sz(sc, "1.05"),
                  color: optVal === value ? c.accent : c.text,
                  fontWeight: optVal === value ? 600 : 400,
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  cursor: "pointer",
                  borderBottom: isLast ? "none" : `1px solid ${c.bdr}`,
                  background: optVal === value ? c.aBg : "transparent",
                  borderRadius: isLast
                    ? "0 0 10px 10px"
                    : idx === 0
                      ? "10px 10px 0 0"
                      : 0,
                }}
              >
                {optLabel}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */

const VIEW_TITLES = {
  log: "Log Service",
  history: "Service History",
  report: "Annual Report",
  settings: "Settings",
};

export default function App({ userId }) {
  const [dark, setDark] = useState(false);
  const [view, setView] = useState("log");
  const [entries, setEntries] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const c = P(dark);
  const sc = (
    FONT_SIZES.find((f) => f.id === (settings.fontSize || "medium")) ||
    FONT_SIZES[1]
  ).scale;

  useEffect(() => {
    (async () => {
      const [ent, sett] = await Promise.all([
        loadEntries(userId),
        loadSettings(userId),
      ]);
      setEntries(ent);
      setSettings(sett);
      if (sett.darkMode) setDark(true);
      setLoading(false);
    })();
  }, [userId]);
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);
  const handleSaveEntry = useCallback(
    async (entry) => {
      const toSave = editingId ? { ...entry, id: editingId } : entry;
      const id = await dbSaveEntry(userId, toSave);
      if (editingId) {
        setEntries((prev) =>
          prev.map((e) => (e.id === editingId ? { ...entry, id } : e)),
        );
        setEditingId(null);
        showToast("Entry updated");
      } else {
        setEntries((prev) =>
          [{ ...entry, id }, ...prev].sort((a, b) =>
            b.date.localeCompare(a.date),
          ),
        );
        showToast("Logged");
      }
    },
    [userId, editingId, showToast],
  );
  const handleDelete = useCallback(
    async (id) => {
      await dbDeleteEntry(userId, id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      showToast("Deleted");
    },
    [userId, showToast],
  );
  const handleEdit = useCallback((entry) => {
    setEditingId(entry.id);
    setView("log");
  }, []);
  const handleSettings = useCallback(
    async (patch) => {
      const merged = { ...settings, ...patch };
      setSettings(merged);
      await saveSettings(userId, merged);
      if (patch.darkMode !== undefined) setDark(patch.darkMode);
    },
    [userId, settings],
  );
  const editEntry = editingId ? entries.find((e) => e.id === editingId) : null;

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: c.bg,
          color: c.muted,
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: sz(sc, "1.1"),
        }}
      >
        Loading…
      </div>
    );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: c.bg,
        color: c.text,
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        transition: "background 0.3s, color 0.3s",
        paddingBottom: 74,
        maxWidth: "100vw",
        overflowX: "hidden",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap"
        rel="stylesheet"
      />
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: c.accent,
            color: "#fff",
            padding: "8px 22px",
            borderRadius: 20,
            fontSize: sz(sc, "0.85"),
            fontWeight: 500,
            zIndex: 1000,
            fontFamily: "-apple-system, sans-serif",
            animation: "toastIn 0.25s ease",
          }}
        >
          {toast}
        </div>
      )}
      <div
        style={{
          padding: "env(safe-area-inset-top, 16px) 20px 0",
          paddingTop: "calc(env(safe-area-inset-top, 16px) + 12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h1
          style={{
            fontSize: sz(sc, "1.8"),
            fontWeight: 300,
            margin: 0,
            letterSpacing: "0.04em",
          }}
        >
          {VIEW_TITLES[view]}
        </h1>
        <button
          onClick={() => handleSettings({ darkMode: !dark })}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: c.muted,
            fontSize: sz(sc, "0.78"),
            padding: "6px 10px",
            borderRadius: 12,
            fontFamily: "-apple-system, sans-serif",
          }}
        >
          {dark ? "Light" : "Dark"}
        </button>
      </div>
      <div style={{ padding: "14px 18px", overflowX: "hidden" }}>
        {view === "log" && (
          <LogForm
            c={c}
            sc={sc}
            onSave={handleSaveEntry}
            editEntry={editEntry}
            onCancelEdit={() => setEditingId(null)}
          />
        )}
        {view === "history" && (
          <HistoryView
            c={c}
            sc={sc}
            entries={entries}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
        {view === "report" && <ReportView c={c} sc={sc} entries={entries} />}
        {view === "settings" && (
          <SettingsView
            c={c}
            sc={sc}
            settings={settings}
            onChange={handleSettings}
            entries={entries}
          />
        )}
      </div>
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: c.card,
          borderTop: `1px solid ${c.bdr}`,
          display: "flex",
          justifyContent: "space-around",
          padding: "8px 0 env(safe-area-inset-bottom, 8px)",
          zIndex: 100,
        }}
      >
        {[
          { id: "log", label: "Log Service", icon: "✦" },
          { id: "history", label: "History", icon: "☰" },
          { id: "report", label: "Annual Report", icon: "◈" },
          { id: "settings", label: "Settings", icon: "gear" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setView(t.id);
              if (t.id !== "log") setEditingId(null);
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              color: view === t.id ? c.accent : c.muted,
              transition: "color 0.2s",
              padding: "4px 8px",
              fontFamily: "-apple-system, sans-serif",
            }}
          >
            {t.icon === "gear" ? (
              <GearIcon color={view === t.id ? c.accent : c.muted} size={18} />
            ) : (
              <span style={{ fontSize: "1.1rem" }}>{t.icon}</span>
            )}
            <span
              style={{
                fontSize: "0.52rem",
                fontWeight: 500,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {t.label}
            </span>
          </button>
        ))}
      </nav>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}input,select,textarea{font-size:16px !important}body{margin:0;overscroll-behavior:none}`}</style>
    </div>
  );
}

/* ── LOG FORM ────────────────────────────────────────────────────────── */

/** Minimum page height to ensure the 6-item dropdown never gets clipped.
 *  The dropdown trigger is ~48px, the dropdown list is ~6×46 = 276px,
 *  plus the gap and some breathing room = ~380px. We use 420 to be safe. */
const FORM_MIN_H = 420;

function LogForm({ c, sc, onSave, editEntry, onCancelEdit }) {
  const today = new Date().toISOString().slice(0, 10);
  const blank = {
    category: "",
    date: today,
    communicants: "",
    under16: "",
    over16: "",
    baptisedUnder6: "",
    baptisedOver6: "",
    numberConfirmed: "",
    notes: "",
  };
  const [form, setForm] = useState(
    editEntry ? { ...blank, ...editEntry } : blank,
  );
  useEffect(() => {
    if (editEntry) setForm({ ...blank, ...editEntry });
  }, [editEntry]);
  const set = (field) => (val) => {
    const v = typeof val === "object" && val.target ? val.target.value : val;
    setForm((f) => ({ ...f, [field]: v }));
  };
  const setN = (field) => (val) => setForm((f) => ({ ...f, [field]: val }));
  const handleSubmit = () => {
    if (!form.date || !form.category) return;
    const entry = { ...form };
    for (const k of [
      "communicants",
      "under16",
      "over16",
      "baptisedUnder6",
      "baptisedOver6",
      "numberConfirmed",
    ])
      entry[k] = entry[k] === "" ? 0 : Number(entry[k]);
    onSave(entry);
    setForm({ ...blank, date: form.date });
  };
  const label = mkLabel(c, sc),
    gap = { marginBottom: 16 };
  const cat = form.category,
    hasCategory = cat !== "";
  const flexRow = { display: "flex", gap: 10, overflow: "hidden", ...gap };
  const flexChild = { flex: 1, minWidth: 0 };

  return (
    <div style={{ minHeight: FORM_MIN_H }}>
      {editEntry && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
            padding: "10px 14px",
            background: c.aBg,
            borderRadius: 10,
            border: `1px solid ${c.aBdr}`,
          }}
        >
          <span
            style={{
              fontSize: sz(sc, "0.85"),
              color: c.accent,
              fontFamily: "-apple-system, sans-serif",
            }}
          >
            Editing entry
          </span>
          <button
            onClick={() => {
              onCancelEdit();
              setForm(blank);
            }}
            style={{
              background: "none",
              border: "none",
              color: c.muted,
              fontSize: sz(sc, "0.78"),
              cursor: "pointer",
              fontFamily: "-apple-system, sans-serif",
            }}
          >
            Cancel
          </button>
        </div>
      )}
      <div style={gap}>
        <CustomSelect
          value={cat}
          options={CATEGORIES}
          onChange={set("category")}
          placeholder="Please select a service"
          placeholderItalic
          showAll
          c={c}
          sc={sc}
        />
      </div>
      {hasCategory && (
        <>
          {cat === "eucharist" && (
            <>
              <div style={gap}>
                <label style={label}>
                  Date
                  <Dot c={c} />
                </label>
                <DatePicker
                  value={form.date}
                  onChange={set("date")}
                  c={c}
                  sc={sc}
                />
              </div>
              <div style={gap}>
                <label style={label}>
                  Communicants
                  <Dot c={c} />
                </label>
                <NumInput
                  value={form.communicants}
                  onChange={setN("communicants")}
                  c={c}
                  sc={sc}
                />
              </div>
              <div style={{ ...flexRow, alignItems: "stretch" }}>
                <div
                  style={{
                    ...flexChild,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <label style={label}>Attendees: under 16</label>
                  <div style={{ marginTop: "auto" }}>
                    <NumInput
                      value={form.under16}
                      onChange={setN("under16")}
                      c={c}
                      sc={sc}
                    />
                  </div>
                </div>
                <div
                  style={{
                    ...flexChild,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <label style={label}>Attendees: 16 &amp; over</label>
                  <div style={{ marginTop: "auto" }}>
                    <NumInput
                      value={form.over16}
                      onChange={setN("over16")}
                      c={c}
                      sc={sc}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
          {cat === "reserved" && (
            <div style={{ ...flexRow, alignItems: "stretch" }}>
              <div
                style={{
                  ...flexChild,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <label style={label}>
                  Date
                  <Dot c={c} />
                </label>
                <div style={{ marginTop: "auto" }}>
                  <DatePicker
                    value={form.date}
                    onChange={set("date")}
                    c={c}
                    sc={sc}
                    compact
                  />
                </div>
              </div>
              <div
                style={{
                  ...flexChild,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <label style={label}>
                  Communicants
                  <Dot c={c} />
                </label>
                <div style={{ marginTop: "auto" }}>
                  <NumInput
                    value={form.communicants}
                    onChange={setN("communicants")}
                    c={c}
                    sc={sc}
                  />
                </div>
              </div>
            </div>
          )}
          {cat === "baptism" && (
            <>
              <div style={gap}>
                <label style={label}>
                  Date
                  <Dot c={c} />
                </label>
                <DatePicker
                  value={form.date}
                  onChange={set("date")}
                  c={c}
                  sc={sc}
                />
              </div>
              <div style={{ ...flexRow, alignItems: "stretch" }}>
                <div
                  style={{
                    ...flexChild,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <label style={label}>
                    Baptised: under 6<Dot c={c} />
                  </label>
                  <div style={{ marginTop: "auto" }}>
                    <NumInput
                      value={form.baptisedUnder6}
                      onChange={setN("baptisedUnder6")}
                      c={c}
                      sc={sc}
                    />
                  </div>
                </div>
                <div
                  style={{
                    ...flexChild,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <label style={label}>
                    Baptised: 6 and over
                    <Dot c={c} />
                  </label>
                  <div style={{ marginTop: "auto" }}>
                    <NumInput
                      value={form.baptisedOver6}
                      onChange={setN("baptisedOver6")}
                      c={c}
                      sc={sc}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
          {cat === "confirmation" && (
            <div style={{ ...flexRow, alignItems: "stretch" }}>
              <div
                style={{
                  ...flexChild,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <label style={label}>
                  Date
                  <Dot c={c} />
                </label>
                <div style={{ marginTop: "auto" }}>
                  <DatePicker
                    value={form.date}
                    onChange={set("date")}
                    c={c}
                    sc={sc}
                    compact
                  />
                </div>
              </div>
              <div
                style={{
                  ...flexChild,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <label style={label}>
                  Confirmands
                  <Dot c={c} />
                </label>
                <div style={{ marginTop: "auto" }}>
                  <NumInput
                    value={form.numberConfirmed}
                    onChange={setN("numberConfirmed")}
                    c={c}
                    sc={sc}
                  />
                </div>
              </div>
            </div>
          )}
          {(cat === "wedding" || cat === "funeral") && (
            <div style={gap}>
              <label style={label}>
                Date
                <Dot c={c} />
              </label>
              <DatePicker
                value={form.date}
                onChange={set("date")}
                c={c}
                sc={sc}
              />
            </div>
          )}
          <div style={gap}>
            <label style={label}>Notes</label>
            <textarea
              value={form.notes}
              onChange={set("notes")}
              rows={2}
              placeholder="Optional"
              style={{
                width: "100%",
                padding: "12px 14px",
                border: `1px solid ${c.iBdr}`,
                borderRadius: 10,
                background: c.iBg,
                color: c.text,
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: sz(sc, "1.1"),
                outline: "none",
                boxSizing: "border-box",
                resize: "vertical",
                minHeight: 56,
                fontStyle: form.notes ? "normal" : "italic",
              }}
            />
          </div>
          <button
            onClick={handleSubmit}
            style={{
              width: "100%",
              padding: "14px",
              background: c.accent,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontSize: sz(sc, "1.05"),
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              letterSpacing: "0.05em",
              marginTop: 2,
            }}
          >
            {editEntry ? "Update Entry" : `Log ${CAT_LABEL[cat]}`}
          </button>
        </>
      )}
    </div>
  );
}

/* ── HISTORY ─────────────────────────────────────────────────────────── */

function HistoryView({ c, sc, entries, onEdit, onDelete }) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const filtered = entries.filter((e) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return [CAT_LABEL[e.category], e.notes, fmtDate(e.date)].some((f) =>
      (f || "").toLowerCase().includes(s),
    );
  });
  const grouped = {};
  filtered.forEach((e) => {
    (grouped[e.date] ??= []).push(e);
  });
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const SummaryIcons = ({ entry }) => {
    if (entry.category === "eucharist") {
      const att = (entry.under16 || 0) + (entry.over16 || 0),
        comm = entry.communicants || 0;
      if (!att && !comm) return null;
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: sz(sc, "0.8"),
            color: c.muted,
            fontFamily: "-apple-system, sans-serif",
          }}
        >
          {att > 0 && (
            <>
              <PersonIcon color={c.muted} size={13} />
              <span>{att}</span>
            </>
          )}
          {att > 0 && comm > 0 && (
            <span style={{ color: c.bdr, margin: "0 2px" }}>│</span>
          )}
          {comm > 0 && (
            <>
              <WaferIcon color={c.muted} bgColor={c.card} size={13} />
              <span>{comm}</span>
            </>
          )}
        </span>
      );
    }
    if (entry.category === "reserved") {
      const comm = entry.communicants || 0;
      if (!comm) return null;
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: sz(sc, "0.8"),
            color: c.muted,
            fontFamily: "-apple-system, sans-serif",
          }}
        >
          <WaferIcon color={c.muted} bgColor={c.card} size={13} />
          <span>{comm}</span>
        </span>
      );
    }
    if (entry.category === "baptism") {
      const t = (entry.baptisedUnder6 || 0) + (entry.baptisedOver6 || 0);
      if (!t) return null;
      return (
        <span
          style={{
            fontSize: sz(sc, "0.8"),
            color: c.muted,
            fontFamily: "-apple-system, sans-serif",
          }}
        >
          {t}
        </span>
      );
    }
    if (entry.category === "confirmation") {
      if (!entry.numberConfirmed) return null;
      return (
        <span
          style={{
            fontSize: sz(sc, "0.8"),
            color: c.muted,
            fontFamily: "-apple-system, sans-serif",
          }}
        >
          {entry.numberConfirmed}
        </span>
      );
    }
    return null;
  };

  const detailLines = (entry) => {
    const l = [];
    if (entry.category === "eucharist") {
      l.push(`Communicants: ${entry.communicants || 0}`);
      l.push(`Under 16: ${entry.under16 || 0} · 16+: ${entry.over16 || 0}`);
    } else if (entry.category === "reserved") {
      l.push(`Communicants: ${entry.communicants || 0}`);
    } else if (entry.category === "baptism") {
      l.push(
        `Under 6: ${entry.baptisedUnder6 || 0} · 6 and over: ${entry.baptisedOver6 || 0}`,
      );
    } else if (entry.category === "confirmation") {
      l.push(`Confirmands: ${entry.numberConfirmed || 0}`);
    }
    if (entry.notes) l.push(`Notes: ${entry.notes}`);
    return l;
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Search entries…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: "0 14px",
          height: INPUT_H,
          border: `1px solid ${c.iBdr}`,
          borderRadius: 10,
          background: c.iBg,
          color: c.text,
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: sz(sc, "1.1"),
          outline: "none",
          boxSizing: "border-box",
          marginBottom: 16,
          fontStyle: search ? "normal" : "italic",
        }}
      />
      {entries.length === 0 && (
        <p
          style={{
            textAlign: "center",
            color: c.muted,
            fontSize: sz(sc, "1"),
            marginTop: 40,
          }}
        >
          No services logged yet.
        </p>
      )}
      {dates.map((date) => (
        <div key={date} style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: sz(sc, "0.72"),
              fontWeight: 600,
              color: c.muted,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 7,
              fontFamily: "-apple-system, sans-serif",
            }}
          >
            {fmtDate(date)} · {getDayName(date)}
          </div>
          {grouped[date].map((entry) => (
            <div
              key={entry.id}
              onClick={() =>
                setExpandedId(expandedId === entry.id ? null : entry.id)
              }
              style={{
                background: c.card,
                border: `1px solid ${c.bdr}`,
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 7,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 500, fontSize: sz(sc, "1.05") }}>
                  {CAT_LABEL[entry.category] || entry.category}
                </span>
                <SummaryIcons entry={entry} />
              </div>
              {expandedId === entry.id && (
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: `1px solid ${c.bdr}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: sz(sc, "0.82"),
                      color: c.muted,
                      fontFamily: "-apple-system, sans-serif",
                      lineHeight: 1.8,
                    }}
                  >
                    {detailLines(entry).map((l, i) => (
                      <div key={i}>{l}</div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onEdit(entry);
                      }}
                      style={{
                        flex: 1,
                        padding: "8px",
                        border: `1px solid ${c.aBdr}`,
                        borderRadius: 8,
                        background: c.aBg,
                        color: c.accent,
                        fontSize: sz(sc, "0.78"),
                        cursor: "pointer",
                        fontFamily: "-apple-system, sans-serif",
                      }}
                    >
                      Edit
                    </button>
                    {confirmDel === entry.id ? (
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onDelete(entry.id);
                          setConfirmDel(null);
                        }}
                        style={{
                          flex: 1,
                          padding: "8px",
                          border: `1px solid ${c.danger}`,
                          borderRadius: 8,
                          background: "rgba(192,57,43,0.1)",
                          color: c.danger,
                          fontSize: sz(sc, "0.78"),
                          cursor: "pointer",
                          fontFamily: "-apple-system, sans-serif",
                        }}
                      >
                        Confirm?
                      </button>
                    ) : (
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setConfirmDel(entry.id);
                        }}
                        style={{
                          flex: 1,
                          padding: "8px",
                          border: `1px solid ${c.bdr}`,
                          borderRadius: 8,
                          background: "transparent",
                          color: c.muted,
                          fontSize: sz(sc, "0.78"),
                          cursor: "pointer",
                          fontFamily: "-apple-system, sans-serif",
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
      {filtered.length === 0 && entries.length > 0 && (
        <p
          style={{
            textAlign: "center",
            color: c.muted,
            fontSize: sz(sc, "1"),
            marginTop: 20,
          }}
        >
          No entries match.
        </p>
      )}
    </div>
  );
}

/* ── REPORT ──────────────────────────────────────────────────────────── */

function ReportView({ c, sc, entries }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const r = generateReport(entries, year);
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
  const row = (label, value, note) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: "11px 0",
        borderBottom: `1px solid ${c.bdr}`,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: sz(sc, "0.95"), fontWeight: 500 }}>{label}</div>
        {note && (
          <div
            style={{
              fontSize: sz(sc, "0.7"),
              color: c.muted,
              fontFamily: "-apple-system, sans-serif",
              marginTop: 2,
            }}
          >
            {note}
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: sz(sc, "1.2"),
          fontWeight: 600,
          color: c.accent,
          minWidth: 50,
          textAlign: "right",
        }}
      >
        {value}
      </div>
    </div>
  );
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <span
          style={{
            fontSize: sz(sc, "0.72"),
            fontWeight: 600,
            color: c.muted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontFamily: "-apple-system, sans-serif",
          }}
        >
          Year ending
        </span>
        <CustomSelect
          value={String(year)}
          options={years}
          onChange={(v) => setYear(Number(v))}
          c={c}
          sc={sc}
        />
      </div>
      <div
        style={{
          background: c.card,
          border: `1px solid ${c.bdr}`,
          borderRadius: 12,
          padding: "4px 14px",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            padding: "11px 0",
            fontSize: sz(sc, "0.7"),
            color: c.muted,
            fontFamily: "-apple-system, sans-serif",
            borderBottom: `1px solid ${c.bdr}`,
          }}
        >
          Liturgical year: {r.startDate} – {r.endDate}
        </div>
        {row("Total entries logged", r.totalEntries)}
      </div>
      <div
        style={{
          fontSize: sz(sc, "0.72"),
          color: c.muted,
          fontFamily: "-apple-system, sans-serif",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          margin: "14px 0 6px",
        }}
      >
        Canon 50 Statistical Return Fields
      </div>
      <div
        style={{
          background: c.card,
          border: `1px solid ${c.bdr}`,
          borderRadius: 12,
          padding: "4px 14px",
        }}
      >
        {row("§3 · Baptised under 6", r.field3)}
        {row("§4 · Baptised over 6", r.field4)}
        {row("§6 · Confirmed", r.field6)}
        {row("§7 · Marriages", r.field7)}
        {row("§8 · Funerals", r.field8)}
        {row(
          "§9 · Celebrations of Holy Communion",
          r.field9,
          "Public, private & house",
        )}
        {row("§10 · Easter communicants", r.field10, r.easterDates)}
        {row("§11 · Communicants, Sunday before Advent", r.field11, r.snbaDate)}
        {row("§12 · Attendance, Sunday before Advent", r.field12, r.snbaDate)}
        {row("§13 · Total communions at celebrations", r.field13)}
        {row("§14 · Reserved Sacrament communions", r.field14)}
        <div
          style={{
            padding: "8px 0",
            fontSize: sz(sc, "0.7"),
            color: c.muted,
            fontFamily: "-apple-system, sans-serif",
            fontStyle: "italic",
          }}
        >
          §1–2 (congregation size, communicants' roll) and §5 (children admitted
          to communion) must be entered manually.
        </div>
      </div>
    </div>
  );
}

/* ── SETTINGS ────────────────────────────────────────────────────────── */

function SettingsView({ c, sc, settings, onChange, entries }) {
  const [exportMsg, setExportMsg] = useState("");
  const handleExportCSV = () => {
    if (entries.length === 0) {
      setExportMsg("No entries.");
      return;
    }
    const h = [
      "Category",
      "Date",
      "Communicants",
      "Under16",
      "Over16",
      "BaptisedUnder6",
      "BaptisedOver6",
      "Confirmands",
      "Notes",
    ];
    const rows = entries.map((e) => [
      CAT_LABEL[e.category] || e.category,
      e.date,
      e.communicants || 0,
      e.under16 || 0,
      e.over16 || 0,
      e.baptisedUnder6 || 0,
      e.baptisedOver6 || 0,
      e.numberConfirmed || 0,
      `"${(e.notes || "").replace(/"/g, '""')}"`,
    ]);
    const csv = [h.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sec-services-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMsg("CSV downloaded.");
    setTimeout(() => setExportMsg(""), 2000);
  };
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <label style={mkLabel(c, sc)}>Font size</label>
        <div style={{ display: "flex", gap: 6 }}>
          {FONT_SIZES.map((f) => {
            const active = (settings.fontSize || "medium") === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onChange({ fontSize: f.id })}
                style={{
                  flex: 1,
                  padding: "10px 4px",
                  background: active ? c.aBg : "transparent",
                  border: `1px solid ${active ? c.aBdr : c.iBdr}`,
                  borderRadius: 10,
                  cursor: "pointer",
                  color: active ? c.accent : c.muted,
                  fontSize: sz(sc, "0.78"),
                  fontWeight: active ? 600 : 400,
                  fontFamily: "-apple-system, sans-serif",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>
      <div
        style={{
          fontSize: sz(sc, "0.72"),
          color: c.muted,
          fontFamily: "-apple-system, sans-serif",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          margin: "24px 0 10px",
        }}
      >
        Data
      </div>
      <button
        onClick={handleExportCSV}
        style={{
          width: "100%",
          padding: "11px",
          marginBottom: 8,
          background: c.aBg,
          border: `1px solid ${c.aBdr}`,
          borderRadius: 10,
          color: c.accent,
          cursor: "pointer",
          fontSize: sz(sc, "0.88"),
          fontFamily: "-apple-system, sans-serif",
        }}
      >
        Export all entries as CSV
      </button>
      {exportMsg && (
        <p
          style={{
            fontSize: sz(sc, "0.82"),
            color: c.success,
            textAlign: "center",
            marginTop: 8,
            fontFamily: "-apple-system, sans-serif",
          }}
        >
          {exportMsg}
        </p>
      )}
      <div
        style={{
          fontSize: sz(sc, "0.72"),
          color: c.muted,
          fontFamily: "-apple-system, sans-serif",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          margin: "24px 0 10px",
        }}
      >
        Account
      </div>
      <button
        onClick={() => supabase.auth.signOut()}
        style={{
          width: "100%",
          padding: "11px",
          background: "none",
          border: `1px solid ${c.danger}`,
          borderRadius: 10,
          color: c.danger,
          cursor: "pointer",
          fontSize: sz(sc, "0.88"),
          fontFamily: "-apple-system, sans-serif",
        }}
      >
        Sign out
      </button>
    </div>
  );
}
