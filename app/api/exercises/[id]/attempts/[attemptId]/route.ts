import { prisma } from '@/lib/prisma'

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const { attemptId } = await params
  await prisma.exerciseAttempt.delete({ where: { id: attemptId } })
  return new Response(null, { status: 204 })
}
