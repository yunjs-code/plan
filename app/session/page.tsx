'use client'

import { useEffect, useState } from 'react'
import { formatMinutes } from '@/lib/utils'

interface Textbook { id: string; name: string; type: string }
interface Session {
  id: string
  date: string
  type: string
  subject: string
  chapter: string | null
  problemNos: string | null
  durationMin: number
  completedAt: string | null
  textbook: Textbook | null
}
interface PlanItem {
  subject: string
  type: string
  label: string
  plannedMin: number
  doubled: boolean
  completedAt?: string
  date?: string
  _source?: { kind: 'daily'; date: string } | { kind: 'period'; id: string }
}

const SESSION_TYPES = ['LECTURE', 'EXAMPLE', 'EXERCISE', 'ADVANCED', 'EXAM']
const SESSION_TYPE_LABELS: Record<string, string> = {
  LECTURE: '개념 강의', EXAMPLE: '예제', EXERCISE: '연습', ADVANCED: '심화', EXAM: '모의고사',
}
const SUBJECTS = ['수학', '영어', '국어', '물리', '화학', '기타']

function toLocalDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function SessionPage() {
  const today = toLocalDateString(new Date())

  const [sessions, setSessions] = useState<Session[]>([])
  const [textbooks, setTextbooks] = useState<Textbook[]>([])
  const [planItems, setPlanItems] = useState<PlanItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [filterDate, setFilterDate] = useState('')
  const [form, setForm] = useState({
    date: today,
    type: SESSION_TYPES[0],
    subject: SUBJECTS[0],
    textbookId: '',
    chapter: '',
    problemNos: '',
    durationMin: '',
  })

  async function fetchSessions() {
    const qs = filterDate ? `?date=${filterDate}` : ''
    const res = await fetch(`/api/sessions${qs}`)
    setSessions(await res.json())
  }

  async function fetchTextbooks() {
    const res = await fetch('/api/textbooks')
    setTextbooks(await res.json())
  }

  async function fetchPlanItems(date: string | null) {
    const qs = date ? `?date=${date}` : ''
    const [dailyRes, periodRes] = await Promise.all([
      fetch(`/api/plans/daily${qs}`),
      fetch(`/api/plans/period${qs}`),
    ])
    const [dailyData, periodData] = await Promise.all([dailyRes.json(), periodRes.json()])

    let daily: PlanItem[] = []
    if (date) {
      // 단일 날짜: 단일 객체 반환
      const rawItems: PlanItem[] = Array.isArray(dailyData?.items)
        ? (dailyData.items as PlanItem[])
        : ((dailyData?.items?.items as PlanItem[]) ?? [])
      daily = rawItems.map(it => ({ ...it, date: date, _source: { kind: 'daily' as const, date } }))
    } else {
      // 전체: 배열 반환, 각 DailyPlan에서 items 추출하고 날짜 추가
      if (Array.isArray(dailyData)) {
        for (const plan of dailyData) {
          const planDate = plan.date?.slice(0, 10)
          const items: PlanItem[] = Array.isArray(plan?.items)
            ? (plan.items as PlanItem[])
            : ((plan?.items?.items as PlanItem[]) ?? [])
          daily.push(...items.map(it => ({ ...it, date: planDate, _source: { kind: 'daily' as const, date: planDate } })))
        }
      }
    }

    const period: PlanItem[] = Array.isArray(periodData)
      ? periodData.map((p: { id: string; content: PlanItem; startDate: string; endDate: string }) => ({
          ...p.content,
          date: `${p.startDate?.slice(0, 10)} ~ ${p.endDate?.slice(0, 10)}`,
          _source: { kind: 'period' as const, id: p.id },
        }))
      : []
    setPlanItems([...daily, ...period])
  }

  useEffect(() => { fetchTextbooks() }, [])
  useEffect(() => {
    fetchSessions()
    fetchPlanItems(filterDate || null)
  }, [filterDate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setForm({ date: today, type: SESSION_TYPES[0], subject: SUBJECTS[0], textbookId: '', chapter: '', problemNos: '', durationMin: '' })
      setShowForm(false)
      fetchSessions()
    }
  }

  function parseDailyPlanItems(planData: { items: unknown; availableMin?: number }): { items: PlanItem[]; blob: Record<string, unknown> } {
    const raw = planData.items
    if (Array.isArray(raw)) {
      return { items: raw as PlanItem[], blob: { items: raw } }
    }
    if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>
      return { items: (obj.items as PlanItem[]) ?? [], blob: obj }
    }
    return { items: [], blob: {} }
  }

  async function handlePlanComplete(item: PlanItem) {
    if (!item._source || item._source.kind !== 'daily') return
    const dateStr = item._source.date
    const res = await fetch(`/api/plans/daily?date=${dateStr}`)
    const planData = await res.json()
    if (!planData) return
    const { items, blob } = parseDailyPlanItems(planData)
    const updated = items.map(it =>
      it.label === item.label && it.subject === item.subject
        ? { ...it, completedAt: new Date().toISOString() }
        : it
    )
    await fetch('/api/plans/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateStr, availableMin: planData.availableMin ?? 0, items: { ...blob, items: updated } }),
    })
    setPlanItems(prev => prev.map(it =>
      it._source?.kind === 'daily' && it._source.date === dateStr && it.label === item.label && it.subject === item.subject
        ? { ...it, completedAt: new Date().toISOString() }
        : it
    ))
  }

  async function handlePlanUncomplete(item: PlanItem) {
    if (!item._source || item._source.kind !== 'daily') return
    const dateStr = item._source.date
    const res = await fetch(`/api/plans/daily?date=${dateStr}`)
    const planData = await res.json()
    if (!planData) return
    const { items, blob } = parseDailyPlanItems(planData)
    const updated = items.map(it =>
      it.label === item.label && it.subject === item.subject
        ? { ...it, completedAt: undefined }
        : it
    )
    await fetch('/api/plans/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateStr, availableMin: planData.availableMin ?? 0, items: { ...blob, items: updated } }),
    })
    setPlanItems(prev => prev.map(it =>
      it._source?.kind === 'daily' && it._source.date === dateStr && it.label === item.label && it.subject === item.subject
        ? { ...it, completedAt: undefined }
        : it
    ))
  }

  async function handlePlanDelete(item: PlanItem) {
    if (!item._source) return
    if (item._source.kind === 'period') {
      if (!confirm('기간 계획을 삭제하시겠습니까?')) return
      await fetch(`/api/plans/period/${item._source.id}`, { method: 'DELETE' })
      setPlanItems(prev => prev.filter(it => it._source?.kind !== 'period' || it._source.id !== (item._source as { kind: 'period'; id: string }).id))
    } else if (item._source.kind === 'daily') {
      if (!confirm('계획 항목을 삭제하시겠습니까?')) return
      const dateStr = item._source.date
      const res = await fetch(`/api/plans/daily?date=${dateStr}`)
      const planData = await res.json()
      if (!planData) return
      const { items, blob } = parseDailyPlanItems(planData)
      const updated = items.filter(it => !(it.label === item.label && it.subject === item.subject))
      await fetch('/api/plans/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, availableMin: planData.availableMin ?? 0, items: { ...blob, items: updated } }),
      })
      setPlanItems(prev => prev.filter(it =>
        !(it._source?.kind === 'daily' && it._source.date === dateStr && it.label === item.label && it.subject === item.subject)
      ))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('세션을 삭제하시겠습니까?\n(연결된 복습 일정도 함께 삭제됩니다)')) return
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
    fetchSessions()
  }

  async function handleComplete(id: string) {
    const now = new Date().toISOString()
    setSessions(prev => prev.map(s => s.id === id ? { ...s, completedAt: now } : s))
    await fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completedAt: now }),
    })
  }

  async function handleUncomplete(id: string) {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, completedAt: null } : s))
    await fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completedAt: null }),
    })
  }

  const todaySessions = sessions.filter(s => s.date.startsWith(today))
  const otherSessions = sessions.filter(s => !s.date.startsWith(today))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">학습 기록</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          + 세션 등록
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
              <input type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">학습 유형</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
              >
                {SESSION_TYPES.map(t => <option key={t} value={t}>{SESSION_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">과목</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
              >
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">학습 시간 (분)</label>
              <input type="number" min={1}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={form.durationMin}
                onChange={e => setForm({ ...form, durationMin: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">교재 (선택)</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={form.textbookId}
                onChange={e => setForm({ ...form, textbookId: e.target.value })}
              >
                <option value="">— 없음 —</option>
                {textbooks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">챕터 (선택)</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={form.chapter}
                onChange={e => setForm({ ...form, chapter: e.target.value })}
                placeholder="예: 3단원"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">문제번호 (선택)</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={form.problemNos}
                onChange={e => setForm({ ...form, problemNos: e.target.value })}
                placeholder="예: 1-20, 25, 30"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: '#1e3a5f' }}>
              저장 (복습 6회 자동 생성)
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600">
              취소
            </button>
          </div>
        </form>
      )}

      {/* 날짜 필터 */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm text-gray-600">날짜 필터:</label>
        <input type="date"
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
        />
        {filterDate && (
          <button onClick={() => setFilterDate('')} className="text-xs text-gray-400 hover:text-gray-600">
            초기화 (최근 7일)
          </button>
        )}
      </div>

      {/* 계획 섹션 */}
      {planItems.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            계획 ({filterDate || today})
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 font-medium">날짜</th>
                  <th className="px-4 py-3 font-medium">유형</th>
                  <th className="px-4 py-3 font-medium">과목</th>
                  <th className="px-4 py-3 font-medium">내용</th>
                  <th className="px-4 py-3 font-medium">계획 시간</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {planItems.map((item, i) => {
                  const done = !!item.completedAt
                  const isPeriod = item._source?.kind === 'period'
                  return (
                    <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/30">
                      <td className="px-4 py-3 text-gray-500 text-xs">{item.date ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                          {SESSION_TYPE_LABELS[item.type] ?? item.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{item.subject}</td>
                      <td className="px-4 py-3 text-gray-600">{item.label}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{formatMinutes(item.plannedMin)}</td>
                      <td className="px-4 py-3">
                        {isPeriod ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-500 font-medium">기간</span>
                        ) : done ? (
                          <button
                            onClick={() => handlePlanUncomplete(item)}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-50 text-green-600 hover:bg-green-100 font-medium"
                          >
                            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                            완료
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePlanComplete(item)}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-500 hover:bg-orange-100 font-medium"
                          >
                            <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
                            미완료
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handlePlanDelete(item)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {sessions.length === 0 && planItems.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-12">기록된 세션이 없습니다.</p>
      )}
      {sessions.length === 0 && planItems.length > 0 && (
        <p className="text-gray-400 text-sm text-center py-6">기록된 세션이 없습니다.</p>
      )}

      {todaySessions.length > 0 && !filterDate && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">오늘</h2>
          <SessionTable sessions={todaySessions} onDelete={handleDelete} onComplete={handleComplete} onUncomplete={handleUncomplete} />
        </section>
      )}

      {(filterDate ? sessions : otherSessions).length > 0 && (
        <section>
          {!filterDate && <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">최근 7일</h2>}
          <SessionTable sessions={filterDate ? sessions : otherSessions} onDelete={handleDelete} onComplete={handleComplete} onUncomplete={handleUncomplete} />
        </section>
      )}
    </div>
  )
}

function SessionTable({
  sessions,
  onDelete,
  onComplete,
  onUncomplete,
}: {
  sessions: Session[]
  onDelete: (id: string) => void
  onComplete: (id: string) => void
  onUncomplete: (id: string) => void
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
            <th className="px-4 py-3 font-medium">날짜</th>
            <th className="px-4 py-3 font-medium">유형</th>
            <th className="px-4 py-3 font-medium">과목</th>
            <th className="px-4 py-3 font-medium">교재 / 챕터</th>
            <th className="px-4 py-3 font-medium">문제번호</th>
            <th className="px-4 py-3 font-medium">시간</th>
            <th className="px-4 py-3 font-medium">상태</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s, i) => {
            const done = !!s.completedAt
            return (
              <tr key={s.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/40'} ${done ? '' : 'opacity-75'}`}>
                <td className="px-4 py-3 text-gray-600">{s.date.slice(0, 10)}</td>
                <td className="px-4 py-3">
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                    {SESSION_TYPE_LABELS[s.type] ?? s.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">{s.subject}</td>
                <td className="px-4 py-3 text-gray-600">
                  {s.textbook ? `${s.textbook.name}${s.chapter ? ` / ${s.chapter}` : ''}` : s.chapter ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-600">{s.problemNos ?? '—'}</td>
                <td className="px-4 py-3 text-gray-700 font-medium">{formatMinutes(s.durationMin)}</td>
                <td className="px-4 py-3">
                  {done ? (
                    <button
                      onClick={() => onUncomplete(s.id)}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-50 text-green-600 hover:bg-green-100 font-medium"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                      완료
                    </button>
                  ) : (
                    <button
                      onClick={() => onComplete(s.id)}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-500 hover:bg-orange-100 font-medium"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
                      미완료
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => onDelete(s.id)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
