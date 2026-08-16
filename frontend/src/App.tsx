import { useCallback, useEffect, useState } from "react"

import { LoginPage } from "@/components/auth/LoginPage"
import { DashboardPage } from "@/components/dashboard/DashboardPage"
import { ReportPreviewPage } from "@/components/reports/ReportPreviewPage"
import { AppShell } from "@/components/shell/AppShell"
import { NavigationPages } from "@/components/shell/NavigationPages"
import {
  deriveOnboardingState,
  type OnboardingDashboardSnapshot,
  type OnboardingFirstWorkEntry,
} from "@/lib/onboarding"
import {
  getPathForView,
  isAppView,
  matchAppRoute,
  type AppRoute,
  type AppView,
} from "@/lib/navigation"
import {
  ApiError,
  getSharedReport,
  listOrganizations,
  listWorkEntries,
  listWorkEntryPhotos,
  logoutAccount,
  markReportReviewed,
  type ReportResponse,
  type WorkEntryPhotoResponse,
  type WorkEntryResponse,
} from "@/lib/api"
import type {
  LoginResult,
  PhotoCategory,
  ReportSnapshot,
  ReportStatus,
  WorkEntryStatus,
} from "@/types/domain"

const SESSION_STORAGE_KEY = "fieldproof.session"

const emptyOnboardingDashboard: OnboardingDashboardSnapshot = {
  workspace: null,
  workEntryCount: 0,
  workEntries: [],
  firstWorkEntry: null,
}

function getCurrentAppRoute(): AppRoute {
  return matchAppRoute(window.location.pathname)
    ?? { view: "Dashboard", reportId: null }
}

function getCurrentLocationPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

function readStoredSession(): LoginResult | null {
  try {
    const sessionStoredSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    const localStoredSession = window.localStorage.getItem(SESSION_STORAGE_KEY)
    const storedSession = sessionStoredSession ?? localStoredSession

    if (!storedSession) {
      return null
    }

    const parsedSession = JSON.parse(storedSession) as Partial<LoginResult>

    if (!parsedSession.token || !parsedSession.userName) {
      return null
    }

    return {
      userName: parsedSession.userName,
      dashboardMode: parsedSession.dashboardMode ?? "onboarding",
      token: parsedSession.token,
      rememberSession: Boolean(localStoredSession && !sessionStoredSession),
    }
  } catch {
    return null
  }
}

function persistSession(session: LoginResult | null) {
  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
    return
  }

  const storage = session.rememberSession ? window.localStorage : window.sessionStorage
  const otherStorage = session.rememberSession ? window.sessionStorage : window.localStorage

  otherStorage.removeItem(SESSION_STORAGE_KEY)
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

interface StoredReportSnapshot {
  organization?: {
    name?: string
  }
  workEntry?: {
    id?: number
    jobName?: string
    jobAddress?: string
    customerName?: string
    customerPhone?: string | null
    customerEmail?: string | null
    customerContactName?: string | null
    workType?: string
    plannedScope?: string
    workPerformedSummary?: string
    description?: string
    workDate?: string | null
    scheduledStartTime?: string | null
    arrivalWindow?: string | null
    estimatedDuration?: string | null
    status?: WorkEntryStatus
  }
  photos?: Array<{
    id?: number
    category?: PhotoCategory
    caption?: string | null
    originalFilename?: string
    createdAt?: string
  }>
}

interface ReportSummaryData {
  id: number
  workEntryId?: number
  reportNumber?: string
  status?: ReportStatus
  snapshotJson?: string
  generatedAt?: string
  reviewedAt?: string | null
}

function getSharedReportToken() {
  const match = window.location.pathname.match(/^\/shared\/reports\/([^/]+)/)

  if (!match) {
    return null
  }

  return decodeURIComponent(match[1])
}

function parseStoredSnapshot(snapshotJson?: string): StoredReportSnapshot | null {
  if (!snapshotJson) {
    return null
  }

  try {
    return JSON.parse(snapshotJson) as StoredReportSnapshot
  } catch {
    return null
  }
}

