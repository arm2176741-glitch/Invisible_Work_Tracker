const FieldProofWorkEntries = (() => {
    const elements = {
        metricCount: document.querySelector("#workEntryMetricCount"),
        workspaceCount: document.querySelector("#workspaceEntryCount"),
        title: document.querySelector("#recentWorkEntriesTitle"),
        list: document.querySelector("#recentWorkEntryList"),
        emptyState: document.querySelector("#emptyWorkEntryState"),

        modal: document.querySelector("#workEntryModal"),
        form: document.querySelector("#workEntryForm"),
        formMessage: document.querySelector("#workEntryFormMessage"),
        workspaceName: document.querySelector("#workEntryWorkspaceName"),
        openButtons: document.querySelectorAll("[data-open-work-entry-modal]"),
        closeButtons: document.querySelectorAll("[data-close-work-entry-modal]")
    };

    let currentEntries = [];

    let createFormOptions = {
        getOrganizationId: () => null,
        getOrganizationName: () => "",
        authHeaders: () => ({}),
        getCurrentUserName: () => "User",
        onCreated: async () => {},
        onSuccess: () => {},
        onUnavailableAction: () => {},
        onMissingOrganization: () => {}
    };
    let createFormInitialized = false;
    let isCreatingWorkEntry = false;

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
            currentEntries = Array.isArray(workEntries) ? workEntries : [];
            renderEntries(currentEntries, currentUserName);
            return currentEntries;
        } catch (error) {
            currentEntries = [];
            updateCount(0);
            renderError(error.message);
            return [];
        }
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
    }

    function handleEntryAction(event) {
        const actionButton = event.target.closest("[data-work-entry-action]");

        if (!actionButton) {
            return;
        }

        const action = actionButton.dataset.workEntryAction;
        const message = action === "photos"
            ? "Photo uploads are the next FieldProof slice."
            : "Work-entry detail pages are coming in a later slice.";

        createFormOptions.onUnavailableAction(message);
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
            return "Description must contain at least 5 characters.";
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
        updateCount(0);

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
        const proofLabel = photoCount > 0 ? "Proof started" : "Needs photos";
        const proofClass = photoCount > 0 ? "started" : "incomplete";

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
                ${escapeHtml(proofLabel)} · ${photoCount} photos
            </span>
            <span class="work-entry-row-actions">
                <button class="work-entry-action-button" type="button" data-work-entry-action="open">Open</button>
                <button class="work-entry-action-button emphasis" type="button" data-work-entry-action="photos">Add photos</button>
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
        if (status === "SUBMITTED") {
            return "Submitted";
        }

        if (status === "DRAFT") {
            return "In progress";
        }

        return titleCase(status || "Draft");
    }

    function getStatusClass(status) {
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
