import { useEffect, useState } from 'react';
import { BackupModal } from './components/BackupModal';
import { Header } from './components/Header';
import { TopSummaryBar } from './components/TopSummaryBar';
import { Tab1Schedule } from './components/tabs/Tab1Schedule';
import { Tab2Workout } from './components/tabs/Tab2Workout';
import { Tab3Diet } from './components/tabs/Tab3Diet';
import { Tab4Milestones } from './components/tabs/Tab4Milestones';
import {
  computeTodayLog,
  formatLocalDate,
  getEffectiveMilestoneTargets,
} from './domain/calculations';
import { loadMyPTState, saveMyPTState } from './store/storage';
import type { MyPTStateV1, TabId } from './types/domain';

export function App() {
  const [state, setState] = useState<MyPTStateV1>(() => loadMyPTState());
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Sync state changes to localStorage
  useEffect(() => {
    saveMyPTState(state);
  }, [state]);

  // Synchronize today's log entry on activity updates
  useEffect(() => {
    const todayStr = formatLocalDate();
    const todayLog = computeTodayLog(state, todayStr);

    setState((prev) => {
      const existingIdx = prev.dailyLogs.findIndex((log) => log.date === todayStr);
      let nextLogs = [...prev.dailyLogs];
      if (existingIdx >= 0) {
        nextLogs[existingIdx] = todayLog;
      } else {
        nextLogs = [...nextLogs, todayLog];
      }
      return {
        ...prev,
        dailyLogs: nextLogs,
      };
    });
  }, [state.dietItems, state.workoutsByDay, state.currentWorkoutDay]);

  const handleSelectTab = (tabId: TabId) => {
    setState((prev) => ({
      ...prev,
      activeTabId: tabId,
    }));
  };

  const handleToggleStickySummary = () => {
    setState((prev) => ({
      ...prev,
      ui: {
        ...prev.ui,
        isStickySummary: !prev.ui.isStickySummary,
      },
    }));
  };

  const handleApplyState = (nextState: MyPTStateV1) => {
    setState(nextState);
  };

  const baselineRow = state.milestones[0];
  const finalIdx = state.milestones.length - 1;
  const finalRow = state.milestones[finalIdx];
  const baselineW = baselineRow ? (baselineRow.actualW ?? baselineRow.baseTargetW) : 91.1;
  const targetW =
    baselineRow && finalRow
      ? getEffectiveMilestoneTargets(finalRow, finalIdx, baselineRow).targetW
      : 80.8;
  const currentWeightDisplay = `${baselineW.toFixed(1)}kg ➔ ${targetW.toFixed(1)}kg`;

  return (
    <div className="min-h-screen bg-black text-[#f5f5f7]">
      <Header
        activeTabId={state.activeTabId}
        onSelectTab={handleSelectTab}
        isStickySummary={state.ui.isStickySummary}
        onToggleStickySummary={handleToggleStickySummary}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        currentWeightDisplay={currentWeightDisplay}
      />

      <TopSummaryBar state={state} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-16">
        {state.activeTabId === 1 && (
          <Tab1Schedule state={state} onUpdateState={setState} />
        )}
        {state.activeTabId === 2 && (
          <Tab2Workout state={state} onUpdateState={setState} />
        )}
        {state.activeTabId === 3 && (
          <Tab3Diet state={state} onUpdateState={setState} />
        )}
        {state.activeTabId === 4 && (
          <Tab4Milestones state={state} onUpdateState={setState} />
        )}
      </main>

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        state={state}
        onApplyState={handleApplyState}
      />
    </div>
  );
}

export default App;
