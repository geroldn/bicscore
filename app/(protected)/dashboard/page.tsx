import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user.role

  const clubAdminships = session?.user.id
    ? await prisma.clubAdmin.findMany({
        where: { userId: session.user.id },
        select: { club: { select: { id: true, name: true } } },
        orderBy: { club: { name: "asc" } },
      })
    : []

  return (
    <div className="flex flex-col gap-6 bg-zinc-100 p-8 flex-1 dark:bg-zinc-950">
      <h1 className="text-2xl font-semibold">Overzicht</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(role === "ROOT" || role === "STAFF") && (
          <DashboardCard
            title="Gebruikers"
            description="Bekijk alle gebruikers en beheer hun rollen."
            href="/dashboard/users"
          />
        )}
        {(role === "ROOT" || role === "STAFF") && (
          <DashboardCard
            title="Clubs"
            description="Voeg biljartsverenigingen toe en beheer ze."
            href="/dashboard/clubs"
          />
        )}
        {(role === "ROOT" || role === "STAFF") && (
          <DashboardCard
            title="Berichten"
            description="Schrijf en beheer berichten en nieuws."
            href="/dashboard/posts"
          />
        )}
        {clubAdminships.map(({ club }) => (
          <DashboardCard
            key={club.id}
            title={club.name}
            description="Beheer spelers en competities voor deze club."
            href={`/dashboard/clubs/${club.id}`}
          />
        ))}
      </div>
    </div>
  )
}

function DashboardCard({
  title,
  description,
  href,
}: {
  title: string
  description: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-lg border border-black/10 bg-white p-6 shadow transition-shadow hover:shadow-md dark:border-white/10 dark:bg-zinc-800"
    >
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
    </Link>
  )
}
