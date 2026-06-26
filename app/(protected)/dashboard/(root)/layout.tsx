import { authOptions } from "@/lib/auth"
import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (session?.user.role !== "ROOT" && session?.user.role !== "STAFF") {
    redirect("/dashboard")
  }

  return <>{children}</>
}
