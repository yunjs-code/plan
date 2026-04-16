'use client'

import { useEffect, useState } from 'react'
import { formatMinutes } from '@/lib/utils'

interface Lecture {
  id: string
  name: string
  subject: string
  totalCount: number
  doneCount: number
  minutesPerLecture: number
  createdAt: string
}

const SUBJECTS = ['수학', '영어', '국어', '물리', '화학', '기타']

export default function LecturesPage() {
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', subject: SUBJECTS[0], totalCount: '', minutesPerLecture: '' })

  async function fetchLectures() {
    const res = await fetch('/api/lectures')
    const data = await res.json()
    setLectures(data)
  }

  useEffect(() => { fetchLectures() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/lectures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setForm({ name: '', subject: SUBJECTS[0], totalCount: '', minutesPerLecture: '' })
    setShowForm(false)
    fetchLectures()
  }

  async function handleIncrement(lecture: Lecture) {
    if (lecture.doneCount >= lecture.totalCount) return
    await fetch(`/api/lectures/${lecture.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doneCount: lecture.doneCount + 1 }),
    })
    fetchLectures()
  }

  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    await fetch(`/api/lectures/${id}`, { method: 'DELETE' })
    fetchLectures()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">강의 트래커</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          + 강의 추가
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">강의명</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
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
              <label className="block text-sm font-medium text-gray-700 mb-1">총 강의 수</label>
              <input
                type="number" min={1}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={form.totalCount}
                onChange={e => setForm({ ...form, totalCount: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">강의당 시간(분)</label>
              <input
                type="number" min={1}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={form.minutesPerLecture}
                onChange={e => setForm({ ...form, minutesPerLecture: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: '#1e3a5f' }}>
              저장
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600">
              취소
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4">
        {lectures.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-12">등록된 강의가 없습니다.</p>
        )}
        {lectures.map(lecture => {
          const pct = lecture.totalCount > 0 ? Math.round((lecture.doneCount / lecture.totalCount) * 100) : 0
          const remaining = lecture.totalCount - lecture.doneCount
          const remainingMin = remaining * lecture.minutesPerLecture
          const done = lecture.doneCount >= lecture.totalCount

          return (
            <div key={lecture.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 mb-1">
                    {lecture.subject}
                  </span>
                  <h2 className="text-base font-semibold text-gray-800">{lecture.name}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {!done && (
                    <button
                      onClick={() => handleIncrement(lecture)}
                      className="px-3 py-1 text-xs rounded-lg font-medium text-white"
                      style={{ backgroundColor: '#1e3a5f' }}
                    >
                      +1 완료
                    </button>
                  )}
                  {done && (
                    <span className="px-3 py-1 text-xs rounded-lg font-medium bg-green-100 text-green-700">완강</span>
                  )}
                  <button
                    onClick={() => handleDelete(lecture.id)}
                    className="px-3 py-1 text-xs rounded-lg font-medium bg-red-50 text-red-500"
                  >
                    삭제
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: done ? '#10b981' : '#1e3a5f' }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-600 w-10 text-right">{pct}%</span>
              </div>

              <div className="flex gap-4 text-xs text-gray-500">
                <span>{lecture.doneCount} / {lecture.totalCount} 강</span>
                <span>강의당 {formatMinutes(lecture.minutesPerLecture)}</span>
                {!done && <span>남은 시간 약 {formatMinutes(remainingMin)}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
