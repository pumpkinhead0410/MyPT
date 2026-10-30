export type TabId = 1 | 2 | 3 | 4;

export type ScheduleProfileKey = 'weekday' | 'weekend';

export type WorkoutCoursePreset = 60 | 80 | 100 | 120;

export type RoutineBlockId = 'work' | 'transit' | 'workout' | 'commute' | 'dinner' | 'winddown' | 'sleep';

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type DinnerSetKey = 'A' | 'B' | 'C';

export type MilestoneMetricKey = 'weight' | 'waist' | 'fat' | 'smm';

export interface ScheduleConfig {
  readonly workStart: number;
  readonly leaveWork: number;
  readonly workoutStart: number;
  readonly workoutDur: number;
  readonly dinnerStart: number;
  readonly dinnerDur: number;
  readonly bedtime: number;
  readonly wakeTime: number;
  readonly selectedCourse: WorkoutCoursePreset;
}

export interface RoutineBlock {
  readonly id: RoutineBlockId;
  readonly title: string;
  readonly start: number;
  readonly dur: number;
  readonly color: string;
  readonly desc: string;
}

export interface WorkoutExercise {
  readonly id: string;
  readonly name: string;
  readonly sets: number;
  readonly target: string;
  readonly done: readonly boolean[];
  readonly weightKg: number;
  readonly reps: number;
}

export interface WorkoutDayPlan {
  readonly title: string;
  readonly focus: string;
  readonly cardioType: string;
  readonly cardioDesc: string;
  readonly cardioDone: boolean;
  readonly exercises: readonly WorkoutExercise[];
}

export interface StrengthHistoryEntry {
  readonly id: string;
  readonly date: string;
  readonly exerciseId: string;
  readonly exerciseName: string;
  readonly weightKg: number;
  readonly reps: number;
  readonly estimated1RM: number;
}

export interface InventoryItem {
  readonly id: string;
  readonly name: string;
  readonly count: number;
  readonly unit: string;
  readonly cal: number;
  readonly pro: number;
}

export interface IngredientMapping {
  readonly invId: string;
  readonly qty: number;
}

export interface DinnerSetSpec {
  readonly key: DinnerSetKey;
  readonly name: string;
  readonly summary: string;
  readonly cal: number;
  readonly pro: number;
  readonly ingredients: readonly IngredientMapping[];
}

export interface DietItem {
  readonly id: string;
  readonly time: string;
  readonly name: string;
  readonly cal: number;
  readonly pro: number;
  readonly checked: boolean;
  readonly isDinnerSlot?: boolean;
  readonly ingredients: readonly IngredientMapping[];
}

export interface MilestoneRow {
  readonly week: string;
  readonly focus: string;
  readonly baseTargetW: number;
  readonly actualW: number | null;
  readonly baseTargetWaist: number;
  readonly actualWaist: number | null;
  readonly baseTargetFat: number;
  readonly actualFat: number | null;
  readonly baseTargetSmm: number;
  readonly actualSmm: number | null;
}

export interface DailyLogEntry {
  readonly date: string;
  readonly workoutRatePct: number;
  readonly dietRatePct: number;
  readonly totalCal: number;
  readonly totalPro: number;
}

export interface MyPTStateV1 {
  readonly version: 1;
  readonly activeTabId: TabId;
  readonly activeScheduleProfile: ScheduleProfileKey;
  readonly schedules: {
    readonly weekday: ScheduleConfig;
    readonly weekend: ScheduleConfig;
  };
  readonly currentWorkoutDay: DayKey;
  readonly workoutsByDay: Record<DayKey, WorkoutDayPlan>;
  readonly strengthHistory: readonly StrengthHistoryEntry[];
  readonly inventory: readonly InventoryItem[];
  readonly dinnerSets: Record<DinnerSetKey, DinnerSetSpec>;
  readonly selectedDinnerSet: DinnerSetKey;
  readonly dietItems: readonly DietItem[];
  readonly milestones: readonly MilestoneRow[];
  readonly dailyLogs: readonly DailyLogEntry[];
  readonly ui: {
    readonly isStickySummary: boolean;
    readonly is13hBarOpen: boolean;
    readonly isInBodyMode: boolean;
  };
}

export type ImportResult =
  | { readonly kind: 'ok'; readonly state: MyPTStateV1 }
  | { readonly kind: 'error'; readonly message: string };
