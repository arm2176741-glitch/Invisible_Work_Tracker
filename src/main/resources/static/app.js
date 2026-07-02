const tokenKey = "fieldproofToken";
const selectedOrganizationKeyPrefix = "fieldproofSelectedOrganizationId";

const authView = document.querySelector("#authView");
const workspaceView = document.querySelector("#workspaceView");
const authMessage = document.querySelector("#authMessage");
const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const logoutButton = document.querySelector("#logoutButton");
const modeTabs = document.querySelectorAll(".mode-tab");

const currentName = document.querySelector("#currentName");
const currentEmail = document.querySelector("#currentEmail");
const currentRole = document.querySelector("#currentRole");
const dashboardSubtitle = document.querySelector("#dashboardSubtitle");
const currentOrganizationName = document.querySelector("#currentOrganizationName");
const currentOrganizationHelp = document.querySelector("#currentOrganizationHelp");
const workspaceCardName = document.querySelector("#workspaceCardName");
const workspaceRoleBadge = document.querySelector("#workspaceRoleBadge");
const workspaceStatusBadge = document.querySelector("#workspaceStatusBadge");
const workspaceMemberCount = document.querySelector("#workspaceMemberCount");
const workspaceEntryCount = document.querySelector("#workspaceEntryCount");
const workspaceReportCount = document.querySelector("#workspaceReportCount");
const workspaceCreatedMeta = document.querySelector("#workspaceCreatedMeta");
const workspaceIdMeta = document.querySelector("#workspaceIdMeta");
const organizationForms = document.querySelectorAll("[data-organization-form]");
const organizationMessages = document.querySelectorAll("[data-organization-message]");
const organizationLists = document.querySelectorAll("[data-organization-list]");
const organizationPanels = document.querySelectorAll("[data-organization-panel]");
const organizationFocusControls = document.querySelectorAll("[data-focus-organization-list]");
const workspaceCreateToggle = document.querySelector("#workspaceCreateToggle");
const workspaceCreateForm = document.querySelector("#createWorkspaceForm");
const workspaceToast = document.querySelector("#workspaceToast");
const organizationCount = document.querySelector("#organizationCount");
const profileName = document.querySelector("#profileName");
const profileInitials = document.querySelector("#profileInitials");
const setupCurrentName = document.querySelector("#setupCurrentName");
const sidebarUserName = document.querySelector("#sidebarUserName");
const sidebarUserInitials = document.querySelector("#sidebarUserInitials");
const sidebarCurrentOrgCard = document.querySelector(".sidebar-account-card");
const sidebarOrganizationName = document.querySelector("#sidebarOrganizationName");
const sidebarOrganizationStatus = document.querySelector("#sidebarOrganizationStatus");
const sidebarOrganizationAction = document.querySelector("#sidebarOrganizationAction");
const headerOrganizationAction = document.querySelector("#headerOrganizationAction");
const authModeControls = document.querySelectorAll("[data-mode]");
const authAlternates = document.querySelectorAll(".auth-alternate");

let currentUserId = null;
let currentOrganizations = [];
let workspaceToastTimer = null;

authModeControls.forEach((control) => {
    control.addEventListener("click", () => {
        setMode(control.dataset.mode);
    });
});

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage("");

    const payload = {
        email: loginForm.email.value,
        password: loginForm.password.value
    };

    try {
        const data = await requestJson("/auth/login", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        sessionStorage.setItem(tokenKey, data.token);
        await loadCurrentUser();
    } catch (error) {
        setMessage(error.message, "error");
    }
});

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage("");

    const payload = {
        name: registerForm.name.value,
        email: registerForm.email.value,
        password: registerForm.password.value
    };

    try {
        await requestJson("/auth/register", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        registerForm.reset();
        setMode("login");
        setMessage("Account created. Sign in to continue.", "success");
    } catch (error) {
        setMessage(error.message, "error");
    }
});

