import { prisma } from '@/lib/prisma'

export async function GET() {
  const textbooks = await prisma.textbook.findMany({ orderBy: { name: 'asc' } })
  return Response.json(textbooks)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { name, type } = body
  if (!name || !type) {
    return Response.json({ error: '필수 항목 누락' }, { status: 400 })
  }
  const textbook = await prisma.textbook.create({ data: { name, type } })
  return Response.json(textbook, { status: 201 })
}
