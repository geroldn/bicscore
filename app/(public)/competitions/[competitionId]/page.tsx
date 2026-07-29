import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Header from "@/components/header"
import PublicCompetitionView from "@/components/public-competition-view"
import { getServerSession } from "next-auth/next"
import Link from "next/link"
import { notFound } from "next/navigation"

export default async function PublicCompetitionPage({
  params,
}: {
  params: Promise<{ competitionId: string }>
}) {
  const { competitionId } = await params
  const session = await getServerSession(authOptions)

  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: {
      club: { select: { name: true } },
      entries: {
        include: { player: { select: { id: true, name: true } } },
        orderBy: { player: { name: "asc" } },
      },
    },
  })

  if (!competition) notFound()

  const matches = await prisma.match.findMany({
    where: { competitionId },
    select: {
      id: true,
      playerAId: true,
      playerBId: true,
      scoreA: true,
      scoreB: true,
      scoreAConfirmed: true,
      scoreBConfirmed: true,
      carambolesA: true,
      carambolesB: true,
      innings: true,
    },
  })

  const players = competition.entries.map((e) => ({
    id: e.player.id,
    name: e.player.name,
    tmc: e.tmc,
  }))

  return (
    <div className="flex min-h-screen flex-col">
      {session ? (
        <Header
          userName={session.user.name}
          userEmail={session.user.email}
          userRole={session.user.role}
        />
      ) : (
        <header className="flex h-14 items-center justify-between bg-zinc-900 px-6 shadow-md">
          <Link href="/" className="text-base font-bold tracking-widest text-white uppercase hover:text-zinc-300">Bicra</Link>
          <Link
            href="/login"
            className="rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600"
          >
            Inloggen
          </Link>
        </header>
      )}

      <main className="flex flex-1 flex-col gap-6 p-8">
        <div>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
            ← Terug
          </Link>
        </div>

        <PublicCompetitionView
          competitionId={competitionId}
          competitionName={competition.name}
          clubName={competition.club.name}
          players={players}
          initialMatches={matches}
          laggingGamesGap={competition.laggingGamesGap}
          laggingGamesPercent={competition.laggingGamesPercent}
        />
      </main>
    </div>
  )
}
