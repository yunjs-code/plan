'use client'

import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { formatMinutes } from '@/lib/utils'

interface Lecture {
  id: string
  name: string
  subject: string
  totalCount: number
  doneCount: number
}

interface TodayPlanItem {
  subject: string
  type: string
  label: string
  plannedMin: number
}

interface OverdueReview {
  id: string
  dueDate: string
  session: { subject: string; chapter: string | null; type: string }
}

interface DashboardData {
  todayReview: { total: number; done: number }
  weekRate: number | null
  monthActualMin: number
  reviewRate: number | null
  subjectChart: { name: string; value: number }[]
  typeChart: { name: string; value: number }[]
  dailyChart: { date: string; min: number }[]
  lectures: Lecture[]
  todayPlanItems: TodayPlanItem[]
  todayActualMin: number
  overdueReviews: OverdueReview[]
  incompletePlanItems: TodayPlanItem[]
}

const SUBJECT_COLORS = ['#1e3a5f', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']
const TYPE_LABELS: Record<string, string> = {
  LECTURE: '개념', EXAMPLE: '예제', EXERCISE: '연습', ADVANCED: '심화', EXAM: '시험',
}
const TYPE_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444']

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color: color ?? '#1e3a5f' }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)

  async function fetchData() {
    const res = await fetch('/api/dashboard')
    setData(await res.json())
  }

  async function handleReviewDone(id: string) {
    await fetch(`/api/reviews/${id}/done`, { method: 'PUT' })
    fetchData()
  }

  async function handleReviewUndo(id: string) {
    await fetch(`/api/reviews/${id}/done`, { method: 'DELETE' })
    fetchData()
  }

  useEffect(() => { fetchData() }, [])

  if (!data) return <div className="p-8 text-gray-400">로딩 중...</div>

  const { todayReview, weekRate, monthActualMin, reviewRate, subjectChart, typeChart, dailyChart, lectures, todayPlanItems, todayActualMin, overdueReviews, incompletePlanItems } = data
  const todayPct = todayReview.total > 0 ? Math.round((todayReview.done / todayReview.total) * 100) : 0

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">대시보드</h1>

      {/* 핵심 지표 4개 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="오늘 복습 완료"
          value={`${todayReview.done} / ${todayReview.total}`}
          sub={`${todayPct}% 완료`}
          color={todayPct === 100 ? '#10b981' : '#1e3a5f'}
        />
        <StatCard
          label="주간 달성률"
          value={weekRate !== null ? `${weekRate}%` : '—'}
          sub="실제 / 계획 시간"
          color={weekRate !== null && weekRate >= 80 ? '#10b981' : '#f59e0b'}
        />
        <StatCard
          label="이달 학습 시간"
          value={formatMinutes(monthActualMin)}
          sub="이번 달 세션 합산"
        />
        <StatCard
          label="복습 준수율"
          value={reviewRate !== null ? `${reviewRate}%` : '—'}
          sub="기한 내 완료 비율"
          color={reviewRate !== null && reviewRate >= 80 ? '#10b981' : '#ef4444'}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* 최근 7일 바 차트 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">최근 7일 학습 시간</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip formatter={(v) => formatMinutes(Number(v ?? 0))} />
              <Bar dataKey="min" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 과목별 도넛 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">과목별 학습 시간 분포</h2>
          {subjectChart.length === 0
            ? <p className="text-gray-400 text-sm text-center py-10">데이터 없음</p>
            : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={subjectChart} dataKey="value" innerRadius={40} outerRadius={65} paddingAngle={2}>
                      {subjectChart.map((_, i) => (
                        <Cell key={i} fill={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatMinutes(Number(v ?? 0))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 flex-1">
                  {subjectChart.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }} />
                      <span className="text-gray-600 flex-1">{d.name}</span>
                      <span className="font-medium text-gray-700">{formatMinutes(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
        </div>
      </div>

      {/* 오늘 공부 계획 + 복습 큐 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* 오늘 공부 계획 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">오늘 공부 계획</h2>
            {todayPlanItems.length > 0 && (
              <span className="text-xs text-gray-400">
                실제 {formatMinutes(todayActualMin)} / 계획 {formatMinutes(todayPlanItems.reduce((s, it) => s + it.plannedMin, 0))}
              </span>
            )}
          </div>
          {todayPlanItems.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm mb-2">오늘 계획이 없습니다</p>
              <a href="/daily" className="text-xs text-blue-500 hover:text-blue-700">일일 관리에서 추가 →</a>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {todayPlanItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6'][i % 6] }} />
                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{item.subject}</span>
                  <span className="text-gray-600 flex-1 truncate">{item.label}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatMinutes(item.plannedMin)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 오늘 복습 큐 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">오늘 복습 큐</h2>
          {todayReview.total === 0
            ? <p className="text-gray-400 text-sm text-center py-8">오늘 복습 항목 없음 🎉</p>
            : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(data as unknown as { todayReview: { items: { id: string; doneAt: string | null; session: { subject: string; chapter: string | null } }[] } }).todayReview.items.map(r => (
                  <div key={r.id} className={`flex items-center gap-3 text-sm ${r.doneAt ? 'opacity-50' : ''}`}>
                    <button
                      disabled={!!r.doneAt}
                      onClick={() => handleReviewDone(r.id)}
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${r.doneAt ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-400'}`}
                    >
                      {r.doneAt && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}
                    </button>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{r.session.subject}</span>
                    <span className="text-gray-600 truncate">{r.session.chapter ?? '—'}</span>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* 학습 유형별 도넛 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">학습 유형별 분포</h2>
          {typeChart.length === 0
            ? <p className="text-gray-400 text-sm text-center py-10">데이터 없음</p>
            : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={typeChart} dataKey="value" innerRadius={40} outerRadius={65} paddingAngle={2}>
                      {typeChart.map((_, i) => (
                        <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatMinutes(Number(v ?? 0))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 flex-1">
                  {typeChart.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[i % TYPE_COLORS.length] }} />
                      <span className="text-gray-600 flex-1">{TYPE_LABELS[d.name] ?? d.name}</span>
                      <span className="font-medium text-gray-700">{formatMinutes(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
        </div>

        {/* 미완료 항목 */}
        {(overdueReviews.length > 0 || incompletePlanItems.length > 0) ? (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-red-100">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <h2 className="text-sm font-semibold text-gray-700">미완료 항목</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500 font-medium">
                {overdueReviews.length + incompletePlanItems.length}개
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* 기한 지난 복습 */}
              {overdueReviews.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    밀린 복습
                    <span className="ml-1.5 text-red-400 font-semibold">{overdueReviews.length}개</span>
                  </p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {overdueReviews.map(r => {
                      const due = new Date(r.dueDate)
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      const daysLate = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
                      return (
                        <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-100">
                          <button
                            onClick={() => handleReviewDone(r.id)}
                            className="w-4 h-4 rounded-full border-2 border-red-300 hover:border-green-400 hover:bg-green-50 flex-shrink-0 transition-colors"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-red-600">{r.session.subject}</span>
                              <span className="text-xs text-red-300">{daysLate}일 초과</span>
                            </div>
                            <p className="text-xs text-gray-600 truncate">{r.session.chapter ?? TYPE_LABELS[r.session.type] ?? r.session.type}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 오늘 미완료 계획 */}
              {incompletePlanItems.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    오늘 미완료 계획
                    <span className="ml-1.5 text-orange-400 font-semibold">{incompletePlanItems.length}개</span>
                  </p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {incompletePlanItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 border border-orange-100">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-orange-400" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-orange-600">{item.subject}</span>
                          <p className="text-xs text-gray-600 truncate">{item.label}</p>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">{formatMinutes(item.plannedMin)}</span>
                      </div>
                    ))}
                  </div>
                  <a href="/daily" className="block text-center text-xs text-blue-500 hover:text-blue-700 mt-2">
                    일일 관리로 이동 →
                  </a>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-center">
            <p className="text-gray-300 text-sm">미완료 항목 없음 🎉</p>
          </div>
        )}
      </div>

      {/* 강의 진도 요약 */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">강의 진도 요약</h2>
        {lectures.length === 0
          ? <p className="text-gray-400 text-sm text-center py-6">등록된 강의 없음</p>
          : (
            <div className="grid grid-cols-2 gap-3">
              {lectures.map(lec => {
                const pct = lec.totalCount > 0 ? Math.round((lec.doneCount / lec.totalCount) * 100) : 0
                return (
                  <div key={lec.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs text-blue-600 font-medium">{lec.subject}</span>
                        <p className="text-sm font-medium text-gray-800 truncate">{lec.name}</p>
                      </div>
                      <span className="text-sm font-bold" style={{ color: pct === 100 ? '#10b981' : '#1e3a5f' }}>{pct}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#10b981' : '#1e3a5f' }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{lec.doneCount} / {lec.totalCount} 강</p>
                  </div>
                )
              })}
            </div>
          )
        }
      </div>
    </div>
  )
}
