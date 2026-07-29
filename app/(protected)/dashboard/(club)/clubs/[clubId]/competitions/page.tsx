import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import CompetitionsView from "./competitions-view"

export default async function CompetitionsPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, name: true },
  })

  if (!club) notFound()

  const competitions = await prisma.competition.findMany({
    where: { clubId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true, status: true, laggingGamesGap: true, laggingGamesPercent: true },
  })

  return (
    <div className="flex flex-col gap-6 p-8">
      <CompetitionsView club={club} competitions={competitions} />
    </div>
  )
}
