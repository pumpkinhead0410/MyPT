import { createDefaultState } from '../data/defaults.ts';
import type {
  DailyLogEntry,
  DayKey,
  DietItem,
  DinnerSetKey,
  DinnerSetSpec,
  ImportResult,
  IngredientMapping,
  InventoryItem,
  MilestoneRow,
  MyPTStateV1,
  ScheduleConfig,
  ScheduleProfileKey,
  StrengthHistoryEntry,
  TabId,
  WorkoutCoursePreset,
  WorkoutDayPlan,
  WorkoutExercise,
} from '../types/domain';

const STORAGE_KEY = 'mypt_state_v1';

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function isNumber(val: unknown): val is number {
  return typeof val === 'number' && !Number.isNaN(val);
}

function isString(val: unknown): val is string {
  return typeof val === 'string';
}

function isBoolean(val: unknown): val is boolean {
  return typeof val === 'boolean';
}

function isTabId(val: unknown): val is TabId {
  return val === 1 || val === 2 || val === 3 || val === 4;
}

function isScheduleProfileKey(val: unknown): val is ScheduleProfileKey {
  return val === 'weekday' || val === 'weekend';
}

function isWorkoutCoursePreset(val: unknown): val is WorkoutCoursePreset {
  return val === 60 || val === 80 || val === 100 || val === 120;
}

function isDayKey(val: unknown): val is DayKey {
  return (
    val === 'mon' ||
    val === 'tue' ||
    val === 'wed' ||
    val === 'thu' ||
    val === 'fri' ||
    val === 'sat' ||
    val === 'sun'
  );
}

const ALL_DAY_KEYS: readonly DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function isDinnerSetKey(val: unknown): val is DinnerSetKey {
  return val === 'A' || val === 'B' || val === 'C';
}

const ALL_DINNER_SET_KEYS: readonly DinnerSetKey[] = ['A', 'B', 'C'];

function isScheduleConfig(val: unknown): val is ScheduleConfig {
  if (!isRecord(val)) return false;
  return (
    isNumber(val.workStart) &&
    isNumber(val.leaveWork) &&
    isNumber(val.workoutStart) &&
    isNumber(val.workoutDur) &&
    isNumber(val.dinnerStart) &&
    isNumber(val.dinnerDur) &&
    isNumber(val.bedtime) &&
    isNumber(val.wakeTime) &&
    isWorkoutCoursePreset(val.selectedCourse)
  );
}

function isWorkoutExercise(val: unknown): val is WorkoutExercise {
  if (!isRecord(val)) return false;
  if (
    !isString(val.id) ||
    !isString(val.name) ||
    !isNumber(val.sets) ||
    !isString(val.target) ||
    !isNumber(val.weightKg) ||
    !isNumber(val.reps) ||
    !Array.isArray(val.done)
  ) {
    return false;
  }
  return val.done.every((d) => typeof d === 'boolean');
}

function isWorkoutDayPlan(val: unknown): val is WorkoutDayPlan {
  if (!isRecord(val)) return false;
  if (
    !isString(val.title) ||
    !isString(val.focus) ||
    !isString(val.cardioType) ||
    !isString(val.cardioDesc) ||
    !isBoolean(val.cardioDone) ||
    !Array.isArray(val.exercises)
  ) {
    return false;
  }
  return val.exercises.every(isWorkoutExercise);
}

function isStrengthHistoryEntry(val: unknown): val is StrengthHistoryEntry {
  if (!isRecord(val)) return false;
  return (
    isString(val.id) &&
    isString(val.date) &&
    isString(val.exerciseId) &&
    isString(val.exerciseName) &&
    isNumber(val.weightKg) &&
    isNumber(val.reps) &&
    isNumber(val.estimated1RM)
  );
}

function isInventoryItem(val: unknown): val is InventoryItem {
  if (!isRecord(val)) return false;
  return (
    isString(val.id) &&
    isString(val.name) &&
    isNumber(val.count) &&
    isString(val.unit) &&
    isNumber(val.cal) &&
    isNumber(val.pro)
  );
}

function isIngredientMapping(val: unknown): val is IngredientMapping {
  if (!isRecord(val)) return false;
  return isString(val.invId) && isNumber(val.qty);
}

function isDinnerSetSpec(val: unknown): val is DinnerSetSpec {
  if (!isRecord(val)) return false;
  if (
    !isDinnerSetKey(val.key) ||
    !isString(val.name) ||
    !isString(val.summary) ||
    !isNumber(val.cal) ||
    !isNumber(val.pro) ||
    !Array.isArray(val.ingredients)
  ) {
    return false;
  }
  return val.ingredients.every(isIngredientMapping);
}

function isDietItem(val: unknown): val is DietItem {
  if (!isRecord(val)) return false;
  if (
    !isString(val.id) ||
    !isString(val.time) ||
    !isString(val.name) ||
    !isNumber(val.cal) ||
    !isNumber(val.pro) ||
    !isBoolean(val.checked) ||
    !Array.isArray(val.ingredients)
  ) {
    return false;
  }
  if (val.isDinnerSlot !== undefined && !isBoolean(val.isDinnerSlot)) {
    return false;
  }
  return val.ingredients.every(isIngredientMapping);
}

