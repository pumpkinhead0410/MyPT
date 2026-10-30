import { useId, useState } from 'react';
import {
  calculateEstimated1RM,
  formatLocalDate,
  getCourseVolumeGuide,
} from '../../domain/calculations';
import type {
  DayKey,
  MyPTStateV1,
  StrengthHistoryEntry,
  WorkoutExercise,
} from '../../types/domain';

interface Tab2WorkoutProps {
  readonly state: MyPTStateV1;
  readonly onUpdateState: (updater: (prev: MyPTStateV1) => MyPTStateV1) => void;
}

const DAY_CONFIGS: ReadonlyArray<{
  readonly key: DayKey;
  readonly label: string;
  readonly sub: string;
}> = [
  { key: 'mon', label: '월', sub: '하체' },
  { key: 'tue', label: '화', sub: '상체밀기' },
  { key: 'wed', label: '수', sub: '등/당기기' },
  { key: 'thu', label: '목', sub: '하체파워' },
  { key: 'fri', label: '금', sub: '상체볼륨' },
  { key: 'sat', label: '토', sub: '모빌리티' },
  { key: 'sun', label: '일', sub: '리커버리' },
];

const DAY_MAP_BY_INDEX: ReadonlyArray<DayKey> = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
];

export function Tab2Workout({ state, onUpdateState }: Tab2WorkoutProps) {
  const currentDay = state.currentWorkoutDay;
  const dayPlan = state.workoutsByDay[currentDay];
  const activeSched = state.schedules[state.activeScheduleProfile];
  const volumeGuide = getCourseVolumeGuide(activeSched.workoutDur);

  const [isEditingPlanInfo, setIsEditingPlanInfo] = useState(false);
  const [editedTitle, setEditedTitle] = useState(dayPlan.title);
  const [editedFocus, setEditedFocus] = useState(dayPlan.focus);
  const [editedCardioType, setEditedCardioType] = useState(dayPlan.cardioType);
  const [editedCardioDesc, setEditedCardioDesc] = useState(dayPlan.cardioDesc);

  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [isAddingExercise, setIsAddingExercise] = useState(false);

  const [newExName, setNewExName] = useState('');
  const [newExTarget, setNewExTarget] = useState('8-10회');
  const [newExSets, setNewExSets] = useState(volumeGuide.recommendedSetsPerExercise);
  const [newExWeight, setNewExWeight] = useState(40);
  const [newExReps, setNewExReps] = useState(10);

  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(() => {
    return dayPlan.exercises[0]?.id ?? state.strengthHistory[0]?.exerciseId ?? 'ex_mon_1';
  });

  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const [appliedBadgeExId, setAppliedBadgeExId] = useState<string | null>(null);

  const allAvailableExercises = (() => {
    const map = new Map<string, string>();
    for (const d of Object.values(state.workoutsByDay)) {
      for (const ex of d.exercises) {
        map.set(ex.id, ex.name);
      }
    }
    for (const h of state.strengthHistory) {
      if (!map.has(h.exerciseId)) {
        map.set(h.exerciseId, h.exerciseName);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  })();

  const handleSelectDay = (day: DayKey) => {
    onUpdateState((prev) => ({
      ...prev,
      currentWorkoutDay: day,
    }));
    const nextDayPlan = state.workoutsByDay[day];
    setEditedTitle(nextDayPlan.title);
    setEditedFocus(nextDayPlan.focus);
    setEditedCardioType(nextDayPlan.cardioType);
    setEditedCardioDesc(nextDayPlan.cardioDesc);
    setIsEditingPlanInfo(false);
    if (nextDayPlan.exercises[0]) {
      setSelectedExerciseId(nextDayPlan.exercises[0].id);
    }
  };

  const handleGoToToday = () => {
    const todayIndex = new Date().getDay();
    const todayKey = DAY_MAP_BY_INDEX[todayIndex] ?? 'mon';
    handleSelectDay(todayKey);
  };

  const handleToggleCardio = () => {
    onUpdateState((prev) => {
      const plan = prev.workoutsByDay[prev.currentWorkoutDay];
      return {
        ...prev,
        workoutsByDay: {
          ...prev.workoutsByDay,
          [prev.currentWorkoutDay]: {
            ...plan,
            cardioDone: !plan.cardioDone,
          },
        },
      };
    });
  };

  const handleSavePlanInfo = () => {
    onUpdateState((prev) => {
      const plan = prev.workoutsByDay[prev.currentWorkoutDay];
      return {
        ...prev,
        workoutsByDay: {
          ...prev.workoutsByDay,
          [prev.currentWorkoutDay]: {
            ...plan,
            title: editedTitle,
            focus: editedFocus,
            cardioType: editedCardioType,
            cardioDesc: editedCardioDesc,
          },
        },
      };
    });
    setIsEditingPlanInfo(false);
  };

  const handleApplyRecommendedSets = () => {
    const recSets = volumeGuide.recommendedSetsPerExercise;
    onUpdateState((prev) => {
      const plan = prev.workoutsByDay[prev.currentWorkoutDay];
      const nextExercises = plan.exercises.map((ex) => {
        const nextDone = Array.from({ length: recSets }, (_, idx) => ex.done[idx] ?? false);
        return {
          ...ex,
          sets: recSets,
          done: nextDone,
        };
      });
      return {
        ...prev,
        workoutsByDay: {
          ...prev.workoutsByDay,
          [prev.currentWorkoutDay]: {
            ...plan,
            exercises: nextExercises,
          },
        },
      };
    });
  };

  const handleResetDaySets = () => {
    onUpdateState((prev) => {
      const plan = prev.workoutsByDay[prev.currentWorkoutDay];
      const nextExercises = plan.exercises.map((ex) => ({
        ...ex,
        done: Array.from({ length: ex.sets }, () => false),
      }));
      return {
        ...prev,
        workoutsByDay: {
          ...prev.workoutsByDay,
          [prev.currentWorkoutDay]: {
            ...plan,
            exercises: nextExercises,
          },
        },
      };
    });
  };

  const handleCascadingSetClick = (exIdx: number, setIdx: number) => {
    onUpdateState((prev) => {
      const plan = prev.workoutsByDay[prev.currentWorkoutDay];
      const targetEx = plan.exercises[exIdx];
      if (!targetEx) return prev;

      const currentDone = targetEx.done[setIdx];
      const nextDone = [...targetEx.done];

      if (!currentDone) {
        for (let s = 0; s <= setIdx; s++) {
          nextDone[s] = true;
        }
      } else {
        for (let s = setIdx; s < nextDone.length; s++) {
          nextDone[s] = false;
        }
      }

      const nextExercises = plan.exercises.map((ex, idx) =>
        idx === exIdx ? { ...ex, done: nextDone } : ex
      );

      return {
        ...prev,
        workoutsByDay: {
          ...prev.workoutsByDay,
          [prev.currentWorkoutDay]: {
            ...plan,
            exercises: nextExercises,
          },
        },
      };
    });
  };

  const handleUpdateExerciseWeightReps = (
    exId: string,
    nextWeight: number,
    nextReps: number
  ) => {
    const validWeight = Math.max(0, Math.round(nextWeight * 10) / 10);
    const validReps = Math.max(1, Math.round(nextReps));

    onUpdateState((prev) => {
      const plan = prev.workoutsByDay[prev.currentWorkoutDay];
      const nextExercises = plan.exercises.map((ex) =>
        ex.id === exId ? { ...ex, weightKg: validWeight, reps: validReps } : ex
      );
      return {
        ...prev,
        workoutsByDay: {
          ...prev.workoutsByDay,
          [prev.currentWorkoutDay]: {
            ...plan,
            exercises: nextExercises,
          },
        },
      };
    });
  };

  const handleCommitStrengthRecord = (ex: WorkoutExercise) => {
    const todayStr = formatLocalDate();
    const estimated1RM = calculateEstimated1RM(ex.weightKg, ex.reps);

    onUpdateState((prev) => {
      const existingIdx = prev.strengthHistory.findIndex(
        (h) => h.exerciseId === ex.id && h.date === todayStr
      );

      let nextHistory: StrengthHistoryEntry[];
      if (existingIdx >= 0) {
        const existing = prev.strengthHistory[existingIdx];
        if (!existing) return prev;
        const updatedEntry: StrengthHistoryEntry = {
          ...existing,
          weightKg: ex.weightKg,
          reps: ex.reps,
          estimated1RM,
        };
        nextHistory = prev.strengthHistory.map((item, idx) =>
          idx === existingIdx ? updatedEntry : item
        );
      } else {
        const newEntry: StrengthHistoryEntry = {
          id: `sh_${Date.now()}`,
          date: todayStr,
          exerciseId: ex.id,
          exerciseName: ex.name,
          weightKg: ex.weightKg,
          reps: ex.reps,
          estimated1RM,
        };
        nextHistory = [...prev.strengthHistory, newEntry];
      }

      return {
        ...prev,
        strengthHistory: nextHistory,
      };
    });

    setSelectedExerciseId(ex.id);
    setAppliedBadgeExId(ex.id);
    setTimeout(() => setAppliedBadgeExId(null), 2500);
  };

  const handleMoveExercise = (idx: number, direction: 'up' | 'down') => {
    onUpdateState((prev) => {
      const plan = prev.workoutsByDay[prev.currentWorkoutDay];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= plan.exercises.length) return prev;

      const nextExercises = [...plan.exercises];
      const current = nextExercises[idx];
      const target = nextExercises[targetIdx];
      if (!current || !target) return prev;

      nextExercises[idx] = target;
      nextExercises[targetIdx] = current;

      return {
        ...prev,
        workoutsByDay: {
          ...prev.workoutsByDay,
          [prev.currentWorkoutDay]: {
            ...plan,
            exercises: nextExercises,
          },
        },
      };
    });
  };

  const handleDeleteExercise = (exId: string) => {
    onUpdateState((prev) => {
      const plan = prev.workoutsByDay[prev.currentWorkoutDay];
      return {
        ...prev,
        workoutsByDay: {
          ...prev.workoutsByDay,
          [prev.currentWorkoutDay]: {
            ...plan,
            exercises: plan.exercises.filter((ex) => ex.id !== exId),
          },
        },
      };
    });
  };

  const handleSaveEditedExercise = (
    exId: string,
    name: string,
    target: string,
    sets: number
  ) => {
    onUpdateState((prev) => {
      const plan = prev.workoutsByDay[prev.currentWorkoutDay];
      const nextExercises = plan.exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        const nextDone = Array.from({ length: sets }, (_, i) => ex.done[i] ?? false);
        return {
          ...ex,
          name,
          target,
          sets,
          done: nextDone,
        };
      });
      return {
        ...prev,
        workoutsByDay: {
          ...prev.workoutsByDay,
          [prev.currentWorkoutDay]: {
            ...plan,
            exercises: nextExercises,
          },
        },
      };
    });
    setEditingExerciseId(null);
  };

  const handleAddNewExercise = () => {
    if (!newExName.trim()) return;
    const newId = `ex_${currentDay}_${Date.now()}`;
    const newEx: WorkoutExercise = {
      id: newId,
      name: newExName.trim(),
      sets: Math.max(1, newExSets),
      target: newExTarget.trim() || '8-10회',
      done: Array.from({ length: Math.max(1, newExSets) }, () => false),
      weightKg: Math.max(0, newExWeight),
      reps: Math.max(1, newExReps),
    };

    onUpdateState((prev) => {
      const plan = prev.workoutsByDay[prev.currentWorkoutDay];
      return {
        ...prev,
        workoutsByDay: {
          ...prev.workoutsByDay,
          [prev.currentWorkoutDay]: {
            ...plan,
            exercises: [...plan.exercises, newEx],
          },
        },
      };
    });

    setNewExName('');
    setIsAddingExercise(false);
    setSelectedExerciseId(newId);
  };

  const handleDeleteHistoryEntry = (id: string) => {
    onUpdateState((prev) => ({
      ...prev,
      strengthHistory: prev.strengthHistory.filter((h) => h.id !== id),
    }));
  };

  let totalSets = 0;
  let doneSets = 0;
  for (const ex of dayPlan.exercises) {
    totalSets += ex.sets;
    doneSets += ex.done.filter(Boolean).length;
  }

  const selectedExerciseHistory = state.strengthHistory
    .filter((h) => h.exerciseId === selectedExerciseId)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  const selectedExerciseInfo = allAvailableExercises.find((ex) => ex.id === selectedExerciseId);

  const chartPoints = selectedExerciseHistory;
  const hasHistory = chartPoints.length > 0;

  const allKgValues = hasHistory
    ? chartPoints.flatMap((h) => [h.weightKg, h.estimated1RM])
    : [0, 100];
  const rawMin = Math.min(...allKgValues);
  const rawMax = Math.max(...allKgValues);
  const yMin = Math.max(0, Math.floor((rawMin - 5) / 5) * 5);
  const yMax = Math.ceil((rawMax + 10) / 5) * 5;
  const yRange = Math.max(10, yMax - yMin);

  const chartSvgLeft = 55;
  const chartSvgRight = 35;
  const chartSvgTop = 25;
  const chartSvgBottom = 35;
  const chartWidth = 760 - chartSvgLeft - chartSvgRight;
  const chartHeight = 180 - chartSvgTop - chartSvgBottom;

  const computedPoints = chartPoints.map((h, idx) => {
    const x =
      chartPoints.length === 1
        ? chartSvgLeft + chartWidth / 2
        : chartSvgLeft + (idx / (chartPoints.length - 1)) * chartWidth;
    const yWeight =
      chartSvgTop + chartHeight - ((h.weightKg - yMin) / yRange) * chartHeight;
    const y1RM =
      chartSvgTop + chartHeight - ((h.estimated1RM - yMin) / yRange) * chartHeight;
    return {
      entry: h,
      x,
      yWeight,
      y1RM,
    };
  });

  const weightPolylinePoints = computedPoints
    .map((p) => `${p.x.toFixed(1)},${p.yWeight.toFixed(1)}`)
    .join(' ');
  const rmPolylinePoints = computedPoints
    .map((p) => `${p.x.toFixed(1)},${p.y1RM.toFixed(1)}`)
    .join(' ');

  const gridLineCount = 4;
  const gridLines = Array.from({ length: gridLineCount }).map((_, idx) => {
    const fraction = idx / (gridLineCount - 1);
    const value = Math.round(yMin + (1 - fraction) * yRange);
    const y = chartSvgTop + fraction * chartHeight;
    return { y, value };
  });

  const firstEntry = chartPoints[0];
  const lastEntry = chartPoints[chartPoints.length - 1];
  const delta1RM =
    firstEntry && lastEntry
      ? Math.round((lastEntry.estimated1RM - firstEntry.estimated1RM) * 10) / 10
      : 0;

  return (
    <div className="space-y-6">
      {/* 7-Day Switcher & Quick Navigation */}
      <div className="bg-apple-surface rounded-2xl p-5 sm:p-6 border border-apple-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            운동 프로그램 &amp; 대표 중량
          </h2>
          <p className="text-xs sm:text-sm text-apple-label mt-0.5">
            요일별 분할 루틴 및 종목별 대표 중량·추정 1RM 추이를 관리합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Day Buttons */}
          <div className="flex items-center bg-[#1c1c1e] p-1 rounded-xl border border-apple-elevated/60 overflow-x-auto no-scrollbar">
            {DAY_CONFIGS.map((d) => {
              const isSelected = currentDay === d.key;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => handleSelectDay(d.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex flex-col items-center ${
                    isSelected
                      ? 'bg-apple-elevated text-white shadow-sm font-bold'
                      : 'text-apple-label hover:text-white'
                  }`}
                >
                  <span>{d.label}</span>
                  <span className="text-[10px] font-normal opacity-75">{d.sub}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleGoToToday}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-apple-card hover:bg-apple-elevated text-xs font-semibold text-apple-cyan border border-apple-cyan/30 transition"
          >
            <span className="w-2 h-2 rounded-full bg-apple-cyan animate-pulse" />
            오늘 요일 이동
          </button>
        </div>
      </div>

      {/* Tab 1 Preset Volume Integration Banner */}
      <div className="bg-gradient-to-r from-[#1c1c1e] to-[#252528] rounded-2xl p-4 sm:p-5 border border-apple-elevated/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-apple-green/10 border border-apple-green/30 flex items-center justify-center text-apple-green font-bold text-sm">
            {activeSched.workoutDur}m
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-apple-green uppercase tracking-wider">
                Tab 1 스케줄 코스 연동
              </span>
              <span className="text-xs text-apple-label">|</span>
              <span className="text-xs font-semibold text-white">{volumeGuide.label}</span>
            </div>
            <p className="text-xs sm:text-sm text-apple-subhead mt-0.5">
              권장 세트: 종목당 <strong>{volumeGuide.recommendedSetsPerExercise}세트</strong> ·
              유산소 <strong>{volumeGuide.cardioMinutes}분</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleApplyRecommendedSets}
          className="px-3.5 py-2 rounded-xl bg-apple-card hover:bg-apple-elevated text-xs font-semibold text-white border border-apple-elevated transition self-stretch md:self-auto text-center"
        >
          권장 세트 수 ({volumeGuide.recommendedSetsPerExercise}세트) 일괄 적용
        </button>
      </div>

      {/* Active Day Routine Header & Protocol */}
      <div className="bg-apple-surface rounded-2xl p-5 sm:p-6 border border-apple-card space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1c1c1e] pb-4">
          <div>
            <span className="text-xs font-bold text-apple-accent uppercase tracking-wider">
              {currentDay.toUpperCase()} PROTOCOL
            </span>
            <h3 className="text-base sm:text-xl font-bold text-white mt-0.5">{dayPlan.title}</h3>
            <p className="text-xs sm:text-sm text-apple-green mt-1">{dayPlan.focus}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-lg bg-apple-card text-apple-label border border-apple-elevated/40">
              {doneSets} / {totalSets} 세트 완료
            </span>
            <button
              type="button"
              onClick={() => {
                if (!isEditingPlanInfo) {
                  setEditedTitle(dayPlan.title);
                  setEditedFocus(dayPlan.focus);
                  setEditedCardioType(dayPlan.cardioType);
                  setEditedCardioDesc(dayPlan.cardioDesc);
                }
                setIsEditingPlanInfo(!isEditingPlanInfo);
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-apple-card hover:bg-apple-elevated text-apple-label hover:text-white transition font-medium"
            >
              {isEditingPlanInfo ? '수정 취소' : '루틴 정보 편집'}
            </button>
            <button
              type="button"
              onClick={handleResetDaySets}
              className="text-xs px-3 py-1.5 rounded-lg bg-apple-card hover:bg-apple-elevated text-apple-label hover:text-white transition font-medium"
            >
              세트 초기화
            </button>
          </div>
        </div>

        {/* Inline Day Plan Metadata Edit Form */}
        {isEditingPlanInfo && (
          <div className="p-4 bg-apple-card rounded-xl border border-apple-elevated/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-apple-label block mb-1">루틴 제목</label>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-apple-surface rounded-lg text-sm text-white border border-apple-elevated focus:outline-none focus:border-apple-cyan"
                />
              </div>
              <div>
                <label className="text-xs text-apple-label block mb-1">핵심 타깃 / 포커스</label>
                <input
                  type="text"
                  value={editedFocus}
                  onChange={(e) => setEditedFocus(e.target.value)}
                  className="w-full px-3 py-2 bg-apple-surface rounded-lg text-sm text-white border border-apple-elevated focus:outline-none focus:border-apple-cyan"
                />
              </div>
              <div>
                <label className="text-xs text-apple-label block mb-1">유산소 종목</label>
                <input
                  type="text"
                  value={editedCardioType}
                  onChange={(e) => setEditedCardioType(e.target.value)}
                  className="w-full px-3 py-2 bg-apple-surface rounded-lg text-sm text-white border border-apple-elevated focus:outline-none focus:border-apple-cyan"
                />
              </div>
              <div>
                <label className="text-xs text-apple-label block mb-1">유산소 세부 수칙</label>
                <input
                  type="text"
                  value={editedCardioDesc}
                  onChange={(e) => setEditedCardioDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-apple-surface rounded-lg text-sm text-white border border-apple-elevated focus:outline-none focus:border-apple-cyan"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingPlanInfo(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-apple-label hover:text-white"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSavePlanInfo}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-apple-green text-black"
              >
                저장하기
              </button>
            </div>
          </div>
        )}

        {/* Cardio Protocol Card */}
        <div className="bg-apple-card p-4 sm:p-5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-apple-elevated/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-apple-cyan uppercase tracking-wider">
                유산소 프로토콜
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-apple-surface text-apple-label">
                {dayPlan.cardioType}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-apple-subhead leading-relaxed">
              {dayPlan.cardioDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleCardio}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 flex-shrink-0 ${
              dayPlan.cardioDone
                ? 'bg-apple-green text-black'
                : 'bg-apple-elevated hover:bg-apple-card-hover text-apple-cyan border border-apple-cyan/30'
            }`}
          >
            <span>{dayPlan.cardioDone ? '✓' : '○'}</span>
            <span>{dayPlan.cardioDone ? '유산소 완료됨 ✓' : '유산소 완료 체크'}</span>
          </button>
        </div>

        {/* Exercise List & Actions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white tracking-tight">
              웨이트 종목 리스트 ({dayPlan.exercises.length}개)
            </h4>
            <button
              type="button"
              onClick={() => setIsAddingExercise(!isAddingExercise)}
              className="px-3 py-1.5 rounded-lg bg-apple-card hover:bg-apple-elevated text-xs font-semibold text-apple-cyan border border-apple-cyan/30 transition flex items-center gap-1"
            >
              <span>+</span>
              <span>종목 추가</span>
            </button>
          </div>

          {/* Add Exercise Form */}
          {isAddingExercise && (
            <div className="p-4 bg-apple-card rounded-xl border border-apple-cyan/40 space-y-3">
              <span className="text-xs font-bold text-apple-cyan">새 운동 종목 등록</span>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs text-apple-label block mb-1">종목명</label>
                  <input
                    type="text"
                    placeholder="예: 인클라인 덤벨 벤치프레스"
                    value={newExName}
                    onChange={(e) => setNewExName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-apple-surface rounded-lg text-xs text-white border border-apple-elevated focus:outline-none focus:border-apple-cyan"
                  />
                </div>
                <div>
                  <label className="text-xs text-apple-label block mb-1">목표 횟수/RPE</label>
                  <input
                    type="text"
                    value={newExTarget}
                    onChange={(e) => setNewExTarget(e.target.value)}
                    className="w-full px-3 py-1.5 bg-apple-surface rounded-lg text-xs text-white border border-apple-elevated focus:outline-none focus:border-apple-cyan"
                  />
                </div>
                <div>
                  <label className="text-xs text-apple-label block mb-1">세트 수</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newExSets}
                    onChange={(e) => setNewExSets(Number.parseInt(e.target.value, 10) || 4)}
                    className="w-full px-3 py-1.5 bg-apple-surface rounded-lg text-xs text-white border border-apple-elevated focus:outline-none focus:border-apple-cyan"
                  />
                </div>
                <div>
                  <label className="text-xs text-apple-label block mb-1">대표 중량(kg)</label>
                  <input
                    type="number"
                    step={0.5}
                    value={newExWeight}
                    onChange={(e) => setNewExWeight(Number.parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-apple-surface rounded-lg text-xs text-white border border-apple-elevated focus:outline-none focus:border-apple-cyan"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingExercise(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-apple-label hover:text-white"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleAddNewExercise}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-apple-cyan text-black"
                >
                  추가하기
                </button>
              </div>
            </div>
          )}

          {/* Exercise Cards */}
          <div className="space-y-3">
            {dayPlan.exercises.map((ex, exIdx) => {
              const e1rm = calculateEstimated1RM(ex.weightKg, ex.reps);
              const isSelectedInChart = selectedExerciseId === ex.id;
              const isEditingThis = editingExerciseId === ex.id;
              const isAppliedJustNow = appliedBadgeExId === ex.id;

              return (
                <div
                  key={ex.id}
                  className={`bg-apple-card border rounded-2xl p-4 sm:p-5 transition space-y-3.5 ${
                    isSelectedInChart
                      ? 'border-apple-cyan shadow-lg'
                      : 'border-apple-elevated/60 hover:border-apple-elevated'
                  }`}
                >
                  {/* Top Bar: Name, Target, Estimated 1RM, Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-bold text-white">{ex.name}</h4>
                      <span className="text-xs text-apple-label">({ex.target})</span>
                      <span className="text-xs font-semibold text-apple-cyan bg-apple-cyan/10 px-2.5 py-0.5 rounded-md">
                        추정 1RM {e1rm}kg
                      </span>
                      {isAppliedJustNow && (
                        <span className="text-xs font-bold text-apple-green bg-apple-green/15 px-2 py-0.5 rounded animate-pulse">
                          기록 반영됨 ✓
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 self-end sm:self-auto">
                      <button
                        type="button"
                        disabled={exIdx === 0}
                        onClick={() => handleMoveExercise(exIdx, 'up')}
                        className="w-7 h-7 rounded-lg bg-apple-surface hover:bg-apple-elevated disabled:opacity-30 disabled:hover:bg-apple-surface text-apple-label hover:text-white text-xs flex items-center justify-center transition"
                        title="위로 이동"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={exIdx === dayPlan.exercises.length - 1}
                        onClick={() => handleMoveExercise(exIdx, 'down')}
                        className="w-7 h-7 rounded-lg bg-apple-surface hover:bg-apple-elevated disabled:opacity-30 disabled:hover:bg-apple-surface text-apple-label hover:text-white text-xs flex items-center justify-center transition"
                        title="아래로 이동"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingExerciseId(isEditingThis ? null : ex.id)}
                        className="px-2.5 py-1 rounded-lg bg-apple-surface hover:bg-apple-elevated text-apple-label hover:text-white text-xs font-medium transition"
                      >
                        {isEditingThis ? '닫기' : '수정'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteExercise(ex.id)}
                        className="px-2.5 py-1 rounded-lg bg-apple-surface hover:bg-apple-red/20 text-apple-label hover:text-apple-red text-xs font-medium transition"
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  {/* Inline Edit Form for Exercise */}
                  {isEditingThis && (
                    <ExerciseInlineEditForm
                      ex={ex}
                      onSave={(name, target, sets) =>
                        handleSaveEditedExercise(ex.id, name, target, sets)
                      }
                      onCancel={() => setEditingExerciseId(null)}
                    />
                  )}

                  {/* Cascading Set Check Buttons */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-apple-subhead block">
                      세트 완료 체크 ({ex.done.filter(Boolean).length}/{ex.sets})
                    </span>
                    <div className="flex gap-2 flex-wrap">
                      {ex.done.map((done, sIdx) => (
                        <button
                          key={`set-btn-${ex.id}-${sIdx}`}
                          type="button"
                          onClick={() => handleCascadingSetClick(exIdx, sIdx)}
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center ${
                            done
                              ? 'bg-apple-green text-black shadow-md'
                              : 'bg-apple-surface text-apple-label hover:text-white hover:bg-apple-elevated'
                          }`}
                        >
                          {done ? '✓' : sIdx + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 1-Line Representative Weight (kg) × Reps (회) Update Control */}
                  <div className="pt-2 border-t border-apple-surface flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-[#19191b] p-3 rounded-xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-apple-label">대표 중량:</span>

                      {/* Weight Stepper */}
                      <div className="inline-flex items-center gap-1 bg-apple-surface rounded-lg p-1 border border-apple-elevated">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateExerciseWeightReps(ex.id, ex.weightKg - 2.5, ex.reps)
                          }
                          className="w-6 h-6 rounded bg-apple-card hover:bg-apple-elevated text-xs font-bold text-apple-label hover:text-white flex items-center justify-center"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          step={2.5}
                          value={ex.weightKg}
                          onChange={(e) =>
                            handleUpdateExerciseWeightReps(
                              ex.id,
                              Number.parseFloat(e.target.value) || 0,
                              ex.reps
                            )
                          }
                          className="w-14 text-center bg-transparent text-xs font-bold text-white focus:outline-none"
                        />
                        <span className="text-[11px] text-apple-label mr-1">kg</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateExerciseWeightReps(ex.id, ex.weightKg + 2.5, ex.reps)
                          }
                          className="w-6 h-6 rounded bg-apple-card hover:bg-apple-elevated text-xs font-bold text-apple-label hover:text-white flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>

                      <span className="text-xs font-bold text-apple-subhead">×</span>

                      {/* Reps Stepper */}
                      <div className="inline-flex items-center gap-1 bg-apple-surface rounded-lg p-1 border border-apple-elevated">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateExerciseWeightReps(ex.id, ex.weightKg, ex.reps - 1)
                          }
                          className="w-6 h-6 rounded bg-apple-card hover:bg-apple-elevated text-xs font-bold text-apple-label hover:text-white flex items-center justify-center"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={ex.reps}
                          onChange={(e) =>
                            handleUpdateExerciseWeightReps(
                              ex.id,
                              ex.weightKg,
                              Number.parseInt(e.target.value, 10) || 1
                            )
                          }
                          className="w-10 text-center bg-transparent text-xs font-bold text-white focus:outline-none"
                        />
                        <span className="text-[11px] text-apple-label mr-1">회</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateExerciseWeightReps(ex.id, ex.weightKg, ex.reps + 1)
                          }
                          className="w-6 h-6 rounded bg-apple-card hover:bg-apple-elevated text-xs font-bold text-apple-label hover:text-white flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedExerciseId(ex.id)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition ${
                          isSelectedInChart
                            ? 'bg-apple-cyan/15 text-apple-cyan border-apple-cyan/40 font-semibold'
                            : 'bg-apple-surface hover:bg-apple-elevated text-apple-label border-apple-elevated'
                        }`}
                      >
                        차트 보기
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCommitStrengthRecord(ex)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-apple-green text-black hover:bg-apple-green/90 transition shadow"
                      >
                        1RM 기록 반영
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom: Exercise Weight & Estimated 1RM Trajectory SVG Chart */}
      <div className="bg-apple-surface rounded-2xl p-5 sm:p-6 border border-apple-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1c1c1e] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-apple-cyan" />
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                종목별 중량 &amp; 추정 1RM 성장 추이
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-apple-label mt-0.5">
              실제 수행한 대표 중량(점선)과 환산된 추정 1RM(실선)의 누적 궤적입니다.
            </p>
          </div>

          {/* Exercise Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-apple-label whitespace-nowrap">종목 선택:</label>
            <select
              value={selectedExerciseId}
              onChange={(e) => setSelectedExerciseId(e.target.value)}
              className="bg-apple-card border border-apple-elevated rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-apple-cyan"
            >
              {allAvailableExercises.map((ex) => (
                <option key={`opt-${ex.id}`} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Exercise Summary Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-apple-card p-4 rounded-xl border border-apple-elevated/40">
          <div>
            <span className="text-[11px] text-apple-label block">선택 종목</span>
            <span className="text-xs sm:text-sm font-bold text-white truncate block mt-0.5">
              {selectedExerciseInfo?.name ?? '선택 없음'}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-apple-label block">시작 1RM</span>
            <span className="text-xs sm:text-sm font-bold text-white mt-0.5 block">
              {firstEntry ? `${firstEntry.estimated1RM}kg` : '-'}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-apple-label block">현재 1RM</span>
            <span className="text-xs sm:text-sm font-bold text-apple-cyan mt-0.5 block">
              {lastEntry ? `${lastEntry.estimated1RM}kg` : '-'}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-apple-label block">누적 증량 변화</span>
            <span
              className={`text-xs sm:text-sm font-bold mt-0.5 block ${
                delta1RM > 0
                  ? 'text-apple-green'
                  : delta1RM < 0
                  ? 'text-apple-red'
                  : 'text-apple-label'
              }`}
            >
              {firstEntry && lastEntry ? `${delta1RM >= 0 ? '+' : ''}${delta1RM}kg` : '-'}
            </span>
          </div>
        </div>

        {/* Trajectory SVG Chart Canvas */}
        <div className="relative w-full bg-apple-card/60 rounded-xl p-3 border border-apple-elevated/40">
          {hasHistory ? (
            <svg
              viewBox="0 0 760 180"
              className="w-full h-auto select-none overflow-visible"
              onMouseLeave={() => setHoveredPointId(null)}
            >
              <defs>
                <linearGradient id="areaGradient1RM" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#64d2ff" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#64d2ff" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines & Y Labels */}
              {gridLines.map((gl, gIdx) => (
                <g key={`grid-${gIdx}`}>
                  <line
                    x1={chartSvgLeft}
                    y1={gl.y}
                    x2={chartSvgLeft + chartWidth}
                    y2={gl.y}
                    stroke="#2c2c2e"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={chartSvgLeft - 8}
                    y={gl.y + 3.5}
                    fill="#86868b"
                    fontSize={10}
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    {gl.value}kg
                  </text>
                </g>
              ))}

              {/* Shaded Area under 1RM Curve (when >= 2 points) */}
              {computedPoints.length > 1 && (
                <polygon
                  points={`${computedPoints[0]?.x},${chartSvgTop + chartHeight} ${rmPolylinePoints} ${
                    computedPoints[computedPoints.length - 1]?.x
                  },${chartSvgTop + chartHeight}`}
                  fill="url(#areaGradient1RM)"
                />
              )}

              {/* Dashed Weight Line */}
              {computedPoints.length > 1 && (
                <polyline
                  points={weightPolylinePoints}
                  fill="none"
                  stroke="#30d158"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                />
              )}

              {/* Solid 1RM Line */}
              {computedPoints.length > 1 && (
                <polyline
                  points={rmPolylinePoints}
                  fill="none"
                  stroke="#64d2ff"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Points on Weight Line */}
              {computedPoints.map((p) => (
                <circle
                  key={`weight-dot-${p.entry.id}`}
                  cx={p.x}
                  cy={p.yWeight}
                  r={3}
                  fill="#30d158"
                />
              ))}

              {/* Interactive Data Points on 1RM Line & X Date Labels */}
              {computedPoints.map((p) => {
                const isHovered = hoveredPointId === p.entry.id;
                return (
                  <g key={`rm-dot-group-${p.entry.id}`}>
                    {/* X Axis Date Label */}
                    <text
                      x={p.x}
                      y={chartSvgTop + chartHeight + 18}
                      fill="#86868b"
                      fontSize={10}
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {p.entry.date.slice(5)}
                    </text>

                    {/* Outer Glow */}
                    <circle
                      cx={p.x}
                      cy={p.y1RM}
                      r={isHovered ? 8 : 5}
                      fill="#64d2ff"
                      fillOpacity={isHovered ? 0.45 : 0.2}
                    />

                    {/* Inner Dot */}
                    <circle
                      cx={p.x}
                      cy={p.y1RM}
                      r={4}
                      fill="#64d2ff"
                      stroke="#161618"
                      strokeWidth={1.5}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPointId(p.entry.id)}
                    />

                    {/* Hover Callout Tag */}
                    {isHovered && (
                      <g transform={`translate(${p.x}, ${Math.max(chartSvgTop, p.y1RM - 14)})`}>
                        <rect
                          x={-60}
                          y={-22}
                          width={120}
                          height={20}
                          rx={6}
                          fill="#161618"
                          stroke="#64d2ff"
                          strokeWidth={1}
                        />
                        <text
                          x={0}
                          y={-8}
                          fill="#ffffff"
                          fontSize={9.5}
                          fontWeight={700}
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          {p.entry.weightKg}k×{p.entry.reps}회 ➔ {p.entry.estimated1RM}kg
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          ) : (
            <div className="py-12 text-center space-y-1.5">
              <p className="text-xs sm:text-sm text-apple-label">
                이 종목({selectedExerciseInfo?.name ?? '선택 종목'})의 누적된 1RM 기록이 없습니다.
              </p>
              <p className="text-xs text-apple-subhead">
                위 운동 목록 카드에서 대표 중량/횟수를 조정한 뒤 <strong>[1RM 기록 반영]</strong>을
                누르면 성장 추이 곡선이 표시됩니다.
              </p>
            </div>
          )}

          {/* Chart Legend */}
          <div className="flex items-center justify-end gap-4 mt-2 px-2 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-apple-green" />
              <span className="text-apple-label">대표 중량 (kg)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-apple-cyan rounded-full" />
              <span className="text-apple-cyan font-semibold">추정 1RM (kg)</span>
            </div>
          </div>
        </div>

        {/* History Log Table & Delete Erroneous Entry */}
        {hasHistory && (
          <div className="pt-2">
            <span className="text-xs font-bold text-apple-subhead block mb-2">
              최근 기록 목록 ({chartPoints.length}건)
            </span>
            <div className="max-h-44 overflow-y-auto divide-y divide-apple-elevated/40 border border-apple-elevated/40 rounded-xl bg-apple-card/40">
              {chartPoints
                .slice()
                .reverse()
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2.5 text-xs hover:bg-apple-card/60 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-apple-label">{entry.date}</span>
                      <span className="font-semibold text-white">
                        {entry.weightKg}kg × {entry.reps}회
                      </span>
                      <span className="text-apple-cyan font-bold bg-apple-cyan/10 px-2 py-0.5 rounded">
                        1RM {entry.estimated1RM}kg
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteHistoryEntry(entry.id)}
                      className="text-apple-label hover:text-apple-red transition px-2 py-1 text-[11px]"
                      title="잘못 입력된 기록 삭제"
                    >
                      삭제
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ExerciseInlineEditFormProps {
  readonly ex: WorkoutExercise;
  readonly onSave: (name: string, target: string, sets: number) => void;
  readonly onCancel: () => void;
}

function ExerciseInlineEditForm({ ex, onSave, onCancel }: ExerciseInlineEditFormProps) {
  const [name, setName] = useState(ex.name);
  const [target, setTarget] = useState(ex.target);
  const [sets, setSets] = useState(ex.sets);

  const nameInputId = useId();
  const targetInputId = useId();
  const setsInputId = useId();

  return (
    <div className="p-3 bg-apple-surface rounded-xl border border-apple-elevated space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div>
          <label htmlFor={nameInputId} className="text-[11px] text-apple-label block mb-1">
            종목명
          </label>
          <input
            id={nameInputId}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-apple-card rounded-lg text-xs text-white border border-apple-elevated focus:outline-none focus:border-apple-cyan"
          />
        </div>
        <div>
          <label htmlFor={targetInputId} className="text-[11px] text-apple-label block mb-1">
            목표 (Target)
          </label>
          <input
            id={targetInputId}
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-apple-card rounded-lg text-xs text-white border border-apple-elevated focus:outline-none focus:border-apple-cyan"
          />
        </div>
        <div>
          <label htmlFor={setsInputId} className="text-[11px] text-apple-label block mb-1">
            세트 수
          </label>
          <input
            id={setsInputId}
            type="number"
            min={1}
            max={10}
            value={sets}
            onChange={(e) => setSets(Number.parseInt(e.target.value, 10) || 1)}
            className="w-full px-2.5 py-1.5 bg-apple-card rounded-lg text-xs text-white border border-apple-elevated focus:outline-none focus:border-apple-cyan"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-2.5 py-1 text-xs text-apple-label hover:text-white"
        >
          취소
        </button>
        <button
          type="button"
          onClick={() => onSave(name, target, sets)}
          className="px-3 py-1 text-xs font-semibold bg-apple-cyan text-black rounded-lg"
        >
          수정 완료
        </button>
      </div>
    </div>
  );
}
