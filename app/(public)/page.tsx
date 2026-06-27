import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Header from "@/components/header"
import { getServerSession } from "next-auth/next"
import Link from "next/link"

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  const [competitions, posts] = await Promise.all([
    prisma.competition.findMany({
      where: { status: "IN_PROGRESS" },
      select: {
        id: true,
        name: true,
        description: true,
        club: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.post.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, title: true, content: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ])

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
          <h1 className="text-2xl font-semibold">Bicscore</h1>
          {session && (
            <Link
              href="/dashboard"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Dashboard
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Left: competitions */}
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-semibold">Lopende competities</h2>
            {competitions.length === 0 ? (
              <p className="text-sm text-zinc-500">Geen competities momenteel in uitvoering.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    <tr>
                      <th className="px-4 py-3">Competitie</th>
                      <th className="px-4 py-3">Club</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {competitions.map((c) => (
                      <tr key={c.id} className="bg-white dark:bg-zinc-900">
                        <td className="px-4 py-3 font-medium">
                          <Link href={`/competitions/${c.id}`} className="hover:underline">{c.name}</Link>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{c.club.name}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/competitions/${c.id}`}
                            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                          >
                            Ga naar competitie
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right: posts */}
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">Berichten</h2>
            {posts.length === 0 ? (
              <p className="text-sm text-zinc-500">Geen berichten beschikbaar.</p>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="rounded-lg border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-900">
                  <p className="mb-1 text-xs text-zinc-400">{post.createdAt.toLocaleDateString("nl-NL")}</p>
                  <h3 className="mb-2 text-sm font-semibold">{post.title}</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{post.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
