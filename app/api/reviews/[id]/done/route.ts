import { prisma } from '@/lib/prisma'

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const review = await prisma.review.update({
    where: { id },
    data: { doneAt: new Date() },
    include: { session: true },
  })
  return Response.json(review)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const review = await prisma.review.update({
    where: { id },
    data: { doneAt: null },
    include: { session: true },
  })
  return Response.json(review)
}
