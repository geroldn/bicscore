import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"

export default async function ClubLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ clubId: string }>
}) {
  const { clubId } = await params
  const session = await getServerSession(authOptions)
  const role = session?.user.role

  if (role !== "ROOT" && role !== "STAFF") {
    const isAdmin = session?.user.id
      ? (await prisma.clubAdmin.count({ where: { userId: session.user.id, clubId } })) > 0
      : false
    if (!isAdmin) redirect("/dashboard")
  }

  return <>{children}</>
}
