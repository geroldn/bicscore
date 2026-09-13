import { prisma } from "@/lib/prisma"
import SeasonsView from "./seasons-view"

export default async function SeasonsPage() {
  const seasons = await prisma.season.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, startDate: true },
  })

  const formattedSeasons = seasons.map((s) => ({ ...s, startDate: s.startDate.toISOString() }))

  return (
    <div className="flex flex-col gap-6 p-8">
      <SeasonsView seasons={formattedSeasons} />
    </div>
  )
}