function buildReportSnapshot(
  report: ReportSummaryData,
  fallback: {
    workspaceName?: string
    workEntry?: OnboardingFirstWorkEntry | null
  } = {},
  sharedToken?: string,
): ReportSnapshot {
  const storedSnapshot = parseStoredSnapshot(report.snapshotJson)
  const generatedAt = report.generatedAt ?? new Date().toISOString()
  const workEntry = fallback.workEntry
  const workEntrySnapshot = storedSnapshot?.workEntry
  const reportNumber =
    report.reportNumber ??
    `FP-${new Date(generatedAt).getFullYear()}-${String(report.id).padStart(6, "0")}`
  const encodedSharedToken = sharedToken ? encodeURIComponent(sharedToken) : null
  const snapshotPhotos = (storedSnapshot?.photos ?? []).flatMap((photo) => {
    if (typeof photo.id !== "number" || !photo.category) {
      return []
    }

    return [{
      id: photo.id,
      category: photo.category,
      caption: photo.caption ?? photo.originalFilename ?? `${photo.category} evidence`,
      uploadedAt: photo.createdAt ?? generatedAt,
      contentUrl: encodedSharedToken
        ? `/api/shared/reports/${encodedSharedToken}/photos/${photo.id}/content`
        : `/api/reports/${report.id}/photos/${photo.id}/content`,
    }]
  })
  const photos = snapshotPhotos.length > 0
    ? snapshotPhotos
    : (workEntry?.evidence ?? []).map((item) => ({
        id: item.id,
        category: item.category,
        caption: item.caption,
        uploadedAt: item.createdAt,
        previewUrl: item.previewUrl,
        contentUrl: encodedSharedToken
          ? `/api/shared/reports/${encodedSharedToken}/photos/${item.id}/content`
          : `/api/reports/${report.id}/photos/${item.id}/content`,
      }))

  return {
    id: report.id,
    workEntryId: report.workEntryId ?? workEntrySnapshot?.id ?? workEntry?.id,
    reportNumber,
    status: report.status ?? "GENERATED",
    generatedAt,
    reviewedAt: report.reviewedAt ?? null,
    workspaceName:
      storedSnapshot?.organization?.name
      ?? fallback.workspaceName
      ?? "FieldProof",
    jobName:
      workEntrySnapshot?.jobName
      ?? workEntry?.jobTitle
      ?? "Untitled job",
    jobAddress:
      workEntrySnapshot?.jobAddress
      ?? workEntry?.propertyAddress
      ?? "No property address added",
    customerName:
      workEntrySnapshot?.customerName
      ?? workEntry?.customerName
      ?? "Customer not recorded",
    customerPhone:
      workEntrySnapshot?.customerPhone
      ?? workEntry?.customerPhone
      ?? null,
    customerEmail:
      workEntrySnapshot?.customerEmail
      ?? workEntry?.customerEmail
      ?? null,
    customerContactName:
      workEntrySnapshot?.customerContactName
      ?? workEntry?.customerContactName
      ?? null,
    workType:
      workEntrySnapshot?.workType
      ?? workEntry?.workType
      ?? "General work",
    workDate:
      workEntrySnapshot?.workDate
      || workEntry?.workDate
      || generatedAt,
    scheduledStartTime:
      workEntrySnapshot?.scheduledStartTime
      || workEntry?.scheduledStartTime
      || null,
    arrivalWindow:
      workEntrySnapshot?.arrivalWindow
      || workEntry?.arrivalWindow
      || null,
    estimatedDuration:
      workEntrySnapshot?.estimatedDuration
      || workEntry?.estimatedDuration
      || null,
    workStatus:
      workEntrySnapshot?.status
      ?? "COMPLETED",
    workPerformed:
      workEntrySnapshot?.workPerformedSummary
      ?? workEntrySnapshot?.description
      ?? workEntry?.workPerformedSummary
      ?? workEntry?.description
      ?? "This proof report was generated from documented work and field evidence.",
    photos,
  }
}

