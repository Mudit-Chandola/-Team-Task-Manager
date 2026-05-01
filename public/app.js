const apiBase = "/api";
let token = localStorage.getItem("token");
let currentProjectId = "";
let projectsCache = [];
let currentUserId = "";
let currentUserName = localStorage.getItem("userName") || "";

const messageEl = document.getElementById("message");
const messageAppEl = document.getElementById("messageApp");
const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");
const nameFieldWrap = document.getElementById("nameFieldWrap");
const authActionsLogin = document.getElementById("authActionsLogin");
const authActionsSignup = document.getElementById("authActionsSignup");
const nameInput = document.getElementById("name");
const passwordInput = document.getElementById("password");
const dashboardUserNameEl = document.getElementById("dashboardUserName");
const projectSelect = document.getElementById("projectSelect");
const dashboardCounters = document.getElementById("dashboardCounters");
const tasksList = document.getElementById("tasksList");
const projectMembersList = document.getElementById("projectMembersList");
const taskAssignedToSelect = document.getElementById("taskAssignedTo");
const taskForm = document.getElementById("taskForm");
const memberEmailInput = document.getElementById("memberEmail");
const memberInlineMessage = document.getElementById("memberInlineError");

function hideMemberInlineError() {
  memberInlineMessage.classList.add("hidden");
  memberInlineMessage.classList.remove("inline-error", "inline-success");
  memberInlineMessage.textContent = "Member not found";
}

function showMemberInlineError(text) {
  memberInlineMessage.textContent = text;
  memberInlineMessage.classList.remove("hidden", "inline-success");
  memberInlineMessage.classList.add("inline-error");
}

function showMemberInlineSuccess(text) {
  memberInlineMessage.textContent = text;
  memberInlineMessage.classList.remove("hidden", "inline-error");
  memberInlineMessage.classList.add("inline-success");
}

function showMessage(text, isError = false) {
  const color = isError ? "#b91c1c" : "#065f46";
  if (messageEl) {
    messageEl.textContent = text;
    messageEl.style.color = color;
  }
  if (messageAppEl) {
    messageAppEl.textContent = text;
    messageAppEl.style.color = color;
  }
}

function getTokenPayload(jwtToken) {
  if (!jwtToken) {
    return { id: "", name: "", email: "" };
  }
  try {
    const payloadPart = jwtToken.split(".")[1];
    const payload = JSON.parse(atob(payloadPart));
    return {
      id: payload.id || "",
      name: payload.name || "",
      email: payload.email || ""
    };
  } catch (_err) {
    return { id: "", name: "", email: "" };
  }
}

