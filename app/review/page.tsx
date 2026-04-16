'use client'

import { useEffect, useState } from 'react'

interface Session {
  id: string
  date: string
  subject: string
  chapter: string | null
  problemNos: string | null
}

interface Review {
  id: string
  dueDate: string
  doneAt: string | null
  session: Session
}

function toLocalDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function ReviewPage() {
  const today = toLocalDateString(new Date())
  const [todayReviews, setTodayReviews] = useState<Review[]>([])
  const [weekReviews, setWeekReviews] = useState<Review[]>([])

  async function fetchToday() {
    const res = await fetch(`/api/reviews?date=${today}`)
    setTodayReviews(await res.json())
  }

  async function fetchWeek() {
    const res = await fetch('/api/reviews')
    setWeekReviews(await res.json())
  }

  useEffect(() => {
    fetchToday()
    fetchWeek()
  }, [])

  async function handleDone(id: string) {
    await fetch(`/api/reviews/${id}/done`, { method: 'PUT' })
    fetchToday()
    fetchWeek()
  }

  const todayTotal = todayReviews.length
  const todayDone = todayReviews.filter(r => r.doneAt).length
  const pct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0

  // 향후 7일 날짜 배열 (오늘 포함)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return toLocalDateString(d)
  })

  // 날짜별 복습 그룹
  const byDay: Record<string, Review[]> = {}
  weekReviews.forEach(r => {
    const key = r.dueDate.slice(0, 10)
    if (!byDay[key]) byDay[key] = []
    byDay[key].push(r)
  })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">복습 큐</h1>

      {/* 오늘 완료율 */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">오늘 복습 완료율</h2>
          <span className="text-lg font-bold" style={{ color: '#1e3a5f' }}>{todayDone} / {todayTotal}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#10b981' : '#1e3a5f' }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1 text-right">{pct}% 완료</p>
      </div>

      {/* 오늘 복습 목록 */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">오늘 복습 항목</h2>
        {todayReviews.length === 0 ? (
          <p className="text-gray-400 text-sm py-6 text-center bg-white rounded-xl border border-gray-100">오늘 복습할 항목이 없습니다 🎉</p>
        ) : (
          <div className="space-y-2">
            {todayReviews.map(r => (
              <div
                key={r.id}
                className={`flex items-center gap-4 bg-white rounded-xl px-5 py-4 shadow-sm border transition-all ${r.doneAt ? 'border-green-100 opacity-60' : 'border-gray-100'}`}
              >
                <button
                  onClick={() => !r.doneAt && handleDone(r.id)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    r.doneAt
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 hover:border-green-400'
                  }`}
                  disabled={!!r.doneAt}
                >
                  {r.doneAt && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      {r.session.subject}
                    </span>
                    {r.session.chapter && (
                      <span className="text-sm text-gray-700">{r.session.chapter}</span>
                    )}
                    {r.session.problemNos && (
                      <span className="text-xs text-gray-500">문제 {r.session.problemNos}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">원본 세션: {r.session.date.slice(0, 10)}</p>
                </div>
                {r.doneAt && <span className="text-xs text-green-600 font-medium flex-shrink-0">완료</span>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 향후 7일 캘린더 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">향후 7일 복습 예정</h2>
        <div className="grid grid-cols-7 gap-2">
          {days.map(day => {
            const reviews = byDay[day] ?? []
            const isToday = day === today
            const done = reviews.filter(r => r.doneAt).length
            return (
              <div
                key={day}
                className={`rounded-xl p-3 border ${isToday ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-white'} shadow-sm`}
              >
                <p className={`text-xs font-semibold mb-2 ${isToday ? 'text-blue-700' : 'text-gray-500'}`}>
                  {isToday ? '오늘' : formatDate(day)}
                </p>
                {reviews.length === 0 ? (
                  <p className="text-xs text-gray-300 text-center py-1">—</p>
                ) : (
                  <>
                    <p className="text-lg font-bold text-center" style={{ color: '#1e3a5f' }}>{reviews.length}</p>
                    <p className="text-xs text-gray-400 text-center">항목</p>
                    {done > 0 && (
                      <p className="text-xs text-green-600 text-center mt-1">{done}완료</p>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
