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
const organizationForm = document.querySelector("#organizationForm");
const organizationName = document.querySelector("#organizationName");
const organizationMessage = document.querySelector("#organizationMessage");
const organizationList = document.querySelector("#organizationList");

let currentUserId = null;
let currentOrganizations = [];

modeTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        setMode(tab.dataset.mode);
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

organizationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setOrganizationMessage("");

    try {
        const organization = await requestJson("/organizations", {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
                name: organizationName.value
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
        currentName.textContent = user.name || "-";
        currentEmail.textContent = user.email || "-";
        currentRole.textContent = user.role || "-";
        authView.classList.add("hidden");
        workspaceView.classList.remove("hidden");
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
        removeStaleSelectedOrganization(organizations);
        renderSelectedOrganization(organizations);
        renderOrganizations(organizations);
    } catch (error) {
        setOrganizationMessage(error.message, "error");
    }
}

function renderOrganizations(organizations) {
    organizationList.innerHTML = "";
    const selectedOrganizationId = getSelectedOrganizationId();

    if (organizations.length === 0) {
        const item = document.createElement("li");
        item.className = "organization-empty";
        item.textContent = "No organizations yet. Create one to start work entry setup.";
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
    organizationForm.reset();
    currentOrganizations = [];
    organizationList.innerHTML = "";
    renderSelectedOrganization([]);
    setOrganizationMessage("");
}

function renderSelectedOrganization(organizations) {
    const selectedOrganizationId = getSelectedOrganizationId();
    const selectedOrganization = organizations.find((organization) => {
        return String(organization.id) === selectedOrganizationId;
    });

    if (!selectedOrganization) {
        currentOrganizationName.textContent = "None selected";
        currentOrganizationHelp.textContent = "Select an organization before creating work entries.";
        return;
    }

    currentOrganizationName.textContent = selectedOrganization.name || "Unnamed organization";
    currentOrganizationHelp.textContent = [
        `Organization ID: ${selectedOrganization.id}`,
        `Role: ${selectedOrganization.role || "-"}`,
        `Membership: ${selectedOrganization.membershipStatus || "-"}`
    ].join(" - ");
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
    setMode("login");
}

function setMode(mode) {
    const isRegister = mode === "register";

    loginForm.classList.toggle("active", !isRegister);
    registerForm.classList.toggle("active", isRegister);

    modeTabs.forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.mode === mode);
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
    organizationMessage.textContent = message;
    organizationMessage.className = "status-message";

    if (type) {
        organizationMessage.classList.add(type);
    }
}

loadCurrentUser();
