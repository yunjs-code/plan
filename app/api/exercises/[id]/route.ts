import { prisma } from '@/lib/prisma'

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.exerciseSet.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
