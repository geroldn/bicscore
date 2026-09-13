"use client"

export default function CompetitionHeaderBar({
  competitionName,
  clubName,
  seasonName,
  showCaramboles,
  onToggleCaramboles,
  children,
}: {
  competitionName: string
  clubName: string
  seasonName?: string | null
  showCaramboles: boolean
  onToggleCaramboles: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="-mx-8 flex items-stretch justify-between gap-4 bg-green-100 px-8 py-6 dark:bg-green-900/30">
      <div>
        <h1 className="text-2xl font-semibold">{competitionName}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {seasonName ? `${clubName} - ${seasonName}` : clubName}
        </p>
      </div>
      <div className="flex flex-col items-end">
        {children}
        <button
          type="button"
          onClick={onToggleCaramboles}
          className="mt-auto text-sm font-medium text-zinc-600 underline dark:text-zinc-300"
        >
          {showCaramboles ? "Verberg uitslagen" : "Toon uitslagen"}
        </button>
      </div>
    </div>
  )
}
