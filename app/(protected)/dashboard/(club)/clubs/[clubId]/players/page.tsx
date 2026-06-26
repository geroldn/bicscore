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

  const players = await prisma.player.findMany({
    where: { clubMemberships: { some: { clubId } } },
    orderBy: [{ tmc: { sort: "desc", nulls: "last" } }, { name: "asc" }],
    select: { id: true, name: true, moyenne: true, tmc: true },
  })

  return (
    <div className="flex flex-col gap-6 p-8">
      <PlayersView club={club} players={players} />
    </div>
  )
}
