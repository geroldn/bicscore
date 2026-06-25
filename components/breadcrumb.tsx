import Link from "next/link"

type Crumb = { label: string; href?: string }

export default function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm text-zinc-500">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronIcon />}
            {crumb.href && !isLast ? (
              <Link href={crumb.href} className="hover:text-zinc-900 dark:hover:text-zinc-100">
                {crumb.label}
              </Link>
            ) : (
              <span className={isLast ? "font-medium text-zinc-900 dark:text-zinc-100" : ""}>
                {crumb.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}

function ChevronIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
