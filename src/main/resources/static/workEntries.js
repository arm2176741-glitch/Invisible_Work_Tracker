const FieldProofWorkEntries = (() => {
    const elements = {
        metricCount: document.querySelector("#workEntryMetricCount"),
        workspaceCount: document.querySelector("#workspaceEntryCount"),
        title: document.querySelector("#recentWorkEntriesTitle"),
        list: document.querySelector("#recentWorkEntryList"),
        emptyState: document.querySelector("#emptyWorkEntryState")
    };

    let currentEntries = [];

    async function loadForOrganization({ organizationId, authHeaders, currentUserName }) {
        if (!organizationId) {
            clear("Select a workspace to see recent work entries.");
            return;
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
        } catch (error) {
            currentEntries = [];
            updateCount(0);
            renderError(error.message);
        }
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
            <span class="work-entry-photo-count">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z"/><path d="M12 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></svg>
                0 photos
            </span>
            <button class="work-entry-more-button" type="button" aria-label="More options for ${escapeHtml(jobName)}">&#8942;</button>
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
        loadForOrganization,
        clear
    };
})();

window.FieldProofWorkEntries = FieldProofWorkEntries;
