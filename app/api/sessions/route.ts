import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'
import type { ITXClientDenyList } from '@prisma/client/runtime/library'

type PrismaTx = Omit<PrismaClient, ITXClientDenyList>

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get('date')

  if (dateParam) {
    const start = new Date(dateParam)
    start.setHours(0, 0, 0, 0)
    const end = new Date(dateParam)
    end.setHours(23, 59, 59, 999)

    const sessions = await prisma.session.findMany({
      where: { date: { gte: start, lte: end } },
      include: { textbook: true },
      orderBy: { date: 'desc' },
    })
    return Response.json(sessions)
  }

  // 기본: 최근 7일
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const sessions = await prisma.session.findMany({
    where: { date: { gte: sevenDaysAgo } },
    include: { textbook: true },
    orderBy: { date: 'desc' },
  })
  return Response.json(sessions)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { date, type, subject, textbookId, chapter, problemNos, durationMin } = body

  if (!date || !type || !subject || !durationMin) {
    return Response.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 })
  }

  const sessionDate = new Date(date)

  const REVIEW_OFFSETS = [1, 3, 7, 14, 21, 30]

  const [session] = await prisma.$transaction(async (tx: PrismaTx) => {
    const session = await tx.session.create({
      data: {
        date: sessionDate,
        type,
        subject,
        textbookId: textbookId || null,
        chapter: chapter || null,
        problemNos: problemNos || null,
        durationMin: Number(durationMin),
      },
    })

    await tx.review.createMany({
      data: REVIEW_OFFSETS.map((offset) => {
        const dueDate = new Date(sessionDate)
        dueDate.setDate(dueDate.getDate() + offset)
        return { sessionId: session.id, dueDate }
      }),
    })

    return [session]
  })

  return Response.json(session, { status: 201 })
}