logoutButton.addEventListener("click", async () => {
    const token = sessionStorage.getItem(tokenKey);

    if (token) {
        try {
            await fetch("/auth/logout", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
        } catch (error) {
            // The local token should be cleared even if the network request fails.
        }
    }

    sessionStorage.removeItem(tokenKey);
    currentUserId = null;
    clearOrganizations();
    showAuth();
});

organizationForms.forEach((organizationForm) => {
    organizationForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        setOrganizationMessage("");

        const formData = new FormData(organizationForm);
        const name = String(formData.get("name") || "").trim();
        const submitButton = organizationForm.querySelector('button[type="submit"]');
        const originalButtonContent = submitButton ? submitButton.innerHTML : "";

        if (name.length < 2) {
            setOrganizationMessage("Workspace name must contain at least 2 characters.", "error");
            return;
        }

        if (name.length > 100) {
            setOrganizationMessage("Workspace name cannot exceed 100 characters.", "error");
            return;
        }

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Creating...";
        }

        try {
            const organization = await requestJson("/organizations", {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({
                    name
                })
            });

            setSelectedOrganizationId(organization.id);
            organizationForm.reset();
            collapseWorkspaceCreateForm();
            showWorkspaceToast("Workspace created and selected.");
            await loadOrganizations();
        } catch (error) {
            setOrganizationMessage(error.message, "error");
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonContent;
            }
        }
    });
});

if (workspaceCreateToggle && workspaceCreateForm) {
    workspaceCreateToggle.addEventListener("click", () => {
        const expanded = workspaceCreateToggle.getAttribute("aria-expanded") === "true";
        setWorkspaceCreateExpanded(!expanded);
    });
}

if (sidebarOrganizationAction) {
    sidebarOrganizationAction.addEventListener("click", () => {
        focusOrganizationPanel();
    });
}

if (headerOrganizationAction) {
    headerOrganizationAction.addEventListener("click", () => {
        focusOrganizationPanel();
    });
}

organizationFocusControls.forEach((control) => {
    control.addEventListener("click", () => {
        focusOrganizationPanel();
    });
});

async function requestJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    if (!response.ok) {
        const errorBody = await readJson(response);
        throw new Error(errorBody.message || `Request failed with status ${response.status}`);
    }

    if (response.status === 204) {
        return {};
    }

    return readJson(response);
}

function authHeaders() {
    const token = sessionStorage.getItem(tokenKey);

    return {
        Authorization: `Bearer ${token}`
    };
}

async function readJson(response) {
    try {
        return await response.json();
    } catch (error) {
        return {};
    }
}

