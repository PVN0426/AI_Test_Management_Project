document.addEventListener("DOMContentLoaded", function () {
  // =====================================================
  // DOM
  // =====================================================

  const tableBody = document.getElementById("testCaseTableBody");
  const table = document.getElementById("testCaseTable");

  const searchInput = document.getElementById("searchTestCase");
  const reviewStatusFilter = document.getElementById("reviewStatusFilter");

  const refreshBtn = document.getElementById("refreshTestCasesBtn");

  const selectAllCheckbox = document.getElementById("selectAllTestCases");

  const selectedActionBar = document.getElementById("selectedActionBar");
  const selectedCountText = document.getElementById("selectedCountText");
  const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");

  const loadingState = document.getElementById("testCaseLoading");
  const emptyState = document.getElementById("testCaseEmpty");

  const pagination = document.getElementById("testCasePagination");
  const paginationInfo = document.getElementById("paginationInfo");
  const pageNumber = document.getElementById("pageNumber");
  const prevPageBtn = document.getElementById("prevPageBtn");
  const nextPageBtn = document.getElementById("nextPageBtn");

  // =====================================================
  // FORM
  // =====================================================

  const formModal = document.getElementById("testCaseFormModal");
  const testCaseForm = document.getElementById("testCaseForm");

  const formTitle = document.getElementById("testCaseFormTitle");
  const closeFormBtn = document.getElementById("closeTestCaseFormBtn");
  const cancelFormBtn = document.getElementById("cancelTestCaseBtn");

  const titleInput = document.getElementById("testCaseTitle");
  const preconditionInput = document.getElementById(
    "testCasePrecondition"
  );
  const priorityInput = document.getElementById("testCasePriority");

  const reviewStatusInput = document.getElementById(
    "testCaseReviewStatus"
  );

  const testResultInput = document.getElementById(
    "testCaseResult"
  );

  const stepsContainer = document.getElementById("stepsContainer");
  const addStepBtn = document.getElementById("addStepBtn");

  const formError = document.getElementById("testCaseFormError");
  const saveBtn = document.getElementById("saveTestCaseBtn");

  // =====================================================
  // DETAIL
  // =====================================================

  const detailModal = document.getElementById("testCaseDetailModal");
  const detailContent = document.getElementById(
    "testCaseDetailContent"
  );
  const detailTitle = document.getElementById("detailTitle");
  const closeDetailBtn = document.getElementById("closeDetailBtn");

  // =====================================================
  // DELETE
  // =====================================================

  const deleteModal = document.getElementById("deleteConfirmModal");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

  const toast = document.getElementById("testCaseToast");

  // =====================================================
  // STATE
  // =====================================================

  const ITEMS_PER_PAGE = 8;

  let allTestCases = [];
  let filteredTestCases = [];

  let currentPage = 1;

  let selectedTestCaseIds = new Set();

  let editingTestCaseId = null;
  let deletingTestCaseId = null;

  // =====================================================
  // PROJECT
  // =====================================================

  const pathParts = window.location.pathname.split("/");

  const projectIndex = pathParts.indexOf("projects") + 1;

  const currentProjectId =
    projectIndex > 0
      ? pathParts[projectIndex]
      : localStorage.getItem("current_project_id");

  // =====================================================
  // INIT
  // =====================================================

  fetchTestCases();

  // =====================================================
  // GET TEST CASES
  // =====================================================

  async function fetchTestCases() {
    showLoading(true);

    try {
      const params = new URLSearchParams();

      const search = searchInput
        ? searchInput.value.trim()
        : "";

      if (currentProjectId) {
        params.append("project_id", currentProjectId);
      }

      const reviewStatus = reviewStatusFilter
        ? reviewStatusFilter.value
        : "";

      if (search) {
        params.append("search", search);
      }

      // =================================================
      // STATUS FILTER
      // Giữ Status Draft / Approved
      // Không có Test Result filter
      // =================================================

      if (reviewStatus) {
        params.append("review_status", reviewStatus);
      }

      const query = params.toString()
        ? `?${params.toString()}`
        : "";

      const url = `/api/testcases/${query}`;

      const response = await apiFetch(url);

      if (!response.ok) {
        const errorText = await response.text();

        console.error(
          "Get test cases failed:",
          errorText
        );

        showToast(
          "Không thể tải Test Cases.",
          true
        );

        return;
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        allTestCases = data;
      } else if (
        data &&
        Array.isArray(data.results)
      ) {
        allTestCases = data.results;
      } else {
        console.error(
          "API không trả về array:",
          data
        );

        allTestCases = [];
      }

      filteredTestCases = [...allTestCases];

      currentPage = 1;

      selectedTestCaseIds.clear();

      renderTestCases();
    } catch (error) {
      console.error(
        "Fetch test cases error:",
        error
      );

      showToast(
        "Đã xảy ra lỗi khi tải Test Cases.",
        true
      );
    } finally {
      showLoading(false);
    }
  }

  // =====================================================
  // SEARCH
  // =====================================================

  let searchTimeout;

  if (searchInput) {
    searchInput.addEventListener(
      "input",
      function () {
        clearTimeout(searchTimeout);

        searchTimeout = setTimeout(
          fetchTestCases,
          400
        );
      }
    );
  }

  // =====================================================
  // STATUS FILTER
  // =====================================================

  if (reviewStatusFilter) {
    reviewStatusFilter.addEventListener(
      "change",
      function () {
        fetchTestCases();
      }
    );
  }

  // =====================================================
  // REFRESH
  // =====================================================

  if (refreshBtn) {
    refreshBtn.addEventListener(
      "click",
      function () {
        fetchTestCases();
      }
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  function renderTestCases() {
    if (!tableBody) {
      return;
    }

    tableBody.innerHTML = "";

    if (filteredTestCases.length === 0) {
      table.classList.add("hidden");

      if (emptyState) {
        emptyState.classList.remove("hidden");
      }

      if (pagination) {
        pagination.classList.add("hidden");
      }

      updateSelectionUI();

      return;
    }

    table.classList.remove("hidden");

    if (emptyState) {
      emptyState.classList.add("hidden");
    }

    const totalPages = Math.ceil(
      filteredTestCases.length / ITEMS_PER_PAGE
    );

    if (currentPage > totalPages) {
      currentPage = totalPages;
    }

    const startIndex =
      (currentPage - 1) * ITEMS_PER_PAGE;

    const endIndex =
      startIndex + ITEMS_PER_PAGE;

    const pageItems =
      filteredTestCases.slice(
        startIndex,
        endIndex
      );

    if (pageItems.length === 0) {
      table.classList.add("hidden");

      if (emptyState) {
        emptyState.classList.remove("hidden");
      }

      if (pagination) {
        pagination.classList.add("hidden");
      }

      return;
    }

    pageItems.forEach(function (testCase) {
      const row = document.createElement("tr");

      row.className =
        "border-b border-slate-100 hover:bg-slate-50 transition";

      const id = String(testCase.id);

      const isSelected =
        selectedTestCaseIds.has(id);

      const priority =
        testCase.priority || "medium";

      // =================================================
      // STATUS
      // Draft / Approved
      // =================================================

      const status =
        testCase.review_status || "draft";

      // =================================================
      // TEST RESULT
      // Not Run / Passed / Failed / Skipped / Blocked
      // =================================================

      const testResult =
        testCase.test_result || "not_run";

      const source =
        testCase.source || "manual";

      const steps = Array.isArray(
        testCase.steps
      )
        ? testCase.steps
        : [];

      row.innerHTML = `

        <!-- CHECKBOX -->

        <td class="px-4 py-4 text-center">

          <input
            type="checkbox"
            class="testcase-checkbox rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            value="${id}"
            ${isSelected ? "checked" : ""}
            data-testid="testcase-list-checkbox-select"
          />

        </td>


        <!-- ID -->

        <td class="px-4 py-4">

          <span
            class="font-mono font-semibold text-indigo-600"
          >
            ${escapeHtml(
              testCase.case_id ||
                `TC-${id}`
            )}
          </span>

        </td>


        <!-- TITLE -->

        <td class="px-4 py-4">

          <div class="max-w-md">

            <button
              type="button"
              class="view-testcase-btn text-left font-medium text-slate-800 hover:text-indigo-600"
              data-id="${id}"
              data-testid="testcase-list-btn-view"
            >
              ${escapeHtml(
                testCase.title ||
                  "Untitled Test Case"
              )}
            </button>

            ${
              testCase.precondition
                ? `
                  <p
                    class="mt-1 text-xs text-slate-400 line-clamp-1"
                  >
                    ${escapeHtml(
                      testCase.precondition
                    )}
                  </p>
                `
                : ""
            }

          </div>

        </td>


        <!-- PRIORITY -->

        <td class="px-4 py-4">

          <span
            class="
              inline-flex
              px-2.5
              py-1
              rounded-md
              text-xs
              font-medium
              ${getPriorityClass(priority)}
            "
          >
            ${escapeHtml(priority)}
          </span>

        </td>


        <!-- STATUS -->

        <td class="px-4 py-4">

          <span
            class="
              inline-flex
              px-2.5
              py-1
              rounded-md
              text-xs
              font-medium
              ${getStatusClass(status)}
            "
          >
            ${escapeHtml(status)}
          </span>

        </td>


        <!-- TEST RESULT -->

        <td class="px-4 py-4">

          <select
            class="
              test-result-select
              px-2.5
              py-1.5
              rounded-md
              border
              border-slate-200
              text-xs
              font-medium
              focus:outline-none
              focus:ring-2
              focus:ring-indigo-500
              ${getTestResultClass(testResult)}
            "
            data-id="${id}"
            data-testid="testcase-list-select-test-result"
          >

            <option
              value="not_run"
              ${
                testResult === "not_run"
                  ? "selected"
                  : ""
              }
            >
              Not Run
            </option>

            <option
              value="passed"
              ${
                testResult === "passed"
                  ? "selected"
                  : ""
              }
            >
              Passed
            </option>

            <option
              value="failed"
              ${
                testResult === "failed"
                  ? "selected"
                  : ""
              }
            >
              Failed
            </option>

            <option
              value="skipped"
              ${
                testResult === "skipped"
                  ? "selected"
                  : ""
              }
            >
              Skipped
            </option>

            <option
              value="blocked"
              ${
                testResult === "blocked"
                  ? "selected"
                  : ""
              }
            >
              Blocked
            </option>

          </select>

        </td>


        <!-- SOURCE -->

        <td class="px-4 py-4">

          ${
            source === "ai"
              ? `
                <span
                  class="
                    inline-flex
                    items-center
                    gap-1
                    px-2.5
                    py-1
                    rounded-md
                    text-xs
                    font-medium
                    bg-violet-50
                    text-violet-600
                  "
                >
                  <i
                    class="fa-solid fa-wand-magic-sparkles"
                  ></i>

                  AI
                </span>
              `
              : `
                <span
                  class="text-xs text-slate-500"
                >
                  Manual
                </span>
              `
          }

        </td>


        <!-- STEPS -->

        <td class="px-4 py-4 text-slate-600">

          ${
            testCase.steps_count !==
            undefined
              ? testCase.steps_count
              : steps.length
          }

        </td>


        <!-- ACTIONS -->

        <td class="px-4 py-4 text-right">

          <div
            class="flex items-center justify-end gap-1"
          >

            <!-- VIEW -->

            <button
              type="button"
              class="
                view-testcase-btn
                p-2
                rounded-lg
                text-slate-400
                hover:text-indigo-600
                hover:bg-indigo-50
              "
              data-id="${id}"
              data-testid="testcase-list-btn-view"
              title="View"
            >
              <i class="fa-solid fa-eye"></i>
            </button>


            <!-- EDIT -->

            <button
              type="button"
              class="
                edit-testcase-btn
                p-2
                rounded-lg
                text-slate-400
                hover:text-indigo-600
                hover:bg-indigo-50
              "
              data-id="${id}"
              data-testid="testcase-list-btn-edit"
              title="Edit"
            >
              <i class="fa-solid fa-pen"></i>
            </button>


            <!-- DELETE -->

            <button
              type="button"
              class="
                delete-testcase-btn
                p-2
                rounded-lg
                text-slate-400
                hover:text-rose-600
                hover:bg-rose-50
              "
              data-id="${id}"
              data-testid="testcase-list-btn-delete"
              title="Delete"
            >
              <i class="fa-solid fa-trash"></i>
            </button>

          </div>

        </td>

      `;

      tableBody.appendChild(row);
    });

    updatePagination(
      totalPages,
      startIndex,
      endIndex
    );

    attachRowEvents();

    updateSelectionUI();

    updateSelectAll();
  }

  // =====================================================
  // ROW EVENTS
  // =====================================================

  function attachRowEvents() {

    // ===================================================
    // CHECKBOX
    // ===================================================

    document
      .querySelectorAll(".testcase-checkbox")
      .forEach(function (checkbox) {

        checkbox.addEventListener(
          "change",
          function () {

            const id = String(
              checkbox.value
            );

            if (checkbox.checked) {
              selectedTestCaseIds.add(id);
            } else {
              selectedTestCaseIds.delete(id);
            }

            updateSelectionUI();

            updateSelectAll();
          }
        );
      });


    // ===================================================
    // VIEW
    // ===================================================

    document
      .querySelectorAll(".view-testcase-btn")
      .forEach(function (button) {

        button.addEventListener(
          "click",
          function () {

            const id =
              button.dataset.id;

            openDetail(id);
          }
        );
      });


    // ===================================================
    // EDIT
    // ===================================================

    document
      .querySelectorAll(".edit-testcase-btn")
      .forEach(function (button) {

        button.addEventListener(
          "click",
          function () {

            const id =
              button.dataset.id;

            openEditForm(id);
          }
        );
      });


    // ===================================================
    // DELETE
    // ===================================================

    document
      .querySelectorAll(".delete-testcase-btn")
      .forEach(function (button) {

        button.addEventListener(
          "click",
          function () {

            const id =
              button.dataset.id;

            openDeleteModal(id);
          }
        );
      });


    // ===================================================
    // TEST RESULT
    // ===================================================

    document
      .querySelectorAll(".test-result-select")
      .forEach(function (select) {

        select.addEventListener(
          "change",
          async function () {

            const id =
              select.dataset.id;

            const result =
              select.value;

            try {

              select.disabled = true;

              const response =
                await apiFetch(
                  `/api/testcases/${id}/`,
                  {
                    method: "PATCH",

                    headers: {
                      "Content-Type":
                        "application/json",
                    },

                    body: JSON.stringify({
                      test_result: result,
                    }),
                  }
                );

              const data =
                await response
                  .json()
                  .catch(() => ({}));

              if (!response.ok) {

                console.error(
                  "Update test result failed:",
                  data
                );

                showToast(
                  "Không thể cập nhật Test Result.",
                  true
                );

                return;
              }

              // Cập nhật data local
              const localTestCase =
                allTestCases.find(
                  (testCase) =>
                    String(
                      testCase.id
                    ) === id
                );

              if (localTestCase) {
                localTestCase.test_result =
                  result;
              }

              const filteredTestCase =
                filteredTestCases.find(
                  (testCase) =>
                    String(
                      testCase.id
                    ) === id
                );

              if (filteredTestCase) {
                filteredTestCase.test_result =
                  result;
              }

              // Cập nhật màu
              updateTestResultSelectClass(
                select,
                result
              );

              showToast(
                "Test Result đã được cập nhật."
              );

            } catch (error) {

              console.error(
                "Update Test Result error:",
                error
              );

              showToast(
                "Không thể cập nhật Test Result.",
                true
              );

            } finally {

              select.disabled = false;
            }
          }
        );
      });
  }

  // =====================================================
  // UPDATE TEST RESULT COLOR
  // =====================================================

  function updateTestResultSelectClass(
    select,
    result
  ) {

    const classesToRemove = [
      "bg-emerald-50",
      "text-emerald-600",

      "bg-rose-50",
      "text-rose-600",

      "bg-slate-100",
      "text-slate-600",

      "bg-orange-50",
      "text-orange-600",

      "bg-amber-50",
      "text-amber-600",
    ];

    select.classList.remove(
      ...classesToRemove
    );

    select.classList.add(
      ...getTestResultClass(result)
        .split(" ")
    );
  }

  // =====================================================
  // SELECT ALL
  // =====================================================

  if (selectAllCheckbox) {

    selectAllCheckbox.addEventListener(
      "change",
      function () {

        const checkboxes =
          document.querySelectorAll(
            ".testcase-checkbox"
          );

        checkboxes.forEach(
          function (checkbox) {

            checkbox.checked =
              selectAllCheckbox.checked;

            const id = String(
              checkbox.value
            );

            if (checkbox.checked) {
              selectedTestCaseIds.add(id);
            } else {
              selectedTestCaseIds.delete(id);
            }
          }
        );

        updateSelectionUI();
      }
    );
  }

  function updateSelectAll() {

    const checkboxes =
      Array.from(
        document.querySelectorAll(
          ".testcase-checkbox"
        )
      );

    if (
      !selectAllCheckbox ||
      checkboxes.length === 0
    ) {

      if (selectAllCheckbox) {
        selectAllCheckbox.checked =
          false;

        selectAllCheckbox.indeterminate =
          false;
      }

      return;
    }

    const checkedCount =
      checkboxes.filter(
        (checkbox) =>
          checkbox.checked
      ).length;

    selectAllCheckbox.checked =
      checkedCount ===
      checkboxes.length;

    selectAllCheckbox.indeterminate =
      checkedCount > 0 &&
      checkedCount < checkboxes.length;
  }

  // =====================================================
  // SELECTION UI
  // =====================================================

  function updateSelectionUI() {

    const count =
      selectedTestCaseIds.size;

    if (
      selectedActionBar &&
      selectedCountText
    ) {

      if (count > 0) {
        selectedActionBar.classList.remove(
          "hidden"
        );
      } else {
        selectedActionBar.classList.add(
          "hidden"
        );
      }

      selectedCountText.textContent =
        `${count} Test Case${
          count !== 1 ? "s" : ""
        } Selected`;
    }
  }

  // =====================================================
  // PAGINATION
  // =====================================================

  function updatePagination(
    totalPages,
    startIndex,
    endIndex
  ) {

    if (!pagination) {
      return;
    }

    if (totalPages <= 1) {

      pagination.classList.add(
        "hidden"
      );

      return;
    }

    pagination.classList.remove(
      "hidden"
    );

    const actualEnd =
      Math.min(
        endIndex,
        filteredTestCases.length
      );

    if (paginationInfo) {
      paginationInfo.textContent =
        `Showing ${
          startIndex + 1
        }-${actualEnd} of ${
          filteredTestCases.length
        }`;
    }

    if (pageNumber) {
      pageNumber.textContent =
        `${currentPage} / ${totalPages}`;
    }

    if (prevPageBtn) {
      prevPageBtn.disabled =
        currentPage === 1;
    }

    if (nextPageBtn) {
      nextPageBtn.disabled =
        currentPage === totalPages;
    }
  }

  if (prevPageBtn) {

    prevPageBtn.addEventListener(
      "click",
      function () {

        if (currentPage > 1) {

          currentPage--;

          renderTestCases();
        }
      }
    );
  }

  if (nextPageBtn) {

    nextPageBtn.addEventListener(
      "click",
      function () {

        const totalPages =
          Math.ceil(
            filteredTestCases.length /
              ITEMS_PER_PAGE
          );

        if (
          currentPage < totalPages
        ) {

          currentPage++;

          renderTestCases();
        }
      }
    );
  }

  // =====================================================
  // CREATE
  // =====================================================

  const createBtn =
    document.getElementById(
      "createTestCaseBtn"
    );

  if (createBtn) {

    createBtn.addEventListener(
      "click",
      function () {

        openCreateForm();
      }
    );
  }

  function openCreateForm() {

    editingTestCaseId = null;

    if (formTitle) {
      formTitle.textContent =
        "Create Test Case";
    }

    if (saveBtn) {
      saveBtn.textContent =
        "Create Test Case";
    }

    if (testCaseForm) {
      testCaseForm.reset();
    }

    // Status mặc định Draft
    if (reviewStatusInput) {
      reviewStatusInput.value =
        "draft";
    }

    // Test Result mặc định Not Run
    if (testResultInput) {
      testResultInput.value =
        "not_run";
    }

    if (stepsContainer) {
      stepsContainer.innerHTML = "";
    }

    addStep();

    if (formError) {
      formError.classList.add(
        "hidden"
      );
    }

    if (formModal) {
      formModal.classList.remove(
        "hidden"
      );
    }
  }

  // =====================================================
  // EDIT
  // =====================================================

  async function openEditForm(id) {

    try {

      const response =
        await apiFetch(
          `/api/testcases/${id}/`
        );

      const data =
        await response.json()
          .catch(() => ({}));

      if (!response.ok) {

        console.error(
          "Get test case failed:",
          data
        );

        showToast(
          "Không thể tải Test Case.",
          true
        );

        return;
      }

      editingTestCaseId = id;

      if (formTitle) {
        formTitle.textContent =
          "Edit Test Case";
      }

      if (saveBtn) {
        saveBtn.textContent =
          "Update Test Case";
      }

      if (titleInput) {
        titleInput.value =
          data.title || "";
      }

      if (preconditionInput) {
        preconditionInput.value =
          data.precondition || "";
      }

      if (priorityInput) {
        priorityInput.value =
          data.priority || "medium";
      }

      // Giữ Status
      if (reviewStatusInput) {
        reviewStatusInput.value =
          data.review_status ||
          "draft";
      }

      // Test Result
      if (testResultInput) {
        testResultInput.value =
          data.test_result ||
          "not_run";
      }

      if (stepsContainer) {
        stepsContainer.innerHTML = "";
      }

      const steps =
        Array.isArray(data.steps)
          ? data.steps
          : [];

      if (steps.length === 0) {

        addStep();

      } else {

        steps.forEach(
          function (step) {

            addStep(
              step.action || "",
              step.expected || ""
            );
          }
        );
      }

      if (formError) {
        formError.classList.add(
          "hidden"
        );
      }

      if (formModal) {
        formModal.classList.remove(
          "hidden"
        );
      }

    } catch (error) {

      console.error(
        "Edit form error:",
        error
      );

      showToast(
        "Không thể mở Test Case.",
        true
      );
    }
  }

  // =====================================================
  // ADD STEP
  // =====================================================

  if (addStepBtn) {

    addStepBtn.addEventListener(
      "click",
      function () {

        addStep();
      }
    );
  }

  function addStep(
    action = "",
    expected = ""
  ) {

    if (!stepsContainer) {
      return;
    }

    const step =
      document.createElement("div");

    step.className =
      "step-item border border-slate-200 rounded-xl p-4";

    step.innerHTML = `

      <div
        class="flex items-center justify-between mb-3"
      >

        <span
          class="text-sm font-semibold text-slate-600"
        >
          Test Step
        </span>

        <button
          type="button"
          class="remove-step-btn text-slate-400 hover:text-rose-600"
          data-testid="testcase-form-btn-remove-step"
          title="Remove step"
        >
          <i class="fa-solid fa-trash"></i>
        </button>

      </div>


      <div class="grid md:grid-cols-2 gap-3">

        <div>

          <label
            class="block text-xs font-medium text-slate-500 mb-1"
          >
            Action
          </label>

          <textarea
            class="
              step-action
              w-full
              px-3
              py-2
              rounded-lg
              border
              border-slate-200
              text-sm
              focus:ring-2
              focus:ring-indigo-500
              focus:outline-none
            "
            data-testid="testcase-form-textarea-step-action"
            rows="3"
            placeholder="Enter action"
          >${escapeHtml(action)}</textarea>

        </div>


        <div>

          <label
            class="block text-xs font-medium text-slate-500 mb-1"
          >
            Expected Result
          </label>

          <textarea
            class="
              step-expected
              w-full
              px-3
              py-2
              rounded-lg
              border
              border-slate-200
              text-sm
              focus:ring-2
              focus:ring-indigo-500
              focus:outline-none
            "
            data-testid="testcase-form-textarea-step-expected"
            rows="3"
            placeholder="Enter expected result"
          >${escapeHtml(expected)}</textarea>

        </div>

      </div>

    `;

    stepsContainer.appendChild(step);

    const removeBtn =
      step.querySelector(
        ".remove-step-btn"
      );

    if (removeBtn) {

      removeBtn.addEventListener(
        "click",
        function () {

          step.remove();
        }
      );
    }
  }

  // =====================================================
  // SUBMIT CREATE / UPDATE
  // =====================================================

  if (testCaseForm) {

    testCaseForm.addEventListener(
      "submit",
      async function (event) {

        event.preventDefault();

        const title =
          titleInput
            ? titleInput.value.trim()
            : "";

        if (!title) {

          showFormError(
            "Vui lòng nhập Title."
          );

          return;
        }

        const steps =
          Array.from(
            document.querySelectorAll(
              "#stepsContainer .step-item"
            )
          ).map(
            function (step, index) {

              return {
                order: index + 1,

                action:
                  step
                    .querySelector(
                      ".step-action"
                    )
                    .value
                    .trim(),

                expected:
                  step
                    .querySelector(
                      ".step-expected"
                    )
                    .value
                    .trim(),
              };
            }
          );

        const payload = {
          project_id:
            Number(currentProjectId),

          title: title,

          precondition:
            preconditionInput
              ? preconditionInput.value.trim()
              : "",

          priority:
            priorityInput
              ? priorityInput.value
              : "medium",

          // STATUS
          review_status:
            reviewStatusInput
              ? reviewStatusInput.value
              : "draft",

          // TEST RESULT
          test_result:
            testResultInput
              ? testResultInput.value
              : "not_run",

          steps: steps,
        };

        if (saveBtn) {
          saveBtn.disabled = true;
        }

        const originalText =
          saveBtn
            ? saveBtn.innerHTML
            : "";

        if (saveBtn) {
          saveBtn.innerHTML = `
            <i
              class="fa-solid fa-spinner fa-spin mr-1"
            ></i>
            Saving...
          `;
        }

        try {

          let response;

          if (editingTestCaseId) {

            // =========================================
            // UPDATE
            // =========================================

            response =
              await apiFetch(
                `/api/testcases/${editingTestCaseId}/`,
                {
                  method: "PATCH",

                  headers: {
                    "Content-Type":
                      "application/json",
                  },

                  body:
                    JSON.stringify(
                      payload
                    ),
                }
              );

          } else {

            // =========================================
            // CREATE
            // =========================================

            response =
              await apiFetch(
                "/api/testcases/",
                {
                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/json",
                  },

                  body:
                    JSON.stringify(
                      payload
                    ),
                }
              );
          }

          const data =
            await response
              .json()
              .catch(() => ({}));

          if (!response.ok) {

            console.error(
              "Save test case failed:",
              data
            );

            showFormError(
              data.detail ||
                data.error ||
                "Không thể lưu Test Case."
            );

            return;
          }

          closeForm();

          showToast(
            editingTestCaseId
              ? "Test Case đã được cập nhật."
              : "Test Case đã được tạo."
          );

          await fetchTestCases();

        } catch (error) {

          console.error(
            "Save Test Case error:",
            error
          );

          showFormError(
            "Đã xảy ra lỗi khi lưu Test Case."
          );

        } finally {

          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML =
              originalText;
          }
        }
      }
    );
  }

  // =====================================================
  // DETAIL
  // =====================================================

  async function openDetail(id) {

    if (!detailModal) {
      return;
    }

    detailModal.classList.remove(
      "hidden"
    );

    if (detailContent) {

      detailContent.innerHTML = `

        <div
          data-testid="testcase-detail-loading"
          class="py-10 text-center"
        >

          <i
            class="
              fa-solid
              fa-spinner
              fa-spin
              text-xl
              text-indigo-600
            "
          ></i>

          <p
            class="mt-2 text-sm text-slate-500"
          >
            Loading...
          </p>

        </div>

      `;
    }

    try {

      const response =
        await apiFetch(
          `/api/testcases/${id}/`
        );

      const data =
        await response.json();

      if (!response.ok) {

        throw new Error(
          data.detail ||
            "Cannot load test case"
        );
      }

      if (detailTitle) {
        detailTitle.textContent =
          data.title ||
          "Test Case Detail";
      }

      renderDetail(data);

    } catch (error) {

      console.error(
        "Detail error:",
        error
      );

      if (detailContent) {

        detailContent.innerHTML = `

          <div
            data-testid="testcase-detail-error"
            class="
              p-4
              rounded-xl
              bg-rose-50
              text-rose-600
              text-sm
            "
          >
            Không thể tải Test Case.
          </div>

        `;
      }
    }
  }

  function renderDetail(testCase) {

    const steps =
      Array.isArray(testCase.steps)
        ? testCase.steps
        : [];

    const testResult =
      testCase.test_result ||
      "not_run";

    if (!detailContent) {
      return;
    }

    detailContent.innerHTML = `

      <div class="space-y-6">

        <!-- META -->

        <div
          class="grid md:grid-cols-5 gap-4"
        >

          <!-- TEST CASE -->

          <div
            class="p-4 rounded-xl bg-slate-50"
          >

            <p
              class="text-xs text-slate-400"
            >
              Test Case
            </p>

            <p
              class="
                mt-1
                font-mono
                font-semibold
                text-indigo-600
              "
            >
              ${escapeHtml(
                testCase.case_id ||
                  `TC-${testCase.id}`
              )}
            </p>

          </div>


          <!-- PRIORITY -->

          <div
            class="p-4 rounded-xl bg-slate-50"
          >

            <p
              class="text-xs text-slate-400"
            >
              Priority
            </p>

            <p
              class="mt-1 font-semibold text-slate-700"
            >
              ${escapeHtml(
                testCase.priority ||
                  "medium"
              )}
            </p>

          </div>


          <!-- STATUS -->

          <div
            class="p-4 rounded-xl bg-slate-50"
          >

            <p
              class="text-xs text-slate-400"
            >
              Review Status
            </p>

            <p
              class="mt-1 font-semibold text-slate-700"
            >
              ${escapeHtml(
                testCase.review_status ||
                  "draft"
              )}
            </p>

          </div>


          <!-- TEST RESULT -->

          <div
            class="p-4 rounded-xl bg-slate-50"
          >

            <p
              class="text-xs text-slate-400"
            >
              Test Result
            </p>

            <p
              class="
                mt-1
                inline-flex
                px-2.5
                py-1
                rounded-md
                text-xs
                font-medium
                ${getTestResultClass(
                  testResult
                )}
              "
            >
              ${escapeHtml(
                formatTestResult(
                  testResult
                )
              )}
            </p>

          </div>


          <!-- SOURCE -->

          <div
            class="p-4 rounded-xl bg-slate-50"
          >

            <p
              class="text-xs text-slate-400"
            >
              Source
            </p>

            <p
              class="mt-1 font-semibold text-slate-700"
            >
              ${escapeHtml(
                testCase.source ||
                  "manual"
              )}
            </p>

          </div>

        </div>


        <!-- PRECONDITION -->

        <div>

          <h3
            class="text-sm font-semibold text-slate-700"
          >
            Precondition
          </h3>

          <div
            class="
              mt-2
              p-4
              rounded-xl
              bg-slate-50
              text-sm
              text-slate-600
            "
          >
            ${
              testCase.precondition
                ? escapeHtml(
                    testCase.precondition
                  )
                : "None"
            }
          </div>

        </div>


        <!-- STEPS -->

        <div>

          <h3
            class="
              text-sm
              font-semibold
              text-slate-700
              mb-3
            "
          >
            Test Steps
          </h3>


          ${
            steps.length === 0
              ? `

                <div
                  data-testid="testcase-detail-empty-steps"
                  class="
                    py-8
                    text-center
                    text-sm
                    text-slate-400
                  "
                >
                  No steps.
                </div>

              `
              : `

                <div
                  class="
                    overflow-hidden
                    border
                    border-slate-200
                    rounded-xl
                  "
                >

                  <table
                    data-testid="testcase-detail-table-steps"
                    class="w-full text-sm"
                  >

                    <thead
                      class="bg-slate-50"
                    >

                      <tr>

                        <th
                          class="px-4 py-3 text-left w-16"
                        >
                          #
                        </th>

                        <th
                          class="px-4 py-3 text-left"
                        >
                          Action
                        </th>

                        <th
                          class="px-4 py-3 text-left"
                        >
                          Expected Result
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      ${steps
                        .map(
                          function (
                            step,
                            index
                          ) {

                            return `

                              <tr
                                class="
                                  border-t
                                  border-slate-200
                                "
                              >

                                <td
                                  class="
                                    px-4
                                    py-3
                                    font-medium
                                    text-slate-500
                                  "
                                >
                                  ${
                                    step.order ||
                                    index + 1
                                  }
                                </td>

                                <td
                                  class="
                                    px-4
                                    py-3
                                    text-slate-700
                                  "
                                >
                                  ${escapeHtml(
                                    step.action ||
                                      ""
                                  )}
                                </td>

                                <td
                                  class="
                                    px-4
                                    py-3
                                    text-slate-700
                                  "
                                >
                                  ${escapeHtml(
                                    step.expected ||
                                      ""
                                  )}
                                </td>

                              </tr>

                            `;
                          }
                        )
                        .join("")}

                    </tbody>

                  </table>

                </div>

              `
          }

        </div>

      </div>

    `;
  }

  // =====================================================
  // DELETE ONE
  // =====================================================

  function openDeleteModal(id) {

    deletingTestCaseId = id;

    if (deleteModal) {
      deleteModal.classList.remove(
        "hidden"
      );
    }
  }

  if (confirmDeleteBtn) {

    confirmDeleteBtn.addEventListener(
      "click",
      async function () {

        if (!deletingTestCaseId) {
          return;
        }

        confirmDeleteBtn.disabled =
          true;

        try {

          const response =
            await apiFetch(
              `/api/testcases/${deletingTestCaseId}/`,
              {
                method: "DELETE",
              }
            );

          if (!response.ok) {

            const data =
              await response
                .json()
                .catch(() => ({}));

            throw new Error(
              data.detail ||
                data.error ||
                "Delete failed"
            );
          }

          selectedTestCaseIds.delete(
            String(deletingTestCaseId)
          );

          closeDeleteModal();

          showToast(
            "Test Case đã được xóa."
          );

          await fetchTestCases();

        } catch (error) {

          console.error(
            "Delete error:",
            error
          );

          showToast(
            "Không thể xóa Test Case.",
            true
          );

        } finally {

          confirmDeleteBtn.disabled =
            false;
        }
      }
    );
  }

  // =====================================================
  // DELETE SELECTED
  // =====================================================

  if (deleteSelectedBtn) {

    deleteSelectedBtn.addEventListener(
      "click",
      async function () {

        const ids =
          Array.from(
            selectedTestCaseIds
          );

        if (ids.length === 0) {
          return;
        }

        if (
          !confirm(
            `Bạn có chắc muốn xóa ${ids.length} Test Case đã chọn không?`
          )
        ) {
          return;
        }

        deleteSelectedBtn.disabled =
          true;

        try {

          for (const id of ids) {

            const response =
              await apiFetch(
                `/api/testcases/${id}/`,
                {
                  method: "DELETE",
                }
              );

            if (!response.ok) {

              console.error(
                `Không thể xóa Test Case ${id}`
              );
            }
          }

          selectedTestCaseIds.clear();

          showToast(
            "Đã xóa các Test Case đã chọn."
          );

          await fetchTestCases();

        } catch (error) {

          console.error(
            "Bulk delete error:",
            error
          );

          showToast(
            "Có lỗi khi xóa Test Cases.",
            true
          );

        } finally {

          deleteSelectedBtn.disabled =
            false;
        }
      }
    );
  }

  // =====================================================
  // CLOSE FORM
  // =====================================================

  function closeForm() {

    if (formModal) {
      formModal.classList.add(
        "hidden"
      );
    }

    editingTestCaseId = null;
  }

  if (closeFormBtn) {

    closeFormBtn.addEventListener(
      "click",
      closeForm
    );
  }

  if (cancelFormBtn) {

    cancelFormBtn.addEventListener(
      "click",
      closeForm
    );
  }

  // =====================================================
  // CLOSE DETAIL
  // =====================================================

  if (closeDetailBtn) {

    closeDetailBtn.addEventListener(
      "click",
      function () {

        if (detailModal) {
          detailModal.classList.add(
            "hidden"
          );
        }
      }
    );
  }

  // =====================================================
  // CLOSE DELETE
  // =====================================================

  function closeDeleteModal() {

    if (deleteModal) {
      deleteModal.classList.add(
        "hidden"
      );
    }

    deletingTestCaseId = null;
  }

  if (cancelDeleteBtn) {

    cancelDeleteBtn.addEventListener(
      "click",
      closeDeleteModal
    );
  }

  // =====================================================
  // HELPERS
  // =====================================================

  function showLoading(show) {

    if (!loadingState) {
      return;
    }

    if (show) {
      loadingState.classList.remove(
        "hidden"
      );
    } else {
      loadingState.classList.add(
        "hidden"
      );
    }
  }

  function showFormError(message) {

    if (!formError) {
      return;
    }

    formError.textContent =
      message;

    formError.classList.remove(
      "hidden"
    );
  }

  function showToast(
    message,
    error = false
  ) {

    if (!toast) {
      return;
    }

    toast.textContent =
      message;

    toast.className = `
      fixed
      right-6
      bottom-6
      z-[70]
      px-5
      py-3
      rounded-xl
      shadow-lg
      text-white
      text-sm
      ${
        error
          ? "bg-rose-600"
          : "bg-slate-900"
      }
    `;

    toast.classList.remove(
      "hidden"
    );

    setTimeout(
      function () {
        toast.classList.add(
          "hidden"
        );
      },
      3000
    );
  }

  // =====================================================
  // PRIORITY COLOR
  // =====================================================

  function getPriorityClass(
    priority
  ) {

    switch (
      String(priority).toLowerCase()
    ) {

      case "high":
        return "bg-rose-50 text-rose-600";

      case "low":
        return "bg-emerald-50 text-emerald-600";

      default:
        return "bg-amber-50 text-amber-600";
    }
  }

  // =====================================================
  // REVIEW STATUS COLOR
  // =====================================================

  function getStatusClass(status) {

    switch (
      String(status).toLowerCase()
    ) {

      case "approved":
        return "bg-emerald-50 text-emerald-600";

      case "draft":
        return "bg-amber-50 text-amber-600";

      default:
        return "bg-slate-100 text-slate-600";
    }
  }

  // =====================================================
  // TEST RESULT COLOR
  // =====================================================

  function getTestResultClass(
    result
  ) {

    switch (
      String(result).toLowerCase()
    ) {

      case "passed":
        return "bg-emerald-50 text-emerald-600";

      case "failed":
        return "bg-rose-50 text-rose-600";

      case "skipped":
        return "bg-slate-100 text-slate-600";

      case "blocked":
        return "bg-orange-50 text-orange-600";

      case "not_run":
      default:
        return "bg-amber-50 text-amber-600";
    }
  }

  // =====================================================
  // FORMAT TEST RESULT
  // =====================================================

  function formatTestResult(
    result
  ) {

    switch (
      String(result).toLowerCase()
    ) {

      case "passed":
        return "Passed";

      case "failed":
        return "Failed";

      case "skipped":
        return "Skipped";

      case "blocked":
        return "Blocked";

      case "not_run":
      default:
        return "Not Run";
    }
  }

  // =====================================================
  // ESCAPE HTML
  // =====================================================

  function escapeHtml(value) {

    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value)
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );
  }
});