'use client'

import { useEffect, useRef, useState } from 'react'
import { formatMinutes } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanItem {
  subject: string
  type: string
  label: string
  plannedMin: number
  doubled: boolean
  completedAt?: string
}

// A plan with a date range — stored in Plan model (type='PERIOD')
interface PeriodPlan {
  id: string
  title: string
  startDate: string
  endDate: string
  content: PlanItem
}

interface Review {
  id: string
  doneAt: string | null
  session: { subject: string; chapter: string | null; type: string; date: string }
}

interface Session {
  id: string
  subject: string
  type: string
  chapter: string | null
  durationMin: number
  date: string
}

interface PastStudyGroup {
  offset: number
  date: string
  sessions: Session[]
}

interface IncompletePlanItem {
  subject: string
  type: string
  label: string
  plannedMin: number
  doubled: boolean
  sourceDate: string
}

interface DayTask {
  kind: 'plan' | 'review'
  planIdx?: number
  reviewId?: string
  subject: string
  label: string
  plannedMin: number
  color: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GRID_START = 5, GRID_END = 24, CELL_MIN = 15
const COLS = 60 / CELL_MIN
const TOTAL_ROWS = GRID_END - GRID_START
const TOTAL_CELLS = TOTAL_ROWS * COLS
const EMPTY = -1, AVAIL = -2

const SESSION_TYPES = ['LECTURE', 'EXAMPLE', 'EXERCISE', 'ADVANCED', 'EXAM']
const TYPE_LABELS: Record<string, string> = {
  LECTURE: '개념 강의', EXAMPLE: '예제', EXERCISE: '연습', ADVANCED: '심화', EXAM: '모의고사',
}
const SUBJECTS = ['수학', '영어', '국어', '물리', '화학', '기타']

const PLAN_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#f97316']
const PERIOD_COLORS = ['#7c3aed', '#0369a1', '#065f46', '#92400e', '#9f1239', '#1e40af']
const REVIEW_COLORS = ['#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#a855f7', '#64748b']

function toStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function stepDate(date: string, dir: 1 | -1) {
  const [y, m, dd] = date.split('-').map(Number)
  const d = new Date(y, m - 1, dd); d.setDate(d.getDate() + dir); return toStr(d)
}

function dateLabel(date: string) {
  const [y, m, dd] = date.split('-').map(Number)
  const d = new Date(y, m - 1, dd)
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${y}년 ${m}월 ${dd}일 (${dow})`
}

function shortDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function cellBg(v: number, tasks: DayTask[]) {
  if (v === EMPTY) return '#f8fafc'
  if (v === AVAIL) return '#bfdbfe'
  return tasks[v]?.color ?? '#94a3b8'
}

// ─── Edit Item Modal ──────────────────────────────────────────────────────────

function EditItemModal({
  item,
  onSave,
  onClose,
}: {
  item: PlanItem
  onSave: (updated: PlanItem) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    subject: item.subject,
    type: item.type,
    label: item.label,
    baseMin: String(item.doubled ? item.plannedMin / 2 : item.plannedMin),
    doubled: item.doubled,
  })

  function handleSave() {
    const base = Number(form.baseMin)
    if (!form.label.trim() || !base) return
    onSave({
      subject: form.subject,
      type: form.type,
      label: form.label,
      plannedMin: form.doubled ? base * 2 : base,
      doubled: form.doubled,
      completedAt: item.completedAt,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-[400px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">계획 수정</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <div className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
              value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
              {SUBJECTS.map(s => <option key={s}>{s}</option>)}
            </select>
            <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
              value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {SESSION_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            value={form.label} onChange={e => setForm({ ...form, label: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handleSave()} />
          <div className="flex gap-2 items-center">
            <input type="number" min={1}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="예상 시간 (분)"
              value={form.baseMin} onChange={e => setForm({ ...form, baseMin: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleSave()} />
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer whitespace-nowrap px-1">
              <input type="checkbox" checked={form.doubled}
                onChange={e => setForm({ ...form, doubled: e.target.checked })} />
              ×2 복습
            </label>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-600">취소</button>
          <button onClick={handleSave}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: '#1e3a5f' }}>
            저장
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Plan Input Modal ─────────────────────────────────────────────────────────

function PlanInputModal({
  date,
  planItems,
  periodPlans,
  onAdd,
  onRemove,
  onAddPeriod,
  onRemovePeriod,
  onClose,
}: {
  date: string
  planItems: PlanItem[]
  periodPlans: PeriodPlan[]
  onAdd: (item: PlanItem) => void
  onRemove: (idx: number) => void
  onAddPeriod: (item: PlanItem, startDate: string, endDate: string) => Promise<void>
  onRemovePeriod: (id: string) => Promise<void>
  onClose: () => void
}) {
  const [newItem, setNewItem] = useState({
    subject: SUBJECTS[0], type: SESSION_TYPES[0], label: '', baseMin: '', doubled: false,
  })
  const [hasPeriod, setHasPeriod] = useState(false)
  const [startDate, setStartDate] = useState(date)
  const [endDate, setEndDate] = useState(date)
  const [saving, setSaving] = useState(false)

  async function addItem() {
    if (!newItem.label.trim() || !newItem.baseMin) return
    const base = Number(newItem.baseMin)
    const item: PlanItem = {
      subject: newItem.subject, type: newItem.type, label: newItem.label,
      plannedMin: newItem.doubled ? base * 2 : base, doubled: newItem.doubled,
    }
    if (hasPeriod && startDate && endDate) {
      setSaving(true)
      await onAddPeriod(item, startDate, endDate)
      setSaving(false)
    } else {
      onAdd(item)
    }
    setNewItem({ subject: SUBJECTS[0], type: SESSION_TYPES[0], label: '', baseMin: '', doubled: false })
    setHasPeriod(false)
    setStartDate(date)
    setEndDate(date)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-[520px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">계획 입력</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <div className="flex flex-col gap-5 p-6 overflow-y-auto">
          {/* Add form */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-gray-500">새 항목 추가</p>

            <div className="grid grid-cols-2 gap-2">
              <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                value={newItem.subject} onChange={e => setNewItem({ ...newItem, subject: e.target.value })}>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
              <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                value={newItem.type} onChange={e => setNewItem({ ...newItem, type: e.target.value })}>
                {SESSION_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>

            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="내용 (예: 미적분 3단원)"
              value={newItem.label} onChange={e => setNewItem({ ...newItem, label: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && addItem()} />

            <div className="flex gap-2 items-center">
              <input type="number" min={1}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="예상 시간 (분)"
                value={newItem.baseMin} onChange={e => setNewItem({ ...newItem, baseMin: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && addItem()} />
              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer whitespace-nowrap px-1">
                <input type="checkbox" checked={newItem.doubled}
                  onChange={e => setNewItem({ ...newItem, doubled: e.target.checked })} />
                ×2 복습
              </label>
            </div>

            {/* Period toggle */}
            <div className="border border-gray-100 rounded-xl p-3 bg-gray-50">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={hasPeriod}
                  onChange={e => setHasPeriod(e.target.checked)} />
                <span className="text-xs font-medium text-gray-600">기간 설정</span>
                <span className="text-xs text-gray-400">(설정 시 해당 기간 동안 매일 표시됩니다)</span>
              </label>
              {hasPeriod && (
                <div className="flex items-center gap-2 mt-2.5">
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  <span className="text-xs text-gray-400">~</span>
                  <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
              )}
            </div>

            <button onClick={addItem} disabled={saving}
              className="w-full py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: '#1e3a5f' }}>
              {saving ? '저장 중...' : hasPeriod ? '+ 기간 계획으로 추가' : '+ 오늘 계획으로 추가'}
            </button>
          </div>

          {/* Daily plan items */}
          {planItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">
                오늘 계획 <span className="text-gray-300 font-normal">({dateLabel(date)})</span>
              </p>
              <div className="space-y-1.5">
                {planItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 group">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PLAN_COLORS[i % PLAN_COLORS.length] }} />
                    <span className="text-xs text-blue-600 font-medium flex-shrink-0">{item.subject}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{TYPE_LABELS[item.type]}</span>
                    <span className="text-sm text-gray-700 flex-1 truncate">{item.label}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatMinutes(item.plannedMin)}</span>
                    <button onClick={() => onRemove(i)}
                      className="text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 text-base flex-shrink-0 ml-1">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Period plan items */}
          {periodPlans.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">기간 계획 <span className="text-gray-300 font-normal">(이 날짜에 포함된 계획)</span></p>
              <div className="space-y-1.5">
                {periodPlans.map((pp, i) => (
                  <div key={pp.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 border border-purple-100 group">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PERIOD_COLORS[i % PERIOD_COLORS.length] }} />
                    <span className="text-xs text-purple-600 font-medium flex-shrink-0">{pp.content.subject}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{TYPE_LABELS[pp.content.type]}</span>
                    <span className="text-sm text-gray-700 flex-1 truncate">{pp.content.label}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 flex-shrink-0 whitespace-nowrap">
                      {shortDate(pp.startDate)}~{shortDate(pp.endDate)}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatMinutes(pp.content.plannedMin)}</span>
                    <button onClick={() => onRemovePeriod(pp.id)}
                      className="text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 text-base flex-shrink-0 ml-1">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {planItems.length === 0 && periodPlans.length === 0 && (
            <p className="text-xs text-gray-300 text-center py-2">아직 등록된 계획이 없습니다</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose}
            className="px-5 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: '#1e3a5f' }}>
            완료
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DailyPage() {
  const today = toStr(new Date())
  const [date, setDate] = useState(today)

  const [planItems, setPlanItems] = useState<PlanItem[]>([])
  const [periodPlans, setPeriodPlans] = useState<PeriodPlan[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [grid, setGrid] = useState<number[]>(Array(TOTAL_CELLS).fill(EMPTY))
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState('')
  const [selectedTask, setSelectedTask] = useState<number | null>(null)
  const [completedPeriodIds, setCompletedPeriodIds] = useState<string[]>([])
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [editingItem, setEditingItem] = useState<{ kind: 'daily'; idx: number } | { kind: 'period'; id: string } | null>(null)
  const [pastStudyGroups, setPastStudyGroups] = useState<PastStudyGroup[]>([])
  const [incompletePlans, setIncompletePlans] = useState<{ date: string; items: IncompletePlanItem[] }[]>([])

  const isPainting = useRef(false)
  const paintVal = useRef<number>(EMPTY)
  const prevDateRef = useRef(date)
  const prevStateRef = useRef({ planItems, grid, completedPeriodIds, availableMin: 0 })

  // tasks order: planItems → reviews → periodItems (must match save/load order)
  const tasks: DayTask[] = [
    ...planItems.map((it, i) => ({
      kind: 'plan' as const,
      planIdx: i,
      subject: it.subject,
      label: it.label,
      plannedMin: it.plannedMin,
      color: PLAN_COLORS[i % PLAN_COLORS.length],
    })),
    ...reviews.map((r, i) => ({
      kind: 'review' as const,
      reviewId: r.id,
      subject: r.session.subject,
      label: r.session.chapter ?? `${TYPE_LABELS[r.session.type] ?? r.session.type} 복습`,
      plannedMin: 30,
      color: REVIEW_COLORS[i % REVIEW_COLORS.length],
    })),
    ...periodPlans.map((pp, i) => ({
      kind: 'plan' as const,
      subject: pp.content.subject,
      label: pp.content.label,
      plannedMin: pp.content.plannedMin,
      color: PERIOD_COLORS[i % PERIOD_COLORS.length],
    })),
  ]

  // Base index where period items start in tasks[]
  const periodBase = planItems.length + reviews.length

  const availableMin = grid.filter(v => v === AVAIL).length * CELL_MIN
  const plannedMin = planItems.reduce((s, it) => s + it.plannedMin, 0)
  const actualMin = sessions.reduce((s, se) => s + se.durationMin, 0)
  const taskAssigned = tasks.map((_, i) => grid.filter(v => v === i).length * CELL_MIN)

  // ── Data loading ────────────────────────────────────────────────────────────

  async function load() {
    const OFFSETS = [1, 3, 7, 14, 21, 30]
    const [y, m, dd] = date.split('-').map(Number)
    const sel = new Date(y, m - 1, dd)
    const pastDates = OFFSETS.map(offset => {
      const d = new Date(sel); d.setDate(d.getDate() - offset); return { offset, dateStr: toStr(d) }
    })

    const [planRes, reviewRes, sessionRes, periodRes, incompleteRes, ...pastReses] = await Promise.all([
      fetch(`/api/plans/daily?date=${date}`),
      fetch(`/api/reviews?date=${date}`),
      fetch(`/api/sessions?date=${date}`),
      fetch(`/api/plans/period?date=${date}`),
      fetch(`/api/plans/incomplete?before=${date}`),
      ...pastDates.map(({ dateStr }) => fetch(`/api/sessions?date=${dateStr}`)),
    ])
    const [planData, reviewData, sessionData, periodData, incompleteData, ...pastDataArr] = await Promise.all([
      planRes.json(), reviewRes.json(), sessionRes.json(), periodRes.json(), incompleteRes.json(),
      ...pastReses.map(r => r.json()),
    ])

    const groups: PastStudyGroup[] = pastDates
      .map(({ offset, dateStr }, i) => ({
        offset,
        date: dateStr,
        sessions: Array.isArray(pastDataArr[i]) ? pastDataArr[i] : [],
      }))
      .filter(g => g.sessions.length > 0)
    setPastStudyGroups(groups)
    setIncompletePlans(Array.isArray(incompleteData) ? incompleteData : [])

    if (planData) {
      setSavedId(planData.id)
      const raw = planData.items
      let loadedItems: PlanItem[] = []
      let loadedGrid: number[] = Array(TOTAL_CELLS).fill(EMPTY)
      if (Array.isArray(raw)) {
        loadedItems = raw
      } else if (raw && typeof raw === 'object') {
        loadedItems = raw.items ?? []
        const g = raw.grid
        if (Array.isArray(g) && g.length === TOTAL_CELLS) loadedGrid = g
      }
      setPlanItems(loadedItems)
      setGrid(loadedGrid)
      setCompletedPeriodIds(Array.isArray(raw?.completedPeriodIds) ? raw.completedPeriodIds : [])
    } else {
      setSavedId(null)
      setPlanItems([])
      setGrid(Array(TOTAL_CELLS).fill(EMPTY))
      setCompletedPeriodIds([])
    }

    setReviews(Array.isArray(reviewData) ? reviewData : [])
    setSessions(Array.isArray(sessionData) ? sessionData : [])
    setSelectedTask(null)

    // Period plans: normalize dates from ISO strings
    if (Array.isArray(periodData)) {
      setPeriodPlans(periodData.map((p: { id: string; title: string; startDate: string; endDate: string; content: PlanItem }) => ({
        id: p.id,
        title: p.title,
        startDate: p.startDate,
        endDate: p.endDate,
        content: p.content,
      })))
    } else {
      setPeriodPlans([])
    }
  }

  // prevStateRef를 항상 최신 상태로 유지
  useEffect(() => {
    prevStateRef.current = { planItems, grid, completedPeriodIds, availableMin }
  })

  // 페이지를 떠날 때(언마운트) 자동 저장
  useEffect(() => {
    return () => {
      const { planItems: pi, grid: g, completedPeriodIds: cpi, availableMin: am } = prevStateRef.current
      const currentDate = prevDateRef.current
      if (pi.length > 0 || g.some(v => v !== EMPTY)) {
        fetch('/api/plans/daily', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: currentDate,
            availableMin: am,
            items: { items: pi, grid: g, completedPeriodIds: cpi },
          }),
        })
      }
    }
  }, [])

  useEffect(() => {
    const prevDate = prevDateRef.current
    if (prevDate !== date) {
      // 날짜가 바뀌기 전 데이터를 자동 저장
      const { planItems: pi, grid: g, completedPeriodIds: cpi, availableMin: am } = prevStateRef.current
      if (pi.length > 0 || g.some(v => v !== EMPTY)) {
        fetch('/api/plans/daily', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: prevDate,
            availableMin: am,
            items: { items: pi, grid: g, completedPeriodIds: cpi },
          }),
        })
      }
      prevDateRef.current = date
    }
    load()
  }, [date])

  // ── Grid painting ────────────────────────────────────────────────────────────

  function resolveVal(idx: number) {
    const cur = grid[idx]
    if (selectedTask !== null) return cur === selectedTask ? AVAIL : selectedTask
    return cur === EMPTY ? AVAIL : EMPTY
  }

  function paint(idx: number) {
    setGrid(prev => {
      const next = [...prev]
      if (selectedTask !== null) {
        next[idx] = paintVal.current
      } else {
        if (paintVal.current === EMPTY && next[idx] !== EMPTY) next[idx] = EMPTY
        else if (paintVal.current === AVAIL && next[idx] === EMPTY) next[idx] = AVAIL
      }
      return next
    })
  }

  function onMouseDown(idx: number, e: React.MouseEvent) {
    e.preventDefault(); isPainting.current = true; paintVal.current = resolveVal(idx); paint(idx)
  }
  function onMouseEnter(idx: number) { if (isPainting.current) paint(idx) }
  function onMouseUp() { isPainting.current = false }
  function onTouchStart(idx: number, e: React.TouchEvent) {
    e.preventDefault(); isPainting.current = true; paintVal.current = resolveVal(idx); paint(idx)
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!isPainting.current) return; e.preventDefault()
    const t = e.touches[0]
    const el = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null
    if (el?.dataset.cidx) paint(Number(el.dataset.cidx))
  }

  // ── Plan items ───────────────────────────────────────────────────────────────

  function addItem(item: PlanItem) {
    setPlanItems(prev => [...prev, item])
  }

  function removePlanItem(idx: number) {
    setGrid(prev => prev.map(v => {
      if (v === idx) return AVAIL
      if (v > idx) return v - 1
      return v
    }))
    setPlanItems(prev => prev.filter((_, i) => i !== idx))
    if (selectedTask === idx) setSelectedTask(null)
    else if (selectedTask !== null && selectedTask > idx) setSelectedTask(selectedTask - 1)
  }

  async function addPeriodPlan(item: PlanItem, startDate: string, endDate: string) {
    const res = await fetch('/api/plans/period', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, startDate, endDate }),
    })
    if (res.ok) {
      const created = await res.json()
      setPeriodPlans(prev => [...prev, {
        id: created.id, title: created.title,
        startDate: created.startDate, endDate: created.endDate,
        content: created.content,
      }])
    }
  }

  function completePlanItem(idx: number) {
    setPlanItems(prev => prev.map((it, i) =>
      i === idx ? { ...it, completedAt: new Date().toISOString() } : it
    ))
  }

  function uncompletePlanItem(idx: number) {
    setPlanItems(prev => prev.map((it, i) =>
      i === idx ? { ...it, completedAt: undefined } : it
    ))
  }

  function updatePlanItem(idx: number, updated: PlanItem) {
    setPlanItems(prev => prev.map((it, i) => i === idx ? updated : it))
    setEditingItem(null)
  }

  function completePeriodPlan(id: string) {
    setCompletedPeriodIds(prev => prev.includes(id) ? prev : [...prev, id])
  }

  function uncompletePeriodPlan(id: string) {
    setCompletedPeriodIds(prev => prev.filter(i => i !== id))
  }

  async function updatePeriodPlan(id: string, updated: PlanItem) {
    setPeriodPlans(prev => prev.map(p => p.id === id ? { ...p, content: { ...p.content, ...updated } } : p))
    setEditingItem(null)
    await fetch(`/api/plans/period/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: updated }),
    })
  }

  async function removePeriodPlan(id: string) {
    const periodIdx = periodPlans.findIndex(p => p.id === id)
    const taskIdx = planItems.length + reviews.length + periodIdx
    setGrid(prev => prev.map(v => {
      if (v === taskIdx) return AVAIL
      if (v > taskIdx) return v - 1
      return v
    }))
    if (selectedTask === taskIdx) setSelectedTask(null)
    else if (selectedTask !== null && selectedTask > taskIdx) setSelectedTask(selectedTask - 1)
    await fetch(`/api/plans/period/${id}`, { method: 'DELETE' })
    setPeriodPlans(prev => prev.filter(p => p.id !== id))
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function save() {
    const res = await fetch('/api/plans/daily', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, availableMin, items: { items: planItems, grid, completedPeriodIds } }),
    })
    if (res.ok) {
      setSavedId((await res.json()).id)
      setSaveMsg('저장됨'); setTimeout(() => setSaveMsg(''), 2000)
    }
  }

  // ── Mark review done ─────────────────────────────────────────────────────────

  async function markReviewDone(id: string) {
    await fetch(`/api/reviews/${id}/done`, { method: 'PUT' })
    setReviews(prev => prev.map(r => r.id === id ? { ...r, doneAt: new Date().toISOString() } : r))
  }

  async function unmarkReviewDone(id: string) {
    await fetch(`/api/reviews/${id}/done`, { method: 'DELETE' })
    setReviews(prev => prev.map(r => r.id === id ? { ...r, doneAt: null } : r))
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const isToday = date === today
  const totalPlanCount = planItems.length + periodPlans.length

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 flex-shrink-0">
        <h1 className="text-base font-bold text-gray-800">일일 관리</h1>

        <div className="flex items-center gap-2">
          <button onClick={() => setDate(stepDate(date, -1))}
            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-sm">‹</button>
          <div className="flex items-center gap-2">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            <span className="text-xs text-gray-500">{dateLabel(date)}</span>
          </div>
          <button onClick={() => setDate(stepDate(date, 1))}
            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-sm">›</button>
        </div>

        {!isToday && (
          <button onClick={() => setDate(today)} className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600">오늘</button>
        )}

        <div className="flex items-center gap-4 text-xs">
          {availableMin > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">가용</span>
              <span className="font-semibold text-gray-700">{formatMinutes(availableMin)}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">계획</span>
            <span className={`font-semibold ${availableMin > 0 && plannedMin > Math.floor(availableMin * 0.8) ? 'text-red-500' : 'text-blue-700'}`}>{formatMinutes(plannedMin)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">실제</span>
            <span className={`font-semibold ${actualMin >= plannedMin && plannedMin > 0 ? 'text-green-600' : 'text-gray-700'}`}>
              {formatMinutes(actualMin)}
            </span>
          </div>
          {plannedMin > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">달성률</span>
              <span className={`font-semibold ${Math.round(actualMin / plannedMin * 100) >= 80 ? 'text-green-600' : 'text-orange-500'}`}>
                {Math.round(actualMin / plannedMin * 100)}%
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto text-xs">
          <button
            onClick={() => setShowPlanModal(true)}
            className="ml-2 px-4 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            계획 입력
            {totalPlanCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-white leading-none" style={{ backgroundColor: '#1e3a5f', fontSize: 10 }}>
                {totalPlanCount}
              </span>
            )}
          </button>
          <button onClick={save} className="px-4 py-1.5 rounded-lg text-white text-xs font-medium" style={{ backgroundColor: '#1e3a5f' }}>
            {savedId ? '업데이트' : '저장'}
          </button>
          {saveMsg && <span className="text-green-600">✓ {saveMsg}</span>}
        </div>
      </div>

      {/* ── Three-panel content ── */}
      <div className="flex flex-1 overflow-hidden" onMouseUp={onMouseUp} onTouchEnd={onMouseUp}>


        {/* ── LEFT: Past study panel ── */}
        {pastStudyGroups.length > 0 && (
          <div className="w-52 flex-shrink-0 border-r border-gray-100 bg-gray-50 overflow-y-auto">
            <div className="p-3">
              <p className="text-xs font-bold text-gray-600 mb-3 px-1">복습 연결 내용</p>
              <div className="space-y-3">
                {pastStudyGroups.map(({ offset, date: pastDate, sessions: pastSessions }) => {
                  const [, pm, pd] = pastDate.split('-').map(Number)
                  return (
                    <div key={offset}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: '#1e3a5f' }}>
                          {offset}일 전
                        </span>
                        <span className="text-xs text-gray-400">{pm}/{pd}</span>
                      </div>
                      <div className="space-y-1 pl-1">
                        {pastSessions.map(s => (
                          <div key={s.id} className="bg-white rounded-lg border border-gray-100 px-2.5 py-1.5">
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="text-xs font-semibold text-blue-600">{s.subject}</span>
                              <span className="text-xs text-gray-400">{TYPE_LABELS[s.type] ?? s.type}</span>
                            </div>
                            {s.chapter && (
                              <div className="text-xs text-gray-700 truncate">{s.chapter}</div>
                            )}
                            <div className="text-xs text-gray-400 mt-0.5">{s.durationMin}분</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── CENTER: Time grid ── */}
        <div className="flex-1 overflow-y-auto p-4 bg-white">
          <div className="flex items-center gap-px mb-1 ml-12">
            {Array.from({ length: COLS }, (_, c) => (
              <div key={c} className="text-gray-300 text-center" style={{ width: 36, fontSize: 9 }}>
                {['00', '15', '30', '45'][c]}
              </div>
            ))}
          </div>
          <div className="select-none" onTouchMove={onTouchMove} style={{ touchAction: 'none' }}>
            {Array.from({ length: TOTAL_ROWS }, (_, row) => {
              const hour = (GRID_START + row) % 24
              return (
                <div key={row} className="flex items-center gap-px mb-px">
                  <div className="w-11 text-right pr-1.5 flex-shrink-0 text-xs text-gray-400 select-none">
                    {String(hour).padStart(2, '0')}:00
                  </div>
                  {Array.from({ length: COLS }, (_, col) => {
                    const cidx = row * COLS + col
                    const v = grid[cidx]
                    const isSel = selectedTask !== null && v === selectedTask
                    const bg = cellBg(v, tasks)
                    return (
                      <div key={col} data-cidx={cidx}
                        style={{
                          width: 36, height: 24,
                          backgroundColor: bg,
                          border: isSel ? `2px solid ${tasks[selectedTask]?.color}` : '1px solid #e2e8f0',
                          borderRadius: 3, cursor: 'pointer',
                        }}
                        onMouseDown={e => onMouseDown(cidx, e)}
                        onMouseEnter={() => onMouseEnter(cidx)}
                        onTouchStart={e => onTouchStart(cidx, e)}
                      />
                    )
                  })}
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-300 mt-3 text-center">셀 1개 = 15분 · 항목 미선택 드래그 → 가용 시간(파란색) · 항목 선택 후 드래그 → 배치</p>
        </div>

        {/* ── RIGHT: Tasks ── */}
        <div className="w-64 flex-shrink-0 border-l border-gray-100 bg-gray-50 overflow-y-auto">
          <div className="p-4 space-y-4">

            {/* Stats */}
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <p className="text-xs font-semibold text-blue-700 mb-1">오늘 가용 시간</p>
              {availableMin > 0 ? (
                <>
                  <p className="text-lg font-bold text-blue-800">{formatMinutes(availableMin)}</p>
                  <p className="text-xs text-blue-500 mt-0.5">계획 가능 (×0.8) {formatMinutes(Math.floor(availableMin * 0.8))}</p>
                </>
              ) : (
                <p className="text-xs text-blue-400 leading-relaxed">그리드에서 드래그해서<br />가용 시간을 설정하세요</p>
              )}
            </div>

            <div className="bg-white rounded-xl p-3 space-y-1.5 border border-gray-100">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">계획 합계</span>
                <span className={`font-semibold ${availableMin > 0 && plannedMin > Math.floor(availableMin * 0.8) ? 'text-red-500' : 'text-gray-700'}`}>
                  {formatMinutes(plannedMin)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">실제 공부</span>
                <span className="font-semibold text-gray-700">{formatMinutes(actualMin)}</span>
              </div>
              {plannedMin > 0 && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div className="h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.round(actualMin / plannedMin * 100))}%`, backgroundColor: actualMin >= plannedMin ? '#10b981' : '#1e3a5f' }} />
                  </div>
                  <p className="text-xs text-center text-gray-400">{Math.round(actualMin / plannedMin * 100)}% 달성</p>
                </>
              )}
            </div>

            {/* Daily plan items — active only */}
            {(() => {
              const activeItems = planItems.map((it, i) => ({ it, i })).filter(({ it }) => !it.completedAt)
              const completedDailyItems = planItems.map((it, i) => ({ it, i })).filter(({ it }) => !!it.completedAt)
              const activePeriod = periodPlans.filter(pp => !completedPeriodIds.includes(pp.id))
              const completedPeriod = periodPlans.filter(pp => completedPeriodIds.includes(pp.id))
              return (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-500">오늘 계획 ({activeItems.length})</p>
                      <button onClick={() => setShowPlanModal(true)} className="text-xs text-blue-500 hover:text-blue-700">+ 추가</button>
                    </div>
                    {activeItems.length === 0 ? (
                      <button onClick={() => setShowPlanModal(true)}
                        className="w-full text-xs text-gray-300 text-center py-3 border border-dashed border-gray-200 rounded-xl hover:border-blue-200 hover:text-blue-300 transition-colors">
                        계획 입력 버튼으로 추가
                      </button>
                    ) : (
                      <div className="space-y-1.5">
                        {activeItems.map(({ it: item, i }) => {
                          const task = tasks[i]
                          const isSel = selectedTask === i
                          const assigned = taskAssigned[i]
                          return (
                            <div key={i} onClick={() => setSelectedTask(isSel ? null : i)}
                              className="flex items-center gap-2 p-2 rounded-xl cursor-pointer group bg-white border"
                              style={{ borderColor: isSel ? task.color : '#e5e7eb', boxShadow: isSel ? `0 0 0 2px ${task.color}40` : undefined }}>
                              <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: task.color }} />
                              <div className="flex-1 min-w-0">
                                <div className="text-gray-400 text-xs truncate">{item.subject} · {TYPE_LABELS[item.type]}</div>
                                <div className="font-medium text-gray-800 text-xs truncate">{item.label}</div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <div className="flex-1 bg-gray-100 rounded-full h-1">
                                    <div className="h-1 rounded-full transition-all"
                                      style={{ width: `${Math.min(100, item.plannedMin > 0 ? Math.round(assigned / item.plannedMin * 100) : 0)}%`, backgroundColor: task.color }} />
                                  </div>
                                  <span className="text-xs" style={{ color: task.color }}>
                                    {formatMinutes(assigned)}<span className="text-gray-300">/{formatMinutes(item.plannedMin)}</span>
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                <button onClick={() => completePlanItem(i)}
                                  className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-600 hover:bg-green-100 leading-none">완료</button>
                                <button onClick={() => setEditingItem({ kind: 'daily', idx: i })}
                                  className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 leading-none">수정</button>
                                <button onClick={() => removePlanItem(i)}
                                  className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-400 hover:bg-red-100 leading-none">삭제</button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Period plan items — active only */}
                  {activePeriod.length > 0 && (
                    <>
                      <div className="border-t border-gray-200" />
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">
                          기간 계획 ({activePeriod.length})
                          <span className="ml-1 text-gray-300 font-normal text-xs">이 날에 포함</span>
                        </p>
                        <div className="space-y-1.5">
                          {activePeriod.map((pp, i) => {
                            const taskIdx = periodBase + periodPlans.indexOf(pp)
                            const task = tasks[taskIdx]
                            const isSel = selectedTask === taskIdx
                            const assigned = taskAssigned[taskIdx] ?? 0
                            return (
                              <div key={pp.id}
                                onClick={() => setSelectedTask(isSel ? null : taskIdx)}
                                className="flex items-center gap-2 p-2 rounded-xl bg-white border cursor-pointer group"
                                style={{ borderColor: isSel ? task?.color : '#e9d5ff', boxShadow: isSel ? `0 0 0 2px ${task?.color}40` : undefined }}>
                                <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: PERIOD_COLORS[i % PERIOD_COLORS.length] }} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 mb-0.5">
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 flex-shrink-0">기간</span>
                                    <span className="text-gray-400 text-xs truncate">{pp.content.subject}</span>
                                  </div>
                                  <div className="font-medium text-gray-800 text-xs truncate">{pp.content.label}</div>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <div className="flex-1 bg-gray-100 rounded-full h-1">
                                      <div className="h-1 rounded-full transition-all"
                                        style={{ width: `${Math.min(100, pp.content.plannedMin > 0 ? Math.round(assigned / pp.content.plannedMin * 100) : 0)}%`, backgroundColor: PERIOD_COLORS[i % PERIOD_COLORS.length] }} />
                                    </div>
                                    <span className="text-xs" style={{ color: PERIOD_COLORS[i % PERIOD_COLORS.length] }}>
                                      {formatMinutes(assigned)}<span className="text-gray-300">/{formatMinutes(pp.content.plannedMin)}</span>
                                    </span>
                                  </div>
                                  <div className="text-xs text-purple-300 mt-0.5">{shortDate(pp.startDate)} ~ {shortDate(pp.endDate)}</div>
                                </div>
                                <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                  <button onClick={() => completePeriodPlan(pp.id)}
                                    className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-600 hover:bg-green-100 leading-none">완료</button>
                                  <button onClick={() => setEditingItem({ kind: 'period', id: pp.id })}
                                    className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 leading-none">수정</button>
                                  <button onClick={() => removePeriodPlan(pp.id)}
                                    className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-400 hover:bg-red-100 leading-none">삭제</button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Completed plans */}
                  {(completedDailyItems.length > 0 || completedPeriod.length > 0) && (
                    <>
                      <div className="border-t border-gray-200" />
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-2">완료된 계획 ({completedDailyItems.length + completedPeriod.length})</p>
                        <div className="space-y-1.5">
                          {completedDailyItems.map(({ it: item, i }) => (
                            <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-white border border-gray-100 opacity-60 group">
                              <div className="w-1.5 h-8 rounded-full flex-shrink-0 bg-gray-300" />
                              <div className="flex-1 min-w-0">
                                <div className="text-gray-400 text-xs truncate line-through">{item.subject} · {TYPE_LABELS[item.type]}</div>
                                <div className="text-gray-500 text-xs truncate line-through">{item.label}</div>
                              </div>
                              <button onClick={() => uncompletePlanItem(i)}
                                className="text-xs text-gray-300 hover:text-blue-400 opacity-0 group-hover:opacity-100 flex-shrink-0">↩</button>
                            </div>
                          ))}
                          {completedPeriod.map((pp) => (
                            <div key={pp.id} className="flex items-center gap-2 p-2 rounded-xl bg-white border border-purple-50 opacity-60 group">
                              <div className="w-1.5 h-8 rounded-full flex-shrink-0 bg-purple-200" />
                              <div className="flex-1 min-w-0">
                                <div className="text-purple-300 text-xs truncate line-through">{pp.content.subject} · 기간</div>
                                <div className="text-gray-500 text-xs truncate line-through">{pp.content.label}</div>
                              </div>
                              <button onClick={() => uncompletePeriodPlan(pp.id)}
                                className="text-xs text-gray-300 hover:text-blue-400 opacity-0 group-hover:opacity-100 flex-shrink-0">↩</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )
            })()}

            <div className="border-t border-gray-200" />

            {/* Incomplete plans from past days */}
            {incompletePlans.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">
                  미완료 계획
                  <span className="ml-1 text-orange-400 font-normal">({incompletePlans.reduce((s, g) => s + g.items.length, 0)}개)</span>
                </p>
                <div className="space-y-2">
                  {incompletePlans.map(group => (
                    <div key={group.date}>
                      <p className="text-xs text-gray-300 mb-1">{dateLabel(group.date)}</p>
                      <div className="space-y-1">
                        {group.items.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-orange-50 border border-orange-100 group">
                            <div className="flex-1 min-w-0">
                              <div className="text-gray-400 text-xs truncate">{item.subject} · {TYPE_LABELS[item.type]}</div>
                              <div className="text-xs text-gray-700 truncate">{item.label}</div>
                              <div className="text-xs text-orange-300">{formatMinutes(item.plannedMin)}</div>
                            </div>
                            <button
                              onClick={() => addItem({ subject: item.subject, type: item.type, label: item.label, plannedMin: item.plannedMin, doubled: item.doubled })}
                              className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-600 hover:bg-orange-200 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                            >
                              + 오늘 추가
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-200" />

            {/* Reviews */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">오늘 복습 ({reviews.length})</p>
              {reviews.length === 0 ? (
                <p className="text-xs text-gray-300 text-center py-3">오늘 복습 없음 🎉</p>
              ) : (
                <div className="space-y-1.5">
                  {reviews.map((r, ri) => {
                    const taskIdx = planItems.length + ri
                    const task = tasks[taskIdx]
                    const isSel = selectedTask === taskIdx
                    const assigned = taskAssigned[taskIdx] ?? 0
                    const done = !!r.doneAt
                    return (
                      <div key={r.id}
                        onClick={() => !done && setSelectedTask(isSel ? null : taskIdx)}
                        className={`flex items-center gap-2 p-2 rounded-xl bg-white border group ${done ? 'opacity-50' : 'cursor-pointer'}`}
                        style={{ borderColor: isSel ? task?.color : '#e5e7eb', boxShadow: isSel ? `0 0 0 2px ${task?.color}40` : undefined }}>
                        <button
                          onClick={e => { e.stopPropagation(); done ? unmarkReviewDone(r.id) : markReviewDone(r.id) }}
                          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${done ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-400'}`}>
                          {done && <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1.5 4l2 2 3-3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}
                        </button>
                        <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: task?.color ?? '#94a3b8' }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 flex-shrink-0">복습</span>
                            <span className="text-gray-400 text-xs truncate">{r.session.subject}</span>
                          </div>
                          <div className="font-medium text-gray-800 text-xs truncate mt-0.5">{task?.label}</div>
                          {!done && assigned > 0 && (
                            <span className="text-xs" style={{ color: task?.color }}>{formatMinutes(assigned)} 배치</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="border-t border-gray-200 pt-3">
              <p className="text-xs text-gray-400 mb-2">범례</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-3 h-3 rounded-sm inline-block border border-blue-200" style={{ backgroundColor: '#bfdbfe' }} />
                  가용 시간
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: PLAN_COLORS[0] }} />
                  오늘 계획
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: PERIOD_COLORS[0] }} />
                  기간 계획
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: REVIEW_COLORS[0] }} />
                  복습
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Edit Item Modal ── */}
      {editingItem && editingItem.kind === 'daily' && (
        <EditItemModal
          item={planItems[editingItem.idx]}
          onSave={updated => updatePlanItem(editingItem.idx, updated)}
          onClose={() => setEditingItem(null)}
        />
      )}
      {editingItem && editingItem.kind === 'period' && (() => {
        const pp = periodPlans.find(p => p.id === editingItem.id)
        if (!pp) return null
        return (
          <EditItemModal
            item={pp.content}
            onSave={updated => updatePeriodPlan(editingItem.id, updated)}
            onClose={() => setEditingItem(null)}
          />
        )
      })()}

      {/* ── Plan Input Modal ── */}
      {showPlanModal && (
        <PlanInputModal
          date={date}
          planItems={planItems}
          periodPlans={periodPlans}
          onAdd={addItem}
          onRemove={removePlanItem}
          onAddPeriod={addPeriodPlan}
          onRemovePeriod={removePeriodPlan}
          onClose={() => setShowPlanModal(false)}
        />
      )}
    </div>
  )
}
