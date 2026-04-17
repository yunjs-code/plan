'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard', label: '대시보드' },
  { href: '/daily', label: '일일 관리' },
  { href: '/session', label: '학습 기록' },
  { href: '/review', label: '복습 큐' },
  { href: '/wrong-answers', label: '오답 노트' },
  { href: '/lectures', label: '강의 트래커' },
  { href: '/exercises', label: '예제 트래커' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(true)

  return (
    <aside
      className={`min-h-screen flex-shrink-0 transition-all duration-300 ${open ? 'w-56' : 'w-10'}`}
      style={{ backgroundColor: '#1e3a5f' }}
    >
      {open ? (
        <>
          <div className="p-6 flex items-start justify-between">
            <h1 className="text-white font-bold text-lg leading-tight">
              편입 학습<br />관리 앱
            </h1>
            <button
              onClick={() => setOpen(false)}
              className="text-white/60 hover:text-white ml-2 mt-1 text-lg leading-none"
              aria-label="메뉴 닫기"
            >
              ✕
            </button>
          </div>
          <nav className="mt-2">
            {navItems.map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                    active
                      ? 'text-white border-l-4 border-[#4ecdc4] bg-white/10'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>
        </>
      ) : (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => setOpen(true)}
            className="text-white/60 hover:text-white text-lg"
            aria-label="메뉴 열기"
          >
            ☰
          </button>
        </div>
      )}
    </aside>
  )
}
