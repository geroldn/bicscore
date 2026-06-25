import { prisma } from "@/lib/prisma"
import ClubsView from "./clubs-view"

export default async function ClubsPage() {
  const clubs = await prisma.club.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true },
  })

  return (
    <div className="flex flex-col gap-6 p-8">
      <ClubsView clubs={clubs} />
    </div>
  )
}
