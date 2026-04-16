import { prisma } from '@/lib/prisma'

type Session = {
  id: string
  date: Date
  type: string
  subject: string
  durationMin: number
  textbookId: string | null
  chapter: string | null
  problemNos: string | null
  completedAt: Date | null
  createdAt: Date
}

type Review = {
  id: string
  sessionId: string
  dueDate: Date
  doneAt: Date | null
}

type DailyPlan = {
  id: string
  date: Date
  availableMin: number
  plannedMin: number
  actualMin: number
  items: unknown
}

function toLocalMidnight(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function GET() {
  const now = new Date()

  // 오늘 범위
  const todayStart = toLocalMidnight(now)
  const todayEnd = new Date(todayStart)
  todayEnd.setHours(23, 59, 59, 999)

  // 이번 주 월요일
  const dayOfWeek = now.getDay()
  const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStart = toLocalMidnight(now)
  weekStart.setDate(now.getDate() + diffToMon)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  // 이번 달
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  monthEnd.setHours(23, 59, 59, 999)

  // 최근 7일
  const sevenDaysAgo = toLocalMidnight(now)
  sevenDaysAgo.setDate(now.getDate() - 6)

  const [
    todayReviews,
    weekDailyPlans,
    monthSessions,
    recentSessions,
    allReviews,
    lectures,
    monthPlan,
    todayDailyPlan,
    overdueReviews,
  ] = await Promise.all([
    // 1. 오늘 복습 큐
    prisma.review.findMany({
      where: { dueDate: { gte: todayStart, lte: todayEnd } },
      include: { session: true },
    }),
    // 2. 이번 주 일별 계획
    prisma.dailyPlan.findMany({
      where: { date: { gte: weekStart, lte: weekEnd } },
    }),
    // 3. 이번 달 세션
    prisma.session.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
    }),
    // 4. 최근 7일 세션
    prisma.session.findMany({
      where: { date: { gte: sevenDaysAgo } },
      orderBy: { date: 'asc' },
    }),
    // 5. 전체 Review (복습 준수율)
    prisma.review.findMany({
      where: { dueDate: { lte: todayEnd } },
    }),
    // 6. 강의 진도
    prisma.lecture.findMany({ orderBy: { createdAt: 'desc' } }),
    // 7. 월간 계획
    prisma.plan.findFirst({
      where: { type: 'MONTH', startDate: { gte: monthStart, lte: monthEnd } },
      orderBy: { createdAt: 'desc' },
    }),
    // 8. 오늘 일별 계획
    prisma.dailyPlan.findFirst({
      where: { date: { gte: todayStart, lte: todayEnd } },
    }),
    // 9. 기한 지난 미완료 복습
    prisma.review.findMany({
      where: { dueDate: { lt: todayStart }, doneAt: null },
      include: { session: true },
      orderBy: { dueDate: 'asc' },
    }),
  ])

  // 오늘 복습
  const todayReviewTotal = todayReviews.length
  const todayReviewDone = todayReviews.filter((r: Review) => r.doneAt).length

  // 주간 학습률
  const weekActual = (weekDailyPlans as DailyPlan[]).reduce((s: number, p: DailyPlan) => s + p.actualMin, 0)
  const weekPlanned = (weekDailyPlans as DailyPlan[]).reduce((s: number, p: DailyPlan) => s + p.plannedMin, 0)
  const weekRate = weekPlanned > 0 ? Math.round((weekActual / weekPlanned) * 100) : null

  // 월간 학습률
  const monthActual = (monthSessions as Session[]).reduce((s: number, s2: Session) => s + s2.durationMin, 0)
  const monthRate = monthActual // raw minutes

  // 과목별 분포
  const subjectMap: Record<string, number> = {}
  ;(recentSessions as Session[]).forEach((s: Session) => {
    subjectMap[s.subject] = (subjectMap[s.subject] ?? 0) + s.durationMin
  })
  const subjectChart = Object.entries(subjectMap).map(([name, value]) => ({ name, value }))

  // 학습 유형별 분포
  const typeMap: Record<string, number> = {}
  ;(recentSessions as Session[]).forEach((s: Session) => {
    typeMap[s.type] = (typeMap[s.type] ?? 0) + s.durationMin
  })
  const typeChart = Object.entries(typeMap).map(([name, value]) => ({ name, value }))

  // 최근 7일 일별
  const days: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const key = `${d.getMonth() + 1}/${d.getDate()}`
    days[key] = 0
  }
  ;(recentSessions as Session[]).forEach((s: Session) => {
    const d = new Date(s.date)
    const key = `${d.getMonth() + 1}/${d.getDate()}`
    if (key in days) days[key] += s.durationMin
  })
  const dailyChart = Object.entries(days).map(([date, min]) => ({ date, min }))

  // 복습 준수율
  const pastReviewTotal = allReviews.length
  const pastReviewDone = (allReviews as Review[]).filter(
    (r: Review) => r.doneAt && new Date(r.doneAt) <= new Date(r.dueDate)
  ).length
  const reviewRate = pastReviewTotal > 0 ? Math.round((pastReviewDone / pastReviewTotal) * 100) : null

  // 오늘 공부 계획 항목
  let todayPlanItems: unknown[] = []
  if (todayDailyPlan) {
    const raw = (todayDailyPlan as DailyPlan).items
    if (Array.isArray(raw)) todayPlanItems = raw
    else if (raw && typeof raw === 'object') todayPlanItems = (raw as { items?: unknown[] }).items ?? []
  }

  // 오늘 미완료 계획 항목
  const incompletePlanItems = (
    todayPlanItems as {
      subject: string
      type: string
      label: string
      plannedMin: number
      completedAt?: string
    }[]
  ).filter((it) => !it.completedAt)

  // 오늘 실제 공부 시간
  const todayActualMin = (monthSessions as Session[])
    .filter((s: Session) => s.date >= todayStart && s.date <= todayEnd)
    .reduce((sum: number, s: Session) => sum + s.durationMin, 0)

  void monthPlan // 현재 미사용

  return Response.json({
    todayReview: { total: todayReviewTotal, done: todayReviewDone, items: todayReviews },
    weekRate,
    monthActualMin: monthRate,
    reviewRate,
    subjectChart,
    typeChart,
    dailyChart,
    lectures,
    todayPlanItems,
    todayActualMin,
    overdueReviews,
    incompletePlanItems,
  })
}
