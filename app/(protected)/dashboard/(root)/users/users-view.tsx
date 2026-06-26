"use client"

import { changeUserRole, createUser } from "@/app/actions/users"
import { UserRole } from "@/app/generated/prisma/client"
import Breadcrumb from "@/components/breadcrumb"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type User = { id: string; username: string | null; name: string | null; email: string | null; role: UserRole }

export default function UsersView({ users, sessionUserId }: { users: User[]; sessionUserId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Breadcrumb crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Users" }]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage Users</h1>
        <button
          onClick={() => setOpen(true)}
          title="Add user"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          <PlusIcon />
        </button>
      </div>

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
                    <RoleSelector userId={user.id} currentRole={user.role} sessionUserId={sessionUserId} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && <AddUserModal onClose={() => setOpen(false)} />}
    </>
  )
}

function AddUserModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await createUser(new FormData(e.currentTarget))
    if (result?.error) {
      setError(result.error)
      setSaving(false)
    } else {
      router.refresh()
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 className="mb-4 text-base font-semibold">Add User</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Name</label>
            <input
              name="name"
              type="text"
              autoFocus
              className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/20 dark:bg-zinc-800 dark:focus:ring-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Username</label>
            <input
              name="username"
              type="text"
              className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/20 dark:bg-zinc-800 dark:focus:ring-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Email</label>
            <input
              name="email"
              type="email"
              className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/20 dark:bg-zinc-800 dark:focus:ring-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Password <span className="text-red-500">*</span></label>
            <input
              name="password"
              type="password"
              required
              className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/20 dark:bg-zinc-800 dark:focus:ring-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Role</label>
            <select
              name="role"
              defaultValue="USER"
              className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/20 dark:bg-zinc-800 dark:focus:ring-white"
            >
              <option value="USER">USER</option>
              <option value="STAFF">STAFF</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-black/20 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-white/20 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
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

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="8" y1="2" x2="8" y2="14" />
      <line x1="2" y1="8" x2="14" y2="8" />
    </svg>
  )
}
