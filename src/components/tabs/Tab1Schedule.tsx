import { useEffect, useState } from 'react';
import { DEFAULT_WEEKDAY_SCHEDULE, DEFAULT_WEEKEND_SCHEDULE } from '../../data/defaults';
import {
  applyScheduleGuardrails,
  buildRoutineBlocks,
  calculateSleepMetrics,
  formatDurationKorean,
  getActiveRoutineBlockId,
  mToKoreanTime,
  mToTime,
} from '../../domain/calculations';
import type {
  MyPTStateV1,
  RoutineBlock,
  RoutineBlockId,
  ScheduleConfig,
  ScheduleProfileKey,
  WorkoutCoursePreset,
} from '../../types/domain';

interface Tab1ScheduleProps {
  readonly state: MyPTStateV1;
  readonly onUpdateState: (updater: (prev: MyPTStateV1) => MyPTStateV1) => void;
}

interface TooltipState {
  readonly title: string;
  readonly time: string;
  readonly x: number;
  readonly y: number;
}

export function Tab1Schedule({ state, onUpdateState }: Tab1ScheduleProps) {
  const currentProfile = state.activeScheduleProfile;
  const sched = state.schedules[currentProfile];
  const blocks = buildRoutineBlocks(sched, currentProfile);

  const [nowMinutes, setNowMinutes] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  const [selectedBlockId, setSelectedBlockId] = useState<RoutineBlockId>(() => {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    return getActiveRoutineBlockId(blocks, mins);
  });

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const activeNowBlockId = getActiveRoutineBlockId(blocks, nowMinutes);
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) ?? blocks[0];
  const isNowActive = selectedBlock.id === activeNowBlockId;
  const sleepMetrics = calculateSleepMetrics(sched);

  const handleProfileChange = (profile: ScheduleProfileKey) => {
    onUpdateState((prev) => ({
      ...prev,
      activeScheduleProfile: profile,
    }));
  };

  const handleFocusNow = () => {
    const activeId = getActiveRoutineBlockId(blocks, nowMinutes);
    setSelectedBlockId(activeId);
  };

  const handleResetProfile = () => {
    const defaultSched =
      currentProfile === 'weekday' ? DEFAULT_WEEKDAY_SCHEDULE : DEFAULT_WEEKEND_SCHEDULE;
    onUpdateState((prev) => ({
      ...prev,
      schedules: {
        ...prev.schedules,
        [currentProfile]: defaultSched,
      },
    }));
    setSelectedBlockId(getActiveRoutineBlockId(buildRoutineBlocks(defaultSched, currentProfile), nowMinutes));
  };

  const handleToggle13hBar = () => {
    onUpdateState((prev) => ({
      ...prev,
      ui: {
        ...prev.ui,
        is13hBarOpen: !prev.ui.is13hBarOpen,
      },
    }));
  };

  const handleSelectCourse = (preset: WorkoutCoursePreset) => {
    onUpdateState((prev) => {
      const current = prev.schedules[prev.activeScheduleProfile];
      const updated = applyScheduleGuardrails({
        ...current,
        selectedCourse: preset,
        workoutDur: preset,
      });
      return {
        ...prev,
        schedules: {
          ...prev.schedules,
          [prev.activeScheduleProfile]: updated,
        },
      };
    });
  };

  const handleSliderChange = (key: keyof ScheduleConfig, val: number) => {
    onUpdateState((prev) => {
      const current = prev.schedules[prev.activeScheduleProfile];
      const updated = applyScheduleGuardrails({
        ...current,
        [key]: val,
      });
      return {
        ...prev,
        schedules: {
          ...prev.schedules,
          [prev.activeScheduleProfile]: updated,
        },
      };
    });
  };

  const cx = 230;
  const cy = 230;
  const r = 165;
  const arcLen = 1440;

  const cardinalTicks: ReadonlyArray<{ readonly offset: number; readonly label: string }> = [
    { offset: 0, label: '오전 0시' },
    { offset: 360, label: '오전 6시' },
    { offset: 720, label: '오후 12시' },
    { offset: 1080, label: '오후 6시' },
  ];

  const nowDeg = -90 + (nowMinutes / arcLen) * 360;
  const nowRad = (nowDeg * Math.PI) / 180;
  const nowLineInnerR = 146;
  const nowLineOuterR = 184;
  const nx1 = cx + nowLineInnerR * Math.cos(nowRad);
  const ny1 = cy + nowLineInnerR * Math.sin(nowRad);
  const nx2 = cx + nowLineOuterR * Math.cos(nowRad);
  const ny2 = cy + nowLineOuterR * Math.sin(nowRad);
  const dotX = cx + r * Math.cos(nowRad);
  const dotY = cy + r * Math.sin(nowRad);
  const badgeR = 124;
  const badgeX = cx + badgeR * Math.cos(nowRad);
  const badgeY = cy + badgeR * Math.sin(nowRad);

  const startRange = sched.leaveWork;
  const wakeTimeAbs = sched.wakeTime <= sched.leaveWork ? sched.wakeTime + 1440 : sched.wakeTime;
  const totalMins = Math.max(60, wakeTimeAbs - startRange);
  const eveningBlocks = blocks.filter((b) => b.id !== 'work');

  let activeOffsetAccum = 0;
  let selectedCenterPct = 50;
  let selectedColor = selectedBlock.color;

  const timelineSegments = eveningBlocks.map((b) => {
    const blockStartAbs = b.start < sched.leaveWork && b.start < 720 ? b.start + 1440 : b.start;
    const effectiveDur = b.id === 'sleep' ? Math.max(0, wakeTimeAbs - blockStartAbs) : b.dur;
    const segWidthPct = (effectiveDur / totalMins) * 100;
    const isSelected = b.id === selectedBlockId;

    if (isSelected) {
      selectedCenterPct = activeOffsetAccum + segWidthPct / 2;
      selectedColor = b.color;
    }

    const segData = {
      block: b,
      widthPct: segWidthPct,
      effectiveDur,
      isSelected,
    };
    activeOffsetAccum += segWidthPct;
    return segData;
  });

  const nowAbs = nowMinutes < sched.leaveWork && nowMinutes < 720 ? nowMinutes + 1440 : nowMinutes;
  const isNowInEveningWindow = nowAbs >= startRange && nowAbs <= wakeTimeAbs;
  const nowLinearPct = isNowInEveningWindow ? ((nowAbs - startRange) / totalMins) * 100 : null;

  const candidateMarkers: ReadonlyArray<{ readonly absMin: number; readonly label: string }> = [
    { absMin: 1080, label: '오후 6시 (18:00)' },
    { absMin: 1440, label: '자정 (00:00)' },
    { absMin: 1800, label: '오전 6시 (06:00)' },
  ];
  const dynamicMarkers = candidateMarkers
    .filter((cand) => cand.absMin > startRange + 35 && cand.absMin < wakeTimeAbs - 40)
    .map((cand) => ({
      pct: ((cand.absMin - startRange) / totalMins) * 100,
      label: cand.label,
    }));

  const getDynamicInstruction = (b: RoutineBlock): string => {
    const timeRange = `${mToTime(b.start)} ~ ${mToTime(b.start + b.dur)}`;
    switch (b.id) {
      case 'work':
        return currentProfile === 'weekend'
          ? `${timeRange} 주말 여가 및 자유 활동 시간. 가벼운 수분 섭취와 기립 스트레칭 병행.`
          : `${timeRange} 집중 업무 및 일과 시간. 수분 500ml 섭취 및 규칙적 기립 스트레칭.`;
      case 'transit':
        return currentProfile === 'weekend'
          ? `${timeRange} 체육관 이동 및 동적 모빌리티 스트레칭, 관절 활성화.`
          : `${timeRange} 업무 마감, 체육관 이동 및 웜업 스트레칭. 프리웨이트 부상 방지 관절 예열.`;
      case 'workout':
        return `${timeRange} 웨이트 트레이닝 + 유산소 프로토콜 결합 (${sched.workoutDur}분 코스, RPE 8 준수).`;
      case 'commute':
        return `${timeRange} 즉시 귀가 및 32~35°C 미온수 샤워. 코어 체온을 쿨다운시켜 야간 멜라토닌 분비 촉진.`;
      case 'dinner':
        return `${timeRange} 고단백 간편식(35g 이상) 섭취. 소화 시간 확보를 위해 ${mToTime(
          b.start + b.dur
        )} 이전 식사 완료 권장.`;
      case 'winddown':
        return `${timeRange} 최소 2시간 이상 식후 소화 및 야간 이완 시간 확보. 블루라이트 차단 및 폼롤러 스트레칭.`;
      case 'sleep':
        return `${timeRange} 90분 수면 주기 약 ${(b.dur / 90).toFixed(
          1
        )}회 충족. 근합성 및 대사 호르몬 정상화.`;
      default:
        return b.desc;
    }
  };

  const getSleepBadge = (mins: number) => {
    if (mins < 420) {
      return { text: '수면 부족', color: 'text-apple-orange' };
    }
    if (mins <= 540) {
      return { text: '최적 수면', color: 'text-apple-green' };
    }
    return { text: '충분한 휴식', color: 'text-apple-cyan' };
  };

  const sleepBadge = getSleepBadge(sleepMetrics.sleepMinutes);

  return (
    <div className="space-y-6">
      {/* Profile Switcher & Fast Actions */}
      <div className="bg-apple-surface rounded-2xl p-5 sm:p-6 border border-apple-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            저녁 일정 &amp; 스케줄러
          </h2>
          <p className="text-xs sm:text-sm text-apple-label mt-0.5">
            퇴근 후 웜업부터 수면까지의 최적 회복 타임라인을 관리합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center bg-[#1c1c1e] p-1 rounded-xl border border-apple-elevated/60">
            <button
              type="button"
              onClick={() => handleProfileChange('weekday')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                currentProfile === 'weekday'
                  ? 'bg-apple-elevated text-white shadow-sm'
                  : 'text-apple-label hover:text-white'
              }`}
            >
              평일 루틴
            </button>
            <button
              type="button"
              onClick={() => handleProfileChange('weekend')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                currentProfile === 'weekend'
                  ? 'bg-apple-elevated text-white shadow-sm'
                  : 'text-apple-label hover:text-white'
              }`}
            >
              주말/휴일
            </button>
          </div>

          <button
            type="button"
            onClick={handleFocusNow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-apple-card hover:bg-apple-elevated text-xs font-semibold text-apple-cyan border border-apple-cyan/30 transition"
          >
            <span className="w-2 h-2 rounded-full bg-apple-cyan animate-pulse" />
            현재 시각 포커스
          </button>

          <button
            type="button"
            onClick={handleResetProfile}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-apple-card hover:bg-apple-elevated text-apple-label hover:text-white transition font-medium"
          >
            재설정
          </button>
        </div>
      </div>

      {/* Main Grid: Left Dial + Linear Bar (7 cols) & Right Sliders (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 bg-apple-surface rounded-2xl p-5 sm:p-7 flex flex-col items-center relative border border-apple-card">
          <div className="w-full flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                24시간 원형 활동 다이얼
              </h3>
              <p className="text-xs sm:text-sm text-apple-label mt-0.5">
                블록을 클릭하여 세부 지침 및 타임라인을 확인합니다
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggle13hBar}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-apple-card hover:bg-apple-elevated text-xs sm:text-sm font-semibold transition text-white border border-apple-elevated/40"
            >
              <span>{state.ui.is13hBarOpen ? '▲' : '🌙'}</span>
              <span>{state.ui.is13hBarOpen ? '타임라인 접기' : '타임라인 펼치기'}</span>
            </button>
          </div>

          {/* 24-Hour Circular Dial SVG */}
          <div className="relative w-full max-w-[310px] sm:max-w-[370px] aspect-square flex items-center justify-center my-3">
            <svg
              id="routineSvg"
              viewBox="0 0 460 460"
              className="w-full h-full select-none overflow-visible"
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Outer Track */}
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#222225" strokeWidth={26} />

              {/* Cardinal Ticks & Labels */}
              {cardinalTicks.map((tick) => {
                const deg = -90 + (tick.offset / arcLen) * 360;
                const rad = (deg * Math.PI) / 180;
                const tx1 = cx + (r + 14) * Math.cos(rad);
                const ty1 = cy + (r + 14) * Math.sin(rad);
                const tx2 = cx + (r + 24) * Math.cos(rad);
                const ty2 = cy + (r + 24) * Math.sin(rad);
                const lx = cx + (r + 40) * Math.cos(rad);
                const ly = cy + (r + 40) * Math.sin(rad);

                const cosVal = Math.cos(rad);
                const sinVal = Math.sin(rad);
                let anchor: 'start' | 'end' | 'middle' = 'middle';
                let dy = 4;
                if (cosVal > 0.4) anchor = 'start';
                else if (cosVal < -0.4) anchor = 'end';
                else if (sinVal < -0.4) dy = -3;
                else if (sinVal > 0.4) dy = 12;

                return (
                  <g key={`cardinal-${tick.offset}`}>
                    <line
                      x1={tx1}
                      y1={ty1}
                      x2={tx2}
                      y2={ty2}
                      stroke="#86868b"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                    />
                    <text
                      x={lx}
                      y={ly + dy}
                      fill="#98989d"
                      fontSize={11}
                      fontWeight={600}
                      textAnchor={anchor}
                    >
                      {tick.label}
                    </text>
                  </g>
                );
              })}

              {/* 24-Hour Minor Hourly Ticks */}
              {Array.from({ length: 24 }).map((_, i) => {
                if (i % 6 === 0) return null;
                const deg = -90 + (i / 24) * 360;
                const rad = (deg * Math.PI) / 180;
                const tx1 = cx + (r + 15) * Math.cos(rad);
                const ty1 = cy + (r + 15) * Math.sin(rad);
                const tx2 = cx + (r + 20) * Math.cos(rad);
                const ty2 = cy + (r + 20) * Math.sin(rad);
                return (
                  <line
                    key={`minor-tick-${i}`}
                    x1={tx1}
                    y1={ty1}
                    x2={tx2}
                    y2={ty2}
                    stroke="#2c2c2e"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Routine Blocks Arcs */}
              {blocks.map((b) => {
                const startDeg = -90 + (b.start / arcLen) * 360;
                const endDeg = -90 + ((b.start + b.dur) / arcLen) * 360;
                const startRad = (startDeg * Math.PI) / 180;
                const endRad = (endDeg * Math.PI) / 180;
                const x1 = cx + r * Math.cos(startRad);
                const y1 = cy + r * Math.sin(startRad);
                const x2 = cx + r * Math.cos(endRad);
                const y2 = cy + r * Math.sin(endRad);
                const arcAngle = (b.dur / arcLen) * 360;
                const largeArc = arcAngle > 180 ? 1 : 0;
                const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;

                const isSelected = b.id === selectedBlockId;
                const arcOpacity = state.ui.is13hBarOpen && b.id === 'work' ? 0.22 : 1.0;

                return (
                  <path
                    key={b.id}
                    d={d}
                    fill="none"
                    stroke={b.color}
                    strokeWidth={24}
                    strokeLinecap="round"
                    opacity={arcOpacity}
                    className="transition-all duration-200 cursor-pointer"
                    style={{
                      filter: isSelected ? 'drop-shadow(0 0 8px rgba(255,255,255,0.45))' : 'none',
                    }}
                    onClick={() => setSelectedBlockId(b.id)}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                      if (rect) {
                        setTooltip({
                          title: b.title,
                          time: `${mToTime(b.start)} ~ ${mToTime(b.start + b.dur)} (${formatDurationKorean(b.dur)})`,
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                        });
                      }
                    }}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                      if (rect) {
                        setTooltip({
                          title: b.title,
                          time: `${mToTime(b.start)} ~ ${mToTime(b.start + b.dur)} (${formatDurationKorean(b.dur)})`,
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                        });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}

              {/* Real-time Live `Now` Needle & Glowing Marker on Ring */}
              <g id="liveNowDialGroup">
                <line
                  x1={nx1}
                  y1={ny1}
                  x2={nx2}
                  y2={ny2}
                  stroke="#fa114f"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                <circle cx={dotX} cy={dotY} r={7.5} fill="#fa114f" fillOpacity={0.4} />
                <circle cx={dotX} cy={dotY} r={4.5} fill="#fa114f" />
                <circle cx={dotX} cy={dotY} r={2} fill="#ffffff" />

                {/* Mini NOW Tag on Dial Ring */}
                <g transform={`translate(${badgeX}, ${badgeY})`}>
                  <rect
                    x={-28}
                    y={-9}
                    width={56}
                    height={18}
                    rx={9}
                    fill="#fa114f"
                    fillOpacity={0.92}
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                  />
                  <text
                    x={0}
                    y={3.5}
                    fill="#ffffff"
                    fontSize={9.5}
                    fontWeight={800}
                    textAnchor="middle"
                    className="font-mono"
                  >
                    NOW {mToTime(nowMinutes)}
                  </text>
                </g>
              </g>

              {/* Center Hollow Face */}
              <circle cx={cx} cy={cy} r={148} fill="#161618" />
            </svg>

            {/* Hover Tooltip */}
            {tooltip && (
              <div
                className="absolute pointer-events-none px-3 py-1.5 rounded-xl bg-black/90 border border-apple-card text-center shadow-xl z-20 backdrop-blur-md -translate-x-1/2 -translate-y-full"
                style={{
                  left: tooltip.x,
                  top: tooltip.y - 12,
                }}
              >
                <span className="text-xs font-bold text-white block">{tooltip.title}</span>
                <span className="text-[11px] font-mono text-apple-cyan block">{tooltip.time}</span>
              </div>
            )}

            {/* Center Metric Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-apple-label">
                {isNowActive ? '현재 진행 중 (NOW)' : '선택된 구간'}
              </span>
              <span className="text-lg sm:text-2xl font-bold text-white tracking-tight mt-0.5 max-w-[200px] truncate">
                {selectedBlock.title}
              </span>
              <span className="text-xs sm:text-sm font-medium text-apple-cyan mt-1">
                {mToKoreanTime(selectedBlock.start)} ~{' '}
                {mToKoreanTime(selectedBlock.start + selectedBlock.dur)}
              </span>
              <div
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  color: selectedBlock.color,
                  backgroundColor: `${selectedBlock.color}20`,
                }}
              >
                {formatDurationKorean(selectedBlock.dur)} 진행
              </div>
            </div>
          </div>

          {/* Unrolled 13-Hour Linear Bar (collapsible) */}
          {state.ui.is13hBarOpen && (
            <div className="w-full bg-apple-card rounded-2xl p-4 sm:p-5 border border-apple-elevated/60 shadow-lg my-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-apple-cyan animate-pulse" />
                  <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
                    저녁 ~ 수면 타임라인 ({mToTime(sched.leaveWork)} ~ {mToTime(sched.wakeTime)})
                  </span>
                </div>
                <span className="text-xs text-apple-cyan font-mono font-semibold">
                  총 {formatDurationKorean(totalMins)} ({totalMins}분)
                </span>
              </div>

              {/* Gauge Bar & Pins */}
              <div className="relative w-full pt-1 pb-3">
                <div className="w-full h-7 sm:h-8 bg-apple-surface rounded-xl flex overflow-hidden p-0.5 gap-1 border border-apple-elevated shadow-inner">
                  {timelineSegments.map((seg) => (
                    <button
                      key={`timeline-seg-${seg.block.id}`}
                      type="button"
                      style={{
                        width: `${seg.widthPct}%`,
                        backgroundColor: seg.block.color,
                      }}
                      className={`h-full rounded-md transition-all duration-300 cursor-pointer ${
                        seg.isSelected
                          ? 'ring-2 ring-white scale-y-110 shadow-lg z-10'
                          : 'opacity-85 hover:opacity-100 hover:scale-y-105'
                      }`}
                      title={`${seg.block.title} (${formatDurationKorean(seg.effectiveDur)}: ${mToTime(
                        seg.block.start
                      )} ~ ${mToTime(seg.block.start + seg.effectiveDur)})`}
                      onClick={() => setSelectedBlockId(seg.block.id)}
                    />
                  ))}
                </div>

                {/* Sliding Caret Pin */}
                <div
                  className="absolute -bottom-1 w-0 h-0 border-x-[7px] border-x-transparent border-t-[8px] -translate-x-1/2 pointer-events-none filter drop-shadow transition-all duration-300"
                  style={{
                    left: `${Math.min(96, Math.max(4, selectedCenterPct))}%`,
                    borderTopColor: selectedColor,
                  }}
                />

                {/* Live NOW Pin Marker on Linear Bar */}
                {nowLinearPct !== null && (
                  <div
                    className="absolute -top-3.5 z-20 flex flex-col items-center -translate-x-1/2 pointer-events-none"
                    style={{ left: `${Math.min(98, Math.max(2, nowLinearPct))}%` }}
                  >
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#fa114f] text-white tracking-wider shadow animate-pulse">
                      NOW
                    </span>
                    <div className="w-0.5 h-8 bg-[#fa114f]" />
                  </div>
                )}
              </div>

              {/* Non-overlapping Milestone Axis */}
              <div className="relative w-full h-8 mt-1 select-none">
                {/* Left Start Boundary */}
                <div className="absolute left-0 flex flex-col items-start translate-x-0">
                  <div className="w-0.5 h-3 bg-apple-cyan" />
                  <span className="text-[10px] sm:text-[11px] font-mono mt-0.5 text-white font-bold whitespace-nowrap">
                    퇴근 {mToTime(sched.leaveWork)}
                  </span>
                </div>

                {/* Intermediate Milestones */}
                {dynamicMarkers.map((marker, idx) => (
                  <div
                    key={`marker-${idx}`}
                    className="absolute flex flex-col items-center -translate-x-1/2"
                    style={{ left: `${marker.pct}%` }}
                  >
                    <div className="w-0.5 h-2 bg-apple-label" />
                    <span className="text-[10px] sm:text-[11px] font-mono mt-0.5 text-apple-subhead font-medium whitespace-nowrap">
                      {marker.label}
                    </span>
                  </div>
                ))}

                {/* Right End Boundary */}
                <div className="absolute right-0 flex flex-col items-end -translate-x-full">
                  <div className="w-0.5 h-3 bg-apple-cyan" />
                  <span className="text-[10px] sm:text-[11px] font-mono mt-0.5 text-white font-bold whitespace-nowrap">
                    기상 {mToTime(sched.wakeTime)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Guide Detail Card */}
          <div
            className="w-full mt-2 p-4 bg-apple-card rounded-xl flex items-start gap-3.5 transition border-l-4 shadow-md"
            style={{ borderLeftColor: selectedBlock.color }}
          >
            <div
              className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
              style={{ backgroundColor: selectedBlock.color }}
            />
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h4 className="text-sm font-bold text-white">{selectedBlock.title}</h4>
                <span className="text-xs text-apple-label font-medium">
                  {formatDurationKorean(selectedBlock.dur)} 소요 ({mToTime(selectedBlock.start)} ~{' '}
                  {mToTime(selectedBlock.start + selectedBlock.dur)})
                </span>
              </div>
              <p className="text-xs sm:text-sm text-apple-subhead mt-1 leading-relaxed">
                {getDynamicInstruction(selectedBlock)}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Presets & Sliders */}
        <div className="lg:col-span-5 space-y-4">
          {/* Course Presets */}
          <div className="bg-apple-surface rounded-2xl p-5 sm:p-6 space-y-3.5 border border-apple-card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">운동 코스 프리셋</h3>
                <p className="text-xs sm:text-sm text-apple-label mt-0.5">상황별 총 운동 시간 즉시 설정</p>
              </div>
              <span className="text-xs font-semibold text-apple-green bg-apple-green/10 px-2.5 py-1 rounded-md">
                {sched.workoutDur}분 코스
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleSelectCourse(60)}
                className={`text-left p-3 rounded-xl transition border ${
                  sched.selectedCourse === 60
                    ? 'bg-apple-elevated border-apple-green/40'
                    : 'bg-apple-card hover:bg-apple-card-hover border-transparent'
                }`}
              >
                <div className="flex justify-between items-baseline">
                  <span className="text-xs sm:text-sm font-bold text-white">60분</span>
                  <span className="text-[11px] text-apple-label">야근/단축</span>
                </div>
                <p className="text-xs text-apple-label mt-1">웨이트 35 + 유산소 20</p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectCourse(80)}
                className={`text-left p-3 rounded-xl transition border ${
                  sched.selectedCourse === 80
                    ? 'bg-apple-elevated border-apple-green/40'
                    : 'bg-apple-card hover:bg-apple-card-hover border-transparent'
                }`}
              >
                <div className="flex justify-between items-baseline">
                  <span className="text-xs sm:text-sm font-bold text-white">80분</span>
                  <span className="text-[11px] text-apple-label">평일 밸런스</span>
                </div>
                <p className="text-xs text-apple-label mt-1">웨이트 45 + 유산소 25</p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectCourse(100)}
                className={`text-left p-3 rounded-xl transition border ${
                  sched.selectedCourse === 100
                    ? 'bg-apple-elevated border-apple-green/40'
                    : 'bg-apple-card hover:bg-apple-card-hover border-transparent'
                }`}
              >
                <div className="flex justify-between items-baseline">
                  <span className="text-xs sm:text-sm font-bold text-white">100분</span>
                  <span className="text-[11px] text-apple-green font-semibold bg-apple-green/10 px-1.5 py-0.5 rounded">
                    권장
                  </span>
                </div>
                <p className="text-xs text-apple-label mt-1">웨이트 45 + 유산소 40</p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectCourse(120)}
                className={`text-left p-3 rounded-xl transition border ${
                  sched.selectedCourse === 120
                    ? 'bg-apple-elevated border-apple-green/40'
                    : 'bg-apple-card hover:bg-apple-card-hover border-transparent'
                }`}
              >
                <div className="flex justify-between items-baseline">
                  <span className="text-xs sm:text-sm font-bold text-white">120분</span>
                  <span className="text-[11px] text-apple-label">주말 여유</span>
                </div>
                <p className="text-xs text-apple-label mt-1">웨이트 60 + 유산소 45</p>
              </button>
            </div>
          </div>

          {/* Precision Adjusters */}
          <div className="bg-apple-surface rounded-2xl p-5 sm:p-6 space-y-4 border border-apple-card">
            <h3 className="text-sm font-bold text-white tracking-tight">세부 시간 미세조정</h3>

            {/* 1. 퇴근 / 외출 시각 */}
            <div>
              <div className="flex justify-between text-xs sm:text-sm mb-1.5">
                <span className="text-apple-label font-medium">
                  {currentProfile === 'weekend' ? '1. 외출/준비 시각' : '1. 퇴근 시각'}
                </span>
                <span className="font-bold text-white font-mono">{mToTime(sched.leaveWork)}</span>
              </div>
              <input
                type="range"
                min={currentProfile === 'weekend' ? 600 : 960}
                max={1200}
                step={10}
                value={sched.leaveWork}
                onChange={(e) => handleSliderChange('leaveWork', Number.parseInt(e.target.value, 10))}
                className="w-full accent-apple-cyan"
              />
            </div>

            {/* 2. 운동 시작 */}
            <div>
              <div className="flex justify-between text-xs sm:text-sm mb-1.5">
                <span className="text-apple-label font-medium">2. 운동 시작</span>
                <span className="font-bold text-white font-mono">{mToTime(sched.workoutStart)}</span>
              </div>
              <input
                type="range"
                min={660}
                max={1320}
                step={5}
                value={sched.workoutStart}
                onChange={(e) =>
                  handleSliderChange('workoutStart', Number.parseInt(e.target.value, 10))
                }
                className="w-full accent-apple-cyan"
              />
            </div>

            {/* 3. 총 운동 시간 */}
            <div>
              <div className="flex justify-between text-xs sm:text-sm mb-1.5">
                <span className="text-apple-label font-medium">3. 운동 시간</span>
                <span className="font-bold text-apple-green font-mono">{sched.workoutDur}분</span>
              </div>
              <input
                type="range"
                min={40}
                max={180}
                step={5}
                value={sched.workoutDur}
                onChange={(e) => handleSliderChange('workoutDur', Number.parseInt(e.target.value, 10))}
                className="w-full accent-apple-green"
              />
            </div>

            {/* 4. 저녁 식사 시작 */}
            <div>
              <div className="flex justify-between text-xs sm:text-sm mb-1.5">
                <span className="text-apple-label font-medium">4. 저녁 식사 시작</span>
                <span className="font-bold text-white font-mono">{mToTime(sched.dinnerStart)}</span>
              </div>
              <input
                type="range"
                min={840}
                max={1380}
                step={5}
                value={sched.dinnerStart}
                onChange={(e) => handleSliderChange('dinnerStart', Number.parseInt(e.target.value, 10))}
                className="w-full accent-apple-cyan"
              />
            </div>

            {/* 5. 취침 시각 */}
            <div>
              <div className="flex justify-between text-xs sm:text-sm mb-1.5">
                <span className="text-apple-label font-medium">5. 취침 시각</span>
                <span className="font-bold text-white font-mono">{mToTime(sched.bedtime)}</span>
              </div>
              <input
                type="range"
                min={1200}
                max={1560}
                step={10}
                value={sched.bedtime}
                onChange={(e) => handleSliderChange('bedtime', Number.parseInt(e.target.value, 10))}
                className="w-full accent-apple-cyan"
              />
            </div>

            {/* 6. 기상 시각 */}
            <div>
              <div className="flex justify-between text-xs sm:text-sm mb-1.5">
                <span className="text-apple-label font-medium">6. 기상 시각</span>
                <span className="font-bold text-apple-cyan font-mono">{mToTime(sched.wakeTime)}</span>
              </div>
              <input
                type="range"
                min={300}
                max={660}
                step={10}
                value={sched.wakeTime}
                onChange={(e) => handleSliderChange('wakeTime', Number.parseInt(e.target.value, 10))}
                className="w-full accent-apple-cyan"
              />
            </div>

            {/* 7. 총 수면 시간 & 회복 주기 */}
            <div className="p-3 bg-apple-card rounded-xl border border-apple-elevated/40">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-apple-label font-medium">7. 총 수면 시간</span>
                <span className="font-bold text-apple-cyan font-mono">
                  {formatDurationKorean(sleepMetrics.sleepMinutes)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-apple-subhead mt-1">
                <span>90분 수면 주기 약 {sleepMetrics.cycles}회 충족</span>
                <span className={`font-semibold ${sleepBadge.color}`}>{sleepBadge.text}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Timeline Action Guide (Desktop Table + Mobile Cards) */}
      <div className="bg-apple-surface rounded-2xl p-5 sm:p-6 border border-apple-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              타임라인 행동 가이드
            </h3>
            <p className="text-xs sm:text-sm text-apple-label mt-0.5">
              구간별 핵심 행동 수칙 및 생체 리듬 최적화 지침
            </p>
          </div>
          <span className="text-xs font-medium text-apple-label">{blocks.length}개 블록</span>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="text-apple-label border-b border-apple-card">
                <th className="py-3 px-3.5 font-semibold w-[170px]">구간</th>
                <th className="py-3 px-3 font-semibold min-w-[125px] whitespace-nowrap">시간대</th>
                <th className="py-3 px-3 font-semibold min-w-[95px] whitespace-nowrap">소요</th>
                <th className="py-3 px-4 font-semibold">실행 지침</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-apple-card/60">
              {blocks.map((b) => {
                const isSelected = b.id === selectedBlockId;
                return (
                  <tr
                    key={`tbl-${b.id}`}
                    onClick={() => setSelectedBlockId(b.id)}
                    className={`transition cursor-pointer ${
                      isSelected ? 'bg-apple-card/80 font-medium' : 'hover:bg-apple-card/40'
                    }`}
                  >
                    <td className="py-3 px-3.5 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: b.color }}
                      />
                      <span className="font-bold text-white text-xs sm:text-sm whitespace-nowrap">
                        {b.title}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-apple-cyan text-xs sm:text-sm whitespace-nowrap">
                      {mToTime(b.start)} ~ {mToTime(b.start + b.dur)}
                    </td>
                    <td className="py-3 px-3 text-apple-label font-medium text-xs sm:text-sm whitespace-nowrap min-w-[95px]">
                      {formatDurationKorean(b.dur)}
                    </td>
                    <td className="py-3 px-4 text-apple-subhead text-xs sm:text-sm leading-snug">
                      {b.desc}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="block md:hidden space-y-2">
          {blocks.map((b) => {
            const isSelected = b.id === selectedBlockId;
            return (
              <div
                key={`mob-${b.id}`}
                onClick={() => setSelectedBlockId(b.id)}
                className={`p-3.5 bg-apple-card rounded-xl border cursor-pointer transition ${
                  isSelected
                    ? 'border-apple-accent shadow-md'
                    : 'border-apple-elevated/40 hover:border-apple-elevated'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: b.color }}
                    />
                    <span className="font-bold text-white text-xs sm:text-sm">{b.title}</span>
                  </div>
                  <span className="text-xs font-mono text-apple-cyan">
                    {mToTime(b.start)} ~ {mToTime(b.start + b.dur)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-apple-surface text-xs text-apple-subhead">
                  <span>{formatDurationKorean(b.dur)} 소요</span>
                  <span className="text-[11px] text-apple-label">탭하여 선택</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
