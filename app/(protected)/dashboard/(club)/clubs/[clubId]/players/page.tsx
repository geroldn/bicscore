import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import PlayersView from "./players-view"

export default async function PlayersPage({
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

  const [players, seasons] = await Promise.all([
    prisma.player.findMany({
      where: { clubMemberships: { some: { clubId } } },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        tmcHistory: {
          orderBy: { season: { startDate: "desc" } },
          select: { id: true, tmc: true, seasonId: true, season: { select: { name: true } } },
        },
      },
    }),
    prisma.season.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, name: true },
    }),
  ])

  const playersWithTmc = players
    .map((p) => ({ ...p, currentTmc: p.tmcHistory[0]?.tmc ?? null }))
    .sort((a, b) => {
      if (a.currentTmc === null && b.currentTmc === null) return a.name.localeCompare(b.name)
      if (a.currentTmc === null) return 1
      if (b.currentTmc === null) return -1
      return b.currentTmc - a.currentTmc || a.name.localeCompare(b.name)
    })

  return (
    <div className="flex flex-col gap-6 p-8">
      <PlayersView club={club} players={playersWithTmc} seasons={seasons} />
    </div>
  )
}
