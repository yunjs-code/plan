import { prisma } from '@/lib/prisma'

// GET /api/daily-summary?date=YYYY-MM-DD
// 핵심 데이터를 단 1번의 DB 라운드트립으로 반환
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dateStr = searchParams.get('date')
  if (!dateStr) return Response.json({ error: 'date required' }, { status: 400 })

  const [y, m, d] = dateStr.split('-').map(Number)
  const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0)
  const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999)
  const target = new Date(y, m - 1, d, 12, 0, 0, 0)

  const [plan, reviews, sessions, periodPlans] = await Promise.all([
    prisma.dailyPlan.findFirst({
      where: { date: { gte: dayStart, lte: dayEnd } },
    }),
    prisma.review.findMany({
      where: { dueDate: { gte: dayStart, lte: dayEnd } },
      include: { session: true },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.session.findMany({
      where: { date: { gte: dayStart, lte: dayEnd } },
      include: { textbook: true },
      orderBy: { date: 'desc' },
    }),
    prisma.plan.findMany({
      where: {
        type: 'PERIOD',
        startDate: { lte: target },
        endDate: { gte: target },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  return Response.json({ plan, reviews, sessions, periodPlans })
}
