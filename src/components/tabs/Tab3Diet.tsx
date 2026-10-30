import { useState } from 'react';
import { DEFAULT_DIET_ITEMS, DEFAULT_INVENTORY } from '../../data/defaults';
import {
  applyIngredientsDelta,
  calculateDinnerSetAvailableCount,
} from '../../domain/calculations';
import type {
  DietItem,
  DinnerSetKey,
  IngredientMapping,
  InventoryItem,
  MyPTStateV1,
} from '../../types/domain';

interface Tab3DietProps {
  readonly state: MyPTStateV1;
  readonly onUpdateState: (updater: (prev: MyPTStateV1) => MyPTStateV1) => void;
}

const DINNER_KEYS: readonly DinnerSetKey[] = ['A', 'B', 'C'];

export function Tab3Diet({ state, onUpdateState }: Tab3DietProps) {
  const { dinnerSets, selectedDinnerSet, inventory, dietItems } = state;

  const [isAddingDietItem, setIsAddingDietItem] = useState(false);
  const [newDietTime, setNewDietTime] = useState('10:00');
  const [newDietName, setNewDietName] = useState('');
  const [newDietCal, setNewDietCal] = useState('150');
  const [newDietPro, setNewDietPro] = useState('20');
  const [newDietInvId, setNewDietInvId] = useState('');
  const [newDietInvQty, setNewDietInvQty] = useState('1');
  const [newDietInvId2, setNewDietInvId2] = useState('');
  const [newDietInvQty2, setNewDietInvQty2] = useState('1');

  const [editingDietId, setEditingDietId] = useState<string | null>(null);
  const [editDietTime, setEditDietTime] = useState('');
  const [editDietName, setEditDietName] = useState('');
  const [editDietCal, setEditDietCal] = useState(0);
  const [editDietPro, setEditDietPro] = useState(0);
  const [editDietInvId, setEditDietInvId] = useState('');
  const [editDietInvQty, setEditDietInvQty] = useState(1);
  const [editDietInvId2, setEditDietInvId2] = useState('');
  const [editDietInvQty2, setEditDietInvQty2] = useState(1);

  const [isInvBatchMode, setIsInvBatchMode] = useState(false);
  const [selectedInvIds, setSelectedInvIds] = useState<ReadonlySet<string>>(new Set());

  const [isAddingInvItem, setIsAddingInvItem] = useState(false);
  const [newInvName, setNewInvName] = useState('');
  const [newInvCount, setNewInvCount] = useState('10');
  const [newInvUnit, setNewInvUnit] = useState('팩');
  const [newInvCal, setNewInvCal] = useState('120');
  const [newInvPro, setNewInvPro] = useState('22');

  const [editingInvId, setEditingInvId] = useState<string | null>(null);
  const [editInvName, setEditInvName] = useState('');
  const [editInvCount, setEditInvCount] = useState(0);
  const [editInvUnit, setEditInvUnit] = useState('팩');
  const [editInvCal, setEditInvCal] = useState(0);
  const [editInvPro, setEditInvPro] = useState(0);

  let totalCal = 0;
  let totalPro = 0;
  let checkedCount = 0;

  for (const item of dietItems) {
    if (item.checked) {
      totalCal += item.cal;
      totalPro += item.pro;
      checkedCount += 1;
    }
  }

  const totalDietCount = dietItems.length;
  const dietAchievePct = totalDietCount > 0 ? Math.round((checkedCount / totalDietCount) * 100) : 0;
  const lowStockItems = inventory.filter((item) => item.count <= 3);

  const handleSelectDinnerSet = (key: DinnerSetKey) => {
    const setSpec = dinnerSets[key];
    onUpdateState((prev) => {
      const dinnerSlot = prev.dietItems.find((d) => d.isDinnerSlot || d.id === 'd_dinner');

      let nextInventory = prev.inventory;
      if (dinnerSlot && dinnerSlot.checked) {
        const restored = applyIngredientsDelta(prev.inventory, dinnerSlot.ingredients, 'restore');
        nextInventory = applyIngredientsDelta(restored, setSpec.ingredients, 'deduct');
      }

      const nextDietItems = prev.dietItems.map((item) => {
        if (!item.isDinnerSlot && item.id !== 'd_dinner') return item;
        return {
          ...item,
          name: `저녁 간편식 ${setSpec.name} (${setSpec.summary})`,
          cal: setSpec.cal,
          pro: setSpec.pro,
          ingredients: setSpec.ingredients,
        };
      });

      return {
        ...prev,
        selectedDinnerSet: key,
        inventory: nextInventory,
        dietItems: nextDietItems,
      };
    });
  };

  const handleToggleDietItem = (id: string) => {
    onUpdateState((prev) => {
      const target = prev.dietItems.find((d) => d.id === id);
      if (!target) return prev;

      const willBeChecked = !target.checked;
      const nextInventory = applyIngredientsDelta(
        prev.inventory,
        target.ingredients,
        willBeChecked ? 'deduct' : 'restore'
      );

      const nextDietItems = prev.dietItems.map((d) =>
        d.id === id ? { ...d, checked: willBeChecked } : d
      );

      return {
        ...prev,
        inventory: nextInventory,
        dietItems: nextDietItems,
      };
    });
  };

  const handleResetDietChecklist = () => {
    onUpdateState((prev) => {
      const checkedItems = prev.dietItems.filter((i) => i.checked);
      const allIngredients = checkedItems.flatMap((i) => i.ingredients);
      const restoredInventory = applyIngredientsDelta(prev.inventory, allIngredients, 'restore');
      const resetDietItems = prev.dietItems.map((i) => ({ ...i, checked: false }));

      return {
        ...prev,
        inventory: restoredInventory,
        dietItems: resetDietItems,
      };
    });
  };

  const handleRestoreDefaultDiet = () => {
    onUpdateState((prev) => {
      const checkedItems = prev.dietItems.filter((i) => i.checked);
      const allIngredients = checkedItems.flatMap((i) => i.ingredients);
      const restoredInventory = applyIngredientsDelta(prev.inventory, allIngredients, 'restore');

      return {
        ...prev,
        selectedDinnerSet: 'A',
        inventory: restoredInventory,
        dietItems: DEFAULT_DIET_ITEMS,
      };
    });
  };

  const handleOpenAddDiet = () => {
    setIsAddingDietItem(true);
    setNewDietName('');
    setNewDietTime('10:00');
    setNewDietCal('150');
    setNewDietPro('20');
    setNewDietInvId('');
    setNewDietInvQty('1');
    setNewDietInvId2('');
    setNewDietInvQty2('1');
  };

  const handleSaveNewDiet = () => {
    const trimmedName = newDietName.trim();
    if (!trimmedName) return;

    const parsedCal = Math.max(0, parseInt(newDietCal, 10) || 0);
    const parsedPro = Math.max(0, parseInt(newDietPro, 10) || 0);
    const parsedQty = Math.max(1, parseInt(newDietInvQty, 10) || 1);
    const parsedQty2 = Math.max(1, parseInt(newDietInvQty2, 10) || 1);

    const ingredientsList: IngredientMapping[] = [];
    if (newDietInvId) {
      ingredientsList.push({ invId: newDietInvId, qty: parsedQty });
    }
    if (newDietInvId2 && newDietInvId2 !== newDietInvId) {
      ingredientsList.push({ invId: newDietInvId2, qty: parsedQty2 });
    }

    const newItem: DietItem = {
      id: `diet_${Date.now()}`,
      time: newDietTime.trim() || '12:00',
      name: trimmedName,
      cal: parsedCal,
      pro: parsedPro,
      checked: false,
      ingredients: ingredientsList,
    };

    onUpdateState((prev) => ({
      ...prev,
      dietItems: [...prev.dietItems, newItem],
    }));

    setIsAddingDietItem(false);
  };

  const handleStartEditDiet = (item: DietItem) => {
    setEditingDietId(item.id);
    setEditDietTime(item.time);
    setEditDietName(item.name);
    setEditDietCal(item.cal);
    setEditDietPro(item.pro);
    setEditDietInvId(item.ingredients[0]?.invId ?? '');
    setEditDietInvQty(item.ingredients[0]?.qty ?? 1);
    setEditDietInvId2(item.ingredients[1]?.invId ?? '');
    setEditDietInvQty2(item.ingredients[1]?.qty ?? 1);
  };

  const handleSaveEditDiet = (id: string) => {
    const trimmedName = editDietName.trim();
    if (!trimmedName) return;

    const parsedQty = Math.max(1, editDietInvQty || 1);
    const parsedQty2 = Math.max(1, editDietInvQty2 || 1);
    const ingredientsList: IngredientMapping[] = [];
    if (editDietInvId) {
      ingredientsList.push({ invId: editDietInvId, qty: parsedQty });
    }
    if (editDietInvId2 && editDietInvId2 !== editDietInvId) {
      ingredientsList.push({ invId: editDietInvId2, qty: parsedQty2 });
    }

    onUpdateState((prev) => {
      const target = prev.dietItems.find((d) => d.id === id);
      let nextInventory = prev.inventory;
      if (target && target.checked) {
        const restored = applyIngredientsDelta(prev.inventory, target.ingredients, 'restore');
        nextInventory = applyIngredientsDelta(restored, ingredientsList, 'deduct');
      }

      const nextDietItems = prev.dietItems.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          time: editDietTime.trim() || item.time,
          name: trimmedName,
          cal: Math.max(0, editDietCal),
          pro: Math.max(0, editDietPro),
          ingredients: ingredientsList,
        };
      });

      return {
        ...prev,
        inventory: nextInventory,
        dietItems: nextDietItems,
      };
    });

    setEditingDietId(null);
  };

  const handleDeleteDietItem = (id: string) => {
    onUpdateState((prev) => {
      const target = prev.dietItems.find((d) => d.id === id);
      let nextInventory = prev.inventory;
      if (target && target.checked && target.ingredients.length > 0) {
        nextInventory = applyIngredientsDelta(prev.inventory, target.ingredients, 'restore');
      }
      return {
        ...prev,
        inventory: nextInventory,
        dietItems: prev.dietItems.filter((d) => d.id !== id),
      };
    });
    if (editingDietId === id) {
      setEditingDietId(null);
    }
  };

  const handleAdjustInventoryCount = (id: string, delta: number) => {
    onUpdateState((prev) => ({
      ...prev,
      inventory: prev.inventory.map((item) =>
        item.id === id ? { ...item, count: Math.max(0, item.count + delta) } : item
      ),
    }));
  };

  const handleStartEditInv = (item: InventoryItem) => {
    setEditingInvId(item.id);
    setEditInvName(item.name);
    setEditInvCount(item.count);
    setEditInvUnit(item.unit);
    setEditInvCal(item.cal);
    setEditInvPro(item.pro);
  };

  const handleSaveEditInv = (id: string) => {
    const trimmedName = editInvName.trim();
    if (!trimmedName) return;

    onUpdateState((prev) => {
      const nextInventory = prev.inventory.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          name: trimmedName,
          count: Math.max(0, editInvCount),
          unit: editInvUnit.trim() || item.unit,
          cal: Math.max(0, editInvCal),
          pro: Math.max(0, editInvPro),
        };
      });

      return {
        ...prev,
        inventory: nextInventory,
      };
    });

    setEditingInvId(null);
  };

  const handleDeleteInvItem = (id: string) => {
    onUpdateState((prev) => {
      const nextInventory = prev.inventory.filter((i) => i.id !== id);
      const nextDietItems = prev.dietItems.map((d) => ({
        ...d,
        ingredients: d.ingredients.filter((ing) => ing.invId !== id),
      }));

      return {
        ...prev,
        inventory: nextInventory,
        dietItems: nextDietItems,
      };
    });

    if (editingInvId === id) {
      setEditingInvId(null);
    }
    if (selectedInvIds.has(id)) {
      const nextSet = new Set(selectedInvIds);
      nextSet.delete(id);
      setSelectedInvIds(nextSet);
    }
  };

  const handleSaveNewInv = () => {
    const trimmedName = newInvName.trim();
    if (!trimmedName) return;

    const parsedCount = Math.max(0, parseInt(newInvCount, 10) || 0);
    const parsedCal = Math.max(0, parseInt(newInvCal, 10) || 0);
    const parsedPro = Math.max(0, parseInt(newInvPro, 10) || 0);

    const newItem: InventoryItem = {
      id: `inv_${Date.now()}`,
      name: trimmedName,
      count: parsedCount,
      unit: newInvUnit.trim() || '팩',
      cal: parsedCal,
      pro: parsedPro,
    };

    onUpdateState((prev) => ({
      ...prev,
      inventory: [...prev.inventory, newItem],
    }));

    setIsAddingInvItem(false);
    setNewInvName('');
  };

  const handleRestoreDefaultInventory = () => {
    onUpdateState((prev) => ({
      ...prev,
      inventory: DEFAULT_INVENTORY,
    }));
    setSelectedInvIds(new Set());
    setEditingInvId(null);
  };

  const handleToggleSelectInv = (id: string) => {
    const nextSet = new Set(selectedInvIds);
    if (nextSet.has(id)) {
      nextSet.delete(id);
    } else {
      nextSet.add(id);
    }
    setSelectedInvIds(nextSet);
  };

  const handleToggleSelectAllInv = () => {
    if (selectedInvIds.size === inventory.length) {
      setSelectedInvIds(new Set());
    } else {
      setSelectedInvIds(new Set(inventory.map((i) => i.id)));
    }
  };

  const handleDeleteSelectedInv = () => {
    if (selectedInvIds.size === 0) return;

    onUpdateState((prev) => {
      const nextInventory = prev.inventory.filter((i) => !selectedInvIds.has(i.id));
      const nextDietItems = prev.dietItems.map((d) => ({
        ...d,
        ingredients: d.ingredients.filter((ing) => !selectedInvIds.has(ing.invId)),
      }));

      return {
        ...prev,
        inventory: nextInventory,
        dietItems: nextDietItems,
      };
    });

    setSelectedInvIds(new Set());
  };

  const handleDeleteAllInv = () => {
    onUpdateState((prev) => ({
      ...prev,
      inventory: [],
      dietItems: prev.dietItems.map((d) => ({ ...d, ingredients: [] })),
    }));
    setSelectedInvIds(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Upper 4-Card Nutrition & Inventory Bar */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Calorie */}
        <div className="bg-apple-surface rounded-2xl p-4 sm:p-5 border border-apple-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-apple-label">
            일일 칼로리
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-bold text-white">
              {totalCal.toLocaleString()}
            </span>
            <span className="text-xs sm:text-sm text-apple-label">/ 1,700 kcal</span>
          </div>
          <div className="w-full bg-apple-card h-2 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-apple-green h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (totalCal / 1700) * 100)}%` }}
            />
          </div>
        </div>

        {/* Card 2: Protein */}
        <div className="bg-apple-surface rounded-2xl p-4 sm:p-5 border border-apple-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-apple-label">
              단백질 섭취
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
          <div className="w-full bg-apple-card h-2 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-apple-green h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (totalPro / 160) * 100)}%` }}
            />
          </div>
        </div>

        {/* Card 3: Diet Rate */}
        <div className="bg-apple-surface rounded-2xl p-4 sm:p-5 border border-apple-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-apple-label">
            식단 달성도
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-bold text-white">{dietAchievePct}%</span>
            <span className="text-xs sm:text-sm text-apple-label">
              {checkedCount}/{totalDietCount} 항목
            </span>
          </div>
          <p className="text-xs text-apple-label mt-1">근손실 0% 방어 진행</p>
        </div>

        {/* Card 4: Inventory Status */}
        <div className="bg-apple-surface rounded-2xl p-4 sm:p-5 border border-apple-card">
          <span className="text-xs font-semibold uppercase tracking-wider text-apple-label">
            식단 비축 현황
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-lg sm:text-xl font-bold ${
                lowStockItems.length > 0 ? 'text-apple-orange' : 'text-apple-green'
              }`}
            >
              {lowStockItems.length > 0
                ? `재발주 필요 (${lowStockItems.length}건)`
                : '비축 여유'}
            </span>
          </div>
          <p className="text-xs text-apple-label mt-1 truncate">
            {lowStockItems.length > 0
              ? lowStockItems.map((i) => i.name.split(' ')[0]).join(', ')
              : '재발주 필요 품목 없음'}
          </p>
        </div>
      </section>

      {/* Main Grid: Left 7 cols (Diet Checklist & Dinner Set) + Right 5 cols (Inventory) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Daily Meals Checklist (7 cols) */}
        <div className="lg:col-span-7 bg-apple-surface rounded-2xl p-5 sm:p-6 space-y-4 border border-apple-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1c1c1e] pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                일일 식단 체크리스트
              </h3>
              <p className="text-xs text-apple-label mt-0.5">
                체크 시 해당 품목의 냉장고 재고가 실시간 연동 차감됩니다
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={handleOpenAddDiet}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-apple-card hover:bg-apple-elevated text-apple-cyan transition font-semibold"
              >
                + 식단 추가
              </button>
              <button
                type="button"
                onClick={handleResetDietChecklist}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-apple-card hover:bg-apple-elevated text-apple-label hover:text-white transition font-medium"
              >
                체크 초기화
              </button>
              <button
                type="button"
                onClick={handleRestoreDefaultDiet}
                title="기본 식단 복원"
                className="text-xs px-2 py-1.5 rounded-lg bg-apple-card hover:bg-apple-elevated text-apple-label hover:text-white transition"
              >
                ↺
              </button>
            </div>
          </div>

          {/* Add Diet Item Drawer Form */}
          {isAddingDietItem && (
            <div className="p-4 bg-apple-card rounded-xl space-y-3 border border-apple-elevated/70">
              <span className="text-xs sm:text-sm font-bold text-white block border-b border-apple-surface pb-1.5">
                새 식단 항목 등록
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="text-[11px] text-apple-label block mb-1">섭취 시각</label>
                  <input
                    type="time"
                    value={newDietTime}
                    onChange={(e) => setNewDietTime(e.target.value)}
                    className="w-full bg-apple-surface px-3 py-1.5 rounded-lg text-white border border-apple-elevated focus:outline-none focus:border-apple-cyan"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-apple-label block mb-1">식단명</label>
                  <input
                    type="text"
                    value={newDietName}
                    placeholder="예: 닭가슴살 샐러드"
                    onChange={(e) => setNewDietName(e.target.value)}
                    className="w-full bg-apple-surface px-3 py-1.5 rounded-lg text-white border border-apple-elevated focus:outline-none focus:border-apple-cyan"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-apple-label block mb-1">칼로리 (kcal)</label>
                  <input
                    type="number"
                    value={newDietCal}
                    onChange={(e) => setNewDietCal(e.target.value)}
                    className="w-full bg-apple-surface px-3 py-1.5 rounded-lg text-white font-mono border border-apple-elevated focus:outline-none focus:border-apple-cyan"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-apple-label block mb-1">단백질 (g)</label>
                  <input
                    type="number"
                    value={newDietPro}
                    onChange={(e) => setNewDietPro(e.target.value)}
                    className="w-full bg-apple-surface px-3 py-1.5 rounded-lg text-apple-green font-mono border border-apple-elevated focus:outline-none focus:border-apple-cyan"
                  />
                </div>
                <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-apple-label block mb-1">
                      연동 비축 재고 1 (선택)
                    </label>
                    <select
                      value={newDietInvId}
                      onChange={(e) => setNewDietInvId(e.target.value)}
                      className="w-full bg-apple-surface px-2.5 py-1.5 rounded-lg text-white text-xs border border-apple-elevated focus:outline-none focus:border-apple-cyan"
                    >
                      <option value="">외부 식사 (연동 없음)</option>
                      {inventory.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.name} (잔여 {inv.count}
                          {inv.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-apple-label block mb-1">차감 수량 1</label>
                    <input
                      type="number"
                      min="1"
                      value={newDietInvQty}
                      onChange={(e) => setNewDietInvQty(e.target.value)}
                      disabled={!newDietInvId}
                      className="w-full bg-apple-surface px-3 py-1.5 rounded-lg text-white font-mono border border-apple-elevated focus:outline-none focus:border-apple-cyan disabled:opacity-50"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-apple-label block mb-1">
                      연동 비축 재고 2 (추가 선택)
                    </label>
                    <select
                      value={newDietInvId2}
                      onChange={(e) => setNewDietInvId2(e.target.value)}
                      className="w-full bg-apple-surface px-2.5 py-1.5 rounded-lg text-white text-xs border border-apple-elevated focus:outline-none focus:border-apple-cyan"
                    >
                      <option value="">추가 품목 없음</option>
                      {inventory.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.name} (잔여 {inv.count}
                          {inv.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-apple-label block mb-1">차감 수량 2</label>
                    <input
                      type="number"
                      min="1"
                      value={newDietInvQty2}
                      onChange={(e) => setNewDietInvQty2(e.target.value)}
                      disabled={!newDietInvId2}
                      className="w-full bg-apple-surface px-3 py-1.5 rounded-lg text-white font-mono border border-apple-elevated focus:outline-none focus:border-apple-cyan disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveNewDiet}
                  className="flex-1 py-2 rounded-xl bg-apple-green text-black font-bold text-xs transition hover:opacity-90"
                >
                  등록하기
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingDietItem(false)}
                  className="px-3 py-2 rounded-xl bg-apple-surface hover:bg-apple-card text-apple-label hover:text-white font-semibold text-xs transition"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {/* Checklist Items */}
          <div className="space-y-2.5">
            {dietItems.map((d) => {
              const isEditing = editingDietId === d.id;

              if (isEditing) {
                return (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-2xl bg-apple-card border border-apple-cyan/50 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-apple-surface pb-1.5">
                      <span className="text-xs font-bold text-apple-cyan">식단 항목 수정</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteDietItem(d.id)}
                        className="text-xs text-apple-red hover:underline font-semibold"
                      >
                        삭제
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[11px] text-apple-label block mb-1">시각</label>
                        <input
                          type="time"
                          value={editDietTime}
                          onChange={(e) => setEditDietTime(e.target.value)}
                          className="w-full bg-apple-surface px-2.5 py-1.5 rounded-lg text-white border border-apple-elevated focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-apple-label block mb-1">식단명</label>
                        <input
                          type="text"
                          value={editDietName}
                          onChange={(e) => setEditDietName(e.target.value)}
                          className="w-full bg-apple-surface px-2.5 py-1.5 rounded-lg text-white font-semibold border border-apple-elevated focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-apple-label block mb-1">
                          칼로리 (kcal)
                        </label>
                        <input
                          type="number"
                          value={editDietCal}
                          onChange={(e) => setEditDietCal(Number(e.target.value) || 0)}
                          className="w-full bg-apple-surface px-2.5 py-1.5 rounded-lg text-white font-mono border border-apple-elevated focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-apple-label block mb-1">단백질 (g)</label>
                        <input
                          type="number"
                          value={editDietPro}
                          onChange={(e) => setEditDietPro(Number(e.target.value) || 0)}
                          className="w-full bg-apple-surface px-2.5 py-1.5 rounded-lg text-apple-green font-mono border border-apple-elevated focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-apple-label block mb-1">
                            연동 비축 재고 1
                          </label>
                          <select
                            value={editDietInvId}
                            onChange={(e) => setEditDietInvId(e.target.value)}
                            className="w-full bg-apple-surface px-2 py-1.5 rounded-lg text-white text-xs border border-apple-elevated focus:outline-none"
                          >
                            <option value="">외부 식사 (연동 없음)</option>
                            {inventory.map((inv) => (
                              <option key={inv.id} value={inv.id}>
                                {inv.name} (잔여 {inv.count}
                                {inv.unit})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-apple-label block mb-1">
                            차감 수량 1
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={editDietInvQty}
                            onChange={(e) => setEditDietInvQty(Number(e.target.value) || 1)}
                            disabled={!editDietInvId}
                            className="w-full bg-apple-surface px-2.5 py-1.5 rounded-lg text-white font-mono border border-apple-elevated focus:outline-none disabled:opacity-50"
                          />
                        </div>
                      </div>
                      <div className="col-span-2 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-apple-label block mb-1">
                            연동 비축 재고 2 (추가 선택)
                          </label>
                          <select
                            value={editDietInvId2}
                            onChange={(e) => setEditDietInvId2(e.target.value)}
                            className="w-full bg-apple-surface px-2 py-1.5 rounded-lg text-white text-xs border border-apple-elevated focus:outline-none"
                          >
                            <option value="">추가 품목 없음</option>
                            {inventory.map((inv) => (
                              <option key={inv.id} value={inv.id}>
                                {inv.name} (잔여 {inv.count}
                                {inv.unit})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-apple-label block mb-1">
                            차감 수량 2
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={editDietInvQty2}
                            onChange={(e) => setEditDietInvQty2(Number(e.target.value) || 1)}
                            disabled={!editDietInvId2}
                            className="w-full bg-apple-surface px-2.5 py-1.5 rounded-lg text-white font-mono border border-apple-elevated focus:outline-none disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingDietId(null)}
                        className="px-3 py-1.5 rounded-lg bg-apple-surface text-apple-label hover:text-white text-xs font-semibold"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEditDiet(d.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-apple-elevated hover:bg-apple-surface text-white text-xs font-semibold"
                      >
                        완료
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={d.id}
                  className={`p-3.5 rounded-2xl bg-apple-card flex items-center justify-between transition border ${
                    d.checked
                      ? 'border-apple-card bg-apple-surface/80'
                      : 'border-transparent hover:border-apple-elevated'
                  }`}
                >
                  <div
                    onClick={() => handleToggleDietItem(d.id)}
                    className="flex items-center gap-3 cursor-pointer min-w-0 flex-1 mr-2"
                  >
                    <button
                      type="button"
                      aria-label={d.checked ? '식단 완료 해제' : '식단 섭취 완료'}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition flex-shrink-0 text-xs font-bold ${
                        d.checked
                          ? 'bg-apple-green text-black'
                          : 'border border-apple-elevated bg-apple-surface text-transparent'
                      }`}
                    >
                      ✓
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-apple-label">{d.time}</span>
                        <span
                          className={`text-xs sm:text-sm font-bold truncate ${
                            d.checked ? 'line-through text-apple-label' : 'text-white'
                          }`}
                        >
                          {d.name}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {d.ingredients.length > 0 ? (
                          d.ingredients.map((ing) => {
                            const inv = inventory.find((i) => i.id === ing.invId);
                            return (
                              <span
                                key={ing.invId}
                                className="text-[11px] text-apple-cyan font-semibold font-mono bg-apple-cyan/10 px-2 py-0.5 rounded-md"
                              >
                                {inv ? inv.name.split(' ')[0] : '재고'} {inv ? inv.count : 0}
                                {inv ? inv.unit : '개'}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[11px] text-apple-label bg-apple-surface px-2 py-0.5 rounded-md">
                            외부 식사
                          </span>
                        )}
                        <span className="text-xs font-mono text-apple-subhead">
                          {d.cal} kcal | 단백질 {d.pro}g
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-xs ${
                        d.checked ? 'text-apple-green font-semibold' : 'text-apple-label'
                      }`}
                    >
                      {d.checked ? '섭취 완료' : '대기'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStartEditDiet(d)}
                      title="이 항목 수정"
                      className="text-apple-label hover:text-apple-cyan text-xs p-1 transition"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDietItem(d.id)}
                      title="삭제"
                      className="text-apple-label hover:text-apple-red text-xs p-1 transition"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Microwave Dinner Selection Cards (Set A / B / C) */}
          <div className="pt-3 border-t border-[#1c1c1e] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
                저녁 간편식 선택 (전자레인지 3분 30초)
              </span>
              <span className="text-xs text-apple-label">선택 시 일일 식단 자동 반영</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DINNER_KEYS.map((key) => {
                const set = dinnerSets[key];
                const isSelected = selectedDinnerSet === key;
                const availableCount = calculateDinnerSetAvailableCount(set, inventory);

                let badgeColor = 'bg-apple-green/10 text-apple-green';
                if (availableCount === 0) {
                  badgeColor = 'bg-apple-red/10 text-apple-red';
                } else if (availableCount <= 3) {
                  badgeColor = 'bg-apple-orange/10 text-apple-orange';
                }

                return (
                  <div
                    key={key}
                    onClick={() => handleSelectDinnerSet(key)}
                    className={`p-3.5 rounded-xl cursor-pointer transition ${
                      isSelected
                        ? 'bg-apple-elevated border border-apple-green/40 shadow-sm'
                        : 'bg-apple-card hover:bg-apple-cardHover border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-bold text-white">{set.name}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${badgeColor}`}>
                        잔여 {availableCount}회
                      </span>
                    </div>
                    <div className="text-xs text-apple-label mt-1.5 space-y-0.5">
                      <p className="truncate">{set.summary}</p>
                      <p className="text-white font-medium">
                        {set.cal} kcal / 단백질 {set.pro}g
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Refrigerator & Supplement Inventory Management (5 cols) */}
        <div className="lg:col-span-5 bg-apple-surface rounded-2xl p-5 sm:p-6 space-y-4 border border-apple-card">
          <div className="flex items-center justify-between gap-2 border-b border-[#1c1c1e] pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                비축 식단 및 보충제 재고
              </h3>
              <p className="text-xs text-apple-label mt-0.5">{inventory.length}개 품목 관리</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsInvBatchMode((prev) => !prev)}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                  isInvBatchMode
                    ? 'bg-apple-elevated text-apple-cyan font-semibold'
                    : 'bg-apple-card hover:bg-apple-elevated text-apple-label hover:text-white'
                }`}
              >
                {isInvBatchMode ? '선택 닫기' : '선택 관리'}
              </button>
              <button
                type="button"
                onClick={handleRestoreDefaultInventory}
                title="초기 기본 품목 복원"
                className="text-xs px-2 py-1.5 rounded-lg bg-apple-card hover:bg-apple-elevated text-apple-label hover:text-white transition"
              >
                ↺
              </button>
              <button
                type="button"
                onClick={() => setIsAddingInvItem((prev) => !prev)}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-apple-card hover:bg-apple-elevated text-apple-cyan transition font-semibold whitespace-nowrap"
              >
                {isAddingInvItem ? '닫기' : '+ 추가'}
              </button>
            </div>
          </div>

          {/* Batch Action Bar */}
          {isInvBatchMode && (
            <div className="p-3 bg-apple-card rounded-xl border border-apple-elevated/70 flex items-center justify-between gap-2 transition">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="selectAllInvCheckbox"
                  checked={inventory.length > 0 && selectedInvIds.size === inventory.length}
                  onChange={handleToggleSelectAllInv}
                  className="w-4 h-4 rounded bg-apple-surface border-apple-elevated text-apple-cyan focus:ring-0 cursor-pointer"
                />
                <label
                  htmlFor="selectAllInvCheckbox"
                  className="text-xs text-apple-subhead cursor-pointer select-none"
                >
                  전체
                </label>
                <span className="text-xs text-apple-cyan font-semibold ml-1">
                  {selectedInvIds.size}개 선택
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDeleteSelectedInv}
                  className="text-xs px-2.5 py-1 rounded-lg bg-apple-red/15 hover:bg-apple-red/25 text-apple-red font-semibold transition"
                >
                  선택 삭제
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAllInv}
                  className="text-xs px-2 py-1 rounded-lg bg-apple-surface hover:bg-apple-elevated text-apple-label hover:text-apple-red transition"
                >
                  전체 삭제
                </button>
              </div>
            </div>
          )}

          {/* Add Item Form (Compact Accordion Drawer) */}
          {isAddingInvItem && (
            <div className="p-4 sm:p-5 bg-apple-card rounded-2xl space-y-3.5 border border-apple-elevated/60 shadow-lg">
              <span className="text-xs sm:text-sm font-bold text-white block border-b border-apple-surface pb-2">
                새 비축 품목 등록
              </span>
              <div className="space-y-2.5">
                <div>
                  <label className="text-xs font-medium text-apple-label block mb-1">품목명</label>
                  <input
                    type="text"
                    placeholder="예: 바르닭 소스 닭가슴살"
                    value={newInvName}
                    onChange={(e) => setNewInvName(e.target.value)}
                    className="w-full bg-apple-surface px-3 py-2 rounded-xl text-xs sm:text-sm text-white border border-apple-elevated focus:outline-none focus:border-apple-cyan"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-medium text-apple-label block mb-1">
                      초기 수량 &amp; 단위
                    </label>
                    <div className="flex items-center gap-1.5 bg-apple-surface px-2.5 py-1.5 rounded-xl border border-apple-elevated">
                      <input
                        type="number"
                        placeholder="10"
                        value={newInvCount}
                        onChange={(e) => setNewInvCount(e.target.value)}
                        className="w-full bg-transparent text-xs sm:text-sm text-white font-mono font-bold focus:outline-none"
                      />
                      <input
                        type="text"
                        value={newInvUnit}
                        onChange={(e) => setNewInvUnit(e.target.value)}
                        className="w-8 bg-transparent text-xs text-apple-subhead text-center border-l border-apple-card pl-1 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-apple-label block mb-1">
                      칼로리 (kcal)
                    </label>
                    <div className="flex items-center gap-1.5 bg-apple-surface px-2.5 py-1.5 rounded-xl border border-apple-elevated">
                      <input
                        type="number"
                        placeholder="120"
                        value={newInvCal}
                        onChange={(e) => setNewInvCal(e.target.value)}
                        className="w-full bg-transparent text-xs sm:text-sm text-white font-mono font-bold focus:outline-none"
                      />
                      <span className="text-xs text-apple-label font-mono">kcal</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-apple-label block mb-1">
                    1회 제공량당 단백질 (g)
                  </label>
                  <div className="flex items-center gap-1.5 bg-apple-surface px-2.5 py-1.5 rounded-xl border border-apple-elevated">
                    <input
                      type="number"
                      placeholder="22"
                      value={newInvPro}
                      onChange={(e) => setNewInvPro(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm text-apple-green font-mono font-bold focus:outline-none"
                    />
                    <span className="text-xs text-apple-label font-mono">g</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveNewInv}
                  className="flex-1 py-2.5 rounded-xl bg-apple-green text-black font-bold text-xs sm:text-sm transition hover:opacity-90"
                >
                  등록하기
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingInvItem(false)}
                  className="px-3 py-2.5 rounded-xl bg-apple-surface hover:bg-apple-card text-apple-label hover:text-white font-semibold text-xs sm:text-sm transition"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {/* Inventory List */}
          <div className="space-y-3">
            {inventory.length === 0 ? (
              <div className="p-6 bg-apple-card rounded-2xl text-center space-y-2 border border-apple-elevated/30">
                <p className="text-xs sm:text-sm text-apple-label">등록된 비축 식단이 없습니다.</p>
                <button
                  type="button"
                  onClick={handleRestoreDefaultInventory}
                  className="text-xs text-apple-cyan hover:underline font-semibold"
                >
                  ↺ 초기 기본 품목 불러오기
                </button>
              </div>
            ) : (
              inventory.map((item) => {
                const isEditing = editingInvId === item.id;
                const isLow = item.count <= 3;
                const isSelected = selectedInvIds.has(item.id);

                if (isEditing) {
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 sm:p-4 bg-apple-card rounded-2xl border border-apple-cyan/60 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-apple-surface pb-2">
                        <span className="text-xs font-bold text-apple-cyan">품목 정보 수정</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteInvItem(item.id)}
                          className="text-xs text-apple-red hover:underline font-semibold flex items-center gap-1"
                        >
                          🗑️ 삭제
                        </button>
                      </div>
                      <div>
                        <label className="text-[11px] text-apple-label block mb-1">품목명</label>
                        <input
                          type="text"
                          value={editInvName}
                          onChange={(e) => setEditInvName(e.target.value)}
                          className="w-full bg-apple-surface px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-white border border-apple-elevated focus:outline-none focus:border-apple-cyan"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <label className="text-[11px] text-apple-label block mb-1">수량</label>
                          <input
                            type="number"
                            value={editInvCount}
                            onChange={(e) => setEditInvCount(Number(e.target.value) || 0)}
                            className="w-full bg-apple-surface px-2.5 py-1.5 rounded-lg text-white font-mono text-xs border border-apple-elevated focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-apple-label block mb-1">
                            칼로리 (kcal)
                          </label>
                          <input
                            type="number"
                            value={editInvCal}
                            onChange={(e) => setEditInvCal(Number(e.target.value) || 0)}
                            className="w-full bg-apple-surface px-2.5 py-1.5 rounded-lg text-white font-mono text-xs border border-apple-elevated focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-apple-label block mb-1">
                            단백질 (g)
                          </label>
                          <input
                            type="number"
                            value={editInvPro}
                            onChange={(e) => setEditInvPro(Number(e.target.value) || 0)}
                            className="w-full bg-apple-surface px-2.5 py-1.5 rounded-lg text-apple-green font-mono text-xs border border-apple-elevated focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingInvId(null)}
                          className="px-3 py-1.5 rounded-lg bg-apple-surface text-apple-label hover:text-white text-xs font-semibold"
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditInv(item.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-apple-elevated hover:bg-apple-surface text-white text-xs font-semibold transition"
                        >
                          완료
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 sm:p-4 bg-apple-card rounded-2xl border transition ${
                      isSelected
                        ? 'border-apple-cyan/60 bg-apple-surface/90'
                        : 'border-apple-elevated/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0 pr-2">
                        {isInvBatchMode && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectInv(item.id)}
                            className="w-4 h-4 rounded bg-apple-surface border-apple-elevated text-apple-cyan focus:ring-0 mr-2.5 cursor-pointer flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm sm:text-base font-bold text-white truncate">
                              {item.name}
                            </span>
                            {!isInvBatchMode && (
                              <button
                                type="button"
                                onClick={() => handleStartEditInv(item)}
                                title="이 품목 수정"
                                className="text-apple-label hover:text-apple-cyan transition text-xs p-1"
                              >
                                ✏️
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-xs ${
                                isLow
                                  ? 'text-apple-orange font-semibold bg-apple-orange/10 px-2 py-0.5 rounded'
                                  : 'text-apple-label bg-apple-surface px-2 py-0.5 rounded'
                              }`}
                            >
                              {isLow ? '⚠️ 재발주 필요' : '재고 안정'}
                            </span>
                            <span className="text-xs text-apple-subhead font-mono">
                              {item.cal} kcal | 단백질 {item.pro}g
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stepper Controls */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span
                          className={`text-lg sm:text-xl font-bold font-mono w-7 text-right ${
                            isLow ? 'text-apple-orange' : 'text-white'
                          }`}
                        >
                          {item.count}
                        </span>
                        <span className="text-xs text-apple-label font-medium mr-1.5">
                          {item.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAdjustInventoryCount(item.id, -1)}
                          className="w-7 h-7 rounded-lg bg-apple-surface hover:bg-apple-elevated text-xs font-bold text-white transition flex items-center justify-center"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustInventoryCount(item.id, 1)}
                          className="w-7 h-7 rounded-lg bg-apple-surface hover:bg-apple-elevated text-xs font-bold text-white transition flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
