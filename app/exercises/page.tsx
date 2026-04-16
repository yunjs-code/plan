'use client'

import { useEffect, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExerciseAttempt {
  id: string
  round: number
  date: string
  correctCount: number
  totalProblems: number
  note: string | null
}

interface ExerciseSet {
  id: string
  subject: string
  name: string
  totalProblems: number
  createdAt: string
  attempts: ExerciseAttempt[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUBJECTS = ['수학', '영어', '국어', '물리', '화학', '기타']

const SUBJECT_COLORS: Record<string, string> = {
  수학: '#6366f1', 영어: '#0ea5e9', 국어: '#10b981',
  물리: '#f59e0b', 화학: '#ef4444', 기타: '#8b5cf6',
}

const ROUND_LABELS = ['첫 풀이', '1차 복습', '2차 복습', '3차 복습', '4차 복습', '5차 복습']

function getRoundLabel(round: number) {
  return ROUND_LABELS[round - 1] ?? `${round - 1}차 복습`
}

function toStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${d.getMonth() + 1}/${d.getDate()} (${dow})`
}

function pct(correct: number, total: number) {
  if (!total) return 0
  return Math.round(correct / total * 100)
}

function ScoreBar({ correct, total, color }: { correct: number; total: number; color: string }) {
  const p = pct(correct, total)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${p}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-semibold w-8 text-right" style={{ color }}>{p}%</span>
    </div>
  )
}

// ─── Add Set Modal ─────────────────────────────────────────────────────────────

function AddSetModal({ onAdd, onClose }: { onAdd: (set: ExerciseSet) => void; onClose: () => void }) {
  const [form, setForm] = useState({ subject: SUBJECTS[0], name: '', totalProblems: '' })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.name.trim() || !form.totalProblems) return
    setSaving(true)
    const res = await fetch('/api/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: form.subject, name: form.name, totalProblems: Number(form.totalProblems) }),
    })
    if (res.ok) {
      onAdd(await res.json())
      onClose()
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-[400px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">예제 세트 추가</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
        </div>
        <div className="p-6 space-y-3">
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            value={form.subject}
            onChange={e => setForm({ ...form, subject: e.target.value })}
          >
            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
          </select>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            placeholder="예: 미적분 3단원 예제"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
          <input
            type="number" min={1}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            placeholder="총 문제 수"
            value={form.totalProblems}
            onChange={e => setForm({ ...form, totalProblems: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-600">취소</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: '#1e3a5f' }}>
            {saving ? '저장 중...' : '추가'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add Attempt Modal ─────────────────────────────────────────────────────────

function AddAttemptModal({
  set,
  onAdd,
  onClose,
}: {
  set: ExerciseSet
  onAdd: (attempt: ExerciseAttempt) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    date: toStr(new Date()),
    correctCount: '',
    totalProblems: String(set.totalProblems),
    note: '',
  })
  const [saving, setSaving] = useState(false)
  const round = set.attempts.length + 1
  const color = SUBJECT_COLORS[set.subject] ?? '#6366f1'

  async function handleSave() {
    if (!form.correctCount || !form.totalProblems) return
    setSaving(true)
    const res = await fetch(`/api/exercises/${set.id}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: form.date,
        correctCount: Number(form.correctCount),
        totalProblems: Number(form.totalProblems),
        note: form.note || null,
      }),
    })
    if (res.ok) {
      onAdd(await res.json())
      onClose()
    }
    setSaving(false)
  }

  const p = form.correctCount && form.totalProblems
    ? pct(Number(form.correctCount), Number(form.totalProblems))
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-[420px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-gray-800">{getRoundLabel(round)} 기록</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              <span style={{ color }}>{set.subject}</span> · {set.name}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">날짜</label>
            <input
              type="date" value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">맞은 문제 수</label>
              <input
                type="number" min={0}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="맞은 수"
                value={form.correctCount}
                onChange={e => setForm({ ...form, correctCount: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">총 문제 수</label>
              <input
                type="number" min={1}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={form.totalProblems}
                onChange={e => setForm({ ...form, totalProblems: e.target.value })}
              />
            </div>
          </div>
          {p !== null && (
            <div className="rounded-xl p-3 text-center" style={{ backgroundColor: `${color}15` }}>
              <span className="text-2xl font-bold" style={{ color }}>{p}%</span>
              <span className="text-xs text-gray-400 ml-2">
                {form.correctCount} / {form.totalProblems} 문제
              </span>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">메모 (선택)</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="틀린 유형, 느낀 점 등"
              value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-600">취소</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: '#1e3a5f' }}>
            {saving ? '저장 중...' : '기록 저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Set Detail Panel ──────────────────────────────────────────────────────────

function SetDetail({
  set,
  onAttemptAdded,
  onAttemptDeleted,
}: {
  set: ExerciseSet
  onAttemptAdded: (attempt: ExerciseAttempt) => void
  onAttemptDeleted: (attemptId: string) => void
}) {
  const [showAddAttempt, setShowAddAttempt] = useState(false)
  const color = SUBJECT_COLORS[set.subject] ?? '#6366f1'

  async function deleteAttempt(attemptId: string) {
    await fetch(`/api/exercises/${set.id}/attempts/${attemptId}`, { method: 'DELETE' })
    onAttemptDeleted(attemptId)
  }

  const latest = set.attempts[set.attempts.length - 1]
  const best = set.attempts.reduce<ExerciseAttempt | null>((b, a) =>
    !b || pct(a.correctCount, a.totalProblems) > pct(b.correctCount, b.totalProblems) ? a : b, null)

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>
              {set.subject}
            </span>
            <span className="text-xs text-gray-400">{set.totalProblems}문제</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">{set.name}</h2>
          <p className="text-xs text-gray-400 mt-1">총 {set.attempts.length}회 풀이</p>
        </div>
        <button
          onClick={() => setShowAddAttempt(true)}
          className="px-4 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-1.5"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          풀이 기록
        </button>
      </div>

      {/* Summary stats */}
      {set.attempts.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">최근 점수</p>
            <p className="text-xl font-bold" style={{ color }}>
              {pct(latest.correctCount, latest.totalProblems)}%
            </p>
            <p className="text-xs text-gray-400">{latest.correctCount}/{latest.totalProblems}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">최고 점수</p>
            <p className="text-xl font-bold text-green-600">
              {best ? pct(best.correctCount, best.totalProblems) : 0}%
            </p>
            <p className="text-xs text-gray-400">{best ? `${best.correctCount}/${best.totalProblems}` : '-'}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">풀이 횟수</p>
            <p className="text-xl font-bold text-gray-700">{set.attempts.length}회</p>
            <p className="text-xs text-gray-400">
              {set.attempts.length > 1 ? `${set.attempts.length - 1}회 복습` : '복습 전'}
            </p>
          </div>
        </div>
      )}

      {/* Progress chart (bar per attempt) */}
      {set.attempts.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
          <p className="text-xs font-semibold text-gray-500 mb-3">점수 변화</p>
          <div className="flex items-end gap-2 h-20">
            {set.attempts.map(a => {
              const p = pct(a.correctCount, a.totalProblems)
              return (
                <div key={a.id} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold" style={{ color }}>{p}%</span>
                  <div className="w-full rounded-t-md transition-all" style={{
                    height: `${Math.max(4, p * 0.56)}px`,
                    backgroundColor: color,
                    opacity: 0.7 + (a.round / set.attempts.length) * 0.3,
                  }} />
                  <span className="text-xs text-gray-400 whitespace-nowrap">{getRoundLabel(a.round).replace(' ', '\n')}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Attempt list */}
      {set.attempts.length === 0 ? (
        <div className="text-center py-16 text-gray-300">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-sm">아직 풀이 기록이 없어요</p>
          <p className="text-xs mt-1">위의 버튼으로 첫 풀이를 기록하세요</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500">풀이 기록</p>
          {set.attempts.map((a, idx) => {
            const p = pct(a.correctCount, a.totalProblems)
            const prev = idx > 0 ? pct(set.attempts[idx - 1].correctCount, set.attempts[idx - 1].totalProblems) : null
            const delta = prev !== null ? p - prev : null
            return (
              <div key={a.id} className="bg-white rounded-xl border border-gray-100 p-4 group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>
                      {getRoundLabel(a.round)}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(a.date)}</span>
                    {delta !== null && (
                      <span className={`text-xs font-semibold ${delta > 0 ? 'text-green-500' : delta < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {delta > 0 ? `+${delta}` : delta}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color }}>{p}%</span>
                    <span className="text-xs text-gray-400">{a.correctCount}/{a.totalProblems}</span>
                    <button
                      onClick={() => deleteAttempt(a.id)}
                      className="text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 text-base ml-1"
                    >×</button>
                  </div>
                </div>
                <ScoreBar correct={a.correctCount} total={a.totalProblems} color={color} />
                {a.note && <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-lg px-2 py-1.5">{a.note}</p>}
              </div>
            )
          })}
        </div>
      )}

      {showAddAttempt && (
        <AddAttemptModal
          set={set}
          onAdd={attempt => { onAttemptAdded(attempt); setShowAddAttempt(false) }}
          onClose={() => setShowAddAttempt(false)}
        />
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExercisesPage() {
  const [sets, setSets] = useState<ExerciseSet[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAddSet, setShowAddSet] = useState(false)
  const [filterSubject, setFilterSubject] = useState<string>('전체')

  useEffect(() => {
    fetch('/api/exercises').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setSets(data)
    })
  }, [])

  async function deleteSet(id: string) {
    await fetch(`/api/exercises/${id}`, { method: 'DELETE' })
    setSets(prev => prev.filter(s => s.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  function handleAttemptAdded(setId: string, attempt: ExerciseAttempt) {
    setSets(prev => prev.map(s =>
      s.id === setId ? { ...s, attempts: [...s.attempts, attempt] } : s
    ))
  }

  function handleAttemptDeleted(setId: string, attemptId: string) {
    setSets(prev => prev.map(s =>
      s.id === setId
        ? { ...s, attempts: s.attempts.filter(a => a.id !== attemptId).map((a, i) => ({ ...a, round: i + 1 })) }
        : s
    ))
  }

  const subjects = ['전체', ...Array.from(new Set(sets.map(s => s.subject)))]
  const filtered = filterSubject === '전체' ? sets : sets.filter(s => s.subject === filterSubject)
  const selected = sets.find(s => s.id === selectedId) ?? null

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* ── LEFT: Set list ── */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-bold text-gray-800">예제 트래커</h1>
            <button
              onClick={() => setShowAddSet(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: '#1e3a5f' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {/* Subject filter */}
          <div className="flex gap-1 flex-wrap">
            {subjects.map(s => (
              <button
                key={s}
                onClick={() => setFilterSubject(s)}
                className="text-xs px-2 py-0.5 rounded-full transition-colors"
                style={filterSubject === s
                  ? { backgroundColor: SUBJECT_COLORS[s] ?? '#1e3a5f', color: 'white' }
                  : { backgroundColor: '#f1f5f9', color: '#64748b' }
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-300">
              <p className="text-3xl mb-2">📚</p>
              <p className="text-sm">예제 세트가 없어요</p>
              <p className="text-xs mt-1">+ 버튼으로 추가하세요</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filtered.map(set => {
                const color = SUBJECT_COLORS[set.subject] ?? '#6366f1'
                const latest = set.attempts[set.attempts.length - 1]
                const latestPct = latest ? pct(latest.correctCount, latest.totalProblems) : null
                const isSelected = selectedId === set.id
                return (
                  <div
                    key={set.id}
                    onClick={() => setSelectedId(set.id)}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer group transition-colors"
                    style={{
                      backgroundColor: isSelected ? `${color}15` : undefined,
                      border: isSelected ? `1.5px solid ${color}40` : '1.5px solid transparent',
                    }}
                  >
                    <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-xs font-semibold" style={{ color }}>{set.subject}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{set.totalProblems}문제</span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 truncate">{set.name}</p>
                      {latestPct !== null ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="flex-1 bg-gray-100 rounded-full h-1">
                            <div className="h-1 rounded-full" style={{ width: `${latestPct}%`, backgroundColor: color }} />
                          </div>
                          <span className="text-xs" style={{ color }}>
                            {latestPct}%
                          </span>
                          <span className="text-xs text-gray-300">{set.attempts.length}회</span>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-300 mt-0.5">미풀이</p>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deleteSet(set.id) }}
                      className="text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 text-base flex-shrink-0"
                    >×</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Detail ── */}
      {selected ? (
        <SetDetail
          key={selected.id}
          set={selected}
          onAttemptAdded={a => handleAttemptAdded(selected.id, a)}
          onAttemptDeleted={id => handleAttemptDeleted(selected.id, id)}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-300">
          <div className="text-center">
            <p className="text-5xl mb-4">📝</p>
            <p className="text-sm">예제 세트를 선택하세요</p>
            <p className="text-xs mt-1">왼쪽에서 세트를 선택하거나 새로 추가하세요</p>
          </div>
        </div>
      )}

      {showAddSet && (
        <AddSetModal
          onAdd={set => { setSets(prev => [set, ...prev]); setSelectedId(set.id) }}
          onClose={() => setShowAddSet(false)}
        />
      )}
    </div>
  )
}
