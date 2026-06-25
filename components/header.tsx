"use client"

import { signOut } from "next-auth/react"
import { useEffect, useRef, useState } from "react"

interface HeaderProps {
  userName: string | null | undefined
  userEmail: string | null | undefined
  userRole: string
}

export default function Header({ userName, userEmail, userRole }: HeaderProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?"

  return (
    <header className="flex h-14 items-center justify-between bg-zinc-900 px-6 shadow-md">
      <span className="text-base font-bold tracking-widest text-white uppercase">Bicscore</span>

      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-600 text-xs font-bold text-white ring-2 ring-zinc-500 hover:bg-zinc-500 hover:ring-zinc-400 transition-colors"
          aria-label="User menu"
        >
          {initials}
        </button>

        {open && (
          <div className="absolute right-0 top-10 z-50 w-56 rounded-md border border-zinc-700 bg-zinc-800 py-1 shadow-xl">
            <div className="border-b border-zinc-700 px-4 py-3">
              <p className="text-sm font-semibold text-white">{userName ?? "—"}</p>
              <p className="truncate text-xs text-zinc-400">{userEmail ?? userRole}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
