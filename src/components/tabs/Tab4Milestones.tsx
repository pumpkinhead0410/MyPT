import { useMemo, useState } from 'react';
import {
  computeTodayLog,
  formatLocalDate,
  getEffectiveMilestoneTargets,
} from '../../domain/calculations';
import type {
  DailyLogEntry,
  MilestoneMetricKey,
  MilestoneRow,
  MyPTStateV1,
} from '../../types/domain';

interface Tab4MilestonesProps {
  readonly state: MyPTStateV1;
  readonly onUpdateState: (updater: (prev: MyPTStateV1) => MyPTStateV1) => void;
}

const METRIC_TABS: ReadonlyArray<{
  readonly key: MilestoneMetricKey;
  readonly label: string;
  readonly unit: string;
}> = [
  { key: 'weight', label: '체중 (kg)', unit: 'kg' },
  { key: 'waist', label: '허리둘레 (cm)', unit: 'cm' },
  { key: 'fat', label: '체지방률 (%)', unit: '%' },
  { key: 'smm', label: '골격근량 (kg)', unit: 'kg' },
];

export function Tab4Milestones({ state, onUpdateState }: Tab4MilestonesProps) {
  const { milestones, ui, dailyLogs } = state;
  const baseline = milestones[0];

  const [activeMetric, setActiveMetric] = useState<MilestoneMetricKey>('weight');
  const [hoveredWeek, setHoveredWeek] = useState<string | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(formatLocalDate());

  const handleToggleInBody = () => {
    onUpdateState((prev) => ({
      ...prev,
      ui: {
        ...prev.ui,
        isInBodyMode: !prev.ui.isInBodyMode,
      },
    }));
  };

  const handleResetMilestones = () => {
    onUpdateState((prev) => {
      const base = prev.milestones[0];
      const resetBaseline: MilestoneRow = base
        ? {
            ...base,
            actualW: base.baseTargetW,
            actualWaist: base.baseTargetWaist,
            actualFat: base.baseTargetFat,
            actualSmm: base.baseTargetSmm,
          }
        : prev.milestones[0];

      const nextMilestones = prev.milestones.map((m, i) => {
        if (i === 0) return resetBaseline;
        return {
          ...m,
          actualW: null,
          actualWaist: null,
          actualFat: null,
          actualSmm: null,
        };
      });

      return {
        ...prev,
        milestones: nextMilestones,
      };
    });
  };

  const handleStepWeight = (idx: number, delta: number) => {
    onUpdateState((prev) => {
      const row = prev.milestones[idx];
      if (!row) return prev;
      const eff = getEffectiveMilestoneTargets(row, idx, prev.milestones[0] ?? row);
      const baseVal = row.actualW ?? eff.targetW;
      const nextVal = Math.round((baseVal + delta) * 10) / 10;
      return {
        ...prev,
        milestones: prev.milestones.map((m, i) => (i === idx ? { ...m, actualW: nextVal } : m)),
      };
    });
  };

  const handleInputWeight = (idx: number, valStr: string) => {
    const val = valStr === '' ? null : Number(valStr);
    onUpdateState((prev) => ({
      ...prev,
      milestones: prev.milestones.map((m, i) =>
        i === idx ? { ...m, actualW: val !== null && !isNaN(val) ? val : null } : m
      ),
    }));
  };

  const handleStepWaist = (idx: number, delta: number) => {
    onUpdateState((prev) => {
      const row = prev.milestones[idx];
      if (!row) return prev;
      const eff = getEffectiveMilestoneTargets(row, idx, prev.milestones[0] ?? row);
      const baseVal = row.actualWaist ?? eff.targetWaist;
      const nextVal = Math.round((baseVal + delta) * 10) / 10;
      return {
        ...prev,
        milestones: prev.milestones.map((m, i) => (i === idx ? { ...m, actualWaist: nextVal } : m)),
      };
    });
  };

  const handleInputWaist = (idx: number, valStr: string) => {
    const val = valStr === '' ? null : Number(valStr);
    onUpdateState((prev) => ({
      ...prev,
      milestones: prev.milestones.map((m, i) =>
        i === idx ? { ...m, actualWaist: val !== null && !isNaN(val) ? val : null } : m
      ),
    }));
  };

  const handleInputFat = (idx: number, valStr: string) => {
    const val = valStr === '' ? null : Number(valStr);
    onUpdateState((prev) => ({
      ...prev,
      milestones: prev.milestones.map((m, i) =>
        i === idx ? { ...m, actualFat: val !== null && !isNaN(val) ? val : null } : m
      ),
    }));
  };

  const handleInputSmm = (idx: number, valStr: string) => {
    const val = valStr === '' ? null : Number(valStr);
    onUpdateState((prev) => ({
      ...prev,
      milestones: prev.milestones.map((m, i) =>
        i === idx ? { ...m, actualSmm: val !== null && !isNaN(val) ? val : null } : m
      ),
    }));
  };

  const handleSnapshotTodayLog = () => {
    const todayStr = formatLocalDate();
    const newLog = computeTodayLog(state, todayStr);

    onUpdateState((prev) => {
      const existingIdx = prev.dailyLogs.findIndex((l) => l.date === todayStr);
      let nextLogs: readonly DailyLogEntry[];
      if (existingIdx >= 0) {
        nextLogs = prev.dailyLogs.map((l, i) => (i === existingIdx ? newLog : l));
      } else {
        nextLogs = [...prev.dailyLogs, newLog].sort((a, b) => a.date.localeCompare(b.date));
      }
      return {
        ...prev,
        dailyLogs: nextLogs,
      };
    });
    setSelectedCalendarDate(todayStr);
  };

  // Trajectory Chart Calculation
  const chartData = useMemo(() => {
    const width = 760;
    const height = 180;
    const padLeft = 52;
    const padRight = 32;
    const padTop = 22;
    const padBottom = 28;

    const values: number[] = [];
    const targets: number[] = [];
    const actuals: Array<{ x: number; y: number; week: string; actual: number; target: number }> =
      [];

    milestones.forEach((row, idx) => {
      const eff = getEffectiveMilestoneTargets(row, idx, baseline);
      let targetVal: number;
      let actualVal: number | null;

      if (activeMetric === 'weight') {
        targetVal = eff.targetW;
        actualVal = row.actualW;
      } else if (activeMetric === 'waist') {
        targetVal = eff.targetWaist;
        actualVal = row.actualWaist;
      } else if (activeMetric === 'fat') {
        targetVal = eff.targetFat;
        actualVal = row.actualFat;
      } else {
        targetVal = eff.targetSmm;
        actualVal = row.actualSmm;
      }

      targets.push(targetVal);
      values.push(targetVal);
      if (actualVal !== null) {
        values.push(actualVal);
      }
    });

    const minV = values.length > 0 ? Math.min(...values) : 70;
    const maxV = values.length > 0 ? Math.max(...values) : 95;
    const range = maxV - minV;
    const pad = range > 0 ? range * 0.15 : 2;
    const yMin = Math.floor((minV - pad) * 10) / 10;
    const yMax = Math.ceil((maxV + pad) * 10) / 10;

    const getX = (idx: number) =>
      padLeft + (idx / Math.max(1, milestones.length - 1)) * (width - padLeft - padRight);

    const getY = (val: number) =>
      padTop + ((yMax - val) / Math.max(0.1, yMax - yMin)) * (height - padTop - padBottom);

    let targetPathD = '';
    targets.forEach((tVal, idx) => {
      const x = getX(idx);
      const y = getY(tVal);
      targetPathD += idx === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });

    milestones.forEach((row, idx) => {
      let actualVal: number | null;
      if (activeMetric === 'weight') actualVal = row.actualW;
      else if (activeMetric === 'waist') actualVal = row.actualWaist;
      else if (activeMetric === 'fat') actualVal = row.actualFat;
      else actualVal = row.actualSmm;

      if (actualVal !== null) {
        const x = getX(idx);
        const y = getY(actualVal);
        const targetVal = targets[idx] ?? actualVal;
        actuals.push({ x, y, week: row.week, actual: actualVal, target: targetVal });
      }
    });

    let actualPathD = '';
    actuals.forEach((pt, i) => {
      actualPathD += i === 0 ? `M ${pt.x} ${pt.y}` : ` L ${pt.x} ${pt.y}`;
    });

    const gridLevels = [
      yMin + (yMax - yMin) * 0.25,
      yMin + (yMax - yMin) * 0.5,
      yMin + (yMax - yMin) * 0.75,
    ];

    return {
      width,
      height,
      padLeft,
      padRight,
      yMin,
      yMax,
      getX,
      getY,
      gridLevels,
      targetPathD,
      actualPathD,
      actuals,
    };
  }, [milestones, baseline, activeMetric]);

  const activeMetricTab = METRIC_TABS.find((t) => t.key === activeMetric) ?? METRIC_TABS[0];

  const tooltipInfo = useMemo(() => {
    if (!hoveredWeek) {
      const latestActual = chartData.actuals[chartData.actuals.length - 1];
      if (!latestActual) return '';
      const diff = Math.round((latestActual.actual - latestActual.target) * 10) / 10;
      return `${latestActual.week} 최신: 실제 ${latestActual.actual.toFixed(1)}${
        activeMetricTab.unit
      } (목표 ${latestActual.target.toFixed(1)}${activeMetricTab.unit}, ${
        diff >= 0 ? '+' : ''
      }${diff.toFixed(1)}${activeMetricTab.unit})`;
    }

    const match = chartData.actuals.find((a) => a.week === hoveredWeek);
    if (match) {
      const diff = Math.round((match.actual - match.target) * 10) / 10;
      return `${match.week}: 실제 ${match.actual.toFixed(1)}${activeMetricTab.unit} (목표 ${match.target.toFixed(
        1
      )}${activeMetricTab.unit}, ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}${activeMetricTab.unit})`;
    }

    const rowIdx = milestones.findIndex((m) => m.week === hoveredWeek);
    if (rowIdx >= 0) {
      const eff = getEffectiveMilestoneTargets(milestones[rowIdx], rowIdx, baseline);
      let targetVal = eff.targetW;
      if (activeMetric === 'waist') targetVal = eff.targetWaist;
      else if (activeMetric === 'fat') targetVal = eff.targetFat;
      else if (activeMetric === 'smm') targetVal = eff.targetSmm;
      return `${hoveredWeek}: 목표 ${targetVal.toFixed(1)}${activeMetricTab.unit} (측정 대기)`;
    }

    return '';
  }, [hoveredWeek, chartData.actuals, milestones, baseline, activeMetric, activeMetricTab.unit]);

  // Heatmap 28-day window
  const heatmapDays = useMemo(() => {
    const today = new Date();
    const result: Array<{
      dateStr: string;
      label: string;
      dowLabel: string;
      log: DailyLogEntry | null;
      avgRate: number | null;
    }> = [];

    const dows = ['일', '월', '화', '수', '목', '금', '토'];

    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = formatLocalDate(d);
      const foundLog = dailyLogs.find((l) => l.date === dateStr) ?? null;
      const avgRate = foundLog
        ? Math.round((foundLog.workoutRatePct + foundLog.dietRatePct) / 2)
        : null;

      result.push({
        dateStr,
        label: `${d.getMonth() + 1}.${d.getDate()}`,
        dowLabel: dows[d.getDay()] ?? '',
        log: foundLog,
        avgRate,
      });
    }

    return result;
  }, [dailyLogs]);

  const selectedCalendarLog = dailyLogs.find((l) => l.date === selectedCalendarDate) ?? null;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-apple-surface rounded-2xl p-5 border border-apple-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            11주 체중 &amp; 허리둘레 마일스톤
          </h2>
          <p className="text-xs sm:text-sm text-apple-label mt-0.5">
            시작 신체치 기준 생리학적 감량 궤도 모니터링 (오차 기준점 자동 보정)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleInBody}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              ui.isInBodyMode
                ? 'bg-apple-green text-black'
                : 'bg-apple-card hover:bg-apple-elevated text-apple-cyan border border-apple-cyan/30'
            }`}
          >
            {ui.isInBodyMode ? '인바디 정밀 모드 On' : '인바디 정밀 모드 Off'}
          </button>
          <button
            type="button"
            onClick={handleResetMilestones}
            className="text-xs px-3 py-1.5 rounded-lg bg-apple-card hover:bg-apple-elevated text-apple-label hover:text-white transition font-medium"
          >
            측정치 초기화
          </button>
        </div>
      </div>

      {/* Multi-Metric Trajectory SVG Chart Card */}
      <div className="bg-apple-surface rounded-2xl p-5 border border-apple-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Metric Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-apple-card p-1 rounded-xl">
            {METRIC_TABS.map((tab) => {
              const isActive = activeMetric === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveMetric(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? 'bg-apple-elevated text-white shadow-sm'
                      : 'text-apple-label hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Legend and Dynamic Tooltip */}
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5 text-apple-label">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-apple-label inline-block" />
              <span>목표 곡선</span>
            </div>
            <div className="flex items-center gap-1.5 text-apple-cyan">
              <span className="w-2.5 h-2.5 rounded-full bg-apple-cyan inline-block" />
              <span>실제 측정</span>
            </div>
          </div>
        </div>

        {tooltipInfo && (
          <div className="flex justify-end">
            <span className="text-xs text-apple-green font-mono font-medium">{tooltipInfo}</span>
          </div>
        )}

        <div className="w-full overflow-hidden bg-apple-card/40 rounded-xl p-2 border border-apple-elevated/40">
          <svg
            viewBox={`0 0 ${chartData.width} ${chartData.height}`}
            className="w-full h-44 sm:h-52 select-none"
          >
            {/* Horizontal Grid lines and Y-axis Labels */}
            {chartData.gridLevels.map((level) => {
              const y = chartData.getY(level);
              return (
                <g key={level}>
                  <line
                    x1={chartData.padLeft}
                    x2={chartData.width - chartData.padRight}
                    y1={y}
                    y2={y}
                    stroke="#2c2c2e"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={chartData.padLeft - 8}
                    y={y + 3.5}
                    fill="#86868b"
                    fontSize="10"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {level.toFixed(1)}
                    {activeMetricTab.unit}
                  </text>
                </g>
              );
            })}

            {/* Target Curve (Dashed Gray) */}
            <path
              d={chartData.targetPathD}
              fill="none"
              stroke="#48484a"
              strokeWidth="2"
              strokeDasharray="4 4"
            />

            {/* Actual Curve (Solid Apple Cyan) */}
            {chartData.actualPathD && (
              <path
                d={chartData.actualPathD}
                fill="none"
                stroke="#64d2ff"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}

            {/* X-Axis Week Labels & Interactive Points */}
            {milestones.map((m, idx) => {
              const x = chartData.getX(idx);
              const isHovered = hoveredWeek === m.week;

              return (
                <g key={m.week}>
                  <text
                    x={x}
                    y={chartData.height - 8}
                    fill={isHovered ? '#ffffff' : '#86868b'}
                    fontSize="10"
                    textAnchor="middle"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredWeek(m.week)}
                    onMouseLeave={() => setHoveredWeek(null)}
                  >
                    {m.week}
                  </text>
                </g>
              );
            })}

            {chartData.actuals.map((pt) => {
              const isHovered = hoveredWeek === pt.week;
              return (
                <circle
                  key={pt.week}
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4.5}
                  fill="#64d2ff"
                  stroke="#000000"
                  strokeWidth="2"
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredWeek(pt.week)}
                  onMouseLeave={() => setHoveredWeek(null)}
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* 11-Week Milestone Data Table */}
      <div className="bg-apple-surface rounded-2xl border border-apple-card overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs sm:text-sm table-fixed min-w-[720px]">
            <thead className="bg-[#1c1c1e] text-apple-label border-b border-[#2c2c2e]">
              <tr>
                <th className="py-3 px-3 font-semibold w-[60px]">주차</th>
                <th className="py-3 px-3 font-semibold w-[160px]">주요 초점</th>
                <th className="py-3 px-2 font-semibold text-right w-[85px]">목표 체중</th>
                <th className="py-3 px-2 font-semibold text-apple-cyan text-center w-[135px]">
                  실제 체중 (kg) ✍️
                </th>
                <th className="py-3 px-2 font-semibold text-center w-[85px]">오차</th>
                <th className="py-3 px-2 font-semibold text-right w-[85px]">목표 둘레</th>
                <th className="py-3 px-2 font-semibold text-apple-cyan text-center w-[135px]">
                  실제 둘레 (cm) ✍️
                </th>
                {ui.isInBodyMode && (
                  <>
                    <th className="py-3 px-2 font-semibold text-right w-[80px]">목표 체지방</th>
                    <th className="py-3 px-2 font-semibold text-apple-cyan text-center w-[90px]">
                      실제 체지방 ✍️
                    </th>
                    <th className="py-3 px-2 font-semibold text-right w-[80px]">목표 골격근</th>
                    <th className="py-3 px-2 font-semibold text-apple-cyan text-center w-[90px]">
                      실제 골격근 ✍️
                    </th>
                  </>
                )}
                <th className="py-3 px-3 font-semibold text-right w-[85px]">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c1c1e]">
              {milestones.map((m, idx) => {
                const effTargets = getEffectiveMilestoneTargets(m, idx, baseline);
                const isBaseline = idx === 0;

                let deltaHtml = (
                  <span className="text-apple-label font-mono text-xs sm:text-sm">-</span>
                );
                let statusBadge = (
                  <span className="px-2 py-0.5 rounded text-[11px] sm:text-xs font-semibold bg-apple-card text-apple-label">
                    대기
                  </span>
                );

                if (isBaseline) {
                  statusBadge = (
                    <span className="px-2.5 py-0.5 rounded text-[11px] sm:text-xs font-semibold bg-apple-blue/20 text-apple-cyan">
                      기준점
                    </span>
                  );
                } else if (m.actualW !== null) {
                  const delta = Math.round((m.actualW - effTargets.targetW) * 10) / 10;
                  if (delta < -1.0) {
                    deltaHtml = (
                      <span className="text-apple-orange font-bold font-mono text-xs sm:text-sm">
                        {delta}kg
                      </span>
                    );
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[11px] sm:text-xs font-semibold bg-apple-orange/15 text-apple-orange">
                        감량 가속
                      </span>
                    );
                  } else if (delta <= 0.4) {
                    deltaHtml = (
                      <span className="text-apple-green font-bold font-mono text-xs sm:text-sm">
                        {delta > 0 ? `+${delta}` : delta}kg
                      </span>
                    );
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[11px] sm:text-xs font-semibold bg-apple-green/15 text-apple-green">
                        목표 궤도
                      </span>
                    );
                  } else if (delta <= 1.0) {
                    deltaHtml = (
                      <span className="text-apple-orange font-bold font-mono text-xs sm:text-sm">
                        +{delta}kg
                      </span>
                    );
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[11px] sm:text-xs font-semibold bg-apple-orange/15 text-apple-orange">
                        진행 지연
                      </span>
                    );
                  } else {
                    deltaHtml = (
                      <span className="text-apple-red font-bold font-mono text-xs sm:text-sm">
                        +{delta}kg
                      </span>
                    );
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[11px] sm:text-xs font-semibold bg-apple-red/15 text-apple-red">
                        조정 필요
                      </span>
                    );
                  }
                }

                return (
                  <tr key={m.week} className="hover:bg-apple-card/40 transition">
                    <td className="py-3 px-3 font-bold text-white whitespace-nowrap">{m.week}</td>
                    <td className="py-3 px-3 text-apple-label truncate" title={m.focus}>
                      {m.focus}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-apple-subhead">
                      {effTargets.targetW.toFixed(1)}kg
                    </td>
                    <td className="py-3 px-2">
                      <div className="w-[124px] mx-auto inline-flex items-center justify-between gap-1 bg-[#161618] px-2 py-1 rounded-xl border border-apple-elevated">
                        <button
                          type="button"
                          onClick={() => handleStepWeight(idx, -0.5)}
                          className="w-6 h-6 rounded-lg bg-apple-card hover:bg-apple-elevated text-apple-subhead hover:text-white text-xs font-bold transition flex items-center justify-center flex-shrink-0"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          step="0.1"
                          value={m.actualW !== null ? m.actualW : ''}
                          placeholder={effTargets.targetW.toFixed(1)}
                          onChange={(e) => handleInputWeight(idx, e.target.value)}
                          className="w-12 bg-[#1e1e20] text-center px-1 py-0.5 rounded text-xs sm:text-sm font-mono border border-[#3a3a3c] text-white focus:outline-none focus:border-apple-cyan"
                        />
                        <button
                          type="button"
                          onClick={() => handleStepWeight(idx, 0.5)}
                          className="w-6 h-6 rounded-lg bg-apple-card hover:bg-apple-elevated text-apple-subhead hover:text-white text-xs font-bold transition flex items-center justify-center flex-shrink-0"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">{deltaHtml}</td>
                    <td className="py-3 px-2 text-right font-mono text-apple-subhead">
                      {effTargets.targetWaist.toFixed(1)}cm
                    </td>
                    <td className="py-3 px-2">
                      <div className="w-[124px] mx-auto inline-flex items-center justify-between gap-1 bg-[#161618] px-2 py-1 rounded-xl border border-apple-elevated">
                        <button
                          type="button"
                          onClick={() => handleStepWaist(idx, -1.0)}
                          className="w-6 h-6 rounded-lg bg-apple-card hover:bg-apple-elevated text-apple-subhead hover:text-white text-xs font-bold transition flex items-center justify-center flex-shrink-0"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          step="0.5"
                          value={m.actualWaist !== null ? m.actualWaist : ''}
                          placeholder={effTargets.targetWaist.toFixed(1)}
                          onChange={(e) => handleInputWaist(idx, e.target.value)}
                          className="w-12 bg-[#1e1e20] text-center px-1 py-0.5 rounded text-xs sm:text-sm font-mono border border-[#3a3a3c] text-white focus:outline-none focus:border-apple-cyan"
                        />
                        <button
                          type="button"
                          onClick={() => handleStepWaist(idx, 1.0)}
                          className="w-6 h-6 rounded-lg bg-apple-card hover:bg-apple-elevated text-apple-subhead hover:text-white text-xs font-bold transition flex items-center justify-center flex-shrink-0"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    {ui.isInBodyMode && (
                      <>
                        <td className="py-3 px-2 text-right font-mono text-apple-cyan">
                          {effTargets.targetFat.toFixed(1)}%
                        </td>
                        <td className="py-3 px-2 text-center">
                          <input
                            type="number"
                            step="0.1"
                            value={m.actualFat !== null ? m.actualFat : ''}
                            placeholder={effTargets.targetFat.toFixed(1)}
                            onChange={(e) => handleInputFat(idx, e.target.value)}
                            className="w-14 bg-[#1e1e20] text-center px-1 py-1 rounded text-xs font-mono border border-[#3a3a3c] text-white focus:outline-none focus:border-apple-cyan"
                          />
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-apple-green">
                          {effTargets.targetSmm.toFixed(1)}kg
                        </td>
                        <td className="py-3 px-2 text-center">
                          <input
                            type="number"
                            step="0.1"
                            value={m.actualSmm !== null ? m.actualSmm : ''}
                            placeholder={effTargets.targetSmm.toFixed(1)}
                            onChange={(e) => handleInputSmm(idx, e.target.value)}
                            className="w-14 bg-[#1e1e20] text-center px-1 py-1 rounded text-xs font-mono border border-[#3a3a3c] text-white focus:outline-none focus:border-apple-cyan"
                          />
                        </td>
                      </>
                    )}
                    <td className="py-3 px-3 text-right">{statusBadge}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Achievement History Calendar (Heatmap Card) */}
      <div className="bg-apple-surface rounded-2xl p-5 border border-apple-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1c1c1e] pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              최근 28일 달성도 히트맵 &amp; 기록 캘린더
            </h3>
            <p className="text-xs text-apple-label mt-0.5">
              운동 및 식단 달성도를 시각적으로 추적하고 오늘의 진행 상태를 기록합니다
            </p>
          </div>
          <button
            type="button"
            onClick={handleSnapshotTodayLog}
            className="text-xs px-3 py-1.5 rounded-lg bg-apple-green text-black font-bold transition hover:opacity-90 whitespace-nowrap"
          >
            오늘 달성도 기록/스냅샷
          </button>
        </div>

        {/* 28-Day Grid (4 rows x 7 cols) */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {heatmapDays.map((item) => {
            const isSelected = selectedCalendarDate === item.dateStr;
            let bgColor = 'bg-[#1c1c1e] border-[#2c2c2e] text-apple-label';

            if (item.avgRate !== null) {
              if (item.avgRate >= 80) {
                bgColor = 'bg-[#30d158] border-apple-green text-black font-bold';
              } else if (item.avgRate >= 50) {
                bgColor = 'bg-[rgba(48,209,88,0.55)] border-apple-green/50 text-white font-semibold';
              } else if (item.avgRate > 0) {
                bgColor = 'bg-[rgba(48,209,88,0.25)] border-apple-green/30 text-white font-medium';
              }
            }

            return (
              <div
                key={item.dateStr}
                onClick={() => setSelectedCalendarDate(item.dateStr)}
                className={`p-2.5 rounded-xl border cursor-pointer transition flex flex-col justify-between h-20 ${bgColor} ${
                  isSelected ? 'ring-2 ring-apple-cyan shadow-lg' : 'hover:opacity-90'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span>{item.label}</span>
                  <span className="opacity-75">{item.dowLabel}</span>
                </div>
                <div className="text-center my-auto">
                  <span className="text-sm sm:text-base">
                    {item.avgRate !== null ? `${item.avgRate}%` : '-'}
                  </span>
                </div>
                <div className="text-[10px] truncate text-center opacity-85">
                  {item.log ? `${item.log.totalCal}kcal` : '미기록'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Day Detail Card & Heatmap Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
          <div className="bg-apple-card p-3 rounded-xl border border-apple-elevated/40 flex-1">
            <span className="font-semibold text-white mr-2">{selectedCalendarDate}</span>
            {selectedCalendarLog ? (
              <span className="text-apple-subhead font-mono">
                운동 {selectedCalendarLog.workoutRatePct}% | 식단 {selectedCalendarLog.dietRatePct}%
                | {selectedCalendarLog.totalCal} kcal | 단백질 {selectedCalendarLog.totalPro}g
              </span>
            ) : (
              <span className="text-apple-label">기록 없음 (활동 미기록 일자)</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-apple-label flex-shrink-0">
            <span>달성도:</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-[#1c1c1e] border border-[#2c2c2e] inline-block" />
              <span>0%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-[rgba(48,209,88,0.25)] inline-block" />
              <span>1~49%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-[rgba(48,209,88,0.55)] inline-block" />
              <span>50~79%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-[#30d158] inline-block" />
              <span className="text-white font-semibold">80%+</span>
            </div>
          </div>
        </div>
      </div>

      {/* Long-term Vision Card (Phase 2 Roadmap) */}
      <div className="bg-apple-surface rounded-2xl p-5 sm:p-6 space-y-3.5 border border-apple-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-apple-cyan uppercase tracking-wider">
              NEXT MILESTONE
            </span>
            <span className="text-sm font-bold text-white">
              Phase 2: 72kg &amp; 복근 가시화 로드맵
            </span>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-apple-card text-apple-label">
            12주 ~ 24주 차
          </span>
        </div>

        <p className="text-xs sm:text-sm text-apple-subhead leading-relaxed">
          11주 프로토콜(80.8kg 안착) 완주 후, 약 2~3주의{' '}
          <strong className="text-white">대사 회복기(Diet Break: 2,200 kcal 유지)</strong>를 거쳐
          체지방 10~12%(체중 72kg, 허리둘레 79cm)로 향하는 2단계 체지방 커팅 프로토콜로 진입합니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="p-4 bg-apple-card rounded-xl border border-apple-elevated/40">
            <span className="text-xs font-semibold text-apple-label">1단계 결산 (W11 완주)</span>
            <p className="text-base font-bold text-white mt-0.5">80.8 kg / 허리 95.5 cm</p>
            <p className="text-xs text-apple-label mt-1">체지방률 ~20% 진입, 내장지방 정상화</p>
          </div>
          <div className="p-4 bg-apple-card rounded-xl border border-apple-elevated/40">
            <span className="text-xs font-semibold text-apple-label">대사 회복기 (2~3주)</span>
            <p className="text-base font-bold text-white mt-0.5">80.5 ~ 81.0 kg 유지</p>
            <p className="text-xs text-apple-label mt-1">렙틴/갑상선 호르몬 정상화 &amp; 근력 증량</p>
          </div>
          <div className="p-4 bg-apple-card rounded-xl border border-apple-cyan/30 bg-apple-card/80">
            <span className="text-xs font-semibold text-apple-cyan">2단계 최종 목표 (Phase 2)</span>
            <p className="text-base font-bold text-white mt-0.5">72.0 kg / 허리 79.0 cm</p>
            <p className="text-xs text-apple-cyan mt-1">체지방률 10~12%, 상하 복근 라인 선명화</p>
          </div>
        </div>
      </div>
    </div>
  );
}
