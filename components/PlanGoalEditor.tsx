'use client'

import { useState } from 'react'

export interface Goal {
  subject: string
  textbook: string
  part: string
}

const SUBJECTS = ['수학', '영어', '국어', '물리', '화학', '기타']

interface Props {
  goals: Goal[]
  onChange: (goals: Goal[]) => void
}

export default function PlanGoalEditor({ goals, onChange }: Props) {
  const [draft, setDraft] = useState<Goal>({ subject: SUBJECTS[0], textbook: '', part: '' })

  function add() {
    if (!draft.textbook || !draft.part) return
    onChange([...goals, { ...draft }])
    setDraft({ subject: SUBJECTS[0], textbook: '', part: '' })
  }

  function remove(idx: number) {
    onChange(goals.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">과목별 목표</h3>
      <div className="space-y-2 mb-3">
        {goals.map((g, i) => (
          <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm group">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{g.subject}</span>
            <span className="text-gray-700">{g.textbook}</span>
            <span className="text-gray-400">→</span>
            <span className="text-gray-600 flex-1">{g.part}</span>
            <button onClick={() => remove(i)} className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
          </div>
        ))}
        {goals.length === 0 && <p className="text-xs text-gray-300 py-1">목표를 추가하세요</p>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <select
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          value={draft.subject}
          onChange={e => setDraft({ ...draft, subject: e.target.value })}
        >
          {SUBJECTS.map(s => <option key={s}>{s}</option>)}
        </select>
        <input
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="교재명"
          value={draft.textbook}
          onChange={e => setDraft({ ...draft, textbook: e.target.value })}
        />
        <input
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="완료 파트 (예: 3단원까지)"
          value={draft.part}
          onChange={e => setDraft({ ...draft, part: e.target.value })}
        />
      </div>
      <button
        onClick={add}
        className="mt-2 text-xs px-3 py-1.5 rounded-lg font-medium text-white"
        style={{ backgroundColor: '#1e3a5f' }}
      >
        + 목표 추가
      </button>
    </div>
  )
}
