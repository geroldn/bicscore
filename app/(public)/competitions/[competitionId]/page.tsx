import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Header from "@/components/header"
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

  function getMatch(rowId: string, colId: string) {
    return matches.find(
      (m) =>
        (m.playerAId === rowId && m.playerBId === colId) ||
        (m.playerAId === colId && m.playerBId === rowId),
    ) ?? null
  }

  function getCellScore(rowId: string, colId: string): number | null {
    const m = getMatch(rowId, colId)
    if (!m) return null
    const score = m.playerAId === rowId ? m.scoreA : m.scoreB
    return score
  }

  function isUnfinished(rowId: string, colId: string, rowTmc: number | null, colTmc: number | null): boolean {
    const m = getMatch(rowId, colId)
    if (!m) return false
    const rowCaramboles = m.playerAId === rowId ? m.carambolesA : m.carambolesB
    const colCaramboles = m.playerAId === rowId ? m.carambolesB : m.carambolesA
    if (rowCaramboles === null || colCaramboles === null || rowTmc === null || colTmc === null) return false
    return rowCaramboles < rowTmc && colCaramboles < colTmc
  }

  function getRowTotal(rowId: string): number | null {
    const scores = players
      .filter((p) => p.id !== rowId)
      .map((p) => getCellScore(rowId, p.id))
      .filter((s): s is number => s !== null)
    return scores.length === 0 ? null : scores.reduce((a, b) => a + b, 0)
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {session ? (
        <Header
          userName={session.user.name}
          userEmail={session.user.email}
          userRole={session.user.role}
        />
      ) : (
        <header className="flex h-14 items-center justify-between bg-zinc-900 px-6 shadow-md">
          <a href="/" className="text-base font-bold tracking-widest text-white uppercase hover:text-zinc-300">Bicscore</a>
          <Link
            href="/login"
            className="rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600"
          >
            Login
          </Link>
        </header>
      )}

      <main className="flex flex-1 flex-col gap-6 p-8">
        <div>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
            ← Back
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-semibold">{competition.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">{competition.club.name}</p>
        </div>

        {players.length === 0 ? (
          <p className="text-sm text-zinc-500">No players registered for this competition yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-44" />
                {players.map((p) => <col key={p.id} className="w-16" />)}
                <col className="w-16" />
              </colgroup>

              <thead>
                <tr>
                  <th className="border border-black/10 bg-zinc-50 dark:border-white/10 dark:bg-zinc-800" />
                  {players.map((col) => (
                    <th
                      key={col.id}
                      className="border border-black/10 bg-zinc-50 px-1 py-2 text-center text-xs font-semibold text-zinc-600 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-400"
                      title={col.name}
                    >
                      <span className="block truncate">{col.name.split(" ")[0]}</span>
                    </th>
                  ))}
                  <th className="border border-black/10 bg-zinc-100 px-1 py-2 text-center text-xs font-semibold text-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400">
                    Tot.
                  </th>
                </tr>
              </thead>

              <tbody>
                {players.map((row) => {
                  const total = getRowTotal(row.id)
                  return (
                    <tr key={row.id}>
                      <td
                        className="border border-black/10 bg-zinc-50 py-1 pl-3 pr-4 text-right text-xs font-semibold text-zinc-600 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-400"
                        title={row.name}
                      >
                        <span className="block truncate">
                          {row.name}
                          {row.tmc !== null && (
                            <span className="ml-1 font-normal text-zinc-400">({row.tmc})</span>
                          )}
                        </span>
                      </td>

                      {players.map((col) => {
                        if (row.id === col.id) {
                          return (
                            <td
                              key={col.id}
                              className="h-10 border border-black/10 bg-zinc-100 dark:border-white/10 dark:bg-zinc-900"
                            />
                          )
                        }
                        const score = getCellScore(row.id, col.id)
                        const unfinished = score !== null && isUnfinished(row.id, col.id, row.tmc, col.tmc)
                        return (
                          <td
                            key={col.id}
                            className={`h-10 border border-black/10 text-center text-xs font-medium tabular-nums dark:border-white/10 ${unfinished ? "text-red-500 dark:text-red-400" : ""}`}
                          >
                            {score !== null ? score : <span className="text-zinc-300 dark:text-zinc-600">·</span>}
                          </td>
                        )
                      })}

                      <td className="h-10 border border-black/10 bg-zinc-50 px-2 text-center text-sm font-semibold text-zinc-700 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300">
                        {total !== null ? total : ""}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