function syncAuthFromToken() {
  const payload = getTokenPayload(token);
  currentUserId = payload.id;
  const label = currentUserName || payload.name || payload.email || "";
  if (dashboardUserNameEl) {
    dashboardUserNameEl.textContent = label;
  }
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${apiBase}${path}`, { ...options, headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

function toggleSections(isLoggedIn) {
  authSection.classList.toggle("hidden", isLoggedIn);
  appSection.classList.toggle("hidden", !isLoggedIn);
  if (messageEl) {
    messageEl.classList.toggle("hidden", isLoggedIn);
  }
  if (messageAppEl) {
    messageAppEl.classList.toggle("hidden", !isLoggedIn);
  }
}

function setAuthMode(mode) {
  const isSignup = mode === "signup";
  if (nameFieldWrap) {
    nameFieldWrap.classList.toggle("hidden", !isSignup);
  }
  if (authActionsLogin) {
    authActionsLogin.classList.toggle("hidden", isSignup);
  }
  if (authActionsSignup) {
    authActionsSignup.classList.toggle("hidden", !isSignup);
  }
  if (nameInput) {
    nameInput.required = isSignup;
  }
  if (passwordInput) {
    passwordInput.autocomplete = isSignup ? "new-password" : "current-password";
  }
  document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
    const active = tab.getAttribute("data-auth-tab") === mode;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
}

async function signup() {
  try {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const data = await api("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password })
    });
    token = data.token;
    localStorage.setItem("token", token);
    currentUserName = data.user?.name || currentUserName;
    localStorage.setItem("userName", currentUserName);
    syncAuthFromToken();
    showMessage("Signup successful");
    await initApp();
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function login() {
  try {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    token = data.token;
    localStorage.setItem("token", token);
    currentUserName = data.user?.name || currentUserName;
    localStorage.setItem("userName", currentUserName);
    syncAuthFromToken();
    showMessage("Login successful");
    await initApp();
  } catch (error) {
    showMessage(error.message, true);
  }
}

function getActiveProjects() {
  return projectsCache.filter((project) => project.status !== "completed");
}

function getCompletedProjects() {
  return projectsCache.filter((project) => project.status === "completed");
}

function isUserAdminOfProject(project) {
  const membership = project.members?.find((member) => member.user?._id === currentUserId);
  return membership?.role === "Admin";
}

function renderActiveProjectsList() {
  const container = document.getElementById("activeProjectsList");
  if (!container) {
    return;
  }
  const active = getActiveProjects();
  if (!active.length) {
    container.innerHTML = '<p class="empty-hint">No active projects. Create one on the left.</p>';
    return;
  }
  container.innerHTML = active
    .map((project) => {
      const isAdmin = isUserAdminOfProject(project);
      const actionMarkup = isAdmin
        ? `<button type="button" class="btn btn-outline btn-complete-project" data-project-id="${escapeHtml(project._id)}">Complete</button>`
        : '<span class="project-row-note">Only a project admin can complete</span>';
      return `
        <div class="project-row">
          <div class="project-row-info">
            <span class="project-row-name">${escapeHtml(project.name)}</span>
            <span class="project-row-meta">${project.members?.length || 0} members</span>
          </div>
          <div class="project-row-actions">${actionMarkup}</div>
        </div>
      `;
    })
    .join("");
}

function renderCompletedProjectsList() {
  const container = document.getElementById("completedProjectsList");
  if (!container) {
    return;
  }
  const completed = getCompletedProjects().sort((a, b) => {
    const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return tb - ta;
  });
  if (!completed.length) {
    container.innerHTML = '<p class="empty-hint">No completed projects yet.</p>';
    return;
  }
  container.innerHTML = completed
    .map((project) => {
      const when = project.completedAt
        ? new Date(project.completedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric"
          })
        : "—";
      return `
        <div class="project-row project-row--completed">
          <div class="project-row-info">
            <span class="project-row-name">${escapeHtml(project.name)}</span>
            <span class="project-row-meta">Completed ${escapeHtml(when)} · ${project.members?.length || 0} members</span>
          </div>
        </div>
      `;
    })
    .join("");
}

async function loadProjects() {
  const previousProjectId = currentProjectId;
  const projects = await api("/projects");
  projectsCache = projects;
  const active = projects.filter((project) => project.status !== "completed");

  projectSelect.innerHTML = "";
  if (!active.length) {
    projectSelect.innerHTML = "<option value=''>No active projects</option>";
    currentProjectId = "";
    renderActiveProjectsList();
    renderCompletedProjectsList();
    renderSelectedProjectMembers();
    populateAssigneeDropdown();
    syncTaskCreationAccess();
    return;
  }

  active.forEach((project) => {
    const option = document.createElement("option");
    option.value = project._id;
    option.textContent = `${project.name} (${project.members.length} members)`;
    projectSelect.appendChild(option);
  });

  const hasPrevious = active.some((project) => project._id === previousProjectId);
  currentProjectId = hasPrevious ? previousProjectId : active[0]._id;
  projectSelect.value = currentProjectId;

  renderActiveProjectsList();
  renderCompletedProjectsList();
  renderSelectedProjectMembers();
  populateAssigneeDropdown();
  syncTaskCreationAccess();
}

async function completeProjectById(projectId) {
  if (
    !confirm(
      "Mark this project as completed? It will move to Completed projects and leave the active list. Members can no longer add tasks or members."
    )
  ) {
    return;
  }
  try {
    await api(`/projects/${projectId}/complete`, { method: "PATCH" });
    showMessage("Project marked as completed");
    await loadProjects();
    await loadDashboard();
    await loadTasks();
  } catch (error) {
    showMessage(error.message, true);
  }
}

function getSelectedProject() {
  return projectsCache.find((project) => project._id === currentProjectId);
}

function getCurrentProjectRole() {
  const selectedProject = getSelectedProject();
  if (!selectedProject || !selectedProject.members) {
    return "";
  }
  const myMembership = selectedProject.members.find((member) => member.user?._id === currentUserId);
  return myMembership?.role || "";
}

function escapeHtml(text) {
  if (text === null || text === undefined) {
    return "";
  }
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
}

function renderSelectedProjectMembers() {
  const selectedProject = getSelectedProject();
  if (!selectedProject) {
    projectMembersList.innerHTML = '<p class="empty-hint">Select a project to view members.</p>';
    return;
  }

  if (!selectedProject.members || !selectedProject.members.length) {
    projectMembersList.innerHTML = '<p class="empty-hint">No members in this project yet.</p>';
    return;
  }

  projectMembersList.innerHTML = selectedProject.members
    .map((member) => {
      const user = member.user || {};
      const name = user.name || "Unknown User";
      const initial = name.trim().charAt(0).toUpperCase() || "?";
      const roleClass = member.role === "Admin" ? "role-pill role-pill--admin" : "role-pill";
      return `
        <div class="member-card">
          <div class="member-avatar" aria-hidden="true">${escapeHtml(initial)}</div>
          <div class="member-body">
            <div class="member-top">
              <strong class="member-name">${escapeHtml(name)}</strong>
              <span class="${roleClass}">${escapeHtml(member.role)}</span>
            </div>
            <p class="member-meta"><span class="member-meta-label">User ID</span> ${escapeHtml(user._id || "N/A")}</p>
          </div>
        </div>
      `;
    })
    .join("");
}

function populateAssigneeDropdown() {
  const selectedProject = getSelectedProject();
  taskAssignedToSelect.innerHTML = "<option value=''>Select assignee</option>";

  if (!selectedProject || !selectedProject.members) {
    return;
  }

  selectedProject.members.forEach((member) => {
    const user = member.user || {};
    if (!user._id) {
      return;
    }
    const option = document.createElement("option");
    option.value = user._id;
    option.textContent = `${user.name || "Unknown"} (${user._id})`;
    taskAssignedToSelect.appendChild(option);
  });
}

function syncTaskCreationAccess() {
  const isAdmin = getCurrentProjectRole() === "Admin";
  Array.from(taskForm.elements).forEach((element) => {
    element.disabled = !isAdmin;
  });
}

function getStatusControl(task) {
  const projectRole = getCurrentProjectRole();
  const isAdmin = projectRole === "Admin";
  const isAssignee = task.assignedTo?._id === currentUserId;

  if (isAdmin) {
    if (task.status === "Done") {
      return { canUpdate: true, options: ["Done", "Completed", "In Progress"] };
    }
    return { canUpdate: false, options: [task.status] };
  }

  if (isAssignee) {
    if (task.status === "Todo") {
      return { canUpdate: true, options: ["Todo", "In Progress"] };
    }
    if (task.status === "In Progress") {
      return { canUpdate: true, options: ["In Progress", "Done"] };
    }
  }

  return { canUpdate: false, options: [task.status] };
}

const STAT_META = {
  all: { label: "All tasks", mod: "stat-tile--all" },
  todo: { label: "Todo", mod: "stat-tile--todo" },
  inProgress: { label: "In progress", mod: "stat-tile--progress" },
  done: { label: "Awaiting review", mod: "stat-tile--review" },
  completed: { label: "Completed", mod: "stat-tile--completed" },
  overdue: { label: "Overdue", mod: "stat-tile--overdue" }
};

async function loadDashboard() {
  const data = await api("/dashboard");
  dashboardCounters.innerHTML = "";
  Object.entries(data.counters).forEach(([key, value]) => {
    const meta = STAT_META[key] || { label: key, mod: "stat-tile--neutral" };
    const div = document.createElement("div");
    div.className = `stat-tile ${meta.mod}`;
    div.innerHTML = `
      <span class="stat-value">${escapeHtml(String(value))}</span>
      <span class="stat-label">${escapeHtml(meta.label)}</span>
    `;
    dashboardCounters.appendChild(div);
  });
}

function statusBadgeClass(status) {
  const map = {
    Todo: "status-badge--todo",
    "In Progress": "status-badge--progress",
    Done: "status-badge--done",
    Completed: "status-badge--completed"
  };
  return map[status] || "status-badge--neutral";
}

function priorityClass(priority) {
  const map = { Low: "priority--low", Medium: "priority--med", High: "priority--high" };
  return map[priority] || "priority--med";
}

async function loadTasks() {
  if (!currentProjectId) {
    tasksList.innerHTML = '<p class="empty-hint">Select a project to see tasks.</p>';
    return;
  }
  const tasks = await api(`/tasks?projectId=${currentProjectId}`);
  if (!tasks.length) {
    tasksList.innerHTML = '<p class="empty-hint">No tasks yet. Create one above (admins only).</p>';
    return;
  }
  tasksList.innerHTML = tasks
    .map((task) => {
      const statusControl = getStatusControl(task);
      const statusOptions = statusControl.options
        .map(
          (option) =>
            `<option value="${escapeHtml(option)}" ${task.status === option ? "selected" : ""}>${escapeHtml(option)}</option>`
        )
        .join("");
      const due = new Date(task.dueDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
      const badgeClass = statusBadgeClass(task.status);
      const priClass = priorityClass(task.priority);
      return `
      <article class="task-card">
        <div class="task-card-main">
          <h3 class="task-title">${escapeHtml(task.title)}</h3>
          <div class="task-meta">
            <span class="status-badge ${badgeClass}">${escapeHtml(task.status)}</span>
            <span class="priority-tag ${priClass}">${escapeHtml(task.priority)}</span>
            <span class="task-meta-text">Due ${escapeHtml(due)}</span>
          </div>
          <p class="task-assignee"><span class="task-meta-label">Assignee</span> ${escapeHtml(task.assignedTo?.name || "Unknown")}</p>
        </div>
        <div class="task-card-actions">
          <label class="sr-only" for="status-${task._id}">Update status</label>
          <select id="status-${task._id}" data-id="${task._id}" class="field-input field-select status-select task-status-select" ${statusControl.canUpdate ? "" : "disabled"}>
          ${statusOptions}
          </select>
        </div>
      </article>
    `;
    })
    .join("");
}

async function createProject(event) {
  event.preventDefault();
  try {
    const name = document.getElementById("projectName").value.trim();
    const description = document.getElementById("projectDescription").value.trim();
    await api("/projects", { method: "POST", body: JSON.stringify({ name, description }) });
    showMessage("Project created");
    await loadProjects();
    await loadDashboard();
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function addMember() {
  try {
    hideMemberInlineError();
    if (!currentProjectId) {
      throw new Error("Select a project first");
    }
    const email = memberEmailInput.value.trim();
    const role = document.getElementById("memberRole").value;
    await api(`/projects/${currentProjectId}/members`, {
      method: "POST",
      body: JSON.stringify({ email, role })
    });
    showMessage("Member added");
    showMemberInlineSuccess("Member added successfully");
    await loadProjects();
  } catch (error) {
    if ((error.message || "").toLowerCase().includes("user not found")) {
      showMemberInlineError("Member not found");
    }
    showMessage(error.message, true);
  }
}

async function createTask(event) {
  event.preventDefault();
  try {
    if (!currentProjectId) {
      throw new Error("Select a project first");
    }
    const title = document.getElementById("taskTitle").value.trim();
    const description = document.getElementById("taskDescription").value.trim();
    const dueDate = document.getElementById("taskDueDate").value;
    const assignedTo = taskAssignedToSelect.value;
    const priority = document.getElementById("taskPriority").value;

    await api("/tasks", {
      method: "POST",
      body: JSON.stringify({
        title,
        description,
        projectId: currentProjectId,
        dueDate,
        assignedTo,
        priority
      })
    });
    showMessage("Task created");
    await loadTasks();
    await loadDashboard();
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function updateTaskStatus(event) {
  if (!event.target.classList.contains("status-select")) {
    return;
  }
  try {
    const taskId = event.target.getAttribute("data-id");
    const status = event.target.value;
    await api(`/tasks/${taskId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    showMessage("Task status updated");
    await loadTasks();
    await loadDashboard();
  } catch (error) {
    showMessage(error.message, true);
  }
}

