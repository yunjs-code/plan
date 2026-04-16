import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const updated = await prisma.plan.update({
    where: { id },
    data: { content: body.content },
  })
  return Response.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.plan.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
