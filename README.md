# TL;DR

- 문서 — [고도화 작업계획](decisions/UPGRADE-PLAN.md), [의사결정 기록](decisions/2026-10-29-upgrade-decisions.md), [검증 리포트](evidence/verification-report.md)를 프로젝트 내부에서 관리합니다.
- 목적 — MyPT는 하루 1~2회 접속해 저녁 루틴·운동 중량(1RM) 추이·식단 및 냉장고 재고·11주 신체 변화를 기록하고 향후 계획을 세우는 개인용 대시보드입니다.
- 현재 상태 — 기준 파일 [MyPT.html](MyPT.html)의 레거시 결함 5건을 해결하고 Vite + React 19 + TypeScript + 오프라인 CSS + PWA 모듈형 웹앱 구현 및 검증을 완료했습니다.
- 실행 — `npm run dev`로 개발 서버를 실행하고 `npm test`, `npm run typecheck`, `npm run build`로 테스트와 프로덕션 빌드를 검증합니다.

## 프로젝트 개요와 방향

- 근거 — 세션 `d29e0f2f-172e-4d05-9728-99e3dcff8b3a`에서 사용자가 MyPT의 본질적 용도를 "하루 1~2회 접속하여 추이를 기록하고 앞으로 계획을 세우는 대시보드"로 정의했습니다.
- 참고 — 실시간 운동 보조 도구(세트 간 휴식 타이머, 매 세트 개별 중량·횟수 로깅)와 수분 섭취 트래커는 배제하고, 짧은 접속 안에 상태를 갱신해 장기 추이를 조망하는 UX에 집중합니다.
- 참고 — 기존 단일 HTML 구조를 Vite + React + TypeScript 기반 모듈형 PWA 웹앱으로 전환했으며, 별도 백엔드 없이 `localStorage`(`mypt_state_v1`)와 JSON 백업·복원으로 영속성을 보장합니다.

## 해결된 레거시 결함 5건

- 근거 — **상태 증발 해결**: [src/store/storage.ts](src/store/storage.ts)의 `localStorage` 자동 저장 및 [BackupModal.tsx](src/components/BackupModal.tsx)의 JSON 파일 내보내기·불러오기·초기화로 새로고침 시 데이터 증발을 해결했습니다.
- 근거 — **다중 재고 연동 해결**: [src/domain/calculations.ts](src/domain/calculations.ts)의 `applyIngredientsDelta`와 `calculateDinnerSetAvailableCount`로 저녁 세트(A/B/C) 복합 구성품 동시 차감·복원 및 가용 횟수 동적 계산을 구현했습니다.
- 근거 — **요일별 유산소 상태 분리**: [src/types/domain.ts](src/types/domain.ts)의 `WorkoutDayPlan.cardioDone`을 요일별(`mon`~`sun`)로 분리하여 요일 전환 시 유산소 완료 상태가 초기화되던 결함을 해결했습니다.
- 근거 — **비누적 마일스톤 오프셋**: `MilestoneRow`의 불변 기준값(`baseTargetW` 등)과 `getEffectiveMilestoneTargets` 순수 함수로 시작 체중 반복 수정 시 발생하던 목표치 누적 왜곡을 차단했습니다.
- 근거 — **반응형 헤더 및 소화 시간**: [Header.tsx](src/components/Header.tsx)의 목표 체중 구간과 [Tab1Schedule.tsx](src/components/tabs/Tab1Schedule.tsx)의 식후 소화 여유 판정이 슬라이더·마일스톤 변경에 즉시 반응합니다.

## 탭별 고도화 요약

- 참고 — **Tab 1 ([Tab1Schedule.tsx](src/components/tabs/Tab1Schedule.tsx))**: 24시간 원형 다이얼과 13시간 직선 타임라인 바에 실시간 현재 시각(`NOW`) 마커와 진행 블록 자동 포커스를 추가하고, 평일·주말 스케줄 프로파일을 분리했습니다.
- 참고 — **Tab 2 ([Tab2Workout.tsx](src/components/tabs/Tab2Workout.tsx))**: 기존 휴식 타이머를 제거하고 월~일 7일 루틴 편집(CRUD), 오늘 요일 자동 선택, Tab 1 운동 시간 프리셋 연동, 루틴 카드 내 '대표 중량(kg)×횟수' 1줄 갱신 및 하단 종목별 중량·1RM 성장 추이 차트를 제공합니다.
- 참고 — **Tab 3 ([Tab3Diet.tsx](src/components/tabs/Tab3Diet.tsx))**: 저녁 세트(A/B/C) 다중 재고 동시 차감·복원 및 가용 횟수 동적 계산을 적용하고, 일일 식단 체크리스트 항목의 자유 편집(추가·수정·삭제)을 지원합니다.
- 참고 — **Tab 4 ([Tab4Milestones.tsx](src/components/tabs/Tab4Milestones.tsx))**: 체중·허리둘레·체지방률·골격근량 4대 지표 전환 차트와 최근 28일 운동·식단 달성 캘린더(히트맵), 인바디 정밀 모드 토글을 제공합니다.

## 실행과 검증

- 참고 — `npm run typecheck`(`tsc -b`)로 TypeScript strict 타입 검사를 실행합니다.
- 참고 — `npm test`(`node --test src/**/*.test.ts`)로 도메인 계산, 스토리지 스키마 검증, Vite SSR 컴포넌트 렌더링 테스트 26건을 실행합니다.
- 참고 — `npm run build`(`vite build`)로 `dist/` 프로덕션 번들을 생성하며, 상세 검증 결과는 [검증 리포트](evidence/verification-report.md)에 기록되어 있습니다.

## 변경 이력

- 참고 — 2026-10-29: 프로젝트 개요, 기준 파일 결함 5건, 탭별 고도화 범위와 재개 경로를 작성했습니다.
- 참고 — 2026-10-30: Phase 1~5 모듈형 웹앱 구현 및 자동화 검증 완료 상태를 반영했습니다.
