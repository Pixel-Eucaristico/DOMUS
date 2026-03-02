import React, { useState } from "react";
import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Mode = "day" | "month" | "year";

function todayISO(): string {
  return new Date().toISOString().split("T")[0]!;
}

function parseISO(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y: y!, m: m! - 1, d: d! };
}

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function formatDisplay(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Start of the 12-year block that contains the given year */
function blockStart(y: number): number {
  return Math.floor(y / 12) * 12;
}

interface DatePickerFieldProps {
  value: string; // YYYY-MM-DD
  onChange: (v: string) => void;
  theme: ThemeColors;
  label?: string;
}

export function DatePickerField({
  value,
  onChange,
  theme,
  label = "Data",
}: DatePickerFieldProps) {
  const safe = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : todayISO();
  const { y: initY, m: initM } = parseISO(safe);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("day");
  const [viewMonth, setViewMonth] = useState(initM);
  const [viewYear, setViewYear] = useState(initY);
  const [yearBlock, setYearBlock] = useState(() => blockStart(initY));

  const today = todayISO();

  // ── Open ──────────────────────────────────────────────────
  const openPicker = () => {
    const { y, m } = parseISO(safe);
    setViewYear(y);
    setViewMonth(m);
    setYearBlock(blockStart(y));
    setMode("day");
    setOpen(true);
  };

  // ── Navigation helpers ────────────────────────────────────
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };
  const prevYear  = () => setViewYear((y) => y - 1);
  const nextYear  = () => setViewYear((y) => y + 1);

  // ── Day grid ──────────────────────────────────────────────
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();
  const dayCells: (number | null)[] = Array(firstWeekday).fill(null);
  for (let d = 1; d <= daysInMonth; d++) dayCells.push(d);
  while (dayCells.length % 7 !== 0) dayCells.push(null);

  const handleDay = (day: number) => {
    onChange(toISO(viewYear, viewMonth, day));
    setOpen(false);
  };

  // ── Month grid ────────────────────────────────────────────
  const handleMonthSelect = (m: number) => {
    setViewMonth(m);
    setMode("day");
  };

  // ── Year grid (12-year blocks) ────────────────────────────
  const yearCells = Array.from({ length: 12 }, (_, i) => yearBlock + i);
  const handleYearSelect = (y: number) => {
    setViewYear(y);
    setYearBlock(blockStart(y));
    setMode("month");
  };

  // ── Selected values for highlighting ─────────────────────
  const { y: selY, m: selM, d: selD } = parseISO(safe);

  // ── Render ────────────────────────────────────────────────
  return (
    <>
      <Pressable
        style={[s.field, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        onPress={openPicker}
      >
        <View style={[s.iconBox, { backgroundColor: `${theme.primaryColor}15` }]}>
          <Feather name="calendar" size={18} color={theme.primaryColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.fieldLabel, { color: theme.secondaryText }]}>{label}</Text>
          <Text style={[s.fieldValue, { color: theme.textColor }]}>{formatDisplay(safe)}</Text>
        </View>
        <Feather name="chevron-down" size={16} color={theme.secondaryText} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.overlay} onPress={() => setOpen(false)}>
          <Pressable
            style={[s.calendar, { backgroundColor: theme.cardBackground }]}
            onPress={(e) => e.stopPropagation?.()}
          >

            {/* ─── DAY MODE ─── */}
            {mode === "day" && (
              <>
                <View style={s.calHeader}>
                  <Pressable onPress={prevMonth} hitSlop={12} style={s.navBtn}>
                    <Feather name="chevron-left" size={20} color={theme.textColor} />
                  </Pressable>

                  {/* Tappable month + year labels */}
                  <View style={s.headerLabels}>
                    <Pressable
                      onPress={() => setMode("month")}
                      style={[s.headerChip, { backgroundColor: `${theme.primaryColor}12` }]}
                    >
                      <Text style={[s.headerChipText, { color: theme.primaryColor }]}>
                        {MONTH_NAMES[viewMonth]}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setMode("year")}
                      style={[s.headerChip, { backgroundColor: `${theme.primaryColor}12` }]}
                    >
                      <Text style={[s.headerChipText, { color: theme.primaryColor }]}>
                        {viewYear}
                      </Text>
                    </Pressable>
                  </View>

                  <Pressable onPress={nextMonth} hitSlop={12} style={s.navBtn}>
                    <Feather name="chevron-right" size={20} color={theme.textColor} />
                  </Pressable>
                </View>

                <View style={s.dayHeaders}>
                  {DAY_NAMES.map((d) => (
                    <Text key={d} style={[s.dayHeader, { color: theme.secondaryText }]}>{d}</Text>
                  ))}
                </View>

                <View style={s.grid}>
                  {dayCells.map((day, idx) => {
                    if (!day) return <View key={`_${idx}`} style={s.cell} />;
                    const iso = toISO(viewYear, viewMonth, day);
                    const isSelected = iso === safe;
                    const isToday    = iso === today;
                    return (
                      <Pressable
                        key={iso}
                        style={[
                          s.cell,
                          isSelected && { backgroundColor: theme.primaryColor, borderRadius: 20 },
                          !isSelected && isToday && {
                            borderWidth: 1.5,
                            borderColor: theme.primaryColor,
                            borderRadius: 20,
                          },
                        ]}
                        onPress={() => handleDay(day)}
                      >
                        <Text style={[
                          s.dayText,
                          {
                            color: isSelected ? "#FFF" : isToday ? theme.primaryColor : theme.textColor,
                            fontFamily: isSelected ? "DMSans_700Bold" : "DMSans_400Regular",
                          },
                        ]}>
                          {day}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {/* ─── MONTH MODE ─── */}
            {mode === "month" && (
              <>
                <View style={s.calHeader}>
                  <Pressable onPress={prevYear} hitSlop={12} style={s.navBtn}>
                    <Feather name="chevron-left" size={20} color={theme.textColor} />
                  </Pressable>
                  <Pressable
                    onPress={() => setMode("year")}
                    style={[s.headerChip, { backgroundColor: `${theme.primaryColor}12` }]}
                  >
                    <Text style={[s.headerChipText, { color: theme.primaryColor }]}>{viewYear}</Text>
                  </Pressable>
                  <Pressable onPress={nextYear} hitSlop={12} style={s.navBtn}>
                    <Feather name="chevron-right" size={20} color={theme.textColor} />
                  </Pressable>
                </View>

                <View style={s.monthGrid}>
                  {MONTH_NAMES.map((name, m) => {
                    const isSelected = viewYear === selY && m === selM;
                    const isCurrentMonth =
                      viewYear === new Date().getFullYear() && m === new Date().getMonth();
                    return (
                      <Pressable
                        key={m}
                        style={[
                          s.monthCell,
                          isSelected && { backgroundColor: theme.primaryColor, borderRadius: 12 },
                          !isSelected && isCurrentMonth && {
                            borderWidth: 1.5,
                            borderColor: theme.primaryColor,
                            borderRadius: 12,
                          },
                        ]}
                        onPress={() => handleMonthSelect(m)}
                      >
                        <Text style={[
                          s.monthCellText,
                          { color: isSelected ? "#FFF" : theme.textColor },
                        ]}>
                          {name.substring(0, 3)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {/* ─── YEAR MODE ─── */}
            {mode === "year" && (
              <>
                <View style={s.calHeader}>
                  <Pressable
                    onPress={() => setYearBlock((b) => b - 12)}
                    hitSlop={12}
                    style={s.navBtn}
                  >
                    <Feather name="chevron-left" size={20} color={theme.textColor} />
                  </Pressable>
                  <Text style={[s.calMonthLabel, { color: theme.textColor }]}>
                    {yearBlock} – {yearBlock + 11}
                  </Text>
                  <Pressable
                    onPress={() => setYearBlock((b) => b + 12)}
                    hitSlop={12}
                    style={s.navBtn}
                  >
                    <Feather name="chevron-right" size={20} color={theme.textColor} />
                  </Pressable>
                </View>

                <View style={s.yearGrid}>
                  {yearCells.map((y) => {
                    const isSelected = y === selY;
                    const isCurrent  = y === new Date().getFullYear();
                    return (
                      <Pressable
                        key={y}
                        style={[
                          s.yearCell,
                          isSelected && { backgroundColor: theme.primaryColor, borderRadius: 12 },
                          !isSelected && isCurrent && {
                            borderWidth: 1.5,
                            borderColor: theme.primaryColor,
                            borderRadius: 12,
                          },
                        ]}
                        onPress={() => handleYearSelect(y)}
                      >
                        <Text style={[
                          s.yearCellText,
                          { color: isSelected ? "#FFF" : theme.textColor },
                        ]}>
                          {y}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {/* Back to day from month/year */}
            {mode !== "day" && (
              <Pressable
                style={s.backBtn}
                onPress={() => setMode(mode === "year" ? "month" : "day")}
              >
                <Feather name="arrow-left" size={14} color={theme.secondaryText} />
                <Text style={[s.backBtnText, { color: theme.secondaryText }]}>Voltar</Text>
              </Pressable>
            )}

          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const CELL = 40;

const s = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: { fontFamily: "DMSans_400Regular", fontSize: 11, marginBottom: 2 },
  fieldValue: { fontFamily: "DMSans_600SemiBold", fontSize: 15 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  calendar: { borderRadius: 24, padding: 20, width: "100%", maxWidth: 360 },

  // Header
  calHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  calMonthLabel: { fontFamily: "DMSans_700Bold", fontSize: 15 },
  headerLabels: { flexDirection: "row", gap: 6 },
  headerChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  headerChipText: { fontFamily: "DMSans_700Bold", fontSize: 15 },

  // Day mode
  dayHeaders: { flexDirection: "row", marginBottom: 6 },
  dayHeader: {
    width: CELL,
    textAlign: "center",
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: CELL, height: CELL, alignItems: "center", justifyContent: "center" },
  dayText: { fontSize: 14 },

  // Month mode
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  monthCell: {
    width: "30%",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  monthCellText: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },

  // Year mode
  yearGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  yearCell: {
    width: "22%",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  yearCellText: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },

  // Back button
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 14,
    alignSelf: "flex-start",
  },
  backBtnText: { fontFamily: "DMSans_400Regular", fontSize: 13 },
});
