import {
  calculateDigestionMetrics,
  calculateSleepMetrics,
  getEffectiveMilestoneTargets,
  mToKoreanTime,
  mToTime,
} from '../domain/calculations';
import type { MyPTStateV1 } from '../types/domain';

interface TopSummaryBarProps {
  readonly state: MyPTStateV1;
}

export function TopSummaryBar({ state }: TopSummaryBarProps) {
  const { activeTabId, activeScheduleProfile, schedules, ui } = state;
  const sched = schedules[activeScheduleProfile];

  const stickyClass = ui.isStickySummary
    ? 'sticky top-[96px] z-30 bg-black/95 backdrop-blur-xl border-b border-[#1c1c1e]'
    : 'relative bg-black/95 border-b border-[#1c1c1e]';

  return (
    <div id="topSummaryStickyContainer" className={`${stickyClass} py-2.5 transition-all duration-200`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {activeTabId === 1 && <Tab1Summary sched={sched} />}
        {activeTabId === 2 && <Tab2Summary state={state} />}
        {activeTabId === 3 && <Tab3Summary state={state} />}
        {activeTabId === 4 && <Tab4Summary state={state} />}
      </div>
    </div>
  );
}

function Tab1Summary({ sched }: { readonly sched: MyPTStateV1['schedules']['weekday'] }) {
  const digestion = calculateDigestionMetrics(sched);
  const sleep = calculateSleepMetrics(sched);
  const digestionText = `${digestion.digH}시간 ${digestion.digM > 0 ? `${digestion.digM}분` : ''}`.trim();

  return (
    <>
      <section className="hidden md:grid md:grid-cols-3 gap-4">
        <div className="bg-apple-surface rounded-2xl p-4 sm:p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-apple-label">
            식후 소화 여유
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-bold text-white">{digestion.digH}</span>
            <span className="text-xs sm:text-sm text-apple-label">시간</span>
            <span className="text-2xl sm:text-3xl font-bold text-white ml-1.5">{digestion.digM}</span>
            <span className="text-xs sm:text-sm text-apple-label">분</span>
          </div>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              digestion.isSufficient ? 'text-apple-green' : 'text-apple-orange'
            }`}
          >
            {digestion.isSufficient
              ? '2시간 20분 이상 충족 (역류 방지 및 숙면 보호)'
              : '최소 소화 시간(2시간 20분) 확보 필요'}
          </p>
        </div>

        <div className="bg-apple-surface rounded-2xl p-4 sm:p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-apple-label">
            저녁 식사 마감
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-bold text-white">
              {mToKoreanTime(digestion.dinnerEnd)}
            </span>
          </div>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              digestion.dinnerEnd <= 1240 ? 'text-apple-label' : 'text-apple-orange'
            }`}
          >
            {digestion.dinnerEnd <= 1240
              ? `20:40 이전 완료 권장선 준수 (취침 ${mToTime(sched.bedtime)} 기준)`
              : `권장 마감(20:40) 초과 (${mToTime(digestion.dinnerEnd)} 종료)`}
          </p>
        </div>

        <div className="bg-apple-surface rounded-2xl p-4 sm:p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-apple-label">
            수면 시간
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-bold text-white">{sleep.sleepHours}</span>
            <span className="text-xs sm:text-sm text-apple-label">
              시간 (수면 주기 {sleep.cycles}회)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-apple-label mt-1">
            취침 {mToTime(sched.bedtime)} ➔ 기상 {mToTime(sched.wakeTime)}
          </p>
        </div>
      </section>

      <div className="flex md:hidden px-3.5 py-2 bg-apple-surface/90 border border-apple-card rounded-xl items-center justify-between text-[11px] font-medium text-white shadow-md">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              digestion.isSufficient ? 'bg-apple-green' : 'bg-apple-orange'
            }`}
          />
          <span>
            소화 <strong>{digestionText}</strong>
          </span>
        </div>
        <span className="text-apple-label">|</span>
        <div>
          식사 마감 <strong>{mToTime(digestion.dinnerEnd)}</strong>
        </div>
        <span className="text-apple-label">|</span>
        <div>
          수면 <strong>{sleep.sleepHours}h</strong>
        </div>
      </div>
    </>
  );
}

function Tab2Summary({ state }: { readonly state: MyPTStateV1 }) {
  const plan = state.workoutsByDay[state.currentWorkoutDay];
  let totalSets = 0;
  let doneSets = 0;

  for (const ex of plan.exercises) {
    totalSets += ex.sets;
    doneSets += ex.done.filter(Boolean).length;
  }

  const latestLift = state.strengthHistory[state.strengthHistory.length - 1];
  const liftSummary = latestLift
    ? `${latestLift.exerciseName.split(' ')[0]} ${latestLift.estimated1RM}kg`
    : '1RM 데이터 없음';

  return (
    <>
      <section className="hidden md:grid md:grid-cols-3 gap-4">
        <div className="bg-apple-surface rounded-2xl p-4 sm:p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-apple-label">
            주간 운동 세트 완수
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-bold text-white">{doneSets}</span>
            <span className="text-xs sm:text-sm text-apple-label">/ {totalSets} 세트</span>
          </div>
          <p className="text-xs sm:text-sm text-apple-green mt-1 truncate">{plan.title}</p>
        </div>

        <div className="bg-apple-surface rounded-2xl p-4 sm:p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-apple-label">
            오늘 유산소 목표
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-base sm:text-xl font-bold text-apple-cyan truncate">
              {plan.cardioType}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-apple-label mt-1">
            {plan.cardioDone ? '목표 달성 완료' : '본 운동 직후 진행 권장'}
          </p>
        </div>

        <div className="bg-apple-surface rounded-2xl p-4 sm:p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-apple-label">
            핵심 종목 1RM 요약
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-bold text-white">
              {latestLift ? `${latestLift.estimated1RM}` : '-'}
            </span>
            <span className="text-xs sm:text-sm text-apple-label">kg (추정 1RM)</span>
          </div>
          <p className="text-xs sm:text-sm text-apple-label mt-1 truncate">
            {latestLift
              ? `${latestLift.exerciseName} (${latestLift.weightKg}kg × ${latestLift.reps}회)`
              : '대표 중량 갱신 시 자동 계산'}
          </p>
        </div>
      </section>

      <div className="flex md:hidden px-3.5 py-2 bg-apple-surface/90 border border-apple-card rounded-xl items-center justify-between text-[11px] font-medium text-white shadow-md">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              doneSets === totalSets && totalSets > 0 ? 'bg-apple-green' : 'bg-apple-cyan'
            }`}
          />
          <span>
            세트 <strong>{doneSets}/{totalSets}</strong>
          </span>
        </div>
        <span className="text-apple-label">|</span>
        <div className="truncate max-w-[120px]">
          <strong>{plan.cardioType.split(' ')[0]}</strong>
        </div>
        <span className="text-apple-label">|</span>
        <div className="truncate max-w-[120px]">
          <strong>{liftSummary}</strong>
        </div>
      </div>
    </>
  );
}

