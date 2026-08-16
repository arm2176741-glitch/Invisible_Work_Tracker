export const APP_VIEWS = [
  "Dashboard",
  "Jobs",
  "Reports",
  "Crew",
  "Invitations",
  "Company profile",
  "Settings",
  "Help & support",
  "Profile",
] as const

export type AppView = typeof APP_VIEWS[number]

export const JOB_FILTER_ROUTES = {
  Active: "/jobs?status=active",
  "Needs photos": "/jobs?status=needs-photos",
  "Ready to send": "/jobs?status=ready-to-send",
} as const

export type JobFilterLabel = keyof typeof JOB_FILTER_ROUTES

export interface AppRoute {
  view: AppView
  reportId: number | null
}

export const APP_ROUTE_BY_VIEW: Record<AppView, string> = {
  Dashboard: "/",
  Jobs: "/jobs",
  Reports: "/reports",
  Crew: "/crew",
  Invitations: "/invitations",
  "Company profile": "/company",
  Settings: "/settings",
  "Help & support": "/support",
  Profile: "/profile",
}

export function isAppView(value: string): value is AppView {
  return APP_VIEWS.includes(value as AppView)
}

export function matchAppRoute(pathname: string): AppRoute | null {
  const reportMatch = pathname.match(/^\/reports\/(\d+)\/?$/)

  if (reportMatch) {
    return {
      view: "Reports",
      reportId: Number(reportMatch[1]),
    }
  }

  if (pathname === "/" || pathname === "/dashboard") {
    return { view: "Dashboard", reportId: null }
  }

  const matchedView = APP_VIEWS.find(
    (view) => APP_ROUTE_BY_VIEW[view] === pathname,
  )

  if (!matchedView) {
    return null
  }

  return { view: matchedView, reportId: null }
}

export function getPathForView(view: AppView) {
  return APP_ROUTE_BY_VIEW[view]
}

export function getJobFilterFromSearch(search: string) {
  return new URLSearchParams(search).get("status")
}
