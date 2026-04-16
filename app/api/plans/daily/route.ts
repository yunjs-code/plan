import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dateStr = searchParams.get('date')

  if (!dateStr) {
    // 날짜 없으면 전체 반환
    const plans = await prisma.dailyPlan.findMany({ orderBy: { date: 'asc' } })
    return Response.json(plans)
  }

  const [y, m, d] = dateStr.split('-').map(Number)
  const start = new Date(y, m - 1, d, 0, 0, 0, 0)
  const end = new Date(y, m - 1, d, 23, 59, 59, 999)

  const plan = await prisma.dailyPlan.findFirst({
    where: { date: { gte: start, lte: end } },
  })
  return Response.json(plan)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { date: dateStr, availableMin, items } = body

  const [y, m, d] = dateStr.split('-').map(Number)
  const start = new Date(y, m - 1, d, 0, 0, 0, 0)
  const end = new Date(y, m - 1, d, 23, 59, 59, 999)

  // Compute plannedMin from items
  const planItems: { plannedMin: number }[] = Array.isArray(items)
    ? items
    : (items?.items ?? [])
  const plannedMin = planItems.reduce((s: number, it: { plannedMin: number }) => s + (it.plannedMin ?? 0), 0)

  const existing = await prisma.dailyPlan.findFirst({
    where: { date: { gte: start, lte: end } },
  })

  if (existing) {
    const updated = await prisma.dailyPlan.update({
      where: { id: existing.id },
      data: { availableMin, plannedMin, items },
    })
    return Response.json(updated)
  }

  const created = await prisma.dailyPlan.create({
    data: {
      date: new Date(y, m - 1, d, 12, 0, 0, 0),
      availableMin,
      plannedMin,
      items,
    },
  })
  return Response.json(created)
}
