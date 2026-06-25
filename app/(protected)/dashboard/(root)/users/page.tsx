import { changeUserRole } from "@/app/actions/users"
import { UserRole } from "@/app/generated/prisma/client"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Breadcrumb from "@/components/breadcrumb"
import { getServerSession } from "next-auth/next"

export default async function UsersPage() {
  const session = await getServerSession(authOptions)

  const users = await prisma.user.findMany({
    orderBy: { role: "asc" },
    select: { id: true, username: true, name: true, email: true, role: true },
  })

  return (
    <div className="flex flex-col gap-6 p-8">
      <Breadcrumb crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Users" }]} />
      <h1 className="text-2xl font-semibold">Manage Users</h1>

      <div className="overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email / Username</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {users.map((user) => (
              <tr key={user.id} className="bg-white dark:bg-zinc-900">
                <td className="px-4 py-3 font-medium">{user.name ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                  {user.email ?? user.username ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-4 py-3 text-right">
                  {user.role !== "ROOT" && (
                    <RoleSelector
                      userId={user.id}
                      currentRole={user.role}
                      sessionUserId={session!.user.id}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<UserRole, string> = {
    ROOT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    STAFF: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    USER: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[role]}`}>
      {role}
    </span>
  )
}

function RoleSelector({
  userId,
  currentRole,
  sessionUserId,
}: {
  userId: string
  currentRole: UserRole
  sessionUserId: string
}) {
  const isSelf = userId === sessionUserId

  return (
    <form
      action={async (data: FormData) => {
        "use server"
        const role = data.get("role") as UserRole
        await changeUserRole(userId, role)
      }}
      className="flex items-center justify-end gap-2"
    >
      <select
        name="role"
        defaultValue={currentRole}
        disabled={isSelf}
        className="rounded border border-black/10 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-zinc-800 disabled:opacity-50"
      >
        <option value="STAFF">STAFF</option>
        <option value="USER">USER</option>
      </select>
      <button
        type="submit"
        disabled={isSelf}
        className="rounded bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Save
      </button>
    </form>
  )
}