function isMilestoneRow(val: unknown): val is MilestoneRow {
  if (!isRecord(val)) return false;
  return (
    isString(val.week) &&
    isString(val.focus) &&
    isNumber(val.baseTargetW) &&
    (val.actualW === null || isNumber(val.actualW)) &&
    isNumber(val.baseTargetWaist) &&
    (val.actualWaist === null || isNumber(val.actualWaist)) &&
    isNumber(val.baseTargetFat) &&
    (val.actualFat === null || isNumber(val.actualFat)) &&
    isNumber(val.baseTargetSmm) &&
    (val.actualSmm === null || isNumber(val.actualSmm))
  );
}

function isDailyLogEntry(val: unknown): val is DailyLogEntry {
  if (!isRecord(val)) return false;
  return (
    isString(val.date) &&
    isNumber(val.workoutRatePct) &&
    isNumber(val.dietRatePct) &&
    isNumber(val.totalCal) &&
    isNumber(val.totalPro)
  );
}

function parseWorkoutsByDay(val: unknown): Record<DayKey, WorkoutDayPlan> | null {
  if (!isRecord(val)) return null;
  const { mon, tue, wed, thu, fri, sat, sun } = val;
  if (
    !isWorkoutDayPlan(mon) ||
    !isWorkoutDayPlan(tue) ||
    !isWorkoutDayPlan(wed) ||
    !isWorkoutDayPlan(thu) ||
    !isWorkoutDayPlan(fri) ||
    !isWorkoutDayPlan(sat) ||
    !isWorkoutDayPlan(sun)
  ) {
    return null;
  }
  return { mon, tue, wed, thu, fri, sat, sun };
}

function parseDinnerSets(val: unknown): Record<DinnerSetKey, DinnerSetSpec> | null {
  if (!isRecord(val)) return null;
  const { A, B, C } = val;
  if (!isDinnerSetSpec(A) || !isDinnerSetSpec(B) || !isDinnerSetSpec(C)) {
    return null;
  }
  return { A, B, C };
}

export function parseMyPTState(raw: unknown): MyPTStateV1 | null {
  if (!isRecord(raw)) return null;

  if (raw.version !== 1) return null;
  if (!isTabId(raw.activeTabId)) return null;
  if (!isScheduleProfileKey(raw.activeScheduleProfile)) return null;

  if (!isRecord(raw.schedules)) return null;
  if (!isScheduleConfig(raw.schedules.weekday)) return null;
  if (!isScheduleConfig(raw.schedules.weekend)) return null;

  if (!isDayKey(raw.currentWorkoutDay)) return null;

  const workoutsByDay = parseWorkoutsByDay(raw.workoutsByDay);
  if (!workoutsByDay) return null;

  if (!Array.isArray(raw.strengthHistory) || !raw.strengthHistory.every(isStrengthHistoryEntry)) {
    return null;
  }

  if (!Array.isArray(raw.inventory) || !raw.inventory.every(isInventoryItem)) {
    return null;
  }

  const dinnerSets = parseDinnerSets(raw.dinnerSets);
  if (!dinnerSets) return null;

  if (!isDinnerSetKey(raw.selectedDinnerSet)) return null;

  if (!Array.isArray(raw.dietItems) || !raw.dietItems.every(isDietItem)) {
    return null;
  }

  if (!Array.isArray(raw.milestones) || !raw.milestones.every(isMilestoneRow)) {
    return null;
  }

  if (!Array.isArray(raw.dailyLogs) || !raw.dailyLogs.every(isDailyLogEntry)) {
    return null;
  }

  if (!isRecord(raw.ui)) return null;
  if (
    !isBoolean(raw.ui.isStickySummary) ||
    !isBoolean(raw.ui.is13hBarOpen) ||
    !isBoolean(raw.ui.isInBodyMode)
  ) {
    return null;
  }

  return {
    version: 1,
    activeTabId: raw.activeTabId,
    activeScheduleProfile: raw.activeScheduleProfile,
    schedules: {
      weekday: raw.schedules.weekday,
      weekend: raw.schedules.weekend,
    },
    currentWorkoutDay: raw.currentWorkoutDay,
    workoutsByDay,
    strengthHistory: raw.strengthHistory,
    inventory: raw.inventory,
    dinnerSets,
    selectedDinnerSet: raw.selectedDinnerSet,
    dietItems: raw.dietItems,
    milestones: raw.milestones,
    dailyLogs: raw.dailyLogs,
    ui: {
      isStickySummary: raw.ui.isStickySummary,
      is13hBarOpen: raw.ui.is13hBarOpen,
      isInBodyMode: raw.ui.isInBodyMode,
    },
  };
}

export function loadMyPTState(): MyPTStateV1 {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      const validated = parseMyPTState(parsed);
      if (validated) {
        return validated;
      }
    }
  } catch {
    // Falls back to fresh default state if storage is unreadable or corrupted
  }

  const defaultState = createDefaultState();
  saveMyPTState(defaultState);
  return defaultState;
}

export function saveMyPTState(state: MyPTStateV1): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Handles storage quota or permission error silently without crashing UI
  }
}

export function exportMyPTStateJson(state: MyPTStateV1): string {
  return JSON.stringify(state, null, 2);
}

export function importMyPTStateJson(rawJson: string): ImportResult {
  try {
    const parsed: unknown = JSON.parse(rawJson);
    const validated = parseMyPTState(parsed);
    if (!validated) {
      return {
        kind: 'error',
        message: '유효하지 않은 MyPT 백업 데이터 형식입니다. version 1 스키마와 일치해야 합니다.',
      };
    }
    return {
      kind: 'ok',
      state: validated,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'JSON 파싱 오류';
    return {
      kind: 'error',
      message: `백업 파일을 읽을 수 없습니다: ${detail}`,
    };
  }
}
