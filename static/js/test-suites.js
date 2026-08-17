document.addEventListener("DOMContentLoaded", () => {
  const match = window.location.pathname.match(
    /\/projects\/(\d+)\/test-suites\/?/,
  );

  let projectId = match?.[1];
  if (projectId) {
    localStorage.setItem("current_project_id", projectId);
  } else {
    projectId = localStorage.getItem("current_project_id");
  }

  if (!projectId) {
    console.error("No project ID found.");
  }
  const currentRole = (localStorage.getItem("user_role") || "")
    .trim()
    .toLowerCase();
  const canManageSuites = currentRole === "qc" || currentRole === "superuser";
  const createSuiteBtn = document.getElementById("createSuiteBtn");
  const emptyCreateSuiteBtn = document.getElementById("emptyCreateSuiteBtn");
  const selectTestCasesBtn = document.getElementById("selectTestCasesBtn");
  const refreshSuitesBtn = document.getElementById("refreshSuitesBtn");
  const searchSuiteInput = document.getElementById("searchSuiteInput");
  const suiteLoading = document.getElementById("suiteLoading");
  const suiteError = document.getElementById("suiteError");
  const suiteErrorMessage = document.getElementById("suiteErrorMessage");
  const suiteEmpty = document.getElementById("suiteEmpty");
  const suiteList = document.getElementById("suiteList");
  const suiteFormModal = document.getElementById("suiteFormModal");
  const suiteForm = document.getElementById("suiteForm");
  const suiteFormTitle = document.getElementById("suiteFormTitle");
  const suiteNameInput = document.getElementById("suiteNameInput");
  const suiteFormError = document.getElementById("suiteFormError");
  const saveSuiteBtn = document.getElementById("saveSuiteBtn");
  const closeSuiteFormBtn = document.getElementById("closeSuiteFormBtn");
  const cancelSuiteFormBtn = document.getElementById("cancelSuiteFormBtn");
  const selectCasesModal = document.getElementById("selectCasesModal");
  const closeSelectCasesBtn = document.getElementById("closeSelectCasesBtn");
  const cancelSelectCasesBtn = document.getElementById("cancelSelectCasesBtn");
  const caseRequirementFilter = document.getElementById(
    "caseRequirementFilter",
  );
  const casePriorityFilter = document.getElementById("casePriorityFilter");
  const targetSuiteSelect = document.getElementById("targetSuiteSelect");
  const caseSearchInput = document.getElementById("caseSearchInput");
  const selectAllCases = document.getElementById("selectAllCases");
  const selectCasesBody = document.getElementById("selectCasesBody");
  const selectedCasesCount = document.getElementById("selectedCasesCount");
  const addSelectedCasesBtn = document.getElementById("addSelectedCasesBtn");
  const suiteDetailModal = document.getElementById("suiteDetailModal");

  const suiteDetailTitle = document.getElementById("suiteDetailTitle");

  const suiteDetailSubtitle = document.getElementById("suiteDetailSubtitle");

  const suiteTestCasesContent = document.getElementById(
    "suiteTestCasesContent",
  );

  const closeSuiteDetailBtn = document.getElementById("closeSuiteDetailBtn");
  const deleteSuiteModal = document.getElementById("deleteSuiteModal");
  const deleteSuiteMessage = document.getElementById("deleteSuiteMessage");
  const cancelDeleteSuiteBtn = document.getElementById("cancelDeleteSuiteBtn");
  const confirmDeleteSuiteBtn = document.getElementById(
    "confirmDeleteSuiteBtn",
  );
  const suiteToast = document.getElementById("suiteToast");
  let suites = [];
  let allTestCases = [];
  let filteredTestCases = [];
  let selectedCaseIds = new Set();
  let editingSuiteId = null;
  let deletingSuiteId = null;
  if (!projectId) {
    showError("Select a project before opening Test Suites.");
    return;
  }
  if (!canManageSuites) {
    if (createSuiteBtn) {
      createSuiteBtn.classList.add("hidden");
      createSuiteBtn.style.display = "none";
    }
    if (emptyCreateSuiteBtn) {
      emptyCreateSuiteBtn.classList.add("hidden");
      emptyCreateSuiteBtn.style.display = "none";
    }
    if (selectTestCasesBtn) {
      selectTestCasesBtn.classList.add("hidden");
      selectTestCasesBtn.style.display = "none";
    }
  }
  function getCookie(name) {
    const cookies = document.cookie.split(";").map((cookie) => cookie.trim());

    const cookie = cookies.find((cookie) => cookie.startsWith(`${name}=`));

    return cookie
      ? decodeURIComponent(cookie.substring(name.length + 1))
      : null;
  }
  function getCSRFToken() {
    const cookieToken = getCookie("csrftoken");

    if (cookieToken) {
      return cookieToken;
    }
    const csrfInput = document.querySelector("[name=csrfmiddlewaretoken]");
    return csrfInput?.value || "";
  }
  async function apiFetch(url, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const accessToken = localStorage.getItem("access_token");

    const headers = {
      Accept: "application/json",
      ...(options.headers || {}),
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
      headers["Content-Type"] = "application/json";

      const csrfToken = getCSRFToken();

      if (csrfToken) {
        headers["X-CSRFToken"] = csrfToken;
      }
    }

    const response = await fetch(url, {
      credentials: "include",
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      let message = `Request failed: ${response.status}`;

      if (data?.detail) {
        message = data.detail;
      } else if (data?.error) {
        message = data.error;
      } else if (data && typeof data === "object") {
        const firstError = Object.values(data)
          .flat()
          .find((value) => typeof value === "string");

        if (firstError) {
          message = firstError;
        }
      }

      throw new Error(message);
    }

    return data;
  }
  function normalizeList(data) {
    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.results)) {
      return data.results;
    }

    return [];
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  async function loadSuites() {
    showLoading(true);
    hideError();
    try {
      const data = await apiFetch(`/api/projects/${projectId}/test-suites/`);
      suites = normalizeList(data);
      renderSuites();
    } catch (error) {
      console.error("Load suites failed:", error);
      showError(error.message || "Unable to load test suites.");
    } finally {
      showLoading(false);
    }
  }
  function renderSuites() {
    const keyword = (searchSuiteInput?.value || "").trim().toLowerCase();

    const visibleSuites = suites.filter((suite) =>
      String(suite.name || "")
        .toLowerCase()
        .includes(keyword),
    );

    suiteList.innerHTML = "";

    if (!visibleSuites.length) {
      suiteList.classList.add("hidden");

      suiteEmpty.classList.remove("hidden");

      return;
    }

    suiteEmpty.classList.add("hidden");

    suiteList.classList.remove("hidden");

    visibleSuites.forEach((suite) => {
      const item = document.createElement("article");

      const caseCount = Number(
        suite.test_case_count ??
          suite.assigned_test_cases?.length ??
          suite.test_cases_count ??
          suite.cases_count ??
          0,
      );

      item.className = `border border-slate-200 bg-white rounded-xl px-5 py-4 shadow-sm flex items-center gap-4 hover:border-indigo-300
                    hover:shadow-md transition`;
      item.innerHTML = `
                    <!-- SUITE -->
                    <button
                        type="button"
                        class="suite-open-btn flex min-w-0 flex-1 items-center gap-4 text-left">
                        <span
                            class="w-10 h-10 shrink-0 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"
                        >
                            <i class="fa-solid fa-layer-group"></i>
                        </span>
                        <span class="min-w-0">
                            <span
                                class="block truncate font-semibold text-slate-800"
                            >
                                ${escapeHtml(suite.name)}
                            </span>
                            <span
                                class="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500"
                            >
                                <span
                                    class="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 font-medium text-emerald-700"
                                >
                                    <i class="fa-solid fa-vials"></i>
                                    ${caseCount}
                                    Test Cases
                                </span>
                            </span>

                        </span>

                    </button>
                    <!-- ACTIONS -->
                    <div class="flex items-center gap-1">
                        <button
                            type="button"
                            data-testid="testsuite-page-btn-view-suite"
                            class="suite-view-btn flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                            title="View Test Cases"
                        >
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        ${
                          canManageSuites
                            ? `
                                <button
                                    type="button"
                                    data-testid="testsuite-page-btn-edit-suite"
                                    class="suite-edit-btn flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                                    title="Edit Suite"
                                >
                                    <i class="fa-solid fa-pen"></i>
                                </button>
                                <button
                                    type="button"
                                    data-testid="testsuite-page-btn-delete-suite"
                                    class="suite-delete-btn flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                    title="Delete Suite"
                                >
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            `
                            : ""
                        }
                    </div>

                    `;

      item
        .querySelector(".suite-open-btn")
        .addEventListener("click", () => openSuiteDetail(suite.id));

      item
        .querySelector(".suite-view-btn")
        .addEventListener("click", () => openSuiteDetail(suite.id));

      item
        .querySelector(".suite-edit-btn")
        ?.addEventListener("click", () => openEditForm(suite));

      item
        .querySelector(".suite-delete-btn")
        ?.addEventListener("click", () => openDeleteModal(suite));

      suiteList.appendChild(item);
    });
  }
  function openCreateForm() {
    if (!canManageSuites) {
      return;
    }

    editingSuiteId = null;

    suiteForm.reset();

    suiteFormTitle.textContent = "Create Test Suite";

    saveSuiteBtn.textContent = "Create Suite";

    hideFormError();

    suiteFormModal.classList.remove("hidden");

    suiteNameInput.focus();
  }
  function openEditForm(suite) {
    if (!canManageSuites) {
      return;
    }

    editingSuiteId = suite.id;

    suiteNameInput.value = suite.name || "";

    suiteFormTitle.textContent = "Update Test Suite";

    saveSuiteBtn.textContent = "Update Suite";

    hideFormError();

    suiteFormModal.classList.remove("hidden");

    suiteNameInput.focus();
  }
  async function saveSuite(event) {
    event.preventDefault();

    if (!canManageSuites) {
      return;
    }

    const name = suiteNameInput.value.trim();

    if (!name) {
      showFormError("Suite name is required.");

      return;
    }

    const editing = Boolean(editingSuiteId);

    saveSuiteBtn.disabled = true;

    saveSuiteBtn.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin mr-1"></i>
            Saving...
            `;

    try {
      if (editing) {
        await apiFetch(`/api/test-suites/${editingSuiteId}/`, {
          method: "PATCH",

          body: JSON.stringify({
            name,
          }),
        });

        showToast("Test suite updated.");
      } else {
        await apiFetch(`/api/projects/${projectId}/test-suites/`, {
          method: "POST",

          body: JSON.stringify({
            name,
          }),
        });

        showToast("Test suite created.");
      }

      closeSuiteForm();

      await loadSuites();
    } catch (error) {
      console.error("Save suite failed:", error);

      showFormError(error.message);
    } finally {
      saveSuiteBtn.disabled = false;

      saveSuiteBtn.textContent = editing ? "Update Suite" : "Create Suite";
    }
  }
  async function openSelectCasesModal() {
    if (!canManageSuites) {
      return;
    }
    if (!projectId || projectId === "null" || projectId === "undefined") {
      showToast("Please create at least one Test Suite first.", true);
      return;
    }

    selectedCaseIds = new Set();

    selectCasesModal.classList.remove("hidden");

    selectCasesBody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="px-4 py-12 text-center">
                    <i class="fa-solid fa-spinner fa-spin text-xl text-indigo-600"></i>
                    <p class="mt-3 text-sm text-slate-500">
                        Loading approved test cases...
                    </p>

                </td>
            </tr>
            `;
    populateTargetSuites();
    try {
      const data = await apiFetch(
        `/api/testcases/?project_id=${projectId}&review_status=approved&page_size=1000`,
      );
      console.log("TEST CASE API RESPONSE:", data);
      const rawTestCases = normalizeList(data);
      console.log("RAW TEST CASES:", rawTestCases);
      console.log("RAW COUNT:", rawTestCases.length);
      console.log(
        "STATUSES:",
        rawTestCases.map((tc) => ({
          id: tc.id,
          case_id: tc.case_id,
          status: tc.status,
          review_status: tc.review_status,
        })),
      );

      allTestCases = rawTestCases.filter((testCase) => isApproved(testCase));
      console.log("APPROVED TEST CASES:", allTestCases);
      console.log("APPROVED COUNT:", allTestCases.length);
      populateRequirementFilter();
      applyCaseFilters();
    } catch (error) {
      console.error("Load test cases failed:", error);

      selectCasesBody.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        class="px-4 py-12 text-center text-rose-600"
                    >
                        ${escapeHtml(error.message)}
                    </td>
                </tr>
                `;
    }
  }
  function isApproved(testCase) {
    const status = String(testCase.review_status ?? testCase.status ?? "")
      .trim()
      .toLowerCase();

    return status === "approved";
  }
  function populateTargetSuites() {
    targetSuiteSelect.innerHTML = `
            <option value="">
                Select suite
            </option>
            `;

    suites.forEach((suite) => {
      const option = document.createElement("option");

      option.value = suite.id;

      option.textContent = suite.name;

      targetSuiteSelect.appendChild(option);
    });

    if (suites.length === 1) {
      targetSuiteSelect.value = suites[0].id;
    }

    updateAddButton();
  }
  function populateRequirementFilter() {
    const requirements = new Map();

    allTestCases.forEach((testCase) => {
      const value = getRequirementValue(testCase);

      if (value) {
        requirements.set(String(value), String(value));
      }
    });

    caseRequirementFilter.innerHTML = `
            <option value="">
                All
            </option>
            `;

    [...requirements.values()].sort().forEach((requirement) => {
      const option = document.createElement("option");

      option.value = requirement;

      option.textContent = requirement;

      caseRequirementFilter.appendChild(option);
    });
  }

  function getRequirementValue(testCase) {
    if (testCase.requirement_ref) {
      return testCase.requirement_ref;
    }

    if (testCase.requirement_id) {
      return testCase.requirement_id;
    }

    if (typeof testCase.requirement === "string") {
      return testCase.requirement;
    }

    if (typeof testCase.requirement === "number") {
      return `REQ-${testCase.requirement}`;
    }

    return "";
  }
  function applyCaseFilters() {
    const keyword = (caseSearchInput.value || "").trim().toLowerCase();

    const priority = casePriorityFilter.value;

    const requirement = caseRequirementFilter.value;

    filteredTestCases = allTestCases.filter((testCase) => {
      const caseId = String(
        testCase.case_id || `TC-${testCase.id}`,
      ).toLowerCase();
      const title = String(testCase.title || "").toLowerCase();
      const testPriority = String(testCase.priority || "").toLowerCase();
      const testRequirement = String(getRequirementValue(testCase));
      const matchesSearch =
        !keyword || caseId.includes(keyword) || title.includes(keyword);
      const matchesPriority =
        !priority || testPriority === priority.toLowerCase();
      const matchesRequirement =
        !requirement || testRequirement === requirement;
      return matchesSearch && matchesPriority && matchesRequirement;
    });

    renderCaseRows();
  }
  function renderCaseRows() {
    if (!filteredTestCases.length) {
      selectCasesBody.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        class="px-4 py-12 text-center text-sm text-slate-400"
                    >
                        No approved test cases available
                    </td>

                </tr>
                `;

      updateSelectAllState();

      updateSelectionCount();

      return;
    }

    selectCasesBody.innerHTML = filteredTestCases
      .map((testCase) => {
        const id = String(testCase.id);

        const targetSuiteId = targetSuiteSelect.value;

        const targetSuiteObj = suites.find(
          (item) => Number(item.id) === Number(targetSuiteId),
        );

        const targetAssignedIds = new Set(
          Array.isArray(targetSuiteObj?.assigned_test_cases)
            ? targetSuiteObj.assigned_test_cases.map(Number)
            : [],
        );

        const alreadyInTarget =
          targetSuiteId &&
          (targetAssignedIds.has(Number(testCase.id)) ||
            Number(testCase.suite) === Number(targetSuiteId));

        const checked = selectedCaseIds.has(id);

        const requirement = getRequirementValue(testCase);

        return `
                        <tr
                            class="border-t border-slate-100 hover:bg-slate-50"
                        >
                            <td class="px-4 py-3">
                                <input
                                    type="checkbox"
                                    class="case-checkbox rounded border-slate-300"
                                    data-id="${id}"
                                    ${checked ? "checked" : ""}
                                    ${alreadyInTarget ? "disabled" : ""}
                                />
                            </td>
                            <td class="px-4 py-3">
                                <span class="font-mono font-medium text-indigo-600">
                                    ${escapeHtml(
                                      testCase.case_id || `TC-${testCase.id}`,
                                    )}
                                </span>
                            </td>
                            <td class="px-4 py-3">
                                <div class="font-medium text-slate-800">
                                    ${escapeHtml(
                                      testCase.title || "Untitled Test Case",
                                    )}
                                </div>
                                ${
                                  alreadyInTarget
                                    ? `
                                        <span class="mt-1 inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">

                                            <i class="fa-solid fa-check"></i>

                                            Already in target suite

                                        </span>
                                        `
                                    : ""
                                }

                            </td>
                            <td class="px-4 py-3">
                                <span
                                    class="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                                >
                                    ${escapeHtml(testCase.priority || "medium")}
                                </span>
                            </td>
                            <td class="px-4 py-3 text-xs text-slate-500">
                                ${escapeHtml(requirement || "—")}
                            </td>
                        </tr>
                        `;
      })
      .join("");
    selectCasesBody.querySelectorAll(".case-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const id = checkbox.dataset.id;
        if (checkbox.checked) {
          selectedCaseIds.add(id);
        } else {
          selectedCaseIds.delete(id);
        }
        updateSelectionCount();
        updateSelectAllState();
      });
    });
    updateSelectionCount();
    updateSelectAllState();
  }
  // =====================================================
  // SELECT ALL
  // =====================================================

  function updateSelectAllState() {
    const checkboxes = [
      ...selectCasesBody.querySelectorAll(".case-checkbox:not(:disabled)"),
    ];

    if (!checkboxes.length) {
      selectAllCases.checked = false;

      selectAllCases.indeterminate = false;

      return;
    }

    const checkedCount = checkboxes.filter(
      (checkbox) => checkbox.checked,
    ).length;

    selectAllCases.checked = checkedCount === checkboxes.length;

    selectAllCases.indeterminate =
      checkedCount > 0 && checkedCount < checkboxes.length;
  }

  selectAllCases?.addEventListener("change", () => {
    const checkboxes = selectCasesBody.querySelectorAll(
      ".case-checkbox:not(:disabled)",
    );

    checkboxes.forEach((checkbox) => {
      checkbox.checked = selectAllCases.checked;

      const id = checkbox.dataset.id;

      if (checkbox.checked) {
        selectedCaseIds.add(id);
      } else {
        selectedCaseIds.delete(id);
      }
    });

    updateSelectionCount();
  });
  function updateSelectionCount() {
    selectedCasesCount.textContent = `${selectedCaseIds.size} Cases Selected`;

    updateAddButton();
  }
  function updateAddButton() {
    const hasSuite = Boolean(targetSuiteSelect.value);

    const hasCases = selectedCaseIds.size > 0;

    addSelectedCasesBtn.disabled = !hasSuite || !hasCases;
  }
  targetSuiteSelect?.addEventListener("change", () => {
    selectedCaseIds = new Set();

    renderCaseRows();
  });
  caseSearchInput?.addEventListener("input", applyCaseFilters);
  casePriorityFilter?.addEventListener("change", applyCaseFilters);
  caseRequirementFilter?.addEventListener("change", applyCaseFilters);

  async function addSelectedCasesToSuite() {
    const suiteId = targetSuiteSelect.value;

    const caseIds = [...selectedCaseIds];

    if (!suiteId) {
      showToast("Please select a Target Suite.", true);

      return;
    }

    if (!caseIds.length) {
      showToast("Please select at least one Test Case.", true);

      return;
    }

    addSelectedCasesBtn.disabled = true;
    addSelectedCasesBtn.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin mr-1"></i>
            Adding...
            `;
    try {
      const targetSuite = await apiFetch(`/api/test-suites/${suiteId}/`);
      const currentAssigned = Array.isArray(targetSuite?.assigned_test_cases)
        ? targetSuite.assigned_test_cases.map(Number)
        : [];
      const newCaseIds = caseIds.map(Number);
      const updatedAssigned = Array.from(
        new Set([...currentAssigned, ...newCaseIds]),
      );

      await apiFetch(`/api/test-suites/${suiteId}/`, {
        method: "PATCH",
        body: JSON.stringify({
          assigned_test_cases: updatedAssigned,
        }),
      });

      const suite = suites.find((item) => Number(item.id) === Number(suiteId));

      showToast(
        `${caseIds.length} Test Case(s) added to "${suite?.name || targetSuite?.name || "Suite"}".`,
      );
      closeSelectCasesModal();
      await loadSuites();
    } catch (error) {
      console.error("Add test cases failed:", error);
      showToast(error.message || "Unable to add selected test cases.", true);
    } finally {
      addSelectedCasesBtn.disabled = false;
      addSelectedCasesBtn.innerHTML = `
                <i class="fa-solid fa-plus mr-1"></i>
                Add Selected Cases to Suite
                `;
      updateAddButton();
    }
  }
  async function openSuiteDetail(suiteId) {
    suiteDetailModal.classList.remove("hidden");
    suiteDetailTitle.textContent = "Loading...";
    suiteDetailSubtitle.textContent = "Loading test cases...";
    suiteTestCasesContent.innerHTML = `
            <div class="py-16 text-center" data-testid="test-suite-detail-loading">
                <i class="fa-solid fa-spinner fa-spin text-xl text-indigo-600"></i>
                <p class="mt-3 text-sm text-slate-500">
                    Loading test cases...
                </p>

            </div>
            `;
    try {
      const suite = await apiFetch(`/api/test-suites/${suiteId}/`);

      const casesData = await apiFetch(
        `/api/testcases/?project_id=${projectId}&page_size=1000`,
      );
      const projectCases = normalizeList(casesData);
      const assignedIds = new Set(
        Array.isArray(suite.assigned_test_cases)
          ? suite.assigned_test_cases.map(Number)
          : [],
      );
      const suiteCases = projectCases.filter(
        (testCase) =>
          assignedIds.has(Number(testCase.id)) ||
          Number(testCase.suite) === Number(suiteId),
      );

      suiteDetailTitle.textContent = suite.name || "Test Suite";
      suiteDetailSubtitle.textContent = `${suiteCases.length} Test Case(s) in this suite`;
      renderSuiteDetail(suiteCases);
    } catch (error) {
      suiteTestCasesContent.innerHTML = `
                <div data-testid="test-suite-detail-error" class="py-12 text-center text-rose-600">
                    <i class="fa-solid fa-triangle-exclamation text-xl"></i>
                    <p class="mt-3 text-sm">
                        ${escapeHtml(error.message)}
                    </p>
                </div>
                `;
    }
  }
  function renderSuiteDetail(testCases) {
    if (!testCases.length) {
      suiteTestCasesContent.innerHTML = `
                <div data-testid="test-suite-detail-empty" class="py-16 text-center">
                    <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100">
                        <i class="fa-solid fa-vials text-xl text-slate-400"></i>
                    </div>
                    <h3 class="mt-4 font-semibold text-slate-700">
                        No Test Cases
                    </h3>
                    <p class="mt-1 text-sm text-slate-400">
                        This suite does not contain any test cases yet.
                    </p>
                </div>
                `;

      return;
    }

    suiteTestCasesContent.innerHTML = `
            <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div class="border-b border-slate-200 px-5 py-4">
                    <p class="text-sm font-semibold text-slate-800">
                        ${testCases.length}
                        ${testCases.length === 1 ? "Test Case" : "Test Cases"}
                    </p>
                </div>
                <div class="overflow-x-auto">
                    <table data-testid="test-suite-detail-table-cases" class="w-full text-sm">
                        <thead class="bg-slate-50">
                            <tr>
                                <th class="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                                    Case ID
                                </th>
                                <th class="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                                    Title
                                </th>
                                <th class="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                                    Priority
                                </th>
                                <th class="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                                    Requirement
                                </th>
                            </tr>
                        </thead
                        <tbody>
                            ${testCases
                              .map(
                                (testCase) =>
                                  `
                                            <tr class="border-t border-slate-100 hover:bg-slate-50">
                                                <td class="px-5 py-4">
                                                    <span class="font-mono font-medium text-indigo-600">
                                                        ${escapeHtml(
                                                          testCase.case_id ||
                                                            `TC-${testCase.id}`,
                                                        )}
                                                    </span>
                                                </td>
                                                <td class="px-5 py-4">
                                                    <span class="font-medium text-slate-800">
                                                        ${escapeHtml(
                                                          testCase.title ||
                                                            "Untitled Test Case",
                                                        )}
                                                    </span>
                                                </td>
                                                <td class="px-5 py-4">
                                                    <span class="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                                        ${escapeHtml(
                                                          testCase.priority ||
                                                            "medium",
                                                        )}
                                                    </span>
                                                </td>
                                                <td class="px-5 py-4 text-xs text-slate-500">
                                                    ${escapeHtml(
                                                      getRequirementValue(
                                                        testCase,
                                                      ) || "—",
                                                    )}
                                                </td>
                                            </tr>
                                            `,
                              )
                              .join("")}
                        </tbody>
                    </table>
                </div>
            </div>
            `;
  }
  function openDeleteModal(suite) {
    if (!canManageSuites) {
      return;
    }
    deletingSuiteId = suite.id;
    deleteSuiteMessage.textContent = `Delete "${suite.name}"? The test cases will remain in the project.`;
    deleteSuiteModal.classList.remove("hidden");
  }
  async function confirmDelete() {
    if (!canManageSuites || !deletingSuiteId) {
      return;
    }
    confirmDeleteSuiteBtn.disabled = true;
    confirmDeleteSuiteBtn.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin mr-1"></i>
            Deleting...
            `;
    try {
      await apiFetch(`/api/test-suites/${deletingSuiteId}/`, {
        method: "DELETE",
      });
      showToast("Test suite deleted.");
      closeDeleteModal();
      await loadSuites();
    } catch (error) {
      console.error("Delete suite failed:", error);
      showToast(error.message || "Unable to delete suite.", true);
    } finally {
      confirmDeleteSuiteBtn.disabled = false;
      confirmDeleteSuiteBtn.textContent = "Delete Suite";
    }
  }
  function closeSuiteForm() {
    suiteFormModal.classList.add("hidden");
    editingSuiteId = null;
    suiteForm.reset();
    hideFormError();
  }
  function closeSelectCasesModal() {
    selectCasesModal.classList.add("hidden");

    selectedCaseIds = new Set();

    updateSelectionCount();
  }

  function closeSuiteDetail() {
    suiteDetailModal.classList.add("hidden");
  }

  function closeDeleteModal() {
    deleteSuiteModal.classList.add("hidden");

    deletingSuiteId = null;
  }
  function showError(message) {
    suiteErrorMessage.textContent = message;
    suiteError.classList.remove("hidden");
  }
  function hideError() {
    suiteError.classList.add("hidden");
  }
  function showLoading(value) {
    suiteLoading.classList.toggle("hidden", !value);
  }
  function showFormError(message) {
    suiteFormError.textContent = message;
    suiteFormError.classList.remove("hidden");
  }

  function hideFormError() {
    suiteFormError.classList.add("hidden");
  }
  function showToast(message, isError = false) {
    if (!suiteToast) {
      return;
    }
    suiteToast.textContent = message;
    suiteToast.className = `
            fixed
            bottom-6
            right-6
            z-[70]
            rounded-lg
            px-5
            py-3
            text-sm
            text-white
            shadow-lg
            ${isError ? "bg-rose-600" : "bg-slate-900"}
            `;
    suiteToast.classList.remove("hidden");
    setTimeout(() => {
      suiteToast.classList.add("hidden");
    }, 3500);
  }
  createSuiteBtn?.addEventListener("click", openCreateForm);
  emptyCreateSuiteBtn?.addEventListener("click", openCreateForm);
  selectTestCasesBtn?.addEventListener("click", openSelectCasesModal);
  refreshSuitesBtn?.addEventListener("click", loadSuites);
  searchSuiteInput?.addEventListener("input", renderSuites);
  suiteForm?.addEventListener("submit", saveSuite);
  closeSuiteFormBtn?.addEventListener("click", closeSuiteForm);
  cancelSuiteFormBtn?.addEventListener("click", closeSuiteForm);
  closeSelectCasesBtn?.addEventListener("click", closeSelectCasesModal);
  cancelSelectCasesBtn?.addEventListener("click", closeSelectCasesModal);
  addSelectedCasesBtn?.addEventListener("click", addSelectedCasesToSuite);
  closeSuiteDetailBtn?.addEventListener("click", closeSuiteDetail);
  cancelDeleteSuiteBtn?.addEventListener("click", closeDeleteModal);
  confirmDeleteSuiteBtn?.addEventListener("click", confirmDelete);

  suiteFormModal?.addEventListener("click", (event) => {
    if (event.target === suiteFormModal) {
      closeSuiteForm();
    }
  });

  selectCasesModal?.addEventListener("click", (event) => {
    if (event.target === selectCasesModal) {
      closeSelectCasesModal();
    }
  });

  suiteDetailModal?.addEventListener("click", (event) => {
    if (event.target === suiteDetailModal) {
      closeSuiteDetail();
    }
  });

  deleteSuiteModal?.addEventListener("click", (event) => {
    if (event.target === deleteSuiteModal) {
      closeDeleteModal();
    }
  });
  loadSuites();
});
