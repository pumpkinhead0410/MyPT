import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer, type ViteDevServer } from 'vite';
import { createDefaultState } from '../data/defaults.ts';

describe('UI component rendering verification via Vite SSR', () => {
  let vite: ViteDevServer;

  before(async () => {
    vite = await createServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'custom',
      logLevel: 'error',
    });
  });

  after(async () => {
    await vite.close();
  });

  it('renders App root with Header, TopSummaryBar, and default Tab 1', async () => {
    const { App } = await vite.ssrLoadModule('/src/App.tsx');
    const html = renderToStaticMarkup(createElement(App));
    assert.match(html, /건강 &amp; 루틴/);
    assert.match(html, /91\.1kg ➔ 80\.8kg/);
    assert.match(html, /데이터 백업 및 복원/);
    assert.match(html, /평일 루틴/);
    assert.match(html, /주말\/휴일/);
  });

  it('renders Tab 1 (Schedule) with 24h donut, 13h linear bar, and digestion metrics', async () => {
    const { Tab1Schedule } = await vite.ssrLoadModule('/src/components/tabs/Tab1Schedule.tsx');
    const state = createDefaultState();
    const html = renderToStaticMarkup(
      createElement(Tab1Schedule, { state, onUpdateState: () => {} })
    );
    assert.match(html, /24시간 원형 활동 다이얼/);
    assert.match(html, /타임라인 접기/);
    assert.match(html, /최소 2시간 20분 이상 소화 시간 확보/);
    assert.match(html, /타임라인 행동 가이드/);
  });

  it('renders Tab 2 (Workout) with 7-day selector, 1RM badge, and SVG trend chart without rest timer', async () => {
    const { Tab2Workout } = await vite.ssrLoadModule('/src/components/tabs/Tab2Workout.tsx');
    const state = createDefaultState();
    const html = renderToStaticMarkup(
      createElement(Tab2Workout, { state, onUpdateState: () => {} })
    );
    assert.match(html, /종목 추가/);
    assert.match(html, /추정 1RM/);
    assert.match(html, /1RM 기록 반영/);
    assert.match(html, /종목별 중량 &amp; 추정 1RM 성장 추이/);
    assert.doesNotMatch(html, /휴식 타이머/);
  });

  it('renders Tab 3 (Diet & Inventory) with multi-stock dinner sets A/B/C and without water tracker', async () => {
    const { Tab3Diet } = await vite.ssrLoadModule('/src/components/tabs/Tab3Diet.tsx');
    const state = createDefaultState();
    const html = renderToStaticMarkup(
      createElement(Tab3Diet, { state, onUpdateState: () => {} })
    );
    assert.match(html, /일일 식단 체크리스트/);
    assert.match(html, /잔여 12회/);
    assert.match(html, /잔여 8회/);
    assert.match(html, /잔여 5회/);
    assert.match(html, /비축 식단 및 보충제 재고/);
    assert.doesNotMatch(html, /수분 섭취/);
  });

  it('renders Tab 4 (Milestones) with 4-metric switcher, 11-week table, and 28-day heatmap', async () => {
    const { Tab4Milestones } = await vite.ssrLoadModule('/src/components/tabs/Tab4Milestones.tsx');
    const state = createDefaultState();
    const html = renderToStaticMarkup(
      createElement(Tab4Milestones, { state, onUpdateState: () => {} })
    );
    assert.match(html, /체중 \(kg\)/);
    assert.match(html, /허리둘레 \(cm\)/);
    assert.match(html, /체지방률 \(%\)/);
    assert.match(html, /골격근량 \(kg\)/);
    assert.match(html, /최근 28일 달성도 히트맵/);
    assert.match(html, /오늘 달성도 기록\/스냅샷/);
  });

  it('renders BackupModal when open', async () => {
    const { BackupModal } = await vite.ssrLoadModule('/src/components/BackupModal.tsx');
    const state = createDefaultState();
    const html = renderToStaticMarkup(
      createElement(BackupModal, {
        isOpen: true,
        state,
        onClose: () => {},
        onApplyState: () => {},
      })
    );
    assert.match(html, /데이터 백업/);
    assert.match(html, /\.json 파일 다운로드/);
  });
});