function mapPhotoResponse(photo: WorkEntryPhotoResponse) {
  return {
    id: photo.id,
    category: photo.category,
    caption: photo.caption,
    fileName: photo.originalFilename,
    fileSizeBytes: photo.fileSizeBytes,
    contentUrl: `/api/work-entries/${photo.workEntryId}/photos/${photo.id}/content`,
    createdAt: photo.createdAt,
  }
}

function mapWorkEntryResponse(
  workEntry: WorkEntryResponse,
  photos: WorkEntryPhotoResponse[],
): OnboardingFirstWorkEntry {
  return {
    id: workEntry.id,
    evidence: photos.map(mapPhotoResponse),
    evidenceReady: photos.some((photo) => photo.category === "BEFORE")
      && photos.some((photo) => photo.category === "AFTER"),
    jobTitle: workEntry.jobName,
    propertyAddress: workEntry.jobAddress,
    customerName: workEntry.customerName,
    customerPhone: workEntry.customerPhone,
    customerEmail: workEntry.customerEmail,
    customerContactName: workEntry.customerContactName,
    workType: workEntry.workType,
    workDate: workEntry.workDate,
    scheduledStartTime: workEntry.scheduledStartTime,
    arrivalWindow: workEntry.arrivalWindow,
    estimatedDuration: workEntry.estimatedDuration,
    assignedCrew: workEntry.assignedCrew,
    siteAccessNotes: workEntry.siteAccessNotes,
    internalNotes: workEntry.internalNotes,
    status: workEntry.status,
    plannedScope: workEntry.plannedScope,
    workPerformedSummary: workEntry.workPerformedSummary,
    description: workEntry.description,
    report: workEntry.report
      ? {
          id: workEntry.report.id,
          status: workEntry.report.status,
          reportNumber: workEntry.report.reportNumber,
          snapshotJson: workEntry.report.snapshotJson,
          generatedAt: workEntry.report.generatedAt,
          reviewedAt: workEntry.report.reviewedAt ?? null,
        }
      : null,
  }
}

async function loadOnboardingDashboard(
  token: string,
): Promise<OnboardingDashboardSnapshot> {
  const organizations = await listOrganizations(token)
  const firstOrganization = organizations[0]

  if (!firstOrganization) {
    return emptyOnboardingDashboard
  }

  const savedWorkEntries = await listWorkEntries(token, firstOrganization.id)

  if (savedWorkEntries.length === 0) {
    return {
      workspace: {
        id: firstOrganization.id,
        name: firstOrganization.name,
      },
      workEntryCount: 0,
      workEntries: [],
      firstWorkEntry: null,
    }
  }

  const mappedWorkEntries = await Promise.all(
    savedWorkEntries.map(async (workEntry) => {
      const photos = await listWorkEntryPhotos(token, workEntry.id)

      return mapWorkEntryResponse(workEntry, photos)
    }),
  )

  return {
    workspace: {
      id: firstOrganization.id,
      name: firstOrganization.name,
    },
    workEntryCount: mappedWorkEntries.length,
    workEntries: mappedWorkEntries,
    firstWorkEntry: mappedWorkEntries[0] ?? null,
  }
}

function buildOnboardingReportSnapshot(
  dashboard: OnboardingDashboardSnapshot,
  reportId?: number | null,
): ReportSnapshot | null {
  const workEntries = dashboard.workEntries?.length
    ? dashboard.workEntries
    : dashboard.firstWorkEntry
      ? [dashboard.firstWorkEntry]
      : []
  const workEntry = reportId
    ? workEntries.find((entry) => entry.report?.id === reportId)
    : dashboard.firstWorkEntry

  if (!dashboard.workspace || !workEntry?.report) {
    return null
  }

  return buildReportSnapshot(
    {
      ...workEntry.report,
      workEntryId: workEntry.id,
    },
    {
      workspaceName: dashboard.workspace.name,
      workEntry,
    },
  )
}

