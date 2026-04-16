import { prisma } from '@/lib/prisma'

interface PlanItem {
  subject: string
  type: string
  label: string
  plannedMin: number
  doubled: boolean
  completedAt?: string
}

interface PlanItems {
  items?: PlanItem[]
  grid?: number[]
  completedPeriodIds?: string[]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const beforeStr = searchParams.get('before') // exclusive upper bound date

  const [y, m, d] = (beforeStr ?? '').split('-').map(Number)
  const before = beforeStr ? new Date(y, m - 1, d, 0, 0, 0, 0) : new Date()

  const plans = await prisma.dailyPlan.findMany({
    where: { date: { lt: before } },
    orderBy: { date: 'desc' },
  })

  const result: { date: string; items: (PlanItem & { sourceDate: string })[] }[] = []

  for (const plan of plans) {
    const raw = plan.items as PlanItems | PlanItem[] | null
    if (!raw) continue

    const items: PlanItem[] = Array.isArray(raw) ? raw : (raw.items ?? [])
    const incomplete = items.filter(it => !it.completedAt)
    if (incomplete.length === 0) continue

    const dateObj = new Date(plan.date)
    const sourceDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`

    result.push({
      date: sourceDate,
      items: incomplete.map(it => ({ ...it, sourceDate })),
    })
  }

  return Response.json(result)
}
