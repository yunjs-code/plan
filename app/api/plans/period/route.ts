import { prisma } from '@/lib/prisma'

// GET /api/plans/period?date=YYYY-MM-DD
// Returns all PERIOD plans whose range covers the given date
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dateStr = searchParams.get('date')

  if (!dateStr) {
    // 날짜 없으면 전체 반환
    const plans = await prisma.plan.findMany({
      where: { type: 'PERIOD' },
      orderBy: { startDate: 'asc' },
    })
    return Response.json(plans)
  }

  const [y, m, d] = dateStr.split('-').map(Number)
  const target = new Date(y, m - 1, d, 12, 0, 0, 0)

  const plans = await prisma.plan.findMany({
    where: {
      type: 'PERIOD',
      startDate: { lte: target },
      endDate: { gte: target },
    },
    orderBy: { createdAt: 'asc' },
  })

  return Response.json(plans)
}

// POST /api/plans/period
// Body: { title, startDate, endDate, subject, type, label, plannedMin, doubled }
export async function POST(request: Request) {
  const body = await request.json()
  const { title, startDate, endDate, subject, type, label, plannedMin, doubled } = body

  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)

  const plan = await prisma.plan.create({
    data: {
      type: 'PERIOD',
      title: title || label,
      startDate: new Date(sy, sm - 1, sd, 12, 0, 0, 0),
      endDate: new Date(ey, em - 1, ed, 12, 0, 0, 0),
      content: { subject, type, label, plannedMin, doubled },
    },
  })

  return Response.json(plan, { status: 201 })
}