function updateDashboardReport(
  dashboard: OnboardingDashboardSnapshot,
  report: ReportResponse,
): OnboardingDashboardSnapshot {
  const updateEntry = (entry: OnboardingFirstWorkEntry) => {
    if (entry.report?.id !== report.id) {
      return entry
    }

    return {
      ...entry,
      report: {
        id: report.id,
        status: report.status,
        reportNumber: report.reportNumber,
        snapshotJson: report.snapshotJson,
        generatedAt: report.generatedAt,
        reviewedAt: report.reviewedAt ?? null,
      },
    }
  }
  const workEntries = (dashboard.workEntries ?? []).map(updateEntry)
  const firstWorkEntry = dashboard.firstWorkEntry
    ? updateEntry(dashboard.firstWorkEntry)
    : null

  return {
    ...dashboard,
    workEntries,
    firstWorkEntry,
  }
}

function updateDashboardReportStatus(
  dashboard: OnboardingDashboardSnapshot,
  reportId: number,
  status: ReportStatus,
): OnboardingDashboardSnapshot {
  const updateEntry = (entry: OnboardingFirstWorkEntry) => {
    if (entry.report?.id !== reportId) {
      return entry
    }

    return {
      ...entry,
      report: {
        ...entry.report,
        status,
      },
    }
  }
  const workEntries = (dashboard.workEntries ?? []).map(updateEntry)
  const firstWorkEntry = dashboard.firstWorkEntry
    ? updateEntry(dashboard.firstWorkEntry)
    : null

  return {
    ...dashboard,
    workEntries,
    firstWorkEntry,
  }
}

function SharedReportRoute({ rawToken }: { rawToken: string }) {
  const [report, setReport] = useState<ReportSnapshot | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let isCurrent = true

    async function loadSharedReport() {
      try {
        const sharedReport = await getSharedReport(rawToken)

        if (isCurrent) {
          setReport(buildReportSnapshot(sharedReport, {}, rawToken))
          setLoadError(null)
        }
      } catch {
        if (isCurrent) {
          setLoadError("This shared report link is unavailable or has expired.")
        }
      }
    }

    void loadSharedReport()

    return () => {
      isCurrent = false
    }
  }, [rawToken])

  if (loadError) {
    return (
      <main className="shared-report-state">
        <h1>Report unavailable</h1>
        <p>{loadError}</p>
      </main>
    )
  }

  if (!report) {
    return (
      <main className="shared-report-state">
        <h1>Loading report</h1>
      </main>
    )
  }

  return (
    <main className="shared-report-view">
      <ReportPreviewPage
        report={report}
        isSharedView
        onBack={() => {
          window.location.assign("/")
        }}
      />
    </main>
  )
}

