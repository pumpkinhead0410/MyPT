import { useState } from 'react';
import { createDefaultState } from '../data/defaults';
import { formatLocalDate } from '../domain/calculations';
import { exportMyPTStateJson, importMyPTStateJson } from '../store/storage';
import type { MyPTStateV1 } from '../types/domain';

interface BackupModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly state: MyPTStateV1;
  readonly onApplyState: (nextState: MyPTStateV1) => void;
}

export function BackupModal({ isOpen, onClose, state, onApplyState }: BackupModalProps) {
  const [importText, setImportText] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'reset'>('export');

  if (!isOpen) return null;

  const jsonString = exportMyPTStateJson(state);

  const handleDownload = () => {
    const todayStr = formatLocalDate();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mypt-backup-${todayStr}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyClipboard = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopyFeedback('클립보드에 복사되었습니다.');
      setTimeout(() => setCopyFeedback(null), 2500);
    } catch {
      setCopyFeedback('클립보드 복사 권한이 없습니다.');
      setTimeout(() => setCopyFeedback(null), 2500);
    }
  };

  const handleApplyImport = () => {
    setErrorMessage(null);
    if (!importText.trim()) {
      setErrorMessage('가져올 JSON 데이터를 입력하거나 파일을 선택해주세요.');
      return;
    }

    const result = importMyPTStateJson(importText);
    if (result.kind === 'error') {
      setErrorMessage(result.message);
      return;
    }

    onApplyState(result.state);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setImportText(content);
      }
    };
    reader.onerror = () => {
      setErrorMessage('파일을 읽는 도중 오류가 발생했습니다.');
    };
    reader.readAsText(file);
  };

  const handleResetToDefault = () => {
    if (window.confirm('모든 기록과 설정을 초기 프리셋으로 되돌리시겠습니까? 되돌릴 수 없습니다.')) {
      const fresh = createDefaultState();
      onApplyState(fresh);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-apple-surface border border-apple-card rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#1c1c1e] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">💾</span>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              데이터 백업 및 복원
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-apple-label hover:text-white hover:bg-apple-card transition"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="px-4 sm:px-5 pt-3 border-b border-[#1c1c1e] flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition ${
              activeTab === 'export'
                ? 'border-apple-cyan text-white'
                : 'border-transparent text-apple-label hover:text-white'
            }`}
          >
            백업 내보내기
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition ${
              activeTab === 'import'
                ? 'border-apple-cyan text-white'
                : 'border-transparent text-apple-label hover:text-white'
            }`}
          >
            백업 불러오기
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reset')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition ${
              activeTab === 'reset'
                ? 'border-apple-red text-apple-red'
                : 'border-transparent text-apple-label hover:text-white'
            }`}
          >
            초기화
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'export' && (
            <div className="space-y-3">
              <p className="text-xs sm:text-sm text-apple-label">
                현재 모든 일정, 운동 기록, 식단/재고, 마일스톤 데이터를 JSON 형식으로 내보냅니다.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl bg-apple-blue hover:bg-blue-600 text-white font-semibold text-xs sm:text-sm transition"
                >
                  .json 파일 다운로드
                </button>
                <button
                  type="button"
                  onClick={handleCopyClipboard}
                  className="px-4 py-2 rounded-xl bg-apple-card hover:bg-apple-elevated text-white font-semibold text-xs sm:text-sm transition"
                >
                  JSON 복사
                </button>
                {copyFeedback && (
                  <span className="text-xs text-apple-green font-medium self-center">
                    {copyFeedback}
                  </span>
                )}
              </div>
              <textarea
                readOnly
                value={jsonString}
                className="w-full h-56 bg-black/60 border border-apple-card rounded-xl p-3 text-xs font-mono text-apple-subhead no-scrollbar focus:outline-none"
              />
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-3">
              <p className="text-xs sm:text-sm text-apple-label">
                이전에 저장한 MyPT 백업 파일(.json)을 업로드하거나 아래 입력창에 붙여넣어 복원합니다.
              </p>

              <div>
                <label className="block text-xs font-semibold text-apple-subhead mb-1.5">
                  파일 선택 (.json)
                </label>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-apple-label file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-apple-card file:text-white hover:file:bg-apple-elevated file:cursor-pointer cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-apple-subhead mb-1.5">
                  JSON 직접 입력
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="복사한 JSON 문자열을 여기에 붙여넣으세요..."
                  className="w-full h-44 bg-black/60 border border-apple-card rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-apple-cyan/60"
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-apple-red/10 border border-apple-red/30 text-xs text-apple-red">
                  {errorMessage}
                </div>
              )}

              <button
                type="button"
                onClick={handleApplyImport}
                className="w-full py-2.5 rounded-xl bg-apple-green text-black font-bold text-xs sm:text-sm hover:opacity-95 transition"
              >
                데이터 검증 및 복원 적용
              </button>
            </div>
          )}

          {activeTab === 'reset' && (
            <div className="space-y-3 p-2">
              <div className="p-4 rounded-xl bg-apple-red/10 border border-apple-red/20 space-y-2">
                <h3 className="text-sm font-bold text-apple-red">경고: 데이터 초기화</h3>
                <p className="text-xs text-apple-label leading-relaxed">
                  모든 저장된 기록(루틴 설정, 중량 기록, 재고, 체중 및 일자별 달성 이력)이 삭제되고
                  초기 기준선 프리셋으로 재설정됩니다.
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetToDefault}
                className="w-full py-2.5 rounded-xl bg-apple-red hover:bg-apple-red/90 text-white font-bold text-xs sm:text-sm transition"
              >
                기본 프리셋으로 초기화 실행
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1c1c1e] bg-apple-surface flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-apple-card hover:bg-apple-elevated text-xs sm:text-sm font-semibold text-apple-label hover:text-white transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