async function loadCurrentUser() {
    const token = sessionStorage.getItem(tokenKey);

    if (!token) {
        showAuth();
        return;
    }

    try {
        const user = await requestJson("/auth/me", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        currentUserId = user.id;
        renderCurrentUser(user);
        authView.classList.add("hidden");
        workspaceView.classList.remove("hidden");
        document.body.classList.add("workspace-active");
        await loadOrganizations();
    } catch (error) {
        sessionStorage.removeItem(tokenKey);
        currentUserId = null;
        clearOrganizations();
        showAuth();
        setMessage("Session expired. Sign in again.", "error");
    }
}

async function loadOrganizations() {
    try {
        const organizationsResponse = await requestJson("/organizations", {
            method: "GET",
            headers: authHeaders()
        });
        const organizations = dedupeOrganizationsById(organizationsResponse);

        currentOrganizations = organizations;

        if (organizationCount) {
            organizationCount.textContent = organizations.length;
        }

        renderWorkspaceState(organizations);
        removeStaleSelectedOrganization(organizations);
        renderSelectedOrganization(organizations);
        renderOrganizations(organizations);
    } catch (error) {
        setOrganizationMessage(error.message, "error");
    }
}

function dedupeOrganizationsById(organizations) {
    const organizationMap = new Map();

    organizations.forEach((organization) => {
        if (organization && organization.id !== null && organization.id !== undefined) {
            organizationMap.set(String(organization.id), organization);
        }
    });

    return Array.from(organizationMap.values());
}

function renderOrganizations(organizations) {
    organizationLists.forEach((organizationList) => {
        renderOrganizationList(organizationList, organizations);
    });
}

function renderOrganizationList(organizationList, organizations) {
    organizationList.innerHTML = "";
    const selectedOrganizationId = getSelectedOrganizationId();

    if (organizations.length === 0) {
        const item = document.createElement("li");
        item.className = "organization-empty";
        item.textContent = "No organization yet. Create your company workspace so crews, jobs, photos, and reports have a home.";
        organizationList.appendChild(item);
        return;
    }

    if (selectedOrganizationId && organizations.every((organization) => String(organization.id) === selectedOrganizationId)) {
        const item = document.createElement("li");
        item.className = "organization-empty";
        item.textContent = "No other workspaces yet.";
        organizationList.appendChild(item);
        return;
    }

    organizations.forEach((organization) => {
        const organizationId = String(organization.id);
        const isSelected = selectedOrganizationId === organizationId;

        if (isSelected) {
            return;
        }

        const item = document.createElement("li");
        item.className = "organization-item";

        const button = document.createElement("button");
        button.className = "organization-select-button";
        button.type = "button";
        button.setAttribute("aria-label", `Select ${organization.name || "workspace"}`);

        if (isSelected) {
            button.classList.add("selected");
        }

        const icon = document.createElement("span");
        icon.className = "organization-row-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.innerHTML = isSelected
            ? '<svg viewBox="0 0 24 24"><path d="m7 12 3 3 7-7"/><circle cx="12" cy="12" r="9"/></svg>'
            : '<svg viewBox="0 0 24 24"><path d="M4 21V7h7v14"/><path d="M13 21V3h7v18"/><path d="M7 11h1"/><path d="M7 15h1"/><path d="M16 7h1"/><path d="M16 11h1"/><path d="M16 15h1"/></svg>';

        const copy = document.createElement("span");
        copy.className = "organization-row-copy";

        const name = document.createElement("span");
        name.className = "organization-name";
        name.textContent = organization.name || "Unnamed organization";

        const badgeRow = document.createElement("span");
        badgeRow.className = "organization-badge-row";

        const roleBadge = document.createElement("span");
        roleBadge.className = "organization-mini-badge role-badge";
        roleBadge.textContent = organization.role || "-";

        const statusBadge = document.createElement("span");
        statusBadge.className = "organization-mini-badge status-badge";
        statusBadge.textContent = organization.membershipStatus || "-";

        badgeRow.append(roleBadge, statusBadge);
        copy.append(name, badgeRow);

        const badge = document.createElement("span");
        badge.className = "organization-selected-badge";
        badge.textContent = "Select";

        if (isSelected) {
            const menu = document.createElement("span");
            menu.className = "organization-more";
            menu.setAttribute("aria-hidden", "true");
            menu.textContent = "⋮";
            button.append(icon, copy, menu);
        } else {
            button.append(icon, copy, badge);
        }

        button.addEventListener("click", () => {
            setSelectedOrganizationId(organization.id);
            renderSelectedOrganization(currentOrganizations);
            renderOrganizations(currentOrganizations);
            showWorkspaceToast(`Workspace switched to ${organization.name || "selected workspace"}.`);
        });

        item.appendChild(button);
        organizationList.appendChild(item);
    });
}

function clearOrganizations() {
    organizationForms.forEach((organizationForm) => {
        organizationForm.reset();
    });
    currentOrganizations = [];
    organizationLists.forEach((organizationList) => {
        organizationList.innerHTML = "";
    });

    if (organizationCount) {
        organizationCount.textContent = "0";
    }

    renderSelectedOrganization([]);
    clearWorkspaceState();
    setOrganizationMessage("");
}

function focusOrganizationPanel() {
    const organizationPanel = Array.from(organizationPanels).find((panel) => {
        return panel.offsetParent !== null;
    });

    if (!organizationPanel) {
        return;
    }

    organizationPanel.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
    organizationPanel.classList.add("is-highlighted");

    const organizationInput = organizationPanel.querySelector('input[name="name"]');

    if (organizationInput && !organizationInput.closest("[hidden]")) {
        organizationInput.focus({
            preventScroll: true
        });
    } else {
        const organizationButton = organizationPanel.querySelector(".organization-select-button");

        if (organizationButton) {
            organizationButton.focus({
                preventScroll: true
            });
        }
    }

    window.setTimeout(() => {
        organizationPanel.classList.remove("is-highlighted");
    }, 1200);
}

function setWorkspaceCreateExpanded(expanded) {
    if (!workspaceCreateToggle || !workspaceCreateForm) {
        return;
    }

    workspaceCreateToggle.setAttribute("aria-expanded", String(expanded));
    workspaceCreateForm.hidden = !expanded;

    if (expanded) {
        const input = workspaceCreateForm.querySelector('input[name="name"]');

        if (input) {
            input.focus({
                preventScroll: true
            });
        }
    }
}

function collapseWorkspaceCreateForm() {
    setWorkspaceCreateExpanded(false);
}

function showWorkspaceToast(message) {
    if (!workspaceToast) {
        return;
    }

    workspaceToast.textContent = message;
    workspaceToast.hidden = false;
    workspaceToast.classList.add("is-visible");

    if (workspaceToastTimer) {
        window.clearTimeout(workspaceToastTimer);
    }

    workspaceToastTimer = window.setTimeout(() => {
        workspaceToast.classList.remove("is-visible");
        workspaceToast.hidden = true;
        workspaceToast.textContent = "";
    }, 3000);
}

function renderWorkspaceState(organizations) {
    const hasOrganizations = organizations.length > 0;

    workspaceView.classList.toggle("setup-state", !hasOrganizations);
    workspaceView.classList.toggle("dashboard-state", hasOrganizations);
}

function clearWorkspaceState() {
    workspaceView.classList.remove("setup-state", "dashboard-state");
}

function renderCurrentUser(user) {
    const displayName = user.name || "User";
    const firstName = getFirstName(displayName);
    const displayRole = user.role || "-";
    const initials = getInitials(displayName);

    if (currentName) {
        currentName.textContent = firstName;
    }

    if (currentEmail) {
        currentEmail.textContent = user.email || "-";
    }

    if (currentRole) {
        currentRole.textContent = displayRole;
    }

    if (profileName) {
        profileName.textContent = displayName;
    }

    if (profileInitials) {
        profileInitials.textContent = initials;
    }

    if (setupCurrentName) {
        setupCurrentName.textContent = displayName;
    }

    if (sidebarUserName) {
        sidebarUserName.textContent = displayName;
    }

    if (sidebarUserInitials) {
        sidebarUserInitials.textContent = initials;
    }
}

function getInitials(name) {
    return name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("") || "FP";
}

function getFirstName(name) {
    return name
        .trim()
        .split(/\s+/)
        .filter(Boolean)[0] || "there";
}

function renderSelectedOrganization(organizations) {
    const selectedOrganizationId = getSelectedOrganizationId();
    const selectedOrganization = organizations.find((organization) => {
        return String(organization.id) === selectedOrganizationId;
    });

    if (!selectedOrganization) {
        const hasOrganizations = organizations.length > 0;

        currentOrganizationName.textContent = hasOrganizations ? "No organization selected" : "No organization selected yet";
        currentOrganizationHelp.textContent = hasOrganizations
            ? "Select a company workspace before creating work entries."
            : "Create your first company workspace to start documenting jobs, crews, and proof-of-work reports.";

        if (dashboardSubtitle) {
            dashboardSubtitle.textContent = hasOrganizations
                ? "Select a company workspace to see job activity, crews, and reports."
                : "Create your first company workspace to start documenting jobs.";
        }

        renderWorkspaceCard(null);

        if (sidebarCurrentOrgCard) {
            sidebarCurrentOrgCard.classList.remove("has-organization");
        }

        if (sidebarOrganizationName) {
            sidebarOrganizationName.textContent = "None selected";
        }

        if (sidebarOrganizationStatus) {
            sidebarOrganizationStatus.textContent = hasOrganizations ? "Select workspace" : "Setup";
        }

        if (sidebarOrganizationAction) {
            sidebarOrganizationAction.setAttribute("aria-label", hasOrganizations ? "Select organization" : "Create organization");
        }

        if (headerOrganizationAction) {
            headerOrganizationAction.setAttribute("aria-label", hasOrganizations ? "Select organization" : "Create organization");
        }

        return;
    }

    const selectedOrganizationName = selectedOrganization.name || "Unnamed organization";

    currentOrganizationName.textContent = selectedOrganizationName;
    currentOrganizationHelp.textContent = [
        `Selected workspace`,
        `${selectedOrganization.role || "-"} access`,
        `${selectedOrganization.membershipStatus || "-"} membership`
    ].join(" - ");

    if (dashboardSubtitle) {
        dashboardSubtitle.textContent = `Here's what's happening with ${selectedOrganizationName} today.`;
    }

    renderWorkspaceCard(selectedOrganization);

    if (sidebarCurrentOrgCard) {
        sidebarCurrentOrgCard.classList.add("has-organization");
    }

    if (sidebarOrganizationName) {
        sidebarOrganizationName.textContent = selectedOrganizationName;
    }

    if (sidebarOrganizationStatus) {
        sidebarOrganizationStatus.textContent = formatMembershipRole(selectedOrganization.role);
    }

    if (sidebarOrganizationAction) {
        sidebarOrganizationAction.setAttribute("aria-label", "Switch organization");
    }

    if (headerOrganizationAction) {
        headerOrganizationAction.setAttribute("aria-label", "Switch organization");
    }
}

function renderWorkspaceCard(organization) {
    if (!workspaceCardName) {
        return;
    }

    if (!organization) {
        workspaceCardName.textContent = "No workspace selected";
        setOptionalText(workspaceRoleBadge, "Owner");
        setOptionalText(workspaceStatusBadge, "Active");
        setOptionalText(workspaceMemberCount, "0");
        setOptionalText(workspaceEntryCount, "0");
        setOptionalText(workspaceReportCount, "0");
        setOptionalText(workspaceCreatedMeta, "Created date not available yet");
        setOptionalText(workspaceIdMeta, "-");
        return;
    }

    workspaceCardName.textContent = organization.name || "Unnamed organization";
    setOptionalText(workspaceRoleBadge, organization.role || "Member");
    setOptionalText(workspaceStatusBadge, organization.membershipStatus || "Active");
    setOptionalText(workspaceMemberCount, "1");
    setOptionalText(workspaceEntryCount, "0");
    setOptionalText(workspaceReportCount, "0");
    setOptionalText(workspaceCreatedMeta, formatCreatedDate(organization.createdAt));
    setOptionalText(workspaceIdMeta, organization.id || "-");
}

function setOptionalText(element, text) {
    if (element) {
        element.textContent = text;
    }
}

function formatCreatedDate(createdAt) {
    if (!createdAt) {
        return "Created date not available yet";
    }

    const createdDate = new Date(createdAt);

    if (Number.isNaN(createdDate.getTime())) {
        return "Created date not available yet";
    }

    return `Created ${createdDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
    })}`;
}

function formatMembershipRole(role) {
    if (!role) {
        return "Member";
    }

    const normalizedRole = String(role).trim().toUpperCase();

    if (normalizedRole === "OWNER") {
        return "Admin";
    }

    return normalizedRole
        .toLowerCase()
        .replace(/(^|_)([a-z])/g, (_, separator, letter) => {
            return `${separator ? " " : ""}${letter.toUpperCase()}`;
        });
}

function selectedOrganizationStorageKey() {
    if (!currentUserId) {
        return null;
    }

    return `${selectedOrganizationKeyPrefix}:${currentUserId}`;
}

function getSelectedOrganizationId() {
    const storageKey = selectedOrganizationStorageKey();

    if (!storageKey) {
        return null;
    }

    return localStorage.getItem(storageKey);
}

function setSelectedOrganizationId(organizationId) {
    const storageKey = selectedOrganizationStorageKey();

    if (!storageKey || organizationId === null || organizationId === undefined) {
        return;
    }

    localStorage.setItem(storageKey, String(organizationId));
}

function removeSelectedOrganizationId() {
    const storageKey = selectedOrganizationStorageKey();

    if (!storageKey) {
        return;
    }

    localStorage.removeItem(storageKey);
}

function removeStaleSelectedOrganization(organizations) {
    const selectedOrganizationId = getSelectedOrganizationId();

    if (!selectedOrganizationId) {
        return;
    }

    const selectedOrganizationExists = organizations.some((organization) => {
        return String(organization.id) === selectedOrganizationId;
    });

    if (!selectedOrganizationExists) {
        removeSelectedOrganizationId();
    }
}

function showAuth() {
    workspaceView.classList.add("hidden");
    authView.classList.remove("hidden");
    document.body.classList.remove("workspace-active");
    clearWorkspaceState();
    setMode("login");
}

function setMode(mode) {
    const isRegister = mode === "register";

    loginForm.classList.toggle("active", !isRegister);
    registerForm.classList.toggle("active", isRegister);

    modeTabs.forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.mode === mode);
    });

    authAlternates.forEach((alternate) => {
        alternate.classList.toggle("hidden", alternate.dataset.visibleMode !== mode);
    });

    setMessage("");
}

function setMessage(message, type = "") {
    authMessage.textContent = message;
    authMessage.className = "status-message";

    if (type) {
        authMessage.classList.add(type);
    }
}

function setOrganizationMessage(message, type = "") {
    organizationMessages.forEach((organizationMessage) => {
        organizationMessage.textContent = message;
        organizationMessage.className = "status-message";

        if (type) {
            organizationMessage.classList.add(type);
        }
    });
}

loadCurrentUser();
