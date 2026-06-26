import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Header from "@/components/header"
import { getServerSession } from "next-auth/next"
import Link from "next/link"

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  const competitions = await prisma.competition.findMany({
    where: { status: "IN_PROGRESS" },
    select: {
      id: true,
      name: true,
      description: true,
      club: { select: { name: true } },
    },

    orderBy: { name: "asc" },
  })

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
            Inloggen
          </Link>
        </header>
      )}

      <main className="flex flex-1 flex-col gap-6 p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Competities in uitvoering</h1>
          {session && (
            <Link
              href="/dashboard"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Dashboard
            </Link>
          )}
        </div>

        {competitions.length === 0 ? (
          <p className="text-sm text-zinc-500">Geen competities momenteel in uitvoering.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Competitie</th>
                  <th className="px-4 py-3">Club</th>
                  <th className="px-4 py-3">Omschrijving</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {competitions.map((c) => (
                  <tr key={c.id} className="bg-white dark:bg-zinc-900">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/competitions/${c.id}`} className="hover:underline">{c.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{c.club.name}</td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{c.description ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
