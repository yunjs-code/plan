import { prisma } from '@/lib/prisma'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { date, correctCount, totalProblems, note } = await request.json()

  if (!date || correctCount === undefined || !totalProblems) {
    return Response.json({ error: '필수 항목 누락' }, { status: 400 })
  }

  const existing = await prisma.exerciseAttempt.count({ where: { exerciseSetId: id } })

  const attempt = await prisma.exerciseAttempt.create({
    data: {
      exerciseSetId: id,
      date: new Date(date),
      correctCount: Number(correctCount),
      totalProblems: Number(totalProblems),
      note: note || null,
      round: existing + 1,
    },
  })
  return Response.json(attempt, { status: 201 })
}
