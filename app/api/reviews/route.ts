import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get('date')

  if (dateParam) {
    const [y, m, d] = dateParam.split('-').map(Number)
    const start = new Date(y, m - 1, d, 0, 0, 0, 0)
    const end = new Date(y, m - 1, d, 23, 59, 59, 999)

    const reviews = await prisma.review.findMany({
      where: { dueDate: { gte: start, lte: end } },
      include: { session: true },
      orderBy: { dueDate: 'asc' },
    })
    return Response.json(reviews)
  }

  // 기본: 향후 7일
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in7Days = new Date(today)
  in7Days.setDate(in7Days.getDate() + 7)
  in7Days.setHours(23, 59, 59, 999)

  const reviews = await prisma.review.findMany({
    where: { dueDate: { gte: today, lte: in7Days } },
    include: { session: true },
    orderBy: { dueDate: 'asc' },
  })
  return Response.json(reviews)
}