function Tab3Summary({ state }: { readonly state: MyPTStateV1 }) {
  let totalCal = 0;
  let totalPro = 0;

  for (const meal of state.dietItems) {
    if (meal.checked) {
      totalCal += meal.cal;
      totalPro += meal.pro;
    }
  }

  const lowStock = state.inventory.filter((inv) => inv.count <= 3);

  return (
    <>
      <section className="hidden md:grid md:grid-cols-3 gap-4">
        <div className="bg-apple-surface rounded-2xl p-4 sm:p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-apple-label">
            일일 칼로리
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-bold text-white">{totalCal}</span>
            <span className="text-xs sm:text-sm text-apple-label">/ 1,700 kcal</span>
          </div>
          <p className="text-xs sm:text-sm text-apple-label mt-1">결손 약 900kcal 유지 (대사 방어)</p>
        </div>

        <div className="bg-apple-surface rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-apple-label">
              단백질 충족도
            </span>
            <span className="text-[11px] text-apple-green font-semibold bg-apple-green/10 px-1.5 py-0.5 rounded">
              방어선 130g
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-2xl sm:text-3xl font-bold ${
                totalPro >= 130 ? 'text-apple-green' : 'text-white'
              }`}
            >
              {totalPro}
            </span>
            <span className="text-xs sm:text-sm text-apple-label">/ 160 g</span>
          </div>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              totalPro >= 130 ? 'text-apple-green' : 'text-apple-label'
            }`}
          >
            {totalPro >= 130 ? '근합성 최소 방어선 충족' : '단백질 추가 섭취 필요'}
          </p>
        </div>

        <div className="bg-apple-surface rounded-2xl p-4 sm:p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-apple-label">
            비축 식단 알림
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-base sm:text-xl font-bold ${
                lowStock.length > 0 ? 'text-apple-orange' : 'text-apple-green'
              }`}
            >
              {lowStock.length > 0 ? `재발주 필요 ${lowStock.length}건` : '식단 비축 여유'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-apple-label mt-1 truncate">
            {lowStock.length > 0
              ? lowStock.map((i) => i.name.split(' ')[0]).join(', ')
              : '냉장고 재고 충분함'}
          </p>
        </div>
      </section>

      <div className="flex md:hidden px-3.5 py-2 bg-apple-surface/90 border border-apple-card rounded-xl items-center justify-between text-[11px] font-medium text-white shadow-md">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              totalPro >= 130 ? 'bg-apple-green' : 'bg-apple-orange'
            }`}
          />
          <span>
            단백질 <strong>{totalPro}g</strong>
          </span>
        </div>
        <span className="text-apple-label">|</span>
        <div>
          칼로리 <strong>{totalCal}kcal</strong>
        </div>
        <span className="text-apple-label">|</span>
        <div>
          비축 <strong>{lowStock.length > 0 ? `${lowStock.length}건 부족` : '여유'}</strong>
        </div>
      </div>
    </>
  );
}

