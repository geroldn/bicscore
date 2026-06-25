import { authOptions } from "@/lib/auth"
import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-full flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="rounded-md border border-black/10 p-4 text-sm dark:border-white/10">
        <p><span className="font-medium">Name:</span> {session.user.name ?? "—"}</p>
        <p><span className="font-medium">Email:</span> {session.user.email}</p>
        <p><span className="font-medium">Role:</span> {session.user.role}</p>
      </div>
    </div>
  )
}
