import { prisma } from '@/lib/prisma'

export async function GET() {
  const lectures = await prisma.lecture.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return Response.json(lectures)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { name, totalCount, minutesPerLecture, subject } = body

  if (!name || !totalCount || !minutesPerLecture || !subject) {
    return Response.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 })
  }

  const lecture = await prisma.lecture.create({
    data: {
      name,
      totalCount: Number(totalCount),
      minutesPerLecture: Number(minutesPerLecture),
      subject,
    },
  })
  return Response.json(lecture, { status: 201 })
}
