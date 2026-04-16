import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const subject = searchParams.get('subject')
  const errorType = searchParams.get('errorType')

  const items = await prisma.wrongItem.findMany({
    where: {
      ...(errorType ? { errorType } : {}),
      ...(subject ? { session: { subject } } : {}),
    },
    include: { session: true },
    orderBy: { id: 'desc' },
  })
  return Response.json(items)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { sessionId, problemNo, errorType, note, imageUrl } = body

  if (!sessionId || !problemNo || !errorType) {
    return Response.json({ error: '필수 항목 누락' }, { status: 400 })
  }

  const item = await prisma.wrongItem.create({
    data: { sessionId, problemNo, errorType, note: note || null, imageUrl: imageUrl || null },
    include: { session: true },
  })
  return Response.json(item, { status: 201 })
}
