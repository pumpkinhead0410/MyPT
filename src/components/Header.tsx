import type { TabId } from '../types/domain';

interface HeaderProps {
  readonly activeTabId: TabId;
  readonly onSelectTab: (tabId: TabId) => void;
  readonly isStickySummary: boolean;
  readonly onToggleStickySummary: () => void;
  readonly onOpenBackupModal: () => void;
  readonly currentWeightDisplay: string;
}

export function Header({
  activeTabId,
  onSelectTab,
  isStickySummary,
  onToggleStickySummary,
  onOpenBackupModal,
  currentWeightDisplay,
}: HeaderProps) {
  const tabs: ReadonlyArray<{ readonly id: TabId; readonly label: string }> = [
    { id: 1, label: '저녁 일정' },
    { id: 2, label: '운동 프로그램' },
    { id: 3, label: '식단 & 재고' },
    { id: 4, label: '11주 목표' },
  ];

  return (
    <header className="bg-black/90 backdrop-blur-xl sticky top-0 z-40 border-b border-[#1c1c1e]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-white">건강 &amp; 루틴</h1>
            <span className="text-xs sm:text-sm font-medium text-apple-label">
              {currentWeightDisplay}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenBackupModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-apple-card hover:bg-apple-elevated text-xs sm:text-sm font-semibold transition text-white"
              title="데이터 백업 및 복원"
            >
              <span>💾</span>
              <span className="hidden sm:inline">데이터</span>
              <span>관리</span>
            </button>
            <button
              type="button"
              onClick={onToggleStickySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-apple-card hover:bg-apple-elevated text-xs sm:text-sm font-semibold transition"
              title={isStickySummary ? '요약 바 고정 해제' : '요약 바 상단 고정'}
            >
              <span className={isStickySummary ? 'text-apple-cyan' : 'text-apple-label'}>
                {isStickySummary ? '📌' : '📍'}
              </span>
              <span className={isStickySummary ? 'text-apple-cyan' : 'text-apple-label'}>
                {isStickySummary ? '고정' : '해제'}
              </span>
            </button>
          </div>
        </div>

        <div className="pb-3 overflow-x-auto no-scrollbar">
          <nav
            className="inline-flex items-center bg-[#161618] p-1 rounded-xl gap-1 text-xs sm:text-sm font-semibold border border-apple-card/60"
            role="tablist"
            aria-label="대시보드 탭"
          >
            {tabs.map((tab) => {
              const isActive = activeTabId === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSelectTab(tab.id)}
                  className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${
                    isActive
                      ? 'text-white bg-[#2c2c2e] font-semibold shadow-sm'
                      : 'text-apple-label hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