function Tab4Summary({ state }: { readonly state: MyPTStateV1 }) {
  const baseline = state.milestones[0];
  const lastIdx = state.milestones.length - 1;
  const lastRow = state.milestones[lastIdx];
  const startW = baseline.actualW ?? baseline.baseTargetW;
  const finalEff = getEffectiveMilestoneTargets(lastRow, lastIdx, baseline);
  let latestActualW = startW;
  let latestActualWaist = baseline.actualWaist ?? baseline.baseTargetWaist;
  let latestWeek = '시작';
  let foundW = false;
  let foundWaist = false;

  for (let i = state.milestones.length - 1; i >= 0; i--) {
    const row = state.milestones[i];
    if (!foundW && row.actualW !== null) {
      latestActualW = row.actualW;
      if (latestWeek === '시작') latestWeek = row.week;
      foundW = true;
    }
    if (!foundWaist && row.actualWaist !== null) {
      latestActualWaist = row.actualWaist;
      if (latestWeek === '시작') latestWeek = row.week;
      foundWaist = true;
    }
    if (foundW && foundWaist) {
      break;
    }
  }

  const totalDrop = Math.round((startW - latestActualW) * 10) / 10;
  const startWaist = baseline.actualWaist ?? baseline.baseTargetWaist;
  const waistDrop = Math.round((startWaist - latestActualWaist) * 10) / 10;
  const goalSpan = startW - finalEff.targetW;
  const progressPct =
    goalSpan > 0 ? Math.min(100, Math.max(0, Math.round(((startW - latestActualW) / goalSpan) * 100))) : 0;

  return (
    <>
      <section className="hidden md:grid md:grid-cols-3 gap-4">
        <div className="bg-apple-surface rounded-2xl p-4 sm:p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-apple-label">
            총 체중 감량
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-2xl sm:text-3xl font-bold ${
                totalDrop > 0 ? 'text-apple-green' : 'text-white'
              }`}
            >
              {totalDrop > 0 ? `-${totalDrop.toFixed(1)}` : `${totalDrop.toFixed(1)}`}
            </span>
            <span className="text-xs sm:text-sm text-apple-label">kg</span>
          </div>
          <p className="text-xs sm:text-sm text-apple-label mt-1">
            시작 {startW.toFixed(1)}kg ➔ 현재 {latestActualW.toFixed(1)}kg ({latestWeek})
          </p>
        </div>

        <div className="bg-apple-surface rounded-2xl p-4 sm:p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-apple-label">
            허리둘레 감소
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-2xl sm:text-3xl font-bold ${
                waistDrop > 0 ? 'text-apple-cyan' : 'text-white'
              }`}
            >
              {waistDrop > 0 ? `-${waistDrop.toFixed(1)}` : `${waistDrop.toFixed(1)}`}
            </span>
            <span className="text-xs sm:text-sm text-apple-label">cm</span>
          </div>
          <p className="text-xs sm:text-sm text-apple-label mt-1">
            기준 {startWaist.toFixed(1)}cm ➔ 현재 {latestActualWaist.toFixed(1)}cm
          </p>
        </div>

        <div className="bg-apple-surface rounded-2xl p-4 sm:p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-apple-label">
            최종 목표 도달률
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-bold text-white">{progressPct}%</span>
            <span className="text-xs sm:text-sm text-apple-label">
              (잔여 {Math.max(0, Math.round((latestActualW - finalEff.targetW) * 10) / 10).toFixed(1)}kg)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-apple-label mt-1">
            최종 목표: {finalEff.targetW.toFixed(1)}kg / 허리 {finalEff.targetWaist.toFixed(1)}cm
          </p>
        </div>
      </section>

      <div className="flex md:hidden px-3.5 py-2 bg-apple-surface/90 border border-apple-card rounded-xl items-center justify-between text-[11px] font-medium text-white shadow-md">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-apple-green" />
          <span>
            감량 <strong>{totalDrop > 0 ? `-${totalDrop}` : totalDrop}kg</strong>
          </span>
        </div>
        <span className="text-apple-label">|</span>
        <div>
          허리 <strong>{waistDrop > 0 ? `-${waistDrop}` : waistDrop}cm</strong>
        </div>
        <span className="text-apple-label">|</span>
        <div>
          현재 <strong>{latestActualW}kg</strong>
        </div>
      </div>
    </>
  );
}
