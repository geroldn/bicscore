import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import UsersView from "./users-view"

export default async function UsersPage() {
  const session = await getServerSession(authOptions)

  const users = await prisma.user.findMany({
    orderBy: { role: "asc" },
    select: { id: true, username: true, name: true, email: true, role: true },
  })

  return (
    <div className="flex flex-col gap-6 p-8">
      <UsersView users={users} sessionUserId={session!.user.id} />
    </div>
  )
}
