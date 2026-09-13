import Breadcrumb from "@/components/breadcrumb"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import CompetitionDetailView from "./competition-detail-view"

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
      season: { select: { name: true } },
      entries: {
        include: { player: { select: { id: true, name: true } } },
        orderBy: { player: { name: "asc" } },
      },
    },
  })

  if (!competition || competition.clubId !== clubId) notFound()

  const matches = await prisma.match.findMany({
    where: { competitionId },
    select: { id: true, playerAId: true, playerBId: true, scoreA: true, scoreB: true, scoreAConfirmed: true, scoreBConfirmed: true, carambolesA: true, carambolesB: true, innings: true, awardedScore: true, playedAt: true },
  })

  const players = competition.entries
    .filter((e) => !e.excluded)
    .map((e) => ({
      id: e.player.id,
      name: e.player.name,
      tmc: e.tmc,
    }))

  return (
    <div className="flex flex-col gap-6 p-8">
      <Breadcrumb
        crumbs={[
          { label: "Overzicht", href: "/dashboard" },
          { label: "Clubs", href: "/dashboard/clubs" },
          { label: competition.club.name, href: `/dashboard/clubs/${clubId}` },
          { label: "Competities", href: `/dashboard/clubs/${clubId}/competitions` },
          { label: competition.name },
        ]}
      />

      <CompetitionDetailView
        competitionId={competitionId}
        clubId={clubId}
        competitionName={competition.name}
        clubName={competition.club.name}
        seasonName={competition.season?.name ?? null}
        players={players}
        initialMatches={matches}
        laggingGamesGap={competition.laggingGamesGap}
        laggingGamesPercent={competition.laggingGamesPercent}
      />
    </div>
  )
}
