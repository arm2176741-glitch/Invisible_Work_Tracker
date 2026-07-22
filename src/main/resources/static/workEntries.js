const FieldProofWorkEntries = (() => {
    const elements = {
        metricCount: document.querySelector("#workEntryMetricCount"),
        workspaceCount: document.querySelector("#workspaceEntryCount"),
        title: document.querySelector("#recentWorkEntriesTitle"),
        list: document.querySelector("#recentWorkEntryList"),
        emptyState: document.querySelector("#emptyWorkEntryState"),
        preview: document.querySelector(".work-entry-preview"),
        hero: document.querySelector(".work-entry-hero"),
        metrics: document.querySelector(".dashboard-metrics"),
        detailView: document.querySelector("#workEntryDetailView"),
        detailBackButton: document.querySelector("#workEntryDetailBackButton"),
        detailStatus: document.querySelector("#detailStatus"),
        detailProofStatus: document.querySelector("#detailProofStatus"),
        detailReportStatus: document.querySelector("#detailReportStatus"),
        detailReadinessTitle: document.querySelector("#detailReadinessTitle"),
        detailReadinessList: document.querySelector("#detailReadinessList"),
        detailMarkCompletedButton: document.querySelector("#detailMarkCompletedButton"),
        detailGenerateReportButton: document.querySelector("#detailGenerateReportButton"),
        detailReportMessage: document.querySelector("#detailReportMessage"),
        detailReportEmpty: document.querySelector("#detailReportEmpty"),
        detailReportPreview: document.querySelector("#detailReportPreview"),
        reportView: document.querySelector("#reportPreviewView"),
        reportBackButton: document.querySelector("#reportPreviewBackButton"),
        reportContent: document.querySelector("#reportPreviewContent"),
        detailPhotoList: document.querySelector("#detailPhotoList"),
        detailPhotoPlaceholder: document.querySelector("#detailPhotoPlaceholder"),
        detailAddPhotosButton: document.querySelector("#detailAddPhotosButton"),
        detailAddPhotosEmptyButton: document.querySelector("#detailAddPhotosEmptyButton"),
        quickPhotoButton: document.querySelector("#quickPhotoAction"),
        quickReportButton: document.querySelector("#quickReportAction"),

        modal: document.querySelector("#workEntryModal"),
        form: document.querySelector("#workEntryForm"),
        formMessage: document.querySelector("#workEntryFormMessage"),
        workspaceName: document.querySelector("#workEntryWorkspaceName"),
        openButtons: document.querySelectorAll("[data-open-work-entry-modal]"),
        closeButtons: document.querySelectorAll("[data-close-work-entry-modal]"),

        photoModal: document.querySelector("#workEntryPhotoModal"),
        photoForm: document.querySelector("#workEntryPhotoForm"),
        photoFormMessage: document.querySelector("#workEntryPhotoFormMessage"),
        photoWorkEntryName: document.querySelector("#photoWorkEntryName"),
        photoWorkspaceName: document.querySelector("#photoWorkspaceName"),
        photoFileInput: document.querySelector("#workEntryPhotoFiles"),
        photoDropzone: document.querySelector("#photoDropzone"),
        photoSelectedList: document.querySelector("#photoSelectedList"),
        photoSubmitButton: document.querySelector("#photoUploadSubmitButton"),
        closePhotoButtons: document.querySelectorAll("[data-close-work-entry-photo-modal]")
    };

    let currentEntries = [];
    let activeDetailWorkEntry = null;
    let activePhotoWorkEntry = null;
    let latestCurrentUserName = "User";
    let stagedPhotoFiles = createEmptyPhotoStage();
    let reportPhotoObjectUrls = [];
    let isUpdatingWorkEntryStatus = false;

    let createFormOptions = {
        getOrganizationId: () => null,
        getOrganizationName: () => "",
        authHeaders: () => ({}),
        getCurrentUserName: () => "User",
        onCreated: async () => {},
        onPhotosChanged: async () => {},
        onSuccess: () => {},
        onPhotoUploadSuccess: () => {},
        onReportGenerated: async () => {},
        onAuthenticationExpired: () => {},
        onUnavailableAction: () => {},
        onMissingOrganization: () => {}
    };
    let createFormInitialized = false;
    let isCreatingWorkEntry = false;
    let isUploadingPhotos = false;
    let isGeneratingReport = false;

    async function loadForOrganization({ organizationId, authHeaders, currentUserName }) {
        if (!organizationId) {
            clear("Select a workspace to see recent work entries.");
            return [];
        }

        renderLoading();

        try {
            const response = await fetch(`/work-entries?organizationId=${encodeURIComponent(organizationId)}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    ...(typeof authHeaders === "function" ? authHeaders() : {})
                }
            });

            if (!response.ok) {
                const errorBody = await readJson(response);
                throw new Error(errorBody.message || `Request failed with status ${response.status}`);
            }

            const workEntries = await readJson(response);
            latestCurrentUserName = currentUserName || createFormOptions.getCurrentUserName();
            currentEntries = await hydrateEntriesWithPhotoMetadata(
                Array.isArray(workEntries) ? workEntries : [],
                authHeaders
            );
            renderEntries(currentEntries, latestCurrentUserName);
            return currentEntries;
        } catch (error) {
            currentEntries = [];
            updateCount(0);
            renderError(error.message);
            return [];
        }
    }

    async function hydrateEntriesWithPhotoMetadata(workEntries, authHeaders) {
        return Promise.all(
            workEntries.map(async (workEntry) => {
                const photos = await fetchPhotosForWorkEntry(workEntry.id, authHeaders);
                return enrichWorkEntryWithPhotos(workEntry, photos);
            })
        );
    }

    async function fetchPhotosForWorkEntry(workEntryId, authHeaders = createFormOptions.authHeaders) {
        if (!workEntryId) {
            return [];
        }

        try {
            const response = await fetch(`/work-entries/${encodeURIComponent(workEntryId)}/photos`, {
                method: "GET",
                headers: {
                    ...(typeof authHeaders === "function" ? authHeaders() : {})
                }
            });

            if (!response.ok) {
                return [];
            }

            const photos = await readJson(response);
            return Array.isArray(photos) ? photos : [];
        } catch (error) {
            return [];
        }
    }

    function enrichWorkEntryWithPhotos(workEntry, photos) {
        const normalizedPhotos = Array.isArray(photos) ? photos : [];

        return {
            ...workEntry,
            photos: normalizedPhotos,
            photoCount: normalizedPhotos.length,
            proofReady: hasPhotoCategory(normalizedPhotos, "BEFORE")
                && hasPhotoCategory(normalizedPhotos, "AFTER")
        };
    }

    function initCreateForm(options = {}) {
        createFormOptions = {
            ...createFormOptions,
            ...options
        };

        if (createFormInitialized) {
            return;
        }

        createFormInitialized = true;

        elements.openButtons.forEach((button) => {
            button.addEventListener("click", openCreateForm);
        });

        elements.closeButtons.forEach((button) => {
            button.addEventListener("click", closeCreateForm);
        });

        if (elements.form) {
            elements.form.addEventListener("submit", submitCreateForm);
        }

        if (elements.list) {
            elements.list.addEventListener("click", handleEntryAction);
        }

        if (elements.detailBackButton) {
            elements.detailBackButton.addEventListener("click", closeDetailView);
        }

        if (elements.reportBackButton) {
            elements.reportBackButton.addEventListener("click", closeReportPreviewView);
        }

        elements.closePhotoButtons.forEach((button) => {
            button.addEventListener("click", closePhotoUploadForm);
        });

        if (elements.photoForm) {
            elements.photoForm.addEventListener("submit", submitPhotoUploadForm);
        }

        if (elements.photoFileInput) {
            elements.photoFileInput.addEventListener("change", handlePhotoFileSelection);
        }

        if (elements.photoSelectedList) {
            elements.photoSelectedList.addEventListener("click", handleStagedPhotoListClick);
            elements.photoSelectedList.addEventListener("input", handleStagedPhotoCaptionInput);
        }

        if (elements.photoDropzone) {
            elements.photoDropzone.addEventListener("dragover", handlePhotoDragOver);
            elements.photoDropzone.addEventListener("dragleave", handlePhotoDragLeave);
            elements.photoDropzone.addEventListener("drop", handlePhotoDrop);
        }

        if (elements.detailAddPhotosButton) {
            elements.detailAddPhotosButton.addEventListener("click", openPhotoUploadForDetail);
        }

        if (elements.detailAddPhotosEmptyButton) {
            elements.detailAddPhotosEmptyButton.addEventListener("click", openPhotoUploadForDetail);
        }

        if (elements.detailGenerateReportButton) {
            elements.detailGenerateReportButton.addEventListener("click", generateReportForDetail);
        }

        if (elements.detailMarkCompletedButton) {
            elements.detailMarkCompletedButton.addEventListener("click", markActiveDetailCompleted);
        }

        if (elements.detailPhotoList) {
            elements.detailPhotoList.addEventListener("click", handleDetailPhotoAction);
        }

        if (elements.quickPhotoButton) {
            elements.quickPhotoButton.addEventListener("click", openPhotoUploadForBestEntry);
        }

        if (elements.quickReportButton) {
            elements.quickReportButton.addEventListener("click", generateReportForBestEntry);
        }
    }

    function handleEntryAction(event) {
        const actionButton = event.target.closest("[data-work-entry-action]");

        if (!actionButton) {
            return;
        }

        const action = actionButton.dataset.workEntryAction;
        const workEntryId = actionButton.dataset.workEntryId;

        const workEntry = currentEntries.find((entry) => {
            return String(entry.id) === String(workEntryId);
        });

        if (!workEntry) {
            createFormOptions.onUnavailableAction("We couldn't find that work entry. Refresh and try again.");
            return;
        }

        if (action === "photos") {
            openDetailView(workEntry);
            openPhotoUploadForm(workEntry);
            return;
        }

        openDetailView(workEntry);
    }

    function openDetailView(workEntry) {
        activeDetailWorkEntry = workEntry;
        renderDetailView(workEntry);

        elements.preview?.classList.add("hidden");
        elements.hero?.classList.add("hidden");
        elements.metrics?.classList.add("hidden");
        elements.reportView?.classList.add("hidden");
        elements.detailView?.classList.remove("hidden");
    }

    function renderDetailView(workEntry) {
        setText("#detailJobName", formatDisplayText(workEntry.jobName || "Untitled work entry"));
        setText("#detailJobAddress", workEntry.jobAddress || "No address added");
        setText("#detailWorkType", formatDisplayText(workEntry.workType || "-"));
        setText("#detailWorkDate", formatDate(workEntry.workDate));
        setText("#detailDescription", formatDescription(workEntry.description));
        setText("#detailStatus", formatStatus(workEntry.status));

        if (elements.detailStatus) {
            elements.detailStatus.className = `work-entry-status-pill ${getStatusClass(workEntry.status)}`;
        }

        if (elements.detailProofStatus) {
            elements.detailProofStatus.textContent = getProofStatusLabel(workEntry);
        }

        if (elements.detailReportStatus) {
            elements.detailReportStatus.textContent = getReportStatusLabel(workEntry);
        }

        setReportMessage("");
        renderReportReadiness(workEntry);
        updateGenerateReportButton(workEntry);
        renderReportPreview(workEntry);
        renderDetailPhotos(workEntry);
    }

    function getReportStatusLabel(workEntry) {
        return workEntry.report ? "Generated" : "Not generated";
    }

    function renderDetailPhotos(workEntry) {
        const photos = Array.isArray(workEntry.photos) ? workEntry.photos : [];

        if (!elements.detailPhotoList || !elements.detailPhotoPlaceholder) {
            return;
        }

        elements.detailPhotoList.replaceChildren();
        elements.detailPhotoPlaceholder.classList.toggle("hidden", photos.length > 0);

        if (photos.length === 0) {
            return;
        }

        photos.forEach((photo) => {
            const photoCard = document.createElement("article");
            photoCard.className = "work-entry-photo-card";

            photoCard.innerHTML = `
                <span class="photo-category-badge ${escapeHtml(String(photo.category || "").toLowerCase())}">
                    ${escapeHtml(titleCase(photo.category || "Photo"))}
                </span>
                <div class="photo-card-copy">
                    <strong>${escapeHtml(photo.caption || photo.originalFilename || "Uploaded photo")}</strong>
                    <span>${escapeHtml(formatPhotoMeta(photo))}</span>
                </div>
                <button class="work-entry-action-button" type="button" data-delete-photo-id="${escapeHtml(photo.id)}">Delete</button>
            `;

            elements.detailPhotoList.appendChild(photoCard);
        });
    }

    function formatPhotoMeta(photo) {
        const size = formatFileSize(photo.fileSizeBytes);
        const date = formatDate(photo.createdAt);
        const type = photo.contentType || "image";

        return `${type} • ${size} • ${date}`;
    }

    function getProofStatusLabel(workEntry) {
        if (workEntry.proofReady) {
            return "Proof ready";
        }

        if (Number(workEntry.photoCount || 0) > 0) {
            return "Proof started";
        }

        return "Proof incomplete";
    }

    function hasPhotoCategory(photos, category) {
        return photos.some((photo) => {
            return String(photo.category || "").toUpperCase() === category;
        });
    }

    function setText(selector, value) {
        const element = document.querySelector(selector);

        if (element) {
            element.textContent = value;
        }
    }

    function closeDetailView() {
        activeDetailWorkEntry = null;
        elements.detailView?.classList.add("hidden");
        elements.reportView?.classList.add("hidden");
        elements.preview?.classList.remove("hidden");
        elements.hero?.classList.remove("hidden");
        elements.metrics?.classList.remove("hidden");
    }

    async function generateReportForBestEntry() {
        const reportEntry = getRecentEntries(currentEntries).find((entry) => {
            return Boolean(entry.report);
        });

        if (reportEntry) {
            openReportPreviewView(reportEntry);
            return;
        }

        const targetEntry = getRecentEntries(currentEntries).find((entry) => {
            return isReportReady(entry);
        });

        if (!targetEntry) {
            createFormOptions.onUnavailableAction(
                "Open a work entry and complete the report readiness checklist before generating a report."
            );
            return;
        }

        openDetailView(targetEntry);
        await generateReportForWorkEntry(targetEntry);
    }

    async function generateReportForDetail() {
        if (!activeDetailWorkEntry) {
            createFormOptions.onUnavailableAction("Open a work entry before generating a report.");
            return;
        }

        if (activeDetailWorkEntry.report) {
            openReportPreviewView(activeDetailWorkEntry);
            return;
        }

        await generateReportForWorkEntry(activeDetailWorkEntry);
    }

    async function generateReportForWorkEntry(workEntry) {
        if (isGeneratingReport || !workEntry) {
            return;
        }

        if (workEntry.report) {
            openReportPreviewView(workEntry);
            return;
        }

        const reportRequirements = getReportRequirements(workEntry);

        if (!reportRequirements.ready) {
            setReportMessage(
                `Finish before generating: ${reportRequirements.missing.join(" ")}`,
                "error"
            );
            return;
        }

        isGeneratingReport = true;
        updateGenerateReportButton(workEntry);
        setReportMessage("Generating report...");

        try {
            const response = await fetch(`/work-entries/${encodeURIComponent(workEntry.id)}/reports`, {
                method: "POST",
                headers: getAuthHeadersOrThrow("generating reports")
            });

            if (response.status === 401) {
                handleAuthenticationExpired();
                throw new Error("Your session expired. Sign in again before generating reports.");
            }

            if (!response.ok) {
                const errorBody = await readJson(response);
                throw new Error(extractErrorMessage(errorBody, response.status));
            }

            const report = await readJson(response);
            const updatedWorkEntry = {
                ...workEntry,
                report
            };

            currentEntries = currentEntries.map((entry) => {
                return String(entry.id) === String(workEntry.id)
                    ? updatedWorkEntry
                    : entry;
            });

            activeDetailWorkEntry = updatedWorkEntry;
            renderEntries(currentEntries, latestCurrentUserName);
            openDetailView(updatedWorkEntry);
            setReportMessage("Report generated.");
            await createFormOptions.onReportGenerated(currentEntries, report);
        } catch (error) {
            setReportMessage(error.message || "Report could not be generated.", "error");
        } finally {
            isGeneratingReport = false;
            updateGenerateReportButton(activeDetailWorkEntry || workEntry);
        }
    }

    function updateGenerateReportButton(workEntry) {
        if (!elements.detailGenerateReportButton) {
            return;
        }

        if (isGeneratingReport) {
            elements.detailGenerateReportButton.disabled = true;
            elements.detailGenerateReportButton.textContent = "Generating...";
            return;
        }

        if (workEntry?.report) {
            elements.detailGenerateReportButton.disabled = false;
            elements.detailGenerateReportButton.textContent = "View report";
            return;
        }

        if (!workEntry) {
            elements.detailGenerateReportButton.disabled = true;
            elements.detailGenerateReportButton.textContent = "Generate report";
            return;
        }

        const reportRequirements = getReportRequirements(workEntry);

        elements.detailGenerateReportButton.disabled = !reportRequirements.ready;
        elements.detailGenerateReportButton.textContent = reportRequirements.ready
            ? "Generate report"
            : "Complete requirements";
    }

    function renderReportReadiness(workEntry) {
        if (!elements.detailReadinessList || !elements.detailReadinessTitle) {
            return;
        }

        const requirements = getReportRequirements(workEntry);

        const readinessIsComplete = requirements.ready;

        elements.detailReadinessTitle.textContent = readinessIsComplete
            ? workEntry?.report
                ? "Report generated"
                : "Ready to generate"
            : "Requirements before report";
        elements.detailReadinessList.classList.toggle("is-complete", readinessIsComplete);

        if (readinessIsComplete) {
            const completionMessage = workEntry?.report
                ? `${getReportDetails(workEntry).reportNumber} is ready to review.`
                : "All documentation requirements are complete.";

            elements.detailReadinessList.innerHTML = `
                <li class="complete readiness-summary-row">
                    <span aria-hidden="true">&#10003;</span>
                    <strong>${escapeHtml(completionMessage)}</strong>
                </li>
            `;

            updateMarkCompletedButton(workEntry);
            return;
        }

        elements.detailReadinessList.innerHTML = requirements.items
            .map((item) => `
                <li class="${item.complete ? "complete" : "missing"}">
                    <span aria-hidden="true">${item.complete ? "&#10003;" : "&#9675;"}</span>
                    <strong>${escapeHtml(item.label)}</strong>
                </li>
            `)
            .join("");

        updateMarkCompletedButton(workEntry);
    }

    function getReportRequirements(workEntry) {
        const hasBeforePhoto = hasPhotoCategory(
            Array.isArray(workEntry?.photos) ? workEntry.photos : [],
            "BEFORE"
        );
        const hasAfterPhoto = hasPhotoCategory(
            Array.isArray(workEntry?.photos) ? workEntry.photos : [],
            "AFTER"
        );
        const hasWorkSummary = hasMeaningfulWorkSummary(workEntry?.description);
        const isCompleted = workEntry?.status === "COMPLETED";

        const items = [
            {
                key: "before-photo",
                label: "Add at least one before photo.",
                complete: hasBeforePhoto
            },
            {
                key: "after-photo",
                label: "Add at least one after photo.",
                complete: hasAfterPhoto
            },
            {
                key: "work-summary",
                label: "Add a work performed summary.",
                complete: hasWorkSummary
            },
            {
                key: "completed-status",
                label: "Mark the work entry completed.",
                complete: isCompleted
            }
        ];

        return {
            ready: items.every((item) => item.complete),
            items,
            missing: items
                .filter((item) => !item.complete)
                .map((item) => item.label)
        };
    }

    function isReportReady(workEntry) {
        return getReportRequirements(workEntry).ready;
    }

    function hasMeaningfulWorkSummary(description) {
        const normalizedDescription = String(description || "").trim();

        if (!normalizedDescription) {
            return false;
        }

        return !/^(.)\1{4,}$/i.test(normalizedDescription);
    }

    function updateMarkCompletedButton(workEntry) {
        if (!elements.detailMarkCompletedButton) {
            return;
        }

        const isCompleted = workEntry?.status === "COMPLETED";

        elements.detailMarkCompletedButton.disabled = isCompleted || isUpdatingWorkEntryStatus;
        elements.detailMarkCompletedButton.textContent = isUpdatingWorkEntryStatus
            ? "Marking..."
            : isCompleted
                ? "Completed"
                : "Mark completed";
    }

    async function markActiveDetailCompleted() {
        if (!activeDetailWorkEntry || isUpdatingWorkEntryStatus) {
            return;
        }

        if (activeDetailWorkEntry.status === "COMPLETED") {
            return;
        }

        isUpdatingWorkEntryStatus = true;
        updateMarkCompletedButton(activeDetailWorkEntry);
        setReportMessage("Marking work entry completed...");

        try {
            const response = await fetch(
                `/work-entries/${encodeURIComponent(activeDetailWorkEntry.id)}/status`,
                {
                    method: "PATCH",
                    headers: {
                        ...getAuthHeadersOrThrow("updating work entry status"),
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        status: "COMPLETED"
                    })
                }
            );

            if (response.status === 401) {
                handleAuthenticationExpired();
                throw new Error("Your session expired. Sign in again before updating work entries.");
            }

            if (!response.ok) {
                const errorBody = await readJson(response);
                throw new Error(extractErrorMessage(errorBody, response.status));
            }

            const statusResponse = await readJson(response);
            const updatedWorkEntry = {
                ...activeDetailWorkEntry,
                ...statusResponse,
                photos: activeDetailWorkEntry.photos,
                photoCount: activeDetailWorkEntry.photoCount,
                proofReady: activeDetailWorkEntry.proofReady,
                report: statusResponse.report || activeDetailWorkEntry.report
            };

            currentEntries = currentEntries.map((entry) => {
                return String(entry.id) === String(updatedWorkEntry.id)
                    ? updatedWorkEntry
                    : entry;
            });

            activeDetailWorkEntry = updatedWorkEntry;
            renderEntries(currentEntries, latestCurrentUserName);
            openDetailView(updatedWorkEntry);
            setReportMessage("Work entry marked completed.");
        } catch (error) {
            setReportMessage(error.message || "Work entry status could not be updated.", "error");
            updateMarkCompletedButton(activeDetailWorkEntry);
        } finally {
            isUpdatingWorkEntryStatus = false;
            updateMarkCompletedButton(activeDetailWorkEntry);
            updateGenerateReportButton(activeDetailWorkEntry);
        }
    }

    function renderReportPreview(workEntry) {
        if (!elements.detailReportEmpty || !elements.detailReportPreview) {
            return;
        }

        const report = workEntry?.report;

        elements.detailReportPreview.replaceChildren();
        elements.detailReportEmpty.classList.toggle("hidden", Boolean(report));
        elements.detailReportPreview.classList.toggle("hidden", !report);

        if (!report) {
            renderReportEmptyState(workEntry);
            return;
        }

        const reportDetails = getReportDetails(workEntry);

        const preview = document.createElement("div");
        preview.className = "generated-report-card";
        preview.innerHTML = `
            <span class="generated-report-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7V3Z"/><path d="M14 3v5h5"/><path d="M10 13h6"/><path d="M10 17h6"/></svg>
            </span>
            <div class="generated-report-copy">
                <span class="report-preview-label">Snapshot saved</span>
                <strong>${escapeHtml(reportDetails.reportNumber)}</strong>
                <p>
                    Generated ${escapeHtml(formatDateTime(reportDetails.generatedAt))}
                    &middot; ${escapeHtml(pluralize(reportDetails.photos.length, "evidence photo"))}
                </p>
            </div>
        `;

        elements.detailReportPreview.appendChild(preview);
    }

    function renderReportEmptyState(workEntry) {
        if (!elements.detailReportEmpty) {
            return;
        }

        const isProofReady = Boolean(workEntry?.proofReady);

        elements.detailReportEmpty.innerHTML = isProofReady
            ? `
                <strong>Ready to generate</strong>
                <p>This work entry has before and after coverage. Generate a stable customer-ready snapshot.</p>
            `
            : `
                <strong>No report generated yet</strong>
                <p>Add at least one BEFORE photo and one AFTER photo before generating a proof report.</p>
            `;
    }

    function openReportPreviewView(workEntry) {
        if (!workEntry?.report) {
            setReportMessage("Generate a report before opening the customer preview.", "error");
            return;
        }

        activeDetailWorkEntry = workEntry;
        renderReportPage(workEntry);

        elements.preview?.classList.add("hidden");
        elements.hero?.classList.add("hidden");
        elements.metrics?.classList.add("hidden");
        elements.detailView?.classList.add("hidden");
        elements.reportView?.classList.remove("hidden");
    }

    function closeReportPreviewView() {
        revokeReportPhotoObjectUrls();

        if (activeDetailWorkEntry) {
            openDetailView(activeDetailWorkEntry);
            return;
        }

        closeDetailView();
    }

    function renderReportPage(workEntry) {
        if (!elements.reportContent) {
            return;
        }

        const details = getReportDetails(workEntry);

        elements.reportContent.innerHTML = `
            <div class="report-document-toolbar">
                <div>
                    <p class="eyebrow">Report preview</p>
                    <h3>${escapeHtml(details.reportNumber)}</h3>
                </div>
                <div class="report-document-actions">
                    <button class="work-entry-action-button" type="button" disabled>Download PDF soon</button>
                    <button class="work-entry-action-button" type="button" disabled>Print soon</button>
                </div>
            </div>

            <article class="report-page">
                <header class="report-page-header">
                    <div>
                        <span class="report-brand-mark">FP</span>
                        <p>FieldProof</p>
                    </div>
                    <div>
                        <span>Proof of Work Report</span>
                        <strong>${escapeHtml(details.reportNumber)}</strong>
                    </div>
                </header>

                <section class="report-page-hero">
                    <p class="report-document-label">Generated report</p>
                    <h2>${escapeHtml(formatDisplayText(details.jobName))}</h2>
                    <p>${escapeHtml(details.jobAddress)}</p>
                </section>

                <section class="report-page-summary">
                    <div>
                        <span>Company workspace</span>
                        <strong>${escapeHtml(details.organizationName)}</strong>
                    </div>
                    <div>
                        <span>Generated</span>
                        <strong>${escapeHtml(formatDateTime(details.generatedAt))}</strong>
                    </div>
                    <div>
                        <span>Work date</span>
                        <strong>${escapeHtml(formatDate(details.workDate))}</strong>
                    </div>
                    <div>
                        <span>Work type</span>
                        <strong>${escapeHtml(formatDisplayText(details.workType))}</strong>
                    </div>
                    <div>
                        <span>Job status</span>
                        <strong>${escapeHtml(formatStatus(details.status))}</strong>
                    </div>
                    <div>
                        <span>Proof status</span>
                        <strong>Proof ready</strong>
                    </div>
                </section>

                <section class="report-page-section">
                    <p class="report-document-label">Work summary</p>
                    <p>${escapeHtml(formatDescription(details.description))}</p>
                </section>

                <section class="report-page-section">
                    <div class="report-page-section-heading">
                        <div>
                            <p class="report-document-label">Evidence snapshot</p>
                            <h3>Before, during, and after photos</h3>
                        </div>
                        <span>${escapeHtml(pluralize(details.photos.length, "photo"))}</span>
                    </div>
                    ${renderReportEvidenceSections(details.photos)}
                </section>
            </article>
        `;

        loadReportPhotoImages(details.report.id);
    }

    function getReportDetails(workEntry) {
        const report = workEntry?.report || {};
        const snapshot = parseReportSnapshot(report.snapshotJson);
        const job = snapshot.workEntry || {};
        const photos = Array.isArray(snapshot.photos) ? snapshot.photos : [];

        return {
            report,
            snapshot,
            photos,
            reportNumber: snapshot.reportNumber || report.reportNumber || "Report",
            generatedAt: report.generatedAt || snapshot.generatedAt || report.createdAt,
            organizationName: snapshot.organization?.name || createFormOptions.getOrganizationName() || "Workspace",
            jobName: job.jobName || workEntry?.jobName || "Work entry",
            jobAddress: job.jobAddress || workEntry?.jobAddress || "No address added",
            workType: job.workType || workEntry?.workType || "-",
            workDate: job.workDate || workEntry?.workDate,
            status: job.status || workEntry?.status,
            description: job.description || workEntry?.description || "No notes added"
        };
    }

    function renderReportEvidenceSections(photos) {
        if (photos.length === 0) {
            return `<p class="report-preview-muted">No photo metadata was included in this report snapshot.</p>`;
        }

        return ["BEFORE", "DURING", "AFTER"]
            .map((category) => {
                const categoryPhotos = photos.filter((photo) => {
                    return String(photo.category || "").toUpperCase() === category;
                });

                if (categoryPhotos.length === 0) {
                    return "";
                }

                return `
                    <div class="report-evidence-group">
                        <h4>${escapeHtml(titleCase(category))} work</h4>
                        ${renderReportPhotoRows(categoryPhotos)}
                    </div>
                `;
            })
            .join("");
    }

    function renderReportPhotoRows(photos) {
        if (photos.length === 0) {
            return `<p class="report-preview-muted">No photo metadata was included in this report snapshot.</p>`;
        }

        return `
            <div class="report-photo-list">
                ${photos.map((photo) => `
                    <article class="report-photo-row">
                        <div
                            class="report-photo-image-frame"
                            data-report-photo-id="${escapeHtml(photo.id)}"
                            data-report-photo-alt="${escapeHtml(titleCase(photo.category || "Photo"))} evidence photo"
                        >
                            <span>Loading image...</span>
                        </div>
                        <span class="photo-category-badge ${escapeHtml(String(photo.category || "").toLowerCase())}">
                            ${escapeHtml(titleCase(photo.category || "Photo"))}
                        </span>
                        <div>
                            <strong>${escapeHtml(photo.caption || photo.originalFilename || "Uploaded photo")}</strong>
                            <p>${escapeHtml(titleCase(photo.category || "Photo"))} work &middot; Uploaded ${escapeHtml(formatDate(photo.createdAt))}</p>
                        </div>
                    </article>
                `).join("")}
            </div>
        `;
    }

    async function loadReportPhotoImages(reportId) {
        revokeReportPhotoObjectUrls();

        if (!reportId || !elements.reportContent) {
            return;
        }

        const imageFrames =
                elements.reportContent.querySelectorAll("[data-report-photo-id]");

        imageFrames.forEach(async (frame) => {
            const photoId = frame.dataset.reportPhotoId;

            if (!photoId) {
                renderUnavailableReportPhoto(frame);
                return;
            }

            try {
                const response = await fetch(
                        `/reports/${encodeURIComponent(reportId)}/photos/${encodeURIComponent(photoId)}/content`,
                        {
                            headers: getAuthHeadersOrThrow("loading report photos")
                        }
                );

                if (response.status === 401) {
                    handleAuthenticationExpired();
                    throw new Error("Session expired.");
                }

                if (!response.ok) {
                    throw new Error("Unable to load report photo.");
                }

                const blob = await response.blob();
                const imageUrl = URL.createObjectURL(blob);
                reportPhotoObjectUrls.push(imageUrl);

                frame.replaceChildren();

                const image = document.createElement("img");
                image.src = imageUrl;
                image.alt = frame.dataset.reportPhotoAlt || "Report evidence photo";
                image.className = "report-photo-image";

                frame.appendChild(image);
            } catch (error) {
                renderUnavailableReportPhoto(frame);
            }
        });
    }

    function renderUnavailableReportPhoto(frame) {
        frame.innerHTML = `
            <div class="report-photo-unavailable">
                <strong>Photo unavailable</strong>
                <small>Evidence record remains attached to this report.</small>
            </div>
        `;
    }

    function revokeReportPhotoObjectUrls() {
        reportPhotoObjectUrls.forEach((url) => {
            URL.revokeObjectURL(url);
        });
        reportPhotoObjectUrls = [];
    }

    function parseReportSnapshot(snapshotJson) {
        try {
            return JSON.parse(snapshotJson || "{}");
        } catch (error) {
            return {};
        }
    }

    function setReportMessage(message, type = "") {
        if (!elements.detailReportMessage) {
            return;
        }

        elements.detailReportMessage.textContent = message;
        elements.detailReportMessage.className = "status-message";

        if (type) {
            elements.detailReportMessage.classList.add(type);
        }
    }

    function openPhotoUploadForBestEntry() {
        if (currentEntries.length === 0) {
            createFormOptions.onUnavailableAction("Create a work entry before adding photos.");
            return;
        }

        const targetEntry = getBestPhotoTargetEntry();
        openDetailView(targetEntry);
        openPhotoUploadForm(targetEntry);
    }

    function getBestPhotoTargetEntry() {
        const sortedEntries = getRecentEntries(currentEntries);

        return sortedEntries.find((entry) => !entry.proofReady)
            || sortedEntries[0]
            || currentEntries[0];
    }

    function openPhotoUploadForDetail() {
        if (!activeDetailWorkEntry) {
            createFormOptions.onUnavailableAction("Open a work entry before adding photos.");
            return;
        }

        openPhotoUploadForm(activeDetailWorkEntry);
    }

    function openPhotoUploadForm(workEntry) {
        if (!workEntry || !workEntry.id) {
            createFormOptions.onUnavailableAction("Open a work entry before adding photos.");
            return;
        }

        if (!elements.photoModal) {
            return;
        }

        activePhotoWorkEntry = workEntry;
        renderPhotoModalContext(workEntry);
        resetStagedPhotoFiles();
        setPhotoMessage("");
        elements.photoForm?.reset();
        renderSelectedPhotoFiles();
        elements.photoModal.classList.remove("hidden");
        document.body.classList.add("modal-open");

        if (elements.photoFileInput) {
            elements.photoFileInput.focus();
        }
    }

    function closePhotoUploadForm() {
        if (!elements.photoModal) {
            return;
        }

        elements.photoModal.classList.add("hidden");
        activePhotoWorkEntry = null;
        resetStagedPhotoFiles();
        setPhotoMessage("");
        elements.photoForm?.reset();
        renderSelectedPhotoFiles();

        if (elements.modal?.classList.contains("hidden") !== false) {
            document.body.classList.remove("modal-open");
        }
    }

    function renderPhotoModalContext(workEntry) {
        if (elements.photoWorkEntryName) {
            elements.photoWorkEntryName.textContent =
                    formatDisplayText(workEntry.jobName || "Selected job");
        }

        if (elements.photoWorkspaceName) {
            const organizationName = typeof createFormOptions.getOrganizationName === "function"
                ? createFormOptions.getOrganizationName()
                : "";

            elements.photoWorkspaceName.textContent = organizationName || "Selected workspace";
        }
    }

    function handlePhotoDragOver(event) {
        event.preventDefault();
        elements.photoDropzone?.classList.add("is-dragging");
    }

    function handlePhotoDragLeave() {
        elements.photoDropzone?.classList.remove("is-dragging");
    }

    function handlePhotoDrop(event) {
        event.preventDefault();
        elements.photoDropzone?.classList.remove("is-dragging");

        if (!event.dataTransfer?.files?.length) {
            return;
        }

        stagePhotoFiles(Array.from(event.dataTransfer.files));
    }

    function handlePhotoFileSelection() {
        const files = Array.from(elements.photoFileInput?.files || []);
        stagePhotoFiles(files);

        if (elements.photoFileInput) {
            elements.photoFileInput.value = "";
        }
    }

    function stagePhotoFiles(files, category = getSelectedPhotoCategory()) {
        if (!files.length) {
            return;
        }

        if (!["BEFORE", "DURING", "AFTER"].includes(category)) {
            setPhotoMessage("Choose before, during, or after before adding files.", "error");
            return;
        }

        const existingFileKeys = new Set(
            stagedPhotoFiles[category].map((stagedPhoto) => getPhotoFileKey(stagedPhoto.file))
        );
        let addedCount = 0;

        files.forEach((file) => {
            const fileKey = getPhotoFileKey(file);

            if (existingFileKeys.has(fileKey)) {
                return;
            }

            stagedPhotoFiles[category].push({
                file,
                caption: defaultPhotoCaption(category, stagedPhotoFiles[category].length + 1)
            });
            existingFileKeys.add(fileKey);
            addedCount += 1;
        });

        if (addedCount === 0) {
            setPhotoMessage("Those files are already staged for this category.");
        } else {
            setPhotoMessage(
                `${pluralize(addedCount, "photo")} staged for ${titleCase(category)}.`
            );
        }

        renderSelectedPhotoFiles();
    }

    function handleStagedPhotoListClick(event) {
        const removeButton = event.target.closest("[data-remove-staged-photo]");

        if (!removeButton) {
            return;
        }

        const category = removeButton.dataset.category;
        const index = Number(removeButton.dataset.index);

        if (!["BEFORE", "DURING", "AFTER"].includes(category) || Number.isNaN(index)) {
            return;
        }

        stagedPhotoFiles[category].splice(index, 1);
        setPhotoMessage("");
        renderSelectedPhotoFiles();
    }

    function handleStagedPhotoCaptionInput(event) {
        const captionInput = event.target.closest("[data-staged-photo-caption]");

        if (!captionInput) {
            return;
        }

        const category = captionInput.dataset.category;
        const index = Number(captionInput.dataset.index);

        if (!["BEFORE", "DURING", "AFTER"].includes(category) || Number.isNaN(index)) {
            return;
        }

        if (!stagedPhotoFiles[category][index]) {
            return;
        }

        stagedPhotoFiles[category][index].caption = captionInput.value;
    }

    function renderSelectedPhotoFiles() {
        if (!elements.photoSelectedList) {
            return;
        }

        const stagedItems = getStagedPhotoItems();
        elements.photoSelectedList.replaceChildren();
        elements.photoSelectedList.classList.toggle("hidden", stagedItems.length === 0);
        updatePhotoSubmitState(stagedItems);

        stagedItems.forEach(({ category, file, caption, index }) => {
            const item = document.createElement("li");
            item.innerHTML = `
                <span class="photo-category-badge ${escapeHtml(category.toLowerCase())}">
                    ${escapeHtml(titleCase(category))}
                </span>
                <span class="photo-selected-copy">
                    <strong>${escapeHtml(file.name)}</strong>
                    <small>${escapeHtml(file.type || "image")} &middot; ${escapeHtml(formatFileSize(file.size))}</small>
                </span>
                <label class="photo-caption-field">
                    <span>Caption</span>
                    <input
                        class="photo-caption-input"
                        type="text"
                        maxlength="255"
                        value="${escapeHtml(caption || "")}"
                        placeholder="Describe what this photo shows"
                        data-staged-photo-caption
                        data-category="${escapeHtml(category)}"
                        data-index="${escapeHtml(index)}"
                    >
                </label>
                <em>${file.size > 20 * 1024 * 1024 ? "Too large" : "Ready"}</em>
                <button class="photo-staged-remove" type="button" data-remove-staged-photo data-category="${escapeHtml(category)}" data-index="${escapeHtml(index)}">
                    Remove
                </button>
            `;

            if (file.size > 20 * 1024 * 1024) {
                item.classList.add("has-error");
            }

            elements.photoSelectedList.appendChild(item);
        });
    }

    function updatePhotoSubmitState(stagedItems = getStagedPhotoItems()) {
        if (!elements.photoSubmitButton) {
            return;
        }

        const files = stagedItems.map((item) => item.file);
        const hasFiles = files.length > 0;
        const hasOversizedFiles = files.some((file) => {
            return file.size > 20 * 1024 * 1024;
        });
        const hasInvalidTypes = files.some((file) => {
            return !["image/jpeg", "image/png", "image/webp"].includes(file.type);
        });

        elements.photoSubmitButton.disabled =
                !hasFiles || hasOversizedFiles || hasInvalidTypes || isUploadingPhotos;
    }

    async function submitPhotoUploadForm(event) {
        event.preventDefault();

        if (isUploadingPhotos || !elements.photoForm || !activePhotoWorkEntry) {
            return;
        }

        const stagedItems = getStagedPhotoItems();
        const validationMessage = validatePhotoUpload(stagedItems);

        if (validationMessage) {
            setPhotoMessage(validationMessage, "error");
            return;
        }

        const submitButton = elements.photoForm.querySelector('button[type="submit"]');
        const originalButtonContent = submitButton ? submitButton.innerHTML : "";

        isUploadingPhotos = true;
        setPhotoMessage("");

        if (submitButton) {
            submitButton.disabled = true;
        }

        try {
            for (let index = 0; index < stagedItems.length; index++) {
                const stagedItem = stagedItems[index];

                if (submitButton) {
                    submitButton.textContent = `Uploading ${index + 1} of ${stagedItems.length}...`;
                }

                await uploadSinglePhoto(
                    activePhotoWorkEntry.id,
                    stagedItem.category,
                    stagedItem.file,
                    stagedItem.caption
                );
            }

            const uploadedCount = stagedItems.length;
            const workEntryId = activePhotoWorkEntry.id;

            closePhotoUploadForm();
            await refreshAfterPhotoChange(workEntryId);
            createFormOptions.onPhotoUploadSuccess(
                `${pluralize(uploadedCount, "photo")} uploaded.`
            );
        } catch (error) {
            setPhotoMessage(error.message || "Photo upload failed. Try again.", "error");
        } finally {
            isUploadingPhotos = false;

            if (submitButton) {
                updatePhotoSubmitState();
                submitButton.innerHTML = originalButtonContent;
            }
        }
    }

    function validatePhotoUpload(stagedItems) {
        if (stagedItems.length === 0) {
            return "Choose at least one photo.";
        }

        const invalidCategory = stagedItems.find((item) => {
            return !["BEFORE", "DURING", "AFTER"].includes(item.category);
        });

        if (invalidCategory) {
            return "Every photo needs a before, during, or after category.";
        }

        const invalidType = stagedItems.find((item) => {
            return !["image/jpeg", "image/png", "image/webp"].includes(item.file.type);
        });

        if (invalidType) {
            return `${invalidType.file.name} must be JPEG, PNG, or WebP.`;
        }

        const oversizedFile = stagedItems.find((item) => {
            return item.file.size > 20 * 1024 * 1024;
        });

        if (oversizedFile) {
            return `${oversizedFile.file.name} is larger than 20MB.`;
        }

        return "";
    }

    function getSelectedPhotoCategory() {
        const checkedInput = elements.photoForm?.querySelector('input[name="category"]:checked');
        return String(checkedInput?.value || "")
            .trim()
            .toUpperCase();
    }

    function getStagedPhotoItems() {
        return ["BEFORE", "DURING", "AFTER"].flatMap((category) => {
            return stagedPhotoFiles[category].map((stagedPhoto, index) => ({
                category,
                file: stagedPhoto.file,
                caption: stagedPhoto.caption,
                index
            }));
        });
    }

    function createEmptyPhotoStage() {
        return {
            BEFORE: [],
            DURING: [],
            AFTER: []
        };
    }

    function defaultPhotoCaption(category, number = 1) {
        return `${titleCase(category)} photo ${number}`;
    }

    function resetStagedPhotoFiles() {
        stagedPhotoFiles = createEmptyPhotoStage();

        if (elements.photoFileInput) {
            elements.photoFileInput.value = "";
        }
    }

    function getPhotoFileKey(file) {
        return [
            file.name,
            file.size,
            file.lastModified,
            file.type
        ].join("|");
    }

    async function uploadSinglePhoto(workEntryId, category, file, caption) {
        const formData = new FormData();
        formData.append("category", category);
        formData.append("caption", caption || "");
        formData.append("file", file);

        const response = await fetch(`/work-entries/${encodeURIComponent(workEntryId)}/photos`, {
            method: "POST",
            headers: getAuthHeadersOrThrow("uploading photos"),
            body: formData
        });

        if (response.status === 401) {
            handleAuthenticationExpired();
            throw new Error("Your session expired. Sign in again before uploading photos.");
        }

        if (!response.ok) {
            const errorBody = await readJson(response);
            throw new Error(extractErrorMessage(errorBody, response.status));
        }

        return readJson(response);
    }

    function getAuthHeadersOrThrow(action = "continuing") {
        const headers = typeof createFormOptions.authHeaders === "function"
            ? createFormOptions.authHeaders()
            : {};
        const authorization = headers.Authorization || headers.authorization || "";

        if (
            !authorization
            || authorization === "Bearer null"
            || authorization === "Bearer undefined"
            || authorization.trim() === "Bearer"
        ) {
            handleAuthenticationExpired();
            throw new Error(`Your session expired. Sign in again before ${action}.`);
        }

        return headers;
    }

    function handleAuthenticationExpired() {
        closePhotoUploadForm();
        closeCreateForm();
        createFormOptions.onAuthenticationExpired("Session expired. Sign in again.");
    }

    async function refreshAfterPhotoChange(workEntryId) {
        let refreshedEntries = [];

        if (typeof createFormOptions.onPhotosChanged === "function") {
            const result = await createFormOptions.onPhotosChanged();

            if (Array.isArray(result)) {
                refreshedEntries = result;
            }
        }

        if (refreshedEntries.length > 0) {
            currentEntries = refreshedEntries;
        } else {
            await refreshSingleWorkEntryPhotos(workEntryId);
            renderEntries(currentEntries, latestCurrentUserName);
        }

        const updatedWorkEntry = currentEntries.find((entry) => {
            return String(entry.id) === String(workEntryId);
        });

        if (updatedWorkEntry && !elements.detailView?.classList.contains("hidden")) {
            openDetailView(updatedWorkEntry);
        }
    }

    async function refreshSingleWorkEntryPhotos(workEntryId) {
        const workEntry = currentEntries.find((entry) => {
            return String(entry.id) === String(workEntryId);
        });

        if (!workEntry) {
            return;
        }

        const photos = await fetchPhotosForWorkEntry(workEntryId);
        const updatedWorkEntry = enrichWorkEntryWithPhotos(workEntry, photos);

        currentEntries = currentEntries.map((entry) => {
            return String(entry.id) === String(workEntryId)
                ? updatedWorkEntry
                : entry;
        });
    }

    async function handleDetailPhotoAction(event) {
        const deleteButton = event.target.closest("[data-delete-photo-id]");

        if (!deleteButton || !activeDetailWorkEntry) {
            return;
        }

        const photoId = deleteButton.dataset.deletePhotoId;
        const confirmed = window.confirm("Delete this photo from the work entry?");

        if (!confirmed) {
            return;
        }

        deleteButton.disabled = true;
        deleteButton.textContent = "Deleting...";

        try {
            const response = await fetch(
                `/work-entries/${encodeURIComponent(activeDetailWorkEntry.id)}/photos/${encodeURIComponent(photoId)}`,
                {
                    method: "DELETE",
                    headers: getAuthHeadersOrThrow("deleting photos")
                }
            );

            if (response.status === 401) {
                handleAuthenticationExpired();
                throw new Error("Your session expired. Sign in again before deleting photos.");
            }

            if (!response.ok) {
                const errorBody = await readJson(response);
                throw new Error(extractErrorMessage(errorBody, response.status));
            }

            await refreshAfterPhotoChange(activeDetailWorkEntry.id);
            createFormOptions.onPhotoUploadSuccess("Photo deleted.");
        } catch (error) {
            createFormOptions.onUnavailableAction(error.message || "Photo could not be deleted.");
            deleteButton.disabled = false;
            deleteButton.textContent = "Delete";
        }
    }

    function setPhotoMessage(message, type = "") {
        if (!elements.photoFormMessage) {
            return;
        }

        elements.photoFormMessage.textContent = message;
        elements.photoFormMessage.className = "status-message";

        if (type) {
            elements.photoFormMessage.classList.add(type);
        }
    }

    function openCreateForm() {
        const organizationId = createFormOptions.getOrganizationId();

        if (!organizationId) {
            createFormOptions.onMissingOrganization();
            return;
        }

        if (!elements.modal) {
            return;
        }

        elements.modal.classList.remove("hidden");
        document.body.classList.add("modal-open");
        renderWorkspaceName();
        setCreateMessage("");
        setDefaultWorkDate();

        const firstInput = elements.form?.querySelector('input[name="jobName"]');

        if (firstInput) {
            firstInput.focus();
        }
    }

    function closeCreateForm() {
        if (!elements.modal) {
            return;
        }

        elements.modal.classList.add("hidden");
        document.body.classList.remove("modal-open");
        setCreateMessage("");
    }

    function renderWorkspaceName() {
        if (!elements.workspaceName) {
            return;
        }

        const organizationName = typeof createFormOptions.getOrganizationName === "function"
            ? createFormOptions.getOrganizationName()
            : "";

        elements.workspaceName.textContent = organizationName || "Selected workspace";
    }

    async function submitCreateForm(event) {
        event.preventDefault();

        if (isCreatingWorkEntry || !elements.form) {
            return;
        }

        const payload = getCreatePayload();
        const validationMessage = validateCreatePayload(payload);

        if (validationMessage) {
            setCreateMessage(validationMessage, "error");
            return;
        }

        const submitButton = elements.form.querySelector('button[type="submit"]');
        const originalButtonContent = submitButton ? submitButton.innerHTML : "";

        isCreatingWorkEntry = true;
        setCreateMessage("");

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Creating...";
        }

        try {
            const response = await fetch("/work-entries", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(typeof createFormOptions.authHeaders === "function" ? createFormOptions.authHeaders() : {})
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorBody = await readJson(response);
                throw new Error(extractErrorMessage(errorBody, response.status));
            }

            const createdWorkEntry = await readJson(response);

            elements.form.reset();
            closeCreateForm();
            await createFormOptions.onCreated(createdWorkEntry);
            createFormOptions.onSuccess(createdWorkEntry);
        } catch (error) {
            setCreateMessage(error.message || "We couldn't create the work entry. Try again.", "error");
        } finally {
            isCreatingWorkEntry = false;

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonContent;
            }
        }
    }

    function getCreatePayload() {
        const formData = new FormData(elements.form);
        const organizationId = createFormOptions.getOrganizationId();

        return {
            organizationId: organizationId ? Number(organizationId) : null,
            jobName: getFormString(formData, "jobName"),
            jobAddress: getFormString(formData, "jobAddress"),
            workType: getFormString(formData, "workType"),
            workDate: getFormString(formData, "workDate"),
            description: getFormString(formData, "description")
        };
    }

    function getFormString(formData, fieldName) {
        return String(formData.get(fieldName) || "").trim();
    }

    function validateCreatePayload(payload) {
        if (!payload.organizationId || Number.isNaN(payload.organizationId)) {
            return "Select a workspace before creating work entries.";
        }

        if (payload.jobName.length < 2) {
            return "Job name must contain at least 2 characters.";
        }

        if (payload.jobAddress.length < 5) {
            return "Job address must contain at least 5 characters.";
        }

        if (payload.workType.length < 2) {
            return "Work type must contain at least 2 characters.";
        }

        if (!payload.workDate) {
            return "Work date is required.";
        }

        if (payload.description.length < 5) {
            return "Work performed summary must contain at least 5 characters.";
        }

        return "";
    }

    function setDefaultWorkDate() {
        if (!elements.form) {
            return;
        }

        const workDateInput = elements.form.querySelector('input[name="workDate"]');

        if (workDateInput && !workDateInput.value) {
            workDateInput.value = getTodayInputValue();
        }
    }

    function getTodayInputValue() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function setCreateMessage(message, type = "") {
        if (!elements.formMessage) {
            return;
        }

        elements.formMessage.textContent = message;
        elements.formMessage.className = "status-message";

        if (type) {
            elements.formMessage.classList.add(type);
        }
    }

    function extractErrorMessage(errorBody, status) {
        if (errorBody.message) {
            return errorBody.message;
        }

        if (errorBody.error) {
            return errorBody.error;
        }

        if (Array.isArray(errorBody.errors) && errorBody.errors.length > 0) {
            const firstError = errorBody.errors[0];

            if (typeof firstError === "string") {
                return firstError;
            }

            if (firstError.defaultMessage) {
                return firstError.defaultMessage;
            }
        }

        return `Request failed with status ${status}`;
    }

    function renderLoading() {
        updateCount(0);
        revokeReportPhotoObjectUrls();
        elements.reportView?.classList.add("hidden");

        if (elements.title) {
            elements.title.textContent = "Loading job documentation";
        }

        if (elements.emptyState) {
            elements.emptyState.classList.add("hidden");
        }

        if (!elements.list) {
            return;
        }

        elements.list.replaceChildren();

        for (let index = 0; index < 3; index++) {
            const row = document.createElement("div");
            row.className = "recent-work-entry-row work-entry-skeleton-row";
            row.innerHTML = `
                <span class="work-entry-thumbnail skeleton-block"></span>
                <span class="work-entry-row-main">
                    <span class="skeleton-line skeleton-title"></span>
                    <span class="skeleton-line"></span>
                    <span class="skeleton-line short"></span>
                </span>
                <span class="skeleton-pill"></span>
            `;

            elements.list.appendChild(row);
        }
    }

    function renderEntries(workEntries, currentUserName) {
        updateCount(workEntries.length);

        if (!elements.list || !elements.emptyState) {
            return;
        }

        elements.list.replaceChildren();

        if (workEntries.length === 0) {
            if (elements.title) {
                elements.title.textContent = "Job documentation will appear here";
            }

            elements.emptyState.classList.remove("hidden");
            setEmptyStateCopy(
                "No work entries yet",
                "Your documented jobs will appear here after the first work entry is created."
            );
            return;
        }

        if (elements.title) {
            elements.title.textContent = "Latest job documentation";
        }

        elements.emptyState.classList.add("hidden");

        getRecentEntries(workEntries).forEach((workEntry, index) => {
            elements.list.appendChild(createEntryRow(workEntry, index, currentUserName));
        });
    }

    function clear(message = "Your documented jobs will appear here after the first work entry is created.") {
        currentEntries = [];
        activeDetailWorkEntry = null;
        revokeReportPhotoObjectUrls();
        updateCount(0);
        elements.detailView?.classList.add("hidden");
        elements.reportView?.classList.add("hidden");
        elements.preview?.classList.remove("hidden");
        elements.hero?.classList.remove("hidden");
        elements.metrics?.classList.remove("hidden");

        if (elements.title) {
            elements.title.textContent = "Job documentation will appear here";
        }

        if (elements.list) {
            elements.list.replaceChildren();
        }

        if (elements.emptyState) {
            elements.emptyState.classList.remove("hidden");

            setEmptyStateCopy("No work entries yet", message);
        }

        return [];
    }

    function renderError(message) {
        revokeReportPhotoObjectUrls();
        elements.reportView?.classList.add("hidden");

        if (elements.title) {
            elements.title.textContent = "Work entries unavailable";
        }

        if (elements.list) {
            elements.list.replaceChildren();
        }

        if (elements.emptyState) {
            elements.emptyState.classList.remove("hidden");
            setEmptyStateCopy("We couldn't load work entries", message || "Refresh the dashboard and try again.");
        }
    }

    function updateCount(count) {
        if (elements.metricCount) {
            elements.metricCount.textContent = String(count);
        }

        if (elements.workspaceCount) {
            elements.workspaceCount.textContent = String(count);
        }
    }

    function setEmptyStateCopy(headingText, bodyText) {
        if (!elements.emptyState) {
            return;
        }

        const heading = elements.emptyState.querySelector("strong");
        const copy = elements.emptyState.querySelector("p");

        if (heading) {
            heading.textContent = headingText;
        }

        if (copy) {
            copy.textContent = bodyText;
        }
    }

    function getRecentEntries(workEntries) {
        return [...workEntries]
            .sort((first, second) => {
                return getSortableDate(second) - getSortableDate(first);
            })
            .slice(0, 3);
    }

    function getSortableDate(workEntry) {
        const date = parseDateValue(workEntry.createdAt || workEntry.workDate);
        return date ? date.getTime() : 0;
    }

    function createEntryRow(workEntry, index, currentUserName) {
        const row = document.createElement("article");
        row.className = "recent-work-entry-row";

        const statusLabel = formatStatus(workEntry.status);
        const statusClass = getStatusClass(workEntry.status);
        const jobName = workEntry.jobName || "Untitled work entry";
        const photoCount = Number(workEntry.photoCount || 0);
        const proofLabel = workEntry.proofReady
            ? "Proof ready"
            : photoCount > 0
                ? "Proof started"
                : "Needs photos";
        const proofClass = workEntry.proofReady
            ? "ready"
            : photoCount > 0
                ? "started"
                : "incomplete";

        row.innerHTML = `
            <span class="work-entry-thumbnail thumbnail-${(index % 3) + 1}" aria-hidden="true"></span>
            <span class="work-entry-row-main">
                <span class="work-entry-title-line">
                    <span class="work-entry-live-dot" aria-hidden="true"></span>
                    <strong>${escapeHtml(jobName)}</strong>
                </span>
                <span class="work-entry-address">${escapeHtml(workEntry.jobAddress || "No address added")}</span>
                <span class="work-entry-meta">${escapeHtml(formatEntryMeta(workEntry, currentUserName))}</span>
            </span>
            <span class="work-entry-status-pill ${statusClass}">${escapeHtml(statusLabel)}</span>
            <span class="work-entry-proof-chip ${proofClass}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z"/><path d="M12 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></svg>
                ${escapeHtml(proofLabel)} · ${photoCount} ${photoCount === 1 ? "photo" : "photos"}
            </span>
            <span class="work-entry-row-actions">
                <button class="work-entry-action-button" type="button" data-work-entry-action="open" data-work-entry-id="${escapeHtml(workEntry.id)}">Open</button>
                <button class="work-entry-action-button emphasis" type="button" data-work-entry-action="photos" data-work-entry-id="${escapeHtml(workEntry.id)}">Add photos</button>
            </span>
        `;

        return row;
    }

    function formatEntryMeta(workEntry, currentUserName) {
        const date = formatDate(workEntry.workDate || workEntry.createdAt);
        const time = formatTime(workEntry.createdAt);
        const author = formatAuthor(currentUserName);

        return `${date} • ${time} by ${author}`;
    }

    function formatFileSize(bytes) {
        const normalizedBytes = Number(bytes || 0);

        if (normalizedBytes < 1024) {
            return `${normalizedBytes} B`;
        }

        if (normalizedBytes < 1024 * 1024) {
            return `${(normalizedBytes / 1024).toFixed(1)} KB`;
        }

        return `${(normalizedBytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function formatDate(value) {
        const date = parseDateValue(value);

        if (!date) {
            return "Date not set";
        }

        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        }).format(date);
    }

    function formatTime(value) {
        const date = parseDateValue(value);

        if (!date) {
            return "Time not set";
        }

        return new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            minute: "2-digit"
        }).format(date);
    }

    function formatDateTime(value) {
        const date = parseDateValue(value);

        if (!date) {
            return "Date not set";
        }

        return `${formatDate(value)} at ${formatTime(value)}`;
    }

    function formatDisplayText(value) {
        const normalizedValue = String(value || "").trim();

        if (!normalizedValue || normalizedValue === "-") {
            return normalizedValue || "-";
        }

        return normalizedValue
            .split(/\s+/)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(" ");
    }

    function pluralize(count, singular, plural = `${singular}s`) {
        return `${count} ${count === 1 ? singular : plural}`;
    }

    function formatDescription(description) {
        const normalizedDescription = String(description || "").trim();

        if (!normalizedDescription) {
            return "No work performed summary added.";
        }

        const repeatedCharacterOnly = /^(.)\1{4,}$/i.test(normalizedDescription);

        if (repeatedCharacterOnly) {
            return "No meaningful work performed summary added yet.";
        }

        return normalizedDescription;
    }

    function parseDateValue(value) {
        if (!value) {
            return null;
        }

        const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
            ? `${value}T00:00:00`
            : value;
        const date = new Date(normalizedValue);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    function formatAuthor(name) {
        const parts = String(name || "User")
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        if (parts.length === 0) {
            return "User";
        }

        if (parts.length === 1) {
            return parts[0];
        }

        return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
    }

    function formatStatus(status) {
        if (status === "COMPLETED") {
            return "Completed";
        }

        if (status === "SUBMITTED") {
            return "Submitted";
        }

        if (status === "DRAFT") {
            return "In progress";
        }

        return titleCase(status || "Draft");
    }

    function getStatusClass(status) {
        if (status === "COMPLETED") {
            return "completed";
        }

        if (status === "SUBMITTED") {
            return "submitted";
        }

        return "draft";
    }

    function titleCase(value) {
        return String(value)
            .toLowerCase()
            .split("_")
            .filter(Boolean)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }

    async function readJson(response) {
        try {
            return await response.json();
        } catch (error) {
            return {};
        }
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    return {
        initCreateForm,
        loadForOrganization,
        clear
    };
})();

window.FieldProofWorkEntries = FieldProofWorkEntries;