function App() {
  const sharedReportToken = getSharedReportToken()
  const initialAppRoute = getCurrentAppRoute()
  const [session, setSession] = useState<LoginResult | null>(readStoredSession)
  const [activeView, setActiveView] = useState<AppView>(initialAppRoute.view)
  const [activeReportId, setActiveReportId] =
    useState<number | null>(initialAppRoute.reportId)
  const [completionReportId, setCompletionReportId] = useState<number | null>(null)
  const [dashboardLoadError, setDashboardLoadError] = useState<string | null>(null)
  const [routeSearch, setRouteSearch] = useState(window.location.search)
  const [onboardingDashboard, setOnboardingDashboard] =
    useState<OnboardingDashboardSnapshot>(emptyOnboardingDashboard)

  const navigateToPath = useCallback((path: string, replace = false) => {
    const url = new URL(path, window.location.origin)
    const matchedRoute = matchAppRoute(url.pathname)

    if (!matchedRoute) {
      return
    }

    const nextPath = `${url.pathname}${url.search}${url.hash}`

    setActiveView(matchedRoute.view)
    setRouteSearch(url.search)
    setActiveReportId(matchedRoute.reportId)

    if (!matchedRoute.reportId) {
      setCompletionReportId(null)
    }

    if (getCurrentLocationPath() !== nextPath) {
      if (replace) {
        window.history.replaceState(null, "", nextPath)
      } else {
        window.history.pushState(null, "", nextPath)
      }
    }
  }, [])

  const navigateToView = useCallback((view: AppView) => {
    navigateToPath(getPathForView(view))
  }, [navigateToPath])

  useEffect(() => {
    if (!session?.token) {
      return
    }

    let isCurrent = true
    const currentSession = session
    const token = currentSession.token

    async function refreshDashboard() {
      try {
        setDashboardLoadError(null)
        const loadedDashboard = await loadOnboardingDashboard(token)

        if (isCurrent) {
          setOnboardingDashboard(loadedDashboard)

          if (
            currentSession.dashboardMode !== "operational"
            && deriveOnboardingState(loadedDashboard).onboardingComplete
          ) {
            const operationalSession: LoginResult = {
              ...currentSession,
              dashboardMode: "operational" as const,
            }

            persistSession(operationalSession)
            setSession(operationalSession)
          }
        }
      } catch (error) {
        if (!isCurrent) {
          return
        }

        if (error instanceof ApiError && error.status === 401) {
          persistSession(null)
          setSession(null)
          return
        }

        setDashboardLoadError(
          "Could not load saved dashboard data. Make sure the Spring Boot API is running and reachable from the frontend.",
        )
      }
    }

    void refreshDashboard()

    return () => {
      isCurrent = false
    }
  }, [session])

  useEffect(() => {
    function handlePopState() {
      const nextRoute = getCurrentAppRoute()

      setActiveView(nextRoute.view)
      setRouteSearch(window.location.search)
      setActiveReportId(nextRoute.reportId)

      if (!nextRoute.reportId) {
        setCompletionReportId(null)
      }
    }

    window.addEventListener("popstate", handlePopState)

    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    function handleInternalLinkClick(event: MouseEvent) {
      if (
        event.defaultPrevented
        || event.button !== 0
        || event.metaKey
        || event.ctrlKey
        || event.shiftKey
        || event.altKey
      ) {
        return
      }

      if (!(event.target instanceof Element)) {
        return
      }

      const anchor = event.target.closest("a")

      if (!(anchor instanceof HTMLAnchorElement)) {
        return
      }

      if (anchor.target || anchor.hasAttribute("download")) {
        return
      }

      const href = anchor.getAttribute("href")

      if (!href || href.startsWith("#")) {
        return
      }

      const url = new URL(anchor.href)

      if (url.origin !== window.location.origin || !matchAppRoute(url.pathname)) {
        return
      }

      event.preventDefault()
      navigateToPath(`${url.pathname}${url.search}${url.hash}`)
    }

    document.addEventListener("click", handleInternalLinkClick)

    return () => document.removeEventListener("click", handleInternalLinkClick)
  }, [navigateToPath])

  function handleLogin(nextSession: LoginResult) {
    persistSession(nextSession)
    setSession(nextSession)
  }

  function updateSession(nextSession: LoginResult) {
    persistSession(nextSession)
    setSession(nextSession)
  }

  function handleLogout() {
    const token = session?.token

    persistSession(null)
    setSession(null)
    setActiveReportId(null)
    setCompletionReportId(null)
    setDashboardLoadError(null)
    setOnboardingDashboard(emptyOnboardingDashboard)

    if (token) {
      void logoutAccount(token).catch(() => {
        // The frontend session is already cleared. If the backend is unavailable,
        // the saved token is gone locally and the next protected request will fail.
      })
    }
  }

  if (sharedReportToken) {
    return <SharedReportRoute rawToken={sharedReportToken} />
  }

  if (!session) {
    return <LoginPage onLogin={handleLogin} />
  }

  const sessionToken = session.token
  const currentSession = session
  const activeReport = activeReportId
    ? buildOnboardingReportSnapshot(onboardingDashboard, activeReportId)
    : null
  const firstReportId =
    onboardingDashboard.firstWorkEntry?.report?.id
    ?? onboardingDashboard.workEntries?.find((entry) => entry.report)?.report?.id
    ?? null
  const isFreshlyGeneratedReport =
    Boolean(activeReport && completionReportId === activeReport.id)
  const showFirstReportCompletion =
    Boolean(
      activeReport
      && (
        isFreshlyGeneratedReport
        || (
          !activeReport.reviewedAt
          && currentSession.dashboardMode === "onboarding"
          && firstReportId === activeReport.id
        )
      ),
    )

  function handleOpenReport(reportId: number) {
    navigateToPath(`/reports/${reportId}`)
  }

  function handleOpenGeneratedReport(reportId: number) {
    setCompletionReportId(reportId)
    navigateToPath(`/reports/${reportId}`)
  }

  async function handleReportReviewed(reportId: number) {
    const reviewedReport = await markReportReviewed(sessionToken, reportId)

    setOnboardingDashboard((currentDashboard) =>
      updateDashboardReport(currentDashboard, reviewedReport),
    )

    if (currentSession.dashboardMode !== "operational") {
      updateSession({
        ...currentSession,
        dashboardMode: "operational",
      })
    }

    return reviewedReport.reviewedAt ?? new Date().toISOString()
  }

  function handleReportStatusChange(
    reportId: number,
    status: ReportStatus,
  ) {
    setOnboardingDashboard((currentDashboard) =>
      updateDashboardReportStatus(currentDashboard, reportId, status),
    )
  }

  function handleGoToDashboard() {
    navigateToView("Dashboard")

    if (
      currentSession.dashboardMode !== "operational"
      && deriveOnboardingState(onboardingDashboard).onboardingComplete
    ) {
      updateSession({
        ...currentSession,
        dashboardMode: "operational",
      })
    }
  }

  function handleShellNavigate(view: AppView) {
    if (!isAppView(view)) {
      return
    }

    if (view === "Dashboard") {
      handleGoToDashboard()
      return
    }

    navigateToView(view)
  }

  return (
    <AppShell
      activeView={activeReport ? "Report preview" : activeView}
      routeSearch={routeSearch}
      userName={session.userName}
      workspaceName={activeReport?.workspaceName ?? onboardingDashboard.workspace?.name ?? null}
      onNavigate={handleShellNavigate}
      onNavigatePath={navigateToPath}
      onLogout={handleLogout}
    >
      {activeReport ? (
        <ReportPreviewPage
          report={activeReport}
          authToken={sessionToken}
          forceFirstReportCompletion={isFreshlyGeneratedReport}
          showFirstReportCompletion={showFirstReportCompletion}
          onReportReviewed={handleReportReviewed}
          onReportStatusChange={handleReportStatusChange}
          onGoToDashboard={handleGoToDashboard}
          onBack={handleGoToDashboard}
        />
      ) : activeView === "Dashboard" ? (
        <DashboardPage
          dashboardMode={session.dashboardMode}
          userName={session.userName}
          authToken={session.token}
          onboardingDashboard={onboardingDashboard}
          onOnboardingDashboardChange={setOnboardingDashboard}
          dashboardLoadError={dashboardLoadError}
          onExploreDemo={() => updateSession({ ...session, dashboardMode: "operational" })}
          onOpenReport={handleOpenReport}
          onOpenGeneratedReport={handleOpenGeneratedReport}
          onNavigate={handleShellNavigate}
        />
      ) : (
        <NavigationPages
          view={activeView}
          userName={session.userName}
          authToken={session.token}
          dashboard={onboardingDashboard}
          dashboardLoadError={dashboardLoadError}
          routeSearch={routeSearch}
          onNavigate={handleShellNavigate}
          onOpenReport={handleOpenReport}
        />
      )}
    </AppShell>
  )
}

export default App