function logout() {
  token = "";
  currentUserId = "";
  currentUserName = "";
  localStorage.removeItem("token");
  localStorage.removeItem("userName");
  syncAuthFromToken();
  toggleSections(false);
  showMessage("Logged out");
}

async function initApp() {
  if (!token) {
    syncAuthFromToken();
    toggleSections(false);
    return;
  }
  syncAuthFromToken();
  toggleSections(true);
  await loadProjects();
  await loadDashboard();
  await loadTasks();
}

document.getElementById("authTabLogin").addEventListener("click", () => setAuthMode("login"));
document.getElementById("authTabSignup").addEventListener("click", () => setAuthMode("signup"));
document.getElementById("signupBtn").addEventListener("click", signup);
document.getElementById("loginBtn").addEventListener("click", login);
document.getElementById("projectForm").addEventListener("submit", createProject);
document.getElementById("addMemberBtn").addEventListener("click", addMember);
document.getElementById("taskForm").addEventListener("submit", createTask);
document.getElementById("refreshTasksBtn").addEventListener("click", loadTasks);
document.getElementById("logoutBtn").addEventListener("click", logout);

projectSelect.addEventListener("change", async () => {
  currentProjectId = projectSelect.value;
  renderSelectedProjectMembers();
  populateAssigneeDropdown();
  syncTaskCreationAccess();
  await loadTasks();
});

tasksList.addEventListener("change", updateTaskStatus);
memberEmailInput.addEventListener("input", hideMemberInlineError);

document.getElementById("activeProjectsList").addEventListener("click", (event) => {
  const button = event.target.closest(".btn-complete-project");
  if (!button) {
    return;
  }
  const projectId = button.getAttribute("data-project-id");
  if (projectId) {
    completeProjectById(projectId);
  }
});

setAuthMode("login");
syncAuthFromToken();
initApp().catch((error) => showMessage(error.message, true));
