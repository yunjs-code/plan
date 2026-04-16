'use client'

import { useEffect, useRef, useState } from 'react'

interface Session {
  id: string
  date: string
  subject: string
  chapter: string | null
}

interface WrongItem {
  id: string
  sessionId: string
  problemNo: string
  errorType: string
  note: string | null
  imageUrl: string | null
  session: Session
}

const ERROR_TYPES = ['CALC_ERROR', 'CONCEPT_ERROR', 'INSIGHT_MISSING']
const ERROR_LABELS: Record<string, string> = {
  CALC_ERROR: '계산 실수',
  CONCEPT_ERROR: '개념 오류',
  INSIGHT_MISSING: '풀이 미숙',
}
const ERROR_COLORS: Record<string, string> = {
  CALC_ERROR: '#f59e0b',
  CONCEPT_ERROR: '#ef4444',
  INSIGHT_MISSING: '#8b5cf6',
}
const SUBJECTS = ['', '수학', '영어', '국어', '물리', '화학', '기타']

// SVG 도넛 차트
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <p className="text-gray-400 text-sm text-center py-6">데이터 없음</p>

  const r = 60
  const cx = 80
  const cy = 80
  const stroke = 28
  let cumAngle = -Math.PI / 2

  const arcs = data.map((d) => {
    const angle = (d.value / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(cumAngle)
    const y1 = cy + r * Math.sin(cumAngle)
    cumAngle += angle
    const x2 = cx + r * Math.cos(cumAngle)
    const y2 = cy + r * Math.sin(cumAngle)
    const large = angle > Math.PI ? 1 : 0
    return { ...d, path: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`, angle }
  })

  return (
    <div className="flex items-center gap-6">
      <svg width={160} height={160}>
        {arcs.map((arc) => (
          <path
            key={arc.label}
            d={arc.path}
            fill="none"
            stroke={arc.color}
            strokeWidth={stroke}
            strokeLinecap="butt"
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" className="text-sm" fontSize={13} fill="#374151" fontWeight="600">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize={10} fill="#6b7280">총 오답</text>
      </svg>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-gray-600">{d.label}</span>
            <span className="font-semibold text-gray-800 ml-auto pl-4">{d.value}개</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function WrongAnswersPage() {
  const [items, setItems] = useState<WrongItem[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [subjectFilter, setSubjectFilter] = useState('')
  const [errorFilter, setErrorFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ sessionId: '', problemNo: '', errorType: ERROR_TYPES[0], note: '' })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function fetchItems() {
    const params = new URLSearchParams()
    if (subjectFilter) params.set('subject', subjectFilter)
    if (errorFilter) params.set('errorType', errorFilter)
    const res = await fetch(`/api/wrong-items?${params}`)
    setItems(await res.json())
  }

  async function fetchSessions() {
    const res = await fetch('/api/sessions')
    setSessions(await res.json())
  }

  useEffect(() => { fetchSessions() }, [])
  useEffect(() => { fetchItems() }, [subjectFilter, errorFilter])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setImageFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = ev => setImagePreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setImagePreview(null)
    }
  }

  function clearImage() {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setUploading(true)
    let imageUrl: string | null = null
    if (imageFile) {
      const fd = new FormData()
      fd.append('file', imageFile)
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
      if (uploadRes.ok) {
        const data = await uploadRes.json()
        imageUrl = data.url
      }
    }
    const res = await fetch('/api/wrong-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, imageUrl }),
    })
    setUploading(false)
    if (res.ok) {
      setForm({ sessionId: '', problemNo: '', errorType: ERROR_TYPES[0], note: '' })
      clearImage()
      setShowForm(false)
      fetchItems()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    await fetch(`/api/wrong-items/${id}`, { method: 'DELETE' })
    fetchItems()
  }

  // 통계
  const errorStats = ERROR_TYPES.map((t) => ({
    label: ERROR_LABELS[t],
    value: items.filter((i) => i.errorType === t).length,
    color: ERROR_COLORS[t],
  }))

  // 취약 단원 Top 5
  const chapterMap: Record<string, number> = {}
  items.forEach((item) => {
    const key = item.session.chapter ? `${item.session.subject} · ${item.session.chapter}` : item.session.subject
    chapterMap[key] = (chapterMap[key] ?? 0) + 1
  })
  const top5 = Object.entries(chapterMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const maxCount = top5[0]?.[1] ?? 1

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">오답 노트</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          + 오답 등록
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">세션 선택</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={form.sessionId}
                onChange={e => setForm({ ...form, sessionId: e.target.value })}
                required
              >
                <option value="">— 세션 선택 —</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.date.slice(0, 10)} · {s.subject}{s.chapter ? ` · ${s.chapter}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">문제번호</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={form.problemNo}
                onChange={e => setForm({ ...form, problemNo: e.target.value })}
                placeholder="예: 15번"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">오류 유형</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={form.errorType}
                onChange={e => setForm({ ...form, errorType: e.target.value })}
              >
                {ERROR_TYPES.map(t => <option key={t} value={t}>{ERROR_LABELS[t]}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">메모 (선택)</label>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                rows={2}
                value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
                placeholder="틀린 이유, 핵심 개념 등"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">이미지 (선택)</label>
              {imagePreview ? (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="미리보기" className="max-h-48 rounded-lg border border-gray-200 object-contain" />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600 leading-none"
                  >×</button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-300 mb-1">
                    <path d="M4 16l4-4 4 4 4-6 4 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  <span className="text-xs text-gray-400">클릭하여 이미지 업로드</span>
                  <span className="text-xs text-gray-300 mt-0.5">PNG, JPG, GIF, WEBP · 최대 10MB</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={uploading} className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50" style={{ backgroundColor: '#1e3a5f' }}>
              {uploading ? '저장 중...' : '저장'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600">취소</button>
          </div>
        </form>
      )}

      {/* 통계 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">오류 유형별 분포</h2>
          <DonutChart data={errorStats} />
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">취약 단원 Top 5</h2>
          {top5.length === 0
            ? <p className="text-gray-400 text-sm text-center py-6">데이터 없음</p>
            : (
              <div className="space-y-3">
                {top5.map(([chapter, count]) => (
                  <div key={chapter}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 truncate max-w-[70%]">{chapter}</span>
                      <span className="font-semibold text-gray-800">{count}개</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: '#1e3a5f' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>

      {/* 필터 */}
      <div className="flex gap-3 mb-4">
        <select
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          value={subjectFilter}
          onChange={e => setSubjectFilter(e.target.value)}
        >
          {SUBJECTS.map(s => <option key={s} value={s}>{s || '전체 과목'}</option>)}
        </select>
        <select
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          value={errorFilter}
          onChange={e => setErrorFilter(e.target.value)}
        >
          <option value="">전체 유형</option>
          {ERROR_TYPES.map(t => <option key={t} value={t}>{ERROR_LABELS[t]}</option>)}
        </select>
      </div>

      {/* 테이블 */}
      {items.length === 0
        ? <p className="text-gray-400 text-sm text-center py-12">오답 기록이 없습니다.</p>
        : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 font-medium">날짜</th>
                  <th className="px-4 py-3 font-medium">과목</th>
                  <th className="px-4 py-3 font-medium">챕터</th>
                  <th className="px-4 py-3 font-medium">문제</th>
                  <th className="px-4 py-3 font-medium">오류 유형</th>
                  <th className="px-4 py-3 font-medium">메모</th>
                  <th className="px-4 py-3 font-medium">이미지</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                    <td className="px-4 py-3 text-gray-600">{item.session.date.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-gray-700">{item.session.subject}</td>
                    <td className="px-4 py-3 text-gray-600">{item.session.chapter ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{item.problemNo}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block text-xs px-2 py-0.5 rounded-full font-medium text-white"
                        style={{ backgroundColor: ERROR_COLORS[item.errorType] }}
                      >
                        {ERROR_LABELS[item.errorType] ?? item.errorType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{item.note ?? '—'}</td>
                    <td className="px-4 py-3">
                      {item.imageUrl ? (
                        <button onClick={() => setLightboxUrl(item.imageUrl)} className="block">
                          <img src={item.imageUrl} alt="오답 이미지" className="w-12 h-12 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity" />
                        </button>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(item.id)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      {/* 이미지 라이트박스 */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-2" onClick={e => e.stopPropagation()}>
            <img src={lightboxUrl} alt="오답 이미지" className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl" />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-gray-700 flex items-center justify-center shadow-lg hover:bg-gray-100 text-lg leading-none"
            >×</button>
          </div>
        </div>
      )}
    </div>
  )
}
