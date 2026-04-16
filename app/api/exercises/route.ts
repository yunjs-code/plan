import { prisma } from '@/lib/prisma'

export async function GET() {
  const sets = await prisma.exerciseSet.findMany({
    include: {
      attempts: { orderBy: { round: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return Response.json(sets)
}

export async function POST(request: Request) {
  const { subject, name, totalProblems } = await request.json()
  if (!subject || !name || !totalProblems) {
    return Response.json({ error: '필수 항목 누락' }, { status: 400 })
  }
  const set = await prisma.exerciseSet.create({
    data: { subject, name, totalProblems: Number(totalProblems) },
    include: { attempts: true },
  })
  return Response.json(set, { status: 201 })
}
