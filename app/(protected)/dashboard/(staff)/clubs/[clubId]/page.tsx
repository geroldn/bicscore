import Breadcrumb from "@/components/breadcrumb"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { notFound } from "next/navigation"

export default async function ClubPage({
  params,
}: {
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, name: true, description: true },
  })

  if (!club) notFound()

  return (
    <div className="flex flex-col gap-6 bg-zinc-100 p-8 flex-1 dark:bg-zinc-950">
      <Breadcrumb crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Clubs", href: "/dashboard/clubs" },
        { label: club.name },
      ]} />

      <div>
        <h1 className="text-2xl font-semibold">{club.name}</h1>
        {club.description && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{club.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ClubCard
          title="Players"
          description="View and manage players in this club."
          href={`/dashboard/clubs/${club.id}/players`}
        />
        <ClubCard
          title="Competitions"
          description="View and manage competitions for this club."
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
