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
const currentOrganizationName = document.querySelector("#currentOrganizationName");
const currentOrganizationHelp = document.querySelector("#currentOrganizationHelp");
const organizationForms = document.querySelectorAll("[data-organization-form]");
const organizationMessages = document.querySelectorAll("[data-organization-message]");
const organizationLists = document.querySelectorAll("[data-organization-list]");
const organizationPanels = document.querySelectorAll("[data-organization-panel]");
const organizationCount = document.querySelector("#organizationCount");
const profileName = document.querySelector("#profileName");
const profileInitials = document.querySelector("#profileInitials");
const setupCurrentName = document.querySelector("#setupCurrentName");
const sidebarUserName = document.querySelector("#sidebarUserName");
const sidebarUserInitials = document.querySelector("#sidebarUserInitials");
const sidebarCurrentOrgCard = document.querySelector(".sidebar-current-org");
const sidebarOrganizationName = document.querySelector("#sidebarOrganizationName");
const sidebarOrganizationStatus = document.querySelector("#sidebarOrganizationStatus");
const sidebarOrganizationAction = document.querySelector("#sidebarOrganizationAction");
const authModeControls = document.querySelectorAll("[data-mode]");
const authAlternates = document.querySelectorAll(".auth-alternate");

let currentUserId = null;
let currentOrganizations = [];

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
        const name = String(formData.get("name") || "");

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
            setOrganizationMessage("Organization created and selected.", "success");
            await loadOrganizations();
        } catch (error) {
            setOrganizationMessage(error.message, "error");
        }
    });
});

if (sidebarOrganizationAction) {
    sidebarOrganizationAction.addEventListener("click", () => {
        focusOrganizationPanel();
    });
}

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
        const organizations = await requestJson("/organizations", {
            method: "GET",
            headers: authHeaders()
        });

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

    organizations.forEach((organization) => {
        const organizationId = String(organization.id);
        const isSelected = selectedOrganizationId === organizationId;
        const item = document.createElement("li");
        item.className = "organization-item";

        const button = document.createElement("button");
        button.className = "organization-select-button";
        button.type = "button";
        button.setAttribute("aria-pressed", String(isSelected));

        if (isSelected) {
            button.classList.add("selected");
        }

        const name = document.createElement("span");
        name.className = "organization-name";
        name.textContent = organization.name || "Unnamed organization";

        const details = document.createElement("span");
        details.className = "organization-details";
        details.textContent = [
            organization.role || "-",
            organization.membershipStatus || "-"
        ].join(" - ");

        const badge = document.createElement("span");
        badge.className = "organization-selected-badge";
        badge.textContent = isSelected ? "Selected" : "Select";

        button.append(name, details, badge);

        button.addEventListener("click", () => {
            setSelectedOrganizationId(organization.id);
            renderSelectedOrganization(currentOrganizations);
            renderOrganizations(currentOrganizations);
            setOrganizationMessage(`${organization.name || "Organization"} selected.`, "success");
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

    if (organizationInput) {
        organizationInput.focus({
            preventScroll: true
        });
    }

    window.setTimeout(() => {
        organizationPanel.classList.remove("is-highlighted");
    }, 1200);
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
    const displayRole = user.role || "-";
    const initials = getInitials(displayName);

    currentName.textContent = displayName;
    currentEmail.textContent = user.email || "-";
    currentRole.textContent = displayRole;

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

        if (sidebarCurrentOrgCard) {
            sidebarCurrentOrgCard.classList.remove("has-organization");
        }

        if (sidebarOrganizationName) {
            sidebarOrganizationName.textContent = "None selected";
        }

        if (sidebarOrganizationStatus) {
            sidebarOrganizationStatus.textContent = "Not selected";
        }

        if (sidebarOrganizationAction) {
            sidebarOrganizationAction.textContent = hasOrganizations ? "Select organization" : "Create organization";
        }

        return;
    }

    currentOrganizationName.textContent = selectedOrganization.name || "Unnamed organization";
    currentOrganizationHelp.textContent = [
        `Organization ID: ${selectedOrganization.id}`,
        `Role: ${selectedOrganization.role || "-"}`,
        `Membership: ${selectedOrganization.membershipStatus || "-"}`
    ].join(" - ");

    if (sidebarCurrentOrgCard) {
        sidebarCurrentOrgCard.classList.add("has-organization");
    }

    if (sidebarOrganizationName) {
        sidebarOrganizationName.textContent = selectedOrganization.name || "Unnamed organization";
    }

    if (sidebarOrganizationStatus) {
        sidebarOrganizationStatus.textContent = selectedOrganization.membershipStatus || "-";
    }

    if (sidebarOrganizationAction) {
        sidebarOrganizationAction.textContent = "Switch organization";
    }
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
