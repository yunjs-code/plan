import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const session = await prisma.session.update({
    where: { id },
    data: {
      completedAt: body.completedAt !== undefined ? (body.completedAt ? new Date(body.completedAt) : null) : undefined,
    },
  })
  return Response.json(session)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  await prisma.$transaction([
    prisma.review.deleteMany({ where: { sessionId: id } }),
    prisma.wrongItem.deleteMany({ where: { sessionId: id } }),
    prisma.session.delete({ where: { id } }),
  ])

  return new Response(null, { status: 204 })
}
