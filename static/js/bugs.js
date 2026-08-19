document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  if (path.match(/\/projects\/\d+\/bugs\/?$/)) {
    applyRolePermissions();
    initBugDetail();
    initBugForm();
    initBugList();
  }
});

function getUserRole() {
  return (localStorage.getItem("user_role") || "").toLowerCase();
}

function isQC() {
  const role = getUserRole();
  return role === "qc" || role === "superuser";
}

function isDev() {
  return getUserRole() === "dev";
}

function isOrgAdmin() {
  return getUserRole() === "org_admin";
}

function showBugToast(message) {
  const toast = document.getElementById("bugToast");
  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

function applyRolePermissions() {
  const qc = isQC();
  document.querySelectorAll(".qc-only-action").forEach((element) => {
    if (qc) {
      element.classList.remove("hidden");
    } else {
      element.classList.add("hidden");
    }
  });

  const createBugBtn = document.getElementById("createBugBtn");
  if (createBugBtn) {
    createBugBtn.style.display = qc ? "inline-flex" : "none";
  }
}
function getProjectId() {
  const match = window.location.pathname.match(/projects\/(\d+)/);
  return match ? match[1] : "";
}

function initBugList() {
  const tbody = document.getElementById("bugTableBody");
  const loading = document.getElementById("bugLoading");
  const empty = document.getElementById("bugEmpty");

  const searchInput = document.getElementById("searchBug");
  const statusFilter = document.getElementById("statusFilter");
  const severityFilter = document.getElementById("severityFilter");
  const refreshBtn = document.getElementById("refreshBugsBtn");

  const selectAllBugs = document.getElementById("selectAllBugs");
  const bulkDeleteBtn = document.getElementById("bulkDeleteBugsBtn");
  const selectedCount = document.getElementById("selectedBugsCount");

  const projectId = getProjectId();

  let bugData = [];
  let selectedBugIds = new Set();
  async function loadBugs() {
    loading?.classList.remove("hidden");
    empty?.classList.add("hidden");

    if (tbody) {
      tbody.innerHTML = "";
    }
    selectedBugIds.clear();
    updateBulkDeleteUI();
    try {
      const response = await apiFetch(`/api/bugs/?project_id=${projectId}`);
      if (!response.ok) {
        throw new Error(`Failed to load bugs (${response.status})`);
      }
      const data = await response.json();
      bugData = Array.isArray(data) ? data : data.results || [];

      renderTable(bugData);
    } catch (err) {
      console.error("Load bugs error:", err);

      if (empty) {
        empty.classList.remove("hidden");
      }
    } finally {
      loading?.classList.add("hidden");
    }
  }
  function renderTable(list) {
    if (!tbody) return;
    tbody.innerHTML = "";
    if (!list.length) {
      empty?.classList.remove("hidden");
      updateBulkDeleteUI();
      return;
    }
    empty?.classList.add("hidden");
    list.forEach((bug) => {
      const severityColor =
        {
          critical: "bg-red-100 text-red-700",
          high: "bg-orange-100 text-orange-700",
          medium: "bg-yellow-100 text-yellow-700",
          low: "bg-slate-100 text-slate-700",
        }[bug.severity] || "bg-slate-100 text-slate-700";

      const statusColor =
        {
          open: "bg-blue-100 text-blue-700",
          in_progress: "bg-purple-100 text-purple-700",
          resolved: "bg-green-100 text-green-700",
          reopened: "bg-orange-100 text-orange-700",
          closed: "bg-slate-100 text-slate-700",
          rejected: "bg-red-50 text-red-600",
        }[bug.status] || "bg-slate-100 text-slate-700";

      const checked = selectedBugIds.has(String(bug.id)) ? "checked" : "";
      const actionButtons = `
        <div class="flex items-center justify-end gap-3">
          <button
            type="button"
            class="btn-view-bug text-indigo-600 hover:text-indigo-800 p-1 cursor-pointer"
            data-id="${bug.id}"
            title="Xem chi tiết"
          >
            <i class="fa-solid fa-eye pointer-events-none"></i>
          </button>

          ${
            isQC()
              ? `
                <!-- EDIT -->
                <button
                  type="button"
                  class="btn-edit-bug text-amber-600 hover:text-amber-800 p-1 cursor-pointer"
                  data-id="${bug.id}"
                  title="Chỉnh sửa"
                >
                  <i class="fa-solid fa-pen pointer-events-none"></i>
                </button>

                <!-- DELETE -->
                <button
                  type="button"
                  class="btn-delete-bug text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                  data-id="${bug.id}"
                  title="Xóa Bug"
                >
                  <i class="fa-solid fa-trash pointer-events-none"></i>
                </button>
              `
              : ""
          }

        </div>
      `;
      tbody.insertAdjacentHTML(
        "beforeend",
        `
          <tr class="border-t hover:bg-slate-50">

            ${
              isQC()
                ? `
                  <td class="qc-only-action px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      class="bug-checkbox rounded border-slate-300"
                      data-id="${bug.id}"
                      ${checked}
                    >
                  </td>
                `
                : ""
            }

            <!-- BUG ID -->
            <td class="px-4 py-3 font-medium text-indigo-600">
              ${bug.bug_id || "-"}
            </td>

            <!-- SUMMARY -->
            <td class="px-4 py-3">
              ${bug.title || "-"}
            </td>

            <td class="px-4 py-3">
              <span class="px-3 py-1 rounded-full text-xs font-medium ${severityColor}">
                ${bug.severity || "-"}
              </span>
            </td>

            <!-- STATUS -->
            <td class="px-4 py-3">
              <span class="px-3 py-1 rounded-full text-xs font-medium ${statusColor}">
                ${bug.status || "-"}
              </span>
            </td>
            <td class="px-4 py-3">
              ${bug.assignee_name || "-"}
            </td>

            <!-- ACTIONS -->
            <td class="px-4 py-3 text-right">
              ${actionButtons}
            </td>

          </tr>
        `,
      );
    });
    bindRowActions();
    updateBulkDeleteUI();
  }

  function bindRowActions() {
    document.querySelectorAll(".btn-view-bug").forEach((button) => {
      button.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const bugId = button.dataset.id;

        console.log("VIEW BUG CLICKED:", bugId);

        if (typeof window.openBugDetail !== "function") {
          console.error("openBugDetail is not available");
          return;
        }
        await window.openBugDetail(bugId, false);
      };
    });
    document.querySelectorAll(".btn-edit-bug").forEach((button) => {
      button.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const bugId = button.dataset.id;
        if (!isQC()) {
          alert("Bạn không có quyền chỉnh sửa Bug.");
          return;
        }
        if (typeof window.openBugDetail !== "function") {
          return;
        }
        await window.openBugDetail(bugId, true);
      };
    });

    // =========================
    // DELETE
    // =========================
    document.querySelectorAll(".btn-delete-bug").forEach((button) => {
      button.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const bugId = button.dataset.id;

        console.log("DELETE BUG CLICKED:", bugId);

        await deleteSingleBug(bugId);
      };
    });
    document.querySelectorAll(".bug-checkbox").forEach((checkbox) => {
      checkbox.onchange = () => {
        const id = checkbox.dataset.id;

        if (checkbox.checked) {
          selectedBugIds.add(id);
        } else {
          selectedBugIds.delete(id);
        }

        updateBulkDeleteUI();
      };
    });
  }
  function updateBulkDeleteUI() {
    const count = selectedBugIds.size;

    if (selectedCount) {
      selectedCount.textContent = count;
    }
    if (bulkDeleteBtn) {
      if (isQC() && count > 0) {
        bulkDeleteBtn.classList.remove("hidden");
      } else {
        bulkDeleteBtn.classList.add("hidden");
      }
    }

    if (selectAllBugs) {
      const visibleCheckboxes = document.querySelectorAll(".bug-checkbox");

      const checkedCheckboxes = document.querySelectorAll(
        ".bug-checkbox:checked",
      );

      selectAllBugs.checked =
        visibleCheckboxes.length > 0 &&
        visibleCheckboxes.length === checkedCheckboxes.length;
    }
  }

  async function deleteSingleBug(bugId) {
    if (!isQC()) {
      alert("Bạn không có quyền xóa Bug.");
      return;
    }
    if (!confirm("Bạn có chắc chắn muốn xóa Bug này?")) {
      return;
    }

    try {
      const response = await apiFetch(`/api/bugs/${bugId}/`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Delete failed (${response.status})`);
      }

      showBugToast("Đã xóa Bug thành công!");

      await loadBugs();
    } catch (err) {
      alert("Lỗi khi xóa Bug: " + err.message);
    }
  }

  async function deleteSelectedBugs() {
    if (!isQC()) {
      alert("Bạn không có quyền xóa Bug.");
      return;
    }
    const ids = [...selectedBugIds];
    if (!ids.length) {
      return;
    }
    if (!confirm(`Bạn có chắc muốn xóa ${ids.length} Bug đã chọn?`)) {
      return;
    }
    try {
      await Promise.all(
        ids.map((id) =>
          apiFetch(`/api/bugs/${id}/`, {
            method: "DELETE",
          }),
        ),
      );
      showBugToast(`Đã xóa ${ids.length} Bug thành công!`);
      selectedBugIds.clear();
      await loadBugs();
    } catch (err) {
      alert("Lỗi khi xóa nhiều Bug: " + err.message);
    }
  }
  selectAllBugs?.addEventListener("change", () => {
    if (!isQC()) {
      return;
    }

    const checkboxes = document.querySelectorAll(".bug-checkbox");

    checkboxes.forEach((checkbox) => {
      checkbox.checked = selectAllBugs.checked;
      const id = String(checkbox.dataset.id);
      if (selectAllBugs.checked) {
        selectedBugIds.add(id);
      } else {
        selectedBugIds.delete(id);
      }
    });
    updateBulkDeleteUI();
  });
  bulkDeleteBtn?.addEventListener("click", deleteSelectedBugs);
  function applyFilter() {
    const keyword = searchInput?.value.toLowerCase().trim() || "";
    const status = statusFilter?.value || "";
    const severity = severityFilter?.value || "";
    const filtered = bugData.filter((bug) => {
      const matchKeyword =
        (bug.title || "").toLowerCase().includes(keyword) ||
        (bug.bug_id || "").toLowerCase().includes(keyword);

      const matchStatus = !status || bug.status === status;
      const matchSeverity = !severity || bug.severity === severity;
      return matchKeyword && matchStatus && matchSeverity;
    });
    renderTable(filtered);
  }
  searchInput?.addEventListener("input", applyFilter);
  statusFilter?.addEventListener("change", applyFilter);
  severityFilter?.addEventListener("change", applyFilter);
  refreshBtn?.addEventListener("click", loadBugs);
  window.loadBugs = loadBugs;
  loadBugs();
}

/* =========================================================
   BUG FORM
========================================================= */

function initBugForm() {
  const saveBtn = document.getElementById("saveBugBtn");

  const cancelBtn = document.getElementById("cancelBugBtn");

  const createBugBtn = document.getElementById("createBugBtn");

  const modal = document.getElementById("bugFormModal");

  const uploadArea = document.getElementById("uploadArea");

  const fileInput = document.getElementById("bugAttachment");

  const fileList = document.getElementById("fileList");

  const errorBox = document.getElementById("bugFormError");

  const projectId = getProjectId();

  if (!modal || !saveBtn) {
    console.warn("Bug form elements not found.");

    return;
  }

  function openModal() {
    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  }

  function closeModal() {
    modal.classList.add("hidden");
    modal.style.display = "none";
    document.body.classList.remove("overflow-hidden");
    currentBugId = null;
    originalBug = null;
    editMode = false;
  }

  createBugBtn?.addEventListener("click", openModal);
  cancelBtn?.addEventListener("click", closeModal);
  function resetForm() {
    const form = document.getElementById("bugForm");

    if (form) {
      form.reset();
    }
    if (fileInput) {
      fileInput.value = "";
    }
    if (fileList) {
      fileList.innerHTML = "";
    }
    if (errorBox) {
      errorBox.textContent = "";
      errorBox.classList.add("hidden");
    }
  }
  uploadArea?.addEventListener("click", () => {
    fileInput?.click();
  });
  uploadArea?.addEventListener("dragover", (event) => {
    event.preventDefault();
    uploadArea.classList.add("border-indigo-500", "bg-indigo-50");
  });
  uploadArea?.addEventListener("dragleave", () => {
    uploadArea.classList.remove("border-indigo-500", "bg-indigo-50");
  });
  uploadArea?.addEventListener("drop", (event) => {
    event.preventDefault();
    uploadArea.classList.remove("border-indigo-500", "bg-indigo-50");
    if (!fileInput) {
      return;
    }

    fileInput.files = event.dataTransfer.files;
    renderFiles(fileInput.files);
  });

  fileInput?.addEventListener("change", () => {
    renderFiles(fileInput.files);
  });

  function renderFiles(files) {
    if (!fileList || !errorBox) {
      return;
    }
    fileList.innerHTML = "";
    errorBox.textContent = "";
    errorBox.classList.add("hidden");
    if (files.length > 5) {
      errorBox.textContent = "Maximum 5 files allowed.";
      errorBox.classList.remove("hidden");
      fileInput.value = "";
      return;
    }
    const MAX_SIZE = 50 * 1024 * 1024;
    for (const file of files) {
      if (file.size > MAX_SIZE) {
        errorBox.textContent = `${file.name} exceeds 50MB.`;
        errorBox.classList.remove("hidden");
        fileInput.value = "";
        fileList.innerHTML = "";
        return;
      }
      const icon = file.type.startsWith("image/")
        ? "fa-image text-blue-500"
        : file.type.startsWith("video/")
          ? "fa-video text-purple-500"
          : "fa-file text-slate-500";
      fileList.insertAdjacentHTML(
        "beforeend",
        `
          <div
            class="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50"
          >
            <i
              class="fa-solid ${icon} text-lg"
            ></i>
            <div class="flex-1">
              <p class="text-sm font-medium text-slate-700">
                ${file.name}
              </p>
              <p class="text-xs text-slate-400">
                ${(file.size / 1024 / 1024).toFixed(2)}
                MB
              </p>
            </div>
          </div>
        `,
      );
    }
  }
  saveBtn.addEventListener("click", async () => {
    if (!errorBox) {
      return;
    }
    errorBox.textContent = "";
    errorBox.classList.add("hidden");
    const summary = document.getElementById("bugSummary")?.value.trim();
    if (!summary) {
      errorBox.textContent = "Bug Summary is required.";
      errorBox.classList.remove("hidden");
      return;
    }

    if (!projectId) {
      errorBox.textContent = "Project ID is missing.";

      errorBox.classList.remove("hidden");

      return;
    }

    const formData = new FormData();

    formData.append("project", projectId);

    const bugId = "BUG-" + Date.now().toString().slice(-6);

    formData.append("bug_id", bugId);

    formData.append("title", summary);

    formData.append(
      "platform",
      document.getElementById("bugPlatform")?.value || "",
    );

    formData.append(
      "environment",
      document.getElementById("bugEnvironment")?.value || "",
    );

    formData.append(
      "priority",
      document.getElementById("bugPriority")?.value || "",
    );

    formData.append(
      "severity",
      document.getElementById("bugSeverity")?.value || "",
    );

    formData.append(
      "status",
      document.getElementById("bugStatus")?.value || "",
    );

    formData.append(
      "steps_to_reproduce",
      document.getElementById("bugSteps")?.value || "",
    );

    formData.append(
      "expected_result",
      document.getElementById("expectedResult")?.value || "",
    );

    formData.append(
      "actual_result",
      document.getElementById("actualResult")?.value || "",
    );

    /* ATTACHMENTS */

    if (fileInput?.files?.length) {
      [...fileInput.files].forEach((file) => {
        formData.append("attachments", file);
      });
    }
    saveBtn.disabled = true;
    saveBtn.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Saving...
      `;

    try {
      const response = await apiFetch("/api/bugs/", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Create bug failed (${response.status})`);
      }
      closeModal();
      showBugToast("Đã tạo Bug thành công!");

      if (typeof window.loadBugs === "function") {
        await window.loadBugs();
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error("Create bug error:", err);

      errorBox.textContent = err.message || "Failed to create bug.";

      errorBox.classList.remove("hidden");
    } finally {
      saveBtn.disabled = false;

      saveBtn.innerHTML = `
          <i class="fa-regular fa-floppy-disk"></i>
          Save Bug
        `;
    }
  });
  window.openBugForm = openModal;

  window.closeBugForm = closeModal;
}
function initBugDetail() {
  const modal = document.getElementById("bugDetailModal");

  const closeBtn = document.getElementById("closeBugDetailBtn");

  const cancelBtn = document.getElementById("cancelBugDetailBtn");

  const saveBtn = document.getElementById("saveBugDetailBtn");

  const devStatusBtn = document.getElementById("updateDevStatusBtn");
  const claimBugWrapper = document.getElementById("claimBugWrapper");

  const claimBugCheckbox = document.getElementById("claimBugCheckbox");

  if (!modal) {
    console.warn("Bug detail modal not found.");

    return;
  }

  let currentBugId = null;

  let originalBug = null;

  let editMode = false;

  const fields = [
    "detailBugSummary",
    "detailBugPlatform",
    "detailBugEnvironment",
    "detailBugPriority",
    "detailBugSeverity",
    "detailBugStatus",
    "detailBugSteps",
    "detailBugExpected",
    "detailBugActual",
  ];

  function getField(id) {
    return document.getElementById(id);
  }

  function closeModal() {
    modal.classList.add("hidden");
    modal.style.display = "none";

    document.body.classList.remove("overflow-hidden");

    currentBugId = null;
    originalBug = null;
    editMode = false;
  }

  closeBtn?.addEventListener("click", closeModal);
  cancelBtn?.addEventListener("click", closeModal);
  function setFieldsDisabled(disabled) {
    fields.forEach((id) => {
      const element = getField(id);

      if (!element) {
        return;
      }

      element.disabled = disabled;

      if (disabled) {
        element.classList.add("bg-slate-50", "cursor-not-allowed");
      } else {
        element.classList.remove("bg-slate-50", "cursor-not-allowed");
      }
    });
  }
  function fillBug(bug) {
    const title = getField("bugDetailTitle");

    if (title) {
      title.textContent = bug.title || "Bug Detail";
    }
    const bugId = getField("bugDetailId");
    if (bugId) {
      bugId.textContent = bug.bug_id || "";
    }
    const summary = getField("detailBugSummary");
    if (summary) {
      summary.value = bug.title || "";
    }
    const platform = getField("detailBugPlatform");

    if (platform) {
      platform.value = bug.platform || "";
    }
    const environment = getField("detailBugEnvironment");
    if (environment) {
      environment.value = bug.environment || "";
    }
    const priority = getField("detailBugPriority");
    if (priority) {
      priority.value = bug.priority || "";
    }
    const severity = getField("detailBugSeverity");

    if (severity) {
      severity.value = bug.severity || "";
    }

    const status = getField("detailBugStatus");

    if (status) {
      status.value = bug.status || "";
    }

    const assignee = getField("detailBugAssignee");

    if (assignee) {
      assignee.value = bug.assignee_name || "Chưa có người nhận";
    }

    const steps = getField("detailBugSteps");

    if (steps) {
      steps.value = bug.steps_to_reproduce || "";
    }
    const expected = getField("detailBugExpected");
    if (expected) {
      expected.value = bug.expected_result || "";
    }
    const actual = getField("detailBugActual");
    if (actual) {
      actual.value = bug.actual_result || "";
    }
  }

  function applyRoleMode() {
    const role = getUserRole();
    if (role === "qc" || role === "superuser") {
      setFieldsDisabled(!editMode ? true : false);
      const assignee = getField("detailBugAssignee");
      if (assignee) {
        assignee.disabled = true;
      }
      if (saveBtn) {
        saveBtn.classList.toggle("hidden", !editMode);
      }
      devStatusBtn?.classList.add("hidden");
      return;
    }
    if (role === "dev") {
      setFieldsDisabled(true);

      const status = getField("detailBugStatus");

      if (status) {
        status.disabled = false;

        status.classList.remove("bg-slate-50", "cursor-not-allowed");
      }

      saveBtn?.classList.add("hidden");
      devStatusBtn?.classList.remove("hidden");
      if (originalBug && !originalBug.assignee) {
        claimBugWrapper?.classList.remove("hidden");
        claimBugWrapper?.classList.add("flex");
      } else {
        claimBugWrapper?.classList.add("hidden");
        claimBugWrapper?.classList.remove("flex");
      }
      return;
    }
    setFieldsDisabled(true);
    saveBtn?.classList.add("hidden");
    devStatusBtn?.classList.add("hidden");
  }
  async function openBugDetail(bugId, shouldEdit = false) {
    currentBugId = bugId;
    editMode = shouldEdit;

    try {
      const response = await apiFetch(`/api/bugs/${bugId}/`);
      if (!response.ok) {
        throw new Error(`Load bug failed (${response.status})`);
      }

      const bug = await response.json();
      originalBug = bug;

      fillBug(bug);
      applyRoleMode();
      modal.classList.remove("hidden");
      modal.style.display = "block";

      document.body.classList.add("overflow-hidden");
    } catch (err) {

      alert("Không thể tải chi tiết Bug: " + err.message);
    }
  }
  saveBtn?.addEventListener("click", async () => {
    if (!currentBugId || !isQC()) {
      return;
    }

    const payload = {
      title: getField("detailBugSummary")?.value || "",

      platform: getField("detailBugPlatform")?.value || "",

      environment: getField("detailBugEnvironment")?.value || "",

      priority: getField("detailBugPriority")?.value || "",

      severity: getField("detailBugSeverity")?.value || "",

      status: getField("detailBugStatus")?.value || "",

      steps_to_reproduce: getField("detailBugSteps")?.value || "",

      expected_result: getField("detailBugExpected")?.value || "",

      actual_result: getField("detailBugActual")?.value || "",
    };

    saveBtn.disabled = true;

    try {
      const response = await apiFetch(`/api/bugs/${currentBugId}/`, {
        method: "PATCH",

        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Update failed (${response.status})`);
      }
      showBugToast("Đã cập nhật Bug thành công!");
      closeModal();
      if (typeof window.loadBugs === "function") {
        await window.loadBugs();
      }
    } catch (err) {
      console.error("Update bug error:", err);

      alert("Không thể cập nhật Bug: " + err.message);
    } finally {
      saveBtn.disabled = false;
    }
  });

  /* =======================================================
     DEV UPDATE STATUS
  ======================================================= */

  devStatusBtn?.addEventListener("click", async () => {
    if (!currentBugId || !isDev()) {
      return;
    }
    const statusField = getField("detailBugStatus");
    const newStatus = statusField?.value || "";

    if (originalBug && newStatus === originalBug.status) {
      showBugToast("Status chưa thay đổi.");
      return;
    }
    devStatusBtn.disabled = true;
    try {
      const response = await apiFetch(`/api/bugs/${currentBugId}/`, {
        method: "PATCH",

        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error(`Update status failed (${response.status})`);
      }
      showBugToast("Đã cập nhật Status và tự động nhận Bug.");
      closeModal();
      if (typeof window.loadBugs === "function") {
        await window.loadBugs();
      }
    } catch (err) {
      console.error("Dev update status error:", err);

      alert("Không thể cập nhật Status: " + err.message);
    } finally {
      devStatusBtn.disabled = false;
    }
  });
  /* =======================================================
   CLAIM BUG - DEV
======================================================= */
  claimBugCheckbox?.addEventListener("change", async () => {
    if (!claimBugCheckbox.checked) {
      return;
    }
    if (!currentBugId || !isDev()) {
      claimBugCheckbox.checked = false;
      return;
    }
    claimBugCheckbox.disabled = true;
    try {
      const response = await apiFetch(`/api/bugs/${currentBugId}/claim/`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Claim bug failed (${response.status})`);
      }
      const bug = await response.json();
      originalBug = bug;
      const assignee = getField("detailBugAssignee");

      if (assignee) {
        assignee.value = bug.assignee_name || "";
      }
      claimBugWrapper?.classList.add("hidden");
      claimBugWrapper?.classList.remove("flex");

      showBugToast(`Đã nhận ${bug.bug_id} thành công!`);
      if (typeof window.loadBugs === "function") {
        await window.loadBugs();
      }
    } catch (err) {
      claimBugCheckbox.checked = false;
      claimBugCheckbox.disabled = false;

      alert("Không thể nhận Bug: " + err.message);
    }
  });
  window.openBugDetail = openBugDetail;

  window.closeBugDetail = closeModal;
}
