import type {
  DailyLogEntry,
  DietItem,
  DinnerSetSpec,
  IngredientMapping,
  InventoryItem,
  MilestoneRow,
  MyPTStateV1,
  RoutineBlock,
  RoutineBlockId,
  ScheduleConfig,
  ScheduleProfileKey,
} from '../types/domain';

export function formatLocalDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function mToTime(min: number): string {
  const normalized = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDurationKorean(mins: number): string {
  if (!mins || mins <= 0) return '0분';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  return `${m}분`;
}

export function mToKoreanTime(min: number): string {
  const normalized = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  let period = '오전';
  let displayH = h;
  if (h >= 12) {
    if (h >= 18 && h < 21) period = '저녁';
    else if (h >= 21 || h < 4) period = '밤';
    else period = '오후';
    displayH = h > 12 ? h - 12 : 12;
  } else if (h === 0) {
    period = '자정';
    displayH = 12;
  }
  return `${period} ${displayH}시 ${String(m).padStart(2, '0')}분`;
}

export function applyScheduleGuardrails(sched: ScheduleConfig): ScheduleConfig {
  const minWorkoutStart = sched.leaveWork + 10;
  const safeWorkoutStart = Math.max(sched.workoutStart, minWorkoutStart);

  const minDinnerStart = safeWorkoutStart + sched.workoutDur + 15;
  const safeDinnerStart = Math.max(sched.dinnerStart, minDinnerStart);

  const minBedtime = safeDinnerStart + sched.dinnerDur + 120;
  const safeBedtime = Math.max(sched.bedtime, minBedtime);

  return {
    ...sched,
    workoutStart: safeWorkoutStart,
    dinnerStart: safeDinnerStart,
    bedtime: safeBedtime,
  };
}

export function buildRoutineBlocks(sched: ScheduleConfig, profile: ScheduleProfileKey): RoutineBlock[] {
  const guarded = applyScheduleGuardrails(sched);

  const workDur =
    guarded.leaveWork >= guarded.workStart
      ? guarded.leaveWork - guarded.workStart
      : guarded.leaveWork + 1440 - guarded.workStart;

  const transitDur =
    guarded.workoutStart >= guarded.leaveWork
      ? guarded.workoutStart - guarded.leaveWork
      : guarded.workoutStart + 1440 - guarded.leaveWork;

  const workoutEnd = guarded.workoutStart + guarded.workoutDur;
  const commuteDur =
    guarded.dinnerStart >= workoutEnd
      ? guarded.dinnerStart - workoutEnd
      : guarded.dinnerStart + 1440 - workoutEnd;

  const dinnerEnd = guarded.dinnerStart + guarded.dinnerDur;
  const winddownDur =
    guarded.bedtime >= dinnerEnd
      ? guarded.bedtime - dinnerEnd
      : guarded.bedtime + 1440 - dinnerEnd;

  const sleepDur = (((guarded.wakeTime - guarded.bedtime) % 1440) + 1440) % 1440;

  const isWeekend = profile === 'weekend';

  return [
    {
      id: 'work',
      title: isWeekend ? '주말 오전 자유 활동' : '집중 근무 & 일과',
      start: guarded.workStart,
      dur: workDur,
      color: '#636366',
      desc: isWeekend
        ? '오전 여가, 독서 및 개인 일정. 가벼운 수분 섭취와 기립 스트레칭.'
        : '08:00 ~ 17:00 집중 업무 및 활동 시간. 규칙적인 기립 스트레칭 및 수분 섭취.',
    },
    {
      id: 'transit',
      title: isWeekend ? '체육관 이동 & 웜업' : '퇴근 및 운동 준비',
      start: guarded.leaveWork,
      dur: transitDur,
      color: '#ff9f0a',
      desc: isWeekend
        ? '체육관 이동 및 동적 모빌리티 스트레칭, 관절 활성화.'
        : '17:00 ~ 18:00 업무 마감 및 체육관 이동, 웜업 스트레칭.',
    },
    {
      id: 'workout',
      title: isWeekend ? '주말 전신 웨이트 & 유산소' : '웨이트 + 인터벌 러닝',
      start: guarded.workoutStart,
      dur: guarded.workoutDur,
      color: '#fa114f',
      desc: `웨이트 트레이닝 + 유산소 프로토콜 결합 (${guarded.workoutDur}분 코스).`,
    },
    {
      id: 'commute',
      title: '귀가 & 미온수 샤워',
      start: workoutEnd,
      dur: commuteDur,
      color: '#64d2ff',
      desc: '운동 직후 즉시 이동. 32~35°C 미온수 샤워로 코어 체온을 쿨다운시켜 멜라토닌 분비 촉진.',
    },
    {
      id: 'dinner',
      title: '저녁 식사',
      start: guarded.dinnerStart,
      dur: guarded.dinnerDur,
      color: '#30d158',
      desc: `${mToTime(guarded.dinnerStart)} 저녁 식사 시작. 고단백 식단 완료 필수.`,
    },
    {
      id: 'winddown',
      title: '소화 & 야간 이완',
      start: dinnerEnd,
      dur: winddownDur,
      color: '#bf5af2',
      desc: `최소 ${formatDurationKorean(winddownDur)} 이상 소화 시간 확보. 블루라이트 차단 및 심신 안정.`,
    },
    {
      id: 'sleep',
      title: '렘/깊은 수면 주기',
      start: guarded.bedtime,
      dur: sleepDur,
      color: '#0a84ff',
      desc: `${mToTime(guarded.bedtime)}~${mToTime(guarded.wakeTime)} 수면 (${(sleepDur / 60).toFixed(1)}시간). 근합성 및 신경계 회복.`,
    },
  ];
}

export function getActiveRoutineBlockId(
  blocks: readonly RoutineBlock[],
  currentMinutes: number
): RoutineBlockId {
  const norm = ((currentMinutes % 1440) + 1440) % 1440;

  for (const block of blocks) {
    const start = ((block.start % 1440) + 1440) % 1440;
    const end = start + block.dur;
    if (end <= 1440) {
      if (norm >= start && norm < end) {
        return block.id;
      }
    } else {
      const wrappedEnd = end % 1440;
      if (norm >= start || norm < wrappedEnd) {
        return block.id;
      }
    }
  }

  return blocks[0]?.id ?? 'work';
}

export function calculateSleepMetrics(sched: ScheduleConfig): {
  readonly sleepMinutes: number;
  readonly sleepHours: number;
  readonly cycles: number;
} {
  const sleepMinutes = (((sched.wakeTime - sched.bedtime) % 1440) + 1440) % 1440;
  const sleepHours = Math.round((sleepMinutes / 60) * 10) / 10;
  const cycles = Math.round((sleepHours / 1.5) * 10) / 10;
  return { sleepMinutes, sleepHours, cycles };
}

export function calculateDigestionMetrics(sched: ScheduleConfig): {
  readonly digestionMinutes: number;
  readonly digH: number;
  readonly digM: number;
  readonly isSufficient: boolean;
  readonly dinnerEnd: number;
} {
  const dinnerEnd = sched.dinnerStart + sched.dinnerDur;
  let digestionMinutes = sched.bedtime - dinnerEnd;
  if (digestionMinutes < 0) {
    digestionMinutes += 1440;
  }
  const digH = Math.floor(digestionMinutes / 60);
  const digM = digestionMinutes % 60;
  const isSufficient = digestionMinutes >= 140; // 2시간 20분 이상 준수
  return { digestionMinutes, digH, digM, isSufficient, dinnerEnd };
}

export function calculateEstimated1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0) return 0;
  if (reps <= 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export function getCourseVolumeGuide(workoutDur: number): {
  readonly recommendedSetsPerExercise: number;
  readonly cardioMinutes: number;
  readonly label: string;
} {
  if (workoutDur <= 60) {
    return { recommendedSetsPerExercise: 3, cardioMinutes: 15, label: '60분 압축 코스' };
  }
  if (workoutDur <= 80) {
    return { recommendedSetsPerExercise: 4, cardioMinutes: 25, label: '80분 표준 코스' };
  }
  if (workoutDur <= 100) {
    return { recommendedSetsPerExercise: 4, cardioMinutes: 40, label: '100분 최적 코스' };
  }
  return { recommendedSetsPerExercise: 5, cardioMinutes: 45, label: '120분 주말 집중 코스' };
}

export function calculateDinnerSetAvailableCount(
  setSpec: DinnerSetSpec,
  inventory: readonly InventoryItem[]
): number {
  if (setSpec.ingredients.length === 0) return 0;

  let minAvailable = Number.POSITIVE_INFINITY;

  for (const ing of setSpec.ingredients) {
    const item = inventory.find((inv) => inv.id === ing.invId);
    if (!item || ing.qty <= 0) {
      return 0;
    }
    const available = Math.floor(item.count / ing.qty);
    if (available < minAvailable) {
      minAvailable = available;
    }
  }

  return Number.isFinite(minAvailable) ? minAvailable : 0;
}

export function applyIngredientsDelta(
  inventory: readonly InventoryItem[],
  ingredients: readonly IngredientMapping[],
  direction: 'deduct' | 'restore'
): InventoryItem[] {
  const deltaMap = new Map<string, number>();
  for (const ing of ingredients) {
    const delta = direction === 'deduct' ? -ing.qty : ing.qty;
    deltaMap.set(ing.invId, (deltaMap.get(ing.invId) ?? 0) + delta);
  }

  return inventory.map((item) => {
    const delta = deltaMap.get(item.id);
    if (delta === undefined) return item;
    const nextCount = Math.max(0, item.count + delta);
    return { ...item, count: nextCount };
  });
}

export function getEffectiveMilestoneTargets(
  row: MilestoneRow,
  idx: number,
  baseline: MilestoneRow
): {
  readonly targetW: number;
  readonly targetWaist: number;
  readonly targetFat: number;
  readonly targetSmm: number;
} {
  if (idx === 0) {
    return {
      targetW: baseline.actualW ?? baseline.baseTargetW,
      targetWaist: baseline.actualWaist ?? baseline.baseTargetWaist,
      targetFat: baseline.actualFat ?? baseline.baseTargetFat,
      targetSmm: baseline.actualSmm ?? baseline.baseTargetSmm,
    };
  }

  const baselineW = baseline.actualW ?? baseline.baseTargetW;
  const deltaW = baselineW - baseline.baseTargetW;
  const targetW = Math.round((row.baseTargetW + deltaW) * 10) / 10;

  const baselineWaist = baseline.actualWaist ?? baseline.baseTargetWaist;
  const deltaWaist = baselineWaist - baseline.baseTargetWaist;
  const targetWaist = Math.round((row.baseTargetWaist + deltaWaist) * 10) / 10;

  const baselineFat = baseline.actualFat ?? baseline.baseTargetFat;
  const deltaFat = baselineFat - baseline.baseTargetFat;
  const targetFat = Math.round((row.baseTargetFat + deltaFat) * 10) / 10;

  const baselineSmm = baseline.actualSmm ?? baseline.baseTargetSmm;
  const deltaSmm = baselineSmm - baseline.baseTargetSmm;
  const targetSmm = Math.round((row.baseTargetSmm + deltaSmm) * 10) / 10;

  return { targetW, targetWaist, targetFat, targetSmm };
}

export function computeTodayLog(state: MyPTStateV1, dateStr: string): DailyLogEntry {
  const plan = state.workoutsByDay[state.currentWorkoutDay];
  let totalSets = 0;
  let doneSets = 0;

  for (const ex of plan.exercises) {
    totalSets += ex.sets;
    doneSets += ex.done.filter(Boolean).length;
  }

  const workoutRatePct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;

  let totalCal = 0;
  let totalPro = 0;
  let checkedMeals = 0;

  for (const meal of state.dietItems) {
    if (meal.checked) {
      totalCal += meal.cal;
      totalPro += meal.pro;
      checkedMeals += 1;
    }
  }

  const dietRatePct =
    state.dietItems.length > 0 ? Math.round((checkedMeals / state.dietItems.length) * 100) : 0;

  return {
    date: dateStr,
    workoutRatePct,
    dietRatePct,
    totalCal,
    totalPro,
  };
}
