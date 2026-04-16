import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const lecture = await prisma.lecture.update({
    where: { id },
    data: {
      ...(body.doneCount !== undefined && { doneCount: Number(body.doneCount) }),
      ...(body.name !== undefined && { name: body.name }),
      ...(body.totalCount !== undefined && { totalCount: Number(body.totalCount) }),
      ...(body.minutesPerLecture !== undefined && { minutesPerLecture: Number(body.minutesPerLecture) }),
      ...(body.subject !== undefined && { subject: body.subject }),
    },
  })
  return Response.json(lecture)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.lecture.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
