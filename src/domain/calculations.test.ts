import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyIngredientsDelta,
  applyScheduleGuardrails,
  buildRoutineBlocks,
  calculateDigestionMetrics,
  calculateDinnerSetAvailableCount,
  calculateEstimated1RM,
  calculateSleepMetrics,
  computeTodayLog,
  formatDurationKorean,
  formatLocalDate,
  getActiveRoutineBlockId,
  getCourseVolumeGuide,
  getEffectiveMilestoneTargets,
  mToKoreanTime,
  mToTime,
} from './calculations.ts';
import { createDefaultState } from '../data/defaults.ts';
import type {
  DinnerSetSpec,
  InventoryItem,
  MilestoneRow,
  ScheduleConfig,
} from '../types/domain';

describe('domain calculations', () => {
  it('converts minutes to HH:MM format with wrapping', () => {
    assert.equal(mToTime(480), '08:00');
    assert.equal(mToTime(1050), '17:30');
    assert.equal(mToTime(1440), '00:00');
    assert.equal(mToTime(1500), '01:00');
    assert.equal(mToTime(-60), '23:00');
  });

  it('formats duration in Korean', () => {
    assert.equal(formatDurationKorean(0), '0분');
    assert.equal(formatDurationKorean(30), '30분');
    assert.equal(formatDurationKorean(60), '1시간');
    assert.equal(formatDurationKorean(100), '1시간 40분');
    assert.equal(formatDurationKorean(120), '2시간');
  });

  it('enforces schedule guardrails sequentially', () => {
    const invalidSched: ScheduleConfig = {
      workStart: 480,
      leaveWork: 1050, // 17:30
      workoutStart: 1055, // Only 5 min later (should be >= 1060)
      workoutDur: 100,
      dinnerStart: 1100, // Too early (should be >= 1060 + 100 + 15 = 1175)
      dinnerDur: 30,
      bedtime: 1200, // Too early (should be >= 1175 + 30 + 120 = 1325)
      wakeTime: 420,
      selectedCourse: 100,
    };

    const guarded = applyScheduleGuardrails(invalidSched);
    assert.equal(guarded.workoutStart, 1060);
    assert.equal(guarded.dinnerStart, 1175);
    assert.equal(guarded.bedtime, 1325);
  });

  it('calculates sleep metrics correctly', () => {
    const sched: ScheduleConfig = {
      workStart: 480,
      leaveWork: 1050,
      workoutStart: 1080,
      workoutDur: 100,
      dinnerStart: 1210,
      dinnerDur: 30,
      bedtime: 1380, // 23:00
      wakeTime: 420,  // 07:00
      selectedCourse: 100,
    };

    const metrics = calculateSleepMetrics(sched);
    assert.equal(metrics.sleepMinutes, 480);
    assert.equal(metrics.sleepHours, 8.0);
    assert.equal(metrics.cycles, 5.3);
  });

  it('calculates digestion metrics correctly', () => {
    const sched: ScheduleConfig = {
      workStart: 480,
      leaveWork: 1050,
      workoutStart: 1080,
      workoutDur: 100,
      dinnerStart: 1210, // 20:10
      dinnerDur: 30,     // finishes 20:40 (1240)
      bedtime: 1380,     // 23:00
      wakeTime: 420,
      selectedCourse: 100,
    };

    const metrics = calculateDigestionMetrics(sched);
    assert.equal(metrics.dinnerEnd, 1240);
    assert.equal(metrics.digestionMinutes, 140); // 2 hours 20 mins
    assert.equal(metrics.digH, 2);
    assert.equal(metrics.digM, 20);
    assert.equal(metrics.isSufficient, true);
  });

  it('calculates estimated 1RM using Epley formula', () => {
    assert.equal(calculateEstimated1RM(100, 1), 100);
    assert.equal(calculateEstimated1RM(100, 8), 126.7);
    assert.equal(calculateEstimated1RM(75, 8), 95);
    assert.equal(calculateEstimated1RM(0, 10), 0);
  });

  it('provides course volume guides', () => {
    assert.equal(getCourseVolumeGuide(60).cardioMinutes, 15);
    assert.equal(getCourseVolumeGuide(80).cardioMinutes, 25);
    assert.equal(getCourseVolumeGuide(100).cardioMinutes, 40);
    assert.equal(getCourseVolumeGuide(120).cardioMinutes, 45);
  });

  it('builds routine blocks and finds active block', () => {
    const sched: ScheduleConfig = {
      workStart: 480,
      leaveWork: 1050,
      workoutStart: 1080,
      workoutDur: 100,
      dinnerStart: 1210,
      dinnerDur: 30,
      bedtime: 1380,
      wakeTime: 420,
      selectedCourse: 100,
    };

    const blocks = buildRoutineBlocks(sched, 'weekday');
    assert.equal(blocks.length, 7);

    assert.equal(getActiveRoutineBlockId(blocks, 500), 'work');
    assert.equal(getActiveRoutineBlockId(blocks, 1060), 'transit');
    assert.equal(getActiveRoutineBlockId(blocks, 1100), 'workout');
    assert.equal(getActiveRoutineBlockId(blocks, 1190), 'commute');
    assert.equal(getActiveRoutineBlockId(blocks, 1220), 'dinner');
    assert.equal(getActiveRoutineBlockId(blocks, 1300), 'winddown');
    assert.equal(getActiveRoutineBlockId(blocks, 1400), 'sleep');
    assert.equal(getActiveRoutineBlockId(blocks, 100), 'sleep');
  });

  it('calculates available dinner set counts across multiple ingredients', () => {
    const inventory: InventoryItem[] = [
      { id: 'inv_rice', name: '볶음밥', count: 12, unit: '팩', cal: 390, pro: 16 },
      { id: 'inv_chicken', name: '닭가슴살', count: 5, unit: '팩', cal: 120, pro: 22 },
      { id: 'inv_egg', name: '계란', count: 9, unit: '알', cal: 65, pro: 6 },
    ];

    const setA: DinnerSetSpec = {
      key: 'A',
      name: '세트 A',
      summary: '볶음밥 1 + 닭가슴살 1',
      cal: 510,
      pro: 38,
      ingredients: [
        { invId: 'inv_rice', qty: 1 },
        { invId: 'inv_chicken', qty: 1 },
      ],
    };

    // rice has 12, chicken has 5 -> min is 5
    assert.equal(calculateDinnerSetAvailableCount(setA, inventory), 5);

    const setC: DinnerSetSpec = {
      key: 'C',
      name: '세트 C',
      summary: '닭 1 + 계란 2',
      cal: 540,
      pro: 52,
      ingredients: [
        { invId: 'inv_chicken', qty: 1 },
        { invId: 'inv_egg', qty: 2 },
      ],
    };

    // chicken has 5 (5/1 = 5), egg has 9 (9/2 = 4) -> min is 4
    assert.equal(calculateDinnerSetAvailableCount(setC, inventory), 4);
  });

  it('deducts and restores multiple inventory ingredients safely without negative stock', () => {
    const inventory: InventoryItem[] = [
      { id: 'inv_rice', name: '볶음밥', count: 1, unit: '팩', cal: 390, pro: 16 },
      { id: 'inv_chicken', name: '닭가슴살', count: 0, unit: '팩', cal: 120, pro: 22 },
    ];

    const ingredients = [
      { invId: 'inv_rice', qty: 2 },
      { invId: 'inv_chicken', qty: 1 },
    ];

    const deducted = applyIngredientsDelta(inventory, ingredients, 'deduct');
    assert.equal(deducted.find((i) => i.id === 'inv_rice')?.count, 0); // clamped at 0
    assert.equal(deducted.find((i) => i.id === 'inv_chicken')?.count, 0);

    const restored = applyIngredientsDelta(deducted, ingredients, 'restore');
    assert.equal(restored.find((i) => i.id === 'inv_rice')?.count, 2);
    assert.equal(restored.find((i) => i.id === 'inv_chicken')?.count, 1);
  });

  it('calculates milestone effective targets non-cumulatively from baseline', () => {
    const baseline: MilestoneRow = {
      week: '시작',
      focus: '기준점',
      baseTargetW: 91.1,
      actualW: 95.0, // Modified from 91.1 to 95.0 (+3.9kg offset)
      baseTargetWaist: 110.0,
      actualWaist: 112.0, // +2.0cm offset
      baseTargetFat: 28.5,
      actualFat: 28.5,
      baseTargetSmm: 36.5,
      actualSmm: 36.5,
    };

    const rowW01: MilestoneRow = {
      week: 'W01',
      focus: '80kg대 진입',
      baseTargetW: 89.5,
      actualW: null,
      baseTargetWaist: 108.0,
      actualWaist: null,
      baseTargetFat: 27.8,
      actualFat: null,
      baseTargetSmm: 36.4,
      actualSmm: null,
    };

    const targets = getEffectiveMilestoneTargets(rowW01, 1, baseline);
    // 89.5 + 3.9 = 93.4
    assert.equal(targets.targetW, 93.4);
    // 108.0 + 2.0 = 110.0
    assert.equal(targets.targetWaist, 110.0);

    // If baseline actual weight changes again to 90.0 (-1.1kg offset)
    const updatedBaseline: MilestoneRow = {
      ...baseline,
      actualW: 90.0,
    };
    const updatedTargets = getEffectiveMilestoneTargets(rowW01, 1, updatedBaseline);
    // 89.5 - 1.1 = 88.4 (non-cumulative! Never distorts)
    assert.equal(updatedTargets.targetW, 88.4);
  });

  it('formats natural Korean time strings accurately', () => {
    assert.equal(mToKoreanTime(0), '자정 12시 00분');
    assert.equal(mToKoreanTime(480), '오전 8시 00분');
    assert.equal(mToKoreanTime(720), '오후 12시 00분');
    assert.equal(mToKoreanTime(1050), '오후 5시 30분');
    assert.equal(mToKoreanTime(1380), '밤 11시 00분');
  });

  it('finds active block at minute for live Now needle', () => {
    const state = createDefaultState();
    const blocks = buildRoutineBlocks(state.schedules.weekday, 'weekday');
    assert.equal(getActiveRoutineBlockId(blocks, 1100), 'workout');
    assert.equal(getActiveRoutineBlockId(blocks, 1215), 'dinner');
  });

  it('isolates cardioDone per day of week (Legacy Defect #3)', () => {
    const state = createDefaultState();
    assert.equal(state.workoutsByDay.mon.cardioDone, false);
    assert.equal(state.workoutsByDay.tue.cardioDone, false);

    const updatedWorkouts = {
      ...state.workoutsByDay,
      mon: { ...state.workoutsByDay.mon, cardioDone: true },
    };
    assert.equal(updatedWorkouts.mon.cardioDone, true);
    assert.equal(updatedWorkouts.tue.cardioDone, false);
    assert.equal(updatedWorkouts.sun.cardioDone, false);
  });

  it('computes today achievement log snapshot accurately', () => {
    const state = createDefaultState();
    const log = computeTodayLog(state, '2026-10-30');
    assert.equal(log.date, '2026-10-30');
    assert.equal(log.workoutRatePct, 0);
    assert.equal(log.dietRatePct, 0);
    assert.equal(log.totalCal, 0);
    assert.equal(log.totalPro, 0);
  });

  it('formats local date as YYYY-MM-DD using local calendar components', () => {
    const sample = new Date(2026, 9, 30, 1, 15, 0); // Oct 30, 2026 01:15 local
    assert.equal(formatLocalDate(sample), '2026-10-30');
  });

  it('handles post-midnight bedtime (>= 1440) in sleep metrics and active block lookup', () => {
    const lateSched: ScheduleConfig = {
      workStart: 480,
      leaveWork: 1080,
      workoutStart: 1140,
      workoutDur: 100,
      dinnerStart: 1260,
      dinnerDur: 30,
      bedtime: 1500, // 01:00 AM next day
      wakeTime: 420, // 07:00 AM
      selectedCourse: 100,
    };

    const sleep = calculateSleepMetrics(lateSched);
    assert.equal(sleep.sleepMinutes, 360); // 6 hours (01:00 -> 07:00)
    assert.equal(sleep.sleepHours, 6.0);

    const blocks = buildRoutineBlocks(lateSched, 'weekday');
    // At 00:30 AM (30 mins), still in winddown (21:30 -> 01:00)
    assert.equal(getActiveRoutineBlockId(blocks, 30), 'winddown');
    // At 02:00 AM (120 mins), in sleep (01:00 -> 07:00)
    assert.equal(getActiveRoutineBlockId(blocks, 120), 'sleep');
  });
});
