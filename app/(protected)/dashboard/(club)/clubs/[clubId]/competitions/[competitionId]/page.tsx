import Breadcrumb from "@/components/breadcrumb"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import ScoreSheet from "./score-sheet"

export default async function CompetitionPage({
  params,
}: {
  params: Promise<{ clubId: string; competitionId: string }>
}) {
  const { clubId, competitionId } = await params

  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: {
      club: { select: { id: true, name: true } },
      entries: {
        include: { player: { select: { id: true, name: true } } },
        orderBy: { player: { name: "asc" } },
      },
    },
  })

  if (!competition || competition.clubId !== clubId) notFound()

  const matches = await prisma.match.findMany({
    where: { competitionId },
    select: { id: true, playerAId: true, playerBId: true, scoreA: true, scoreB: true, carambolesA: true, carambolesB: true, innings: true },
  })

  const players = competition.entries.map((e) => ({
    id: e.player.id,
    name: e.player.name,
    tmc: e.tmc,
  }))

  return (
    <div className="flex flex-col gap-6 p-8">
      <Breadcrumb
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Clubs", href: "/dashboard/clubs" },
          { label: competition.club.name, href: `/dashboard/clubs/${clubId}` },
          { label: "Competitions", href: `/dashboard/clubs/${clubId}/competitions` },
          { label: competition.name },
        ]}
      />

      <h1 className="text-2xl font-semibold">{competition.name}</h1>

      <ScoreSheet
        competitionId={competitionId}
        clubId={clubId}
        players={players}
        initialMatches={matches}
      />
    </div>
  )
}
