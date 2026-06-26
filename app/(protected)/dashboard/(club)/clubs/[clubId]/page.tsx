import Breadcrumb from "@/components/breadcrumb"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import Link from "next/link"
import { notFound } from "next/navigation"

export default async function ClubPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const session = await getServerSession(authOptions)
  const isStaff = session?.user.role === "ROOT" || session?.user.role === "STAFF"

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, name: true, description: true },
  })

  if (!club) notFound()

  const crumbs = isStaff
    ? [
        { label: "Overzicht", href: "/dashboard" },
        { label: "Clubs", href: "/dashboard/clubs" },
        { label: club.name },
      ]
    : [
        { label: "Overzicht", href: "/dashboard" },
        { label: club.name },
      ]

  return (
    <div className="flex flex-col gap-6 bg-zinc-100 p-8 flex-1 dark:bg-zinc-950">
      <Breadcrumb crumbs={crumbs} />

      <div>
        <h1 className="text-2xl font-semibold">{club.name}</h1>
        {club.description && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{club.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ClubCard
          title="Spelers"
          description="Bekijk en beheer spelers in deze club."
          href={`/dashboard/clubs/${club.id}/players`}
        />
        <ClubCard
          title="Competities"
          description="Bekijk en beheer competities voor deze club."
          href={`/dashboard/clubs/${club.id}/competitions`}
        />
      </div>
    </div>
  )
}

function ClubCard({ title, description, href }: { title: string; description: string; href: string }) {
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
