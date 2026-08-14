let aiPreviewModal;
let aiPreviewContent;
let aiPreviewCount;
let saveAIDraftBtn;
let confirmAISaveBtn;
let generatedTestCases = [];
let generatedJobId = null;
let currentProjectId = null;

document.addEventListener("DOMContentLoaded", function () {
  const reqFileInput = document.getElementById("reqFile");

  const selectedFileNameSpan = document.getElementById("selectedFileName");

  const uploadSubmitWrapper = document.getElementById("uploadSubmitWrapper");

  const uploadDocForm = document.getElementById("uploadDocForm");

  const requirementTableBody = document.getElementById("requirementTableBody");

  const totalCount = document.getElementById("totalCount");

  const uploadSection = document.getElementById("uploadSection");
  const uploadDocumentBtn = document.getElementById("uploadDocumentBtn");

  const tableSection = document.getElementById("tableSection");

  const aiFloatingBar = document.getElementById("aiFloatingBar");

  const selectAllCheckbox = document.getElementById("selectAll");

  const selectedCountText = document.getElementById("selectedCountText");

  const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");

  const pagination = document.getElementById("pagination");

  const paginationInfo = document.getElementById("paginationInfo");

  const pageNumber = document.getElementById("pageNumber");

  const prevPageBtn = document.getElementById("prevPageBtn");

  const nextPageBtn = document.getElementById("nextPageBtn");

  const searchRequirement = document.getElementById("searchRequirement");

  const aiGeneratingModal = document.getElementById("aiGeneratingModal");

  const aiGeneratingCount = document.getElementById("aiGeneratingCount");

  aiPreviewModal = document.getElementById("aiPreviewModal");

  aiPreviewContent = document.getElementById("aiPreviewContent");

  aiPreviewCount = document.getElementById("aiPreviewCount");

  const closeAIPreviewBtn = document.getElementById("closeAIPreviewBtn");
  if (closeAIPreviewBtn) {
    closeAIPreviewBtn.addEventListener("click", function () {
      aiPreviewModal.classList.add("hidden");
    });
  }

  saveAIDraftBtn = document.getElementById("saveAIDraftBtn");

  confirmAISaveBtn = document.getElementById("confirmAISaveBtn");
  // ==========================================
  // ROLE
  // ==========================================

  const currentRole = localStorage.getItem("user_role");

  const canManageRequirement = currentRole === "qc";
  const canGenerateAI = currentRole === "qc";
  if (!canManageRequirement) {
    if (uploadSection) {
      uploadSection.classList.add("hidden");
    }

    if (uploadDocumentBtn) {
      uploadDocumentBtn.classList.add("hidden");
    }
  }

  const pathParts = window.location.pathname.split("/");

  const projectIdIndex = pathParts.indexOf("projects") + 1;

  currentProjectId =
    projectIdIndex > 0 ? pathParts[projectIdIndex] : null;

  // ==========================================
  // PAGINATION
  // ==========================================

  const ITEMS_PER_PAGE = 8;
  let currentPage = 1;
  let allRequirements = [];
  let filteredRequirements = [];
  let selectedRequirementIds = new Set();

  if (requirementTableBody && currentProjectId) {
    fetchRequirements();
  }

  async function fetchRequirements() {
    try {
      const response = await apiFetch(
        `/api/requirements/?project_id=${currentProjectId}`,
      );

      if (!response.ok) {
        console.error("Không thể tải dữ liệu requirement");
        return;
      }

      const data = await response.json();

      allRequirements = Array.isArray(data) ? data : [];
      filteredRequirements = [...allRequirements];
      currentPage = 1;
      selectedRequirementIds.clear();

      renderRequirements();
    } catch (error) {
      console.error("Lỗi khi tải requirements:", error);
    }
  }
  // ==========================================
  // SEARCH REQUIREMENTS
  // ==========================================

  if (searchRequirement) {
    searchRequirement.addEventListener("input", function () {
      const keyword = searchRequirement.value.trim().toLowerCase();

      filteredRequirements = allRequirements.filter(function (req) {
        const ref = String(req.ref || "").toLowerCase();

        const title = String(req.title || "").toLowerCase();

        const text = String(req.text || "").toLowerCase();

        return (
          ref.includes(keyword) ||
          title.includes(keyword) ||
          text.includes(keyword)
        );
      });

      currentPage = 1;

      renderRequirements();
    });
  }
  // ==========================================
  // RENDER REQUIREMENTS
  // ==========================================

  function renderRequirements() {
    if (!requirementTableBody) return;

    requirementTableBody.innerHTML = "";

    if (totalCount) {
      totalCount.textContent = `${allRequirements.length} items`;
    }

    // --------------------------------------
    // PROJECT HAS NO REQUIREMENTS
    // --------------------------------------

    if (allRequirements.length === 0) {
      if (canManageRequirement) {
        uploadSection.classList.remove("hidden");
      } else {
        uploadSection.classList.add("hidden");
      }

      tableSection.classList.add("hidden");

      pagination.classList.add("hidden");

      if (aiFloatingBar) {
        aiFloatingBar.classList.add("hidden");
      }

      if (deleteSelectedBtn) {
        deleteSelectedBtn.classList.add("hidden");
      }

      return;
    }
    const requirementsToRender = filteredRequirements;

    // --------------------------------------
    // SEARCH NO RESULT
    // --------------------------------------

    if (requirementsToRender.length === 0) {
      uploadSection.classList.add("hidden");

      tableSection.classList.remove("hidden");

      pagination.classList.add("hidden");

      if (aiFloatingBar) {
        aiFloatingBar.classList.add("hidden");
      }

      if (deleteSelectedBtn) {
        deleteSelectedBtn.classList.add("hidden");
      }

      requirementTableBody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="py-10 text-center text-sm text-slate-400"
                >
                    <div class="flex flex-col items-center gap-2">
                        <i class="fa-solid fa-magnifying-glass text-xl"></i>
                        <span>No requirements found</span>
                    </div>
                </td>
            </tr>
        `;

      return;
    }

    uploadSection.classList.add("hidden");

    tableSection.classList.remove("hidden");

    // --------------------------------------
    // PAGINATION
    // --------------------------------------

    const totalPages = Math.ceil(requirementsToRender.length / ITEMS_PER_PAGE);

    if (currentPage > totalPages) {
      currentPage = totalPages;
    }
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

    const endIndex = startIndex + ITEMS_PER_PAGE;

    const pageItems = requirementsToRender.slice(startIndex, endIndex);

    // --------------------------------------
    // RENDER CURRENT PAGE
    // --------------------------------------

    pageItems.forEach(function (req) {
      const row = document.createElement("tr");

      row.className = "hover:bg-slate-50 transition";

      const isSelected = selectedRequirementIds.has(String(req.id));

      row.innerHTML = `

            <!-- Checkbox -->
            <td class="py-3 px-4 text-center">

                <input
                    type="checkbox"
                    class="req-checkbox rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    value="${req.id}"
                    ${isSelected ? "checked" : ""}
                    data-testid="requirement-checkbox-${req.id}"
                >

            </td>
            <!-- ID -->
            <td class="py-3 px-4 font-mono font-semibold text-indigo-600">
                ${req.ref || req.id}
            </td>
            <!-- Title -->
            <td class="py-3 px-4 font-medium text-slate-800">

                <div class="flex items-center gap-2">
                    <i class="fa-regular fa-file-lines text-slate-400"></i>
                    <span>
                        ${req.title || "Untitled"}
                    </span>
                </div>
            </td>
            <!-- Type -->
            <td class="py-3 px-4">

                <span class="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-md text-xs font-medium">
                    Document
                </span>

            </td>
            <td class="py-3 px-4">

                <div class="flex items-center gap-2">

                    <div class="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                            class="bg-indigo-600 h-2 rounded-full"
                            style="width: ${req.coverage || 0}%"
                        ></div>
                    </div>

                    <span class="text-xs text-slate-500">
                        ${req.coverage || 0}%
                    </span>

                </div>

            </td>
            <td class="py-3 px-4 text-slate-600 font-medium">

                ${req.linked_test_cases || 0}

            </td>
            <td class="py-3 px-4 text-right">

                ${
                  canManageRequirement
                    ? `
                        <button
                            type="button"
                            data-testid="requirement-btn-delete-${req.id}"
                            class="text-slate-400 hover:text-rose-600 p-2 rounded-lg transition"
                            onclick="deleteRequirement('${req.id}')"
                            title="Delete requirement"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    `
                    : `
                        <span class="text-xs text-slate-400">
                            Chỉ xem
                        </span>
                    `
                }
            </td>
        `;

      requirementTableBody.appendChild(row);
    });

    updatePagination(totalPages, startIndex, endIndex);

    attachCheckboxEvents();
  }
  // ==========================================
  // PAGINATION UI
  // ==========================================
  function updatePagination(totalPages, startIndex, endIndex) {
    if (!pagination) return;

    if (totalPages <= 1) {
      pagination.classList.add("hidden");
      return;
    }
    pagination.classList.remove("hidden");

    const actualEnd = Math.min(endIndex, allRequirements.length);
    paginationInfo.textContent = `Showing ${startIndex + 1}-${actualEnd} of ${allRequirements.length}`;
    pageNumber.textContent = `${currentPage} / ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
  }

  // ==========================================
  // PREVIOUS PAGE
  // ==========================================

  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", function () {
      if (currentPage > 1) {
        currentPage--;

        renderRequirements();
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", function () {
      const totalPages = Math.ceil(allRequirements.length / ITEMS_PER_PAGE);

      if (currentPage < totalPages) {
        currentPage++;

        renderRequirements();
      }
    });
  }

  if (reqFileInput) {
    reqFileInput.addEventListener("change", function () {
      const files = Array.from(reqFileInput.files);

      if (files.length > 0) {
        if (selectedFileNameSpan) {
          selectedFileNameSpan.textContent =
            `${files.length} file(s) đã chọn: ` +
            files.map((file) => file.name).join(", ");
        }

        if (uploadSubmitWrapper) {
          uploadSubmitWrapper.classList.remove("hidden");
        }
      } else {
        if (selectedFileNameSpan) {
          selectedFileNameSpan.textContent = "";
        }

        if (uploadSubmitWrapper) {
          uploadSubmitWrapper.classList.add("hidden");
        }
      }
    });
  }

  // ==========================================
  // MULTI FILE UPLOAD
  // ==========================================

  if (uploadDocForm) {
    uploadDocForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      if (!canManageRequirement) {
        alert("Bạn không có quyền upload requirement.");

        return;
      }

      const files = Array.from(reqFileInput.files);

      if (files.length === 0) {
        alert("Vui lòng chọn ít nhất một file.");

        return;
      }
      const submitButton = uploadDocForm.querySelector('button[type="submit"]');

      if (submitButton) {
        submitButton.disabled = true;

        submitButton.textContent = `Đang upload ${files.length} file...`;
      }

      try {
        for (const file of files) {
          const formData = new FormData();

          formData.append("project", currentProjectId);

          formData.append("file", file);

          formData.append("title", file.name);

          formData.append(
            "ref",
            "REQ-" + Math.floor(Math.random() * 9000 + 1000),
          );

          const response = await apiFetch("/api/requirements/", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const err = await response.json().catch(() => ({}));

            console.error(`Upload thất bại: ${file.name}`, err);
          }
        }

        uploadDocForm.reset();
        if (selectedFileNameSpan) {
          selectedFileNameSpan.textContent = "";
        }
        if (uploadSubmitWrapper) {
          uploadSubmitWrapper.classList.add("hidden");
        }
        await fetchRequirements();
      } catch (error) {
        console.error("Lỗi upload:", error);

        alert("Đã xảy ra lỗi khi upload file.");
      } finally {
        if (submitButton) {
          submitButton.disabled = false;

          submitButton.textContent = "Xác nhận Upload & Thêm vào danh sách";
        }
      }
    });
  }

  // ==========================================
  // CHECKBOX EVENTS
  // ==========================================
  function attachCheckboxEvents() {
    const checkboxes = document.querySelectorAll(".req-checkbox");

    checkboxes.forEach(function (checkbox) {
      checkbox.addEventListener("change", function () {
        const id = String(checkbox.value);
        if (checkbox.checked) {
          selectedRequirementIds.add(id);
        } else {
          selectedRequirementIds.delete(id);
        }
        if (selectAllCheckbox) {
          const checkedCount = Array.from(checkboxes).filter(
            (checkbox) => checkbox.checked,
          ).length;

          selectAllCheckbox.checked =
            checkboxes.length > 0 && checkedCount === checkboxes.length;

          selectAllCheckbox.indeterminate =
            checkedCount > 0 && checkedCount < checkboxes.length;
        }
        updateSelectionUI();
      });
    });

    if (selectAllCheckbox) {
      selectAllCheckbox.checked =
        checkboxes.length > 0 &&
        Array.from(checkboxes).every((checkbox) => checkbox.checked);

      selectAllCheckbox.indeterminate =
        checkboxes.length > 0 &&
        Array.from(checkboxes).some((checkbox) => checkbox.checked) &&
        !selectAllCheckbox.checked;

      selectAllCheckbox.onchange = function () {
        checkboxes.forEach(function (checkbox) {
          checkbox.checked = selectAllCheckbox.checked;

          const id = String(checkbox.value);

          if (selectAllCheckbox.checked) {
            selectedRequirementIds.add(id);
          } else {
            selectedRequirementIds.delete(id);
          }
        });

        selectAllCheckbox.indeterminate = false;

        updateSelectionUI();
      };
    }
  }
  // ==========================================
  // UPDATE SELECTED UI
  // ==========================================

  function updateSelectionUI() {
    const count = selectedRequirementIds.size;

    if (aiFloatingBar) {
      if (count > 0 && canGenerateAI) {
        aiFloatingBar.classList.remove("hidden");
      } else {
        aiFloatingBar.classList.add("hidden");
      }
    }

    if (selectedCountText) {
      selectedCountText.textContent = `${count} Requirement${count > 1 ? "s" : ""} Selected`;
    }

    if (deleteSelectedBtn) {
      if (count > 0 && canManageRequirement) {
        deleteSelectedBtn.classList.remove("hidden");
      } else {
        deleteSelectedBtn.classList.add("hidden");
      }
    }
  }
  // ==========================================
  // DELETE ONE REQUIREMENT
  // ==========================================

  window.deleteRequirement = async function (id) {
    if (!canManageRequirement) {
      alert("Bạn không có quyền xóa requirement.");

      return;
    }

    if (!confirm("Bạn có chắc muốn xóa requirement này không?")) {
      return;
    }

    try {
      const response = await apiFetch(
        `/api/requirements/${id}/?project_id=${currentProjectId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        console.error("DELETE requirement failed:", {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
        });

        alert(
          `Xóa requirement thất bại!\n` +
            `Status: ${response.status}\n` +
            `Lỗi: ${JSON.stringify(errorData)}`,
        );

        return;
      }

      selectedRequirementIds.delete(String(id));

      await fetchRequirements();
    } catch (error) {
      console.error("Lỗi xóa requirement:", error);

      alert("Đã xảy ra lỗi khi xóa requirement.");
    }
  };

  // ==========================================
  // DELETE SELECTED
  // ==========================================

  if (deleteSelectedBtn) {
    deleteSelectedBtn.addEventListener("click", async function () {
      if (!canManageRequirement) {
        alert("Bạn không có quyền xóa requirement.");

        return;
      }

      const ids = Array.from(selectedRequirementIds);

      if (ids.length === 0) {
        return;
      }

      if (
        !confirm(
          `Bạn có chắc muốn xóa ${ids.length} requirement đã chọn không?`,
        )
      ) {
        return;
      }

      deleteSelectedBtn.disabled = true;

      try {
        for (const id of ids) {
          const response = await apiFetch(
            `/api/requirements/${id}/?project_id=${currentProjectId}`,
            {
              method: "DELETE",
            },
          );

          if (!response.ok) {
            console.error(`Không thể xóa requirement ${id}`);
          }
        }

        selectedRequirementIds.clear();

        await fetchRequirements();
      } catch (error) {
        console.error("Lỗi xóa nhiều requirement:", error);

        alert("Có lỗi xảy ra khi xóa requirement.");
      } finally {
        deleteSelectedBtn.disabled = false;
      }
    });
  }
  // ==========================================
  // GENERATE AI
  // ==========================================
  window.generateTestCasesWithAI = async function () {
    if (!canGenerateAI) {
      alert("Bạn không có quyền sử dụng chức năng AI.");
      return;
    }
    const selectedIds = Array.from(selectedRequirementIds);

    if (selectedIds.length === 0) {
      alert("Vui lòng chọn ít nhất một requirement!");

      return;
    }
    if (aiGeneratingModal) {
      aiGeneratingModal.classList.remove("hidden");
    }
    if (aiGeneratingCount) {
      aiGeneratingCount.textContent = `${selectedIds.length} requirement(s) selected`;
    }
    try {
      const response = await apiFetch("/api/requirements/generate-testcases/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: currentProjectId,
          requirement_ids: selectedIds,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        console.error("AI generation failed:", {
          status: response.status,
          statusText: response.statusText,
          response: errorText,
        });
        alert(
          `Generate Test Cases thất bại!\n` +
            `Status: ${response.status}\n` +
            `Error: ${errorText}`,
        );
        return;
      }
      const data = await response.json();

      generatedJobId = data.job_id;
      openAIPreviewModal(data.test_cases, data.job_id);
    } catch (error) {
      alert("Đã xảy ra lỗi khi generate Test Cases.");
    } finally {
      if (aiGeneratingModal) {
        aiGeneratingModal.classList.add("hidden");
      }
    }
  };

  if (saveAIDraftBtn) {
    saveAIDraftBtn.addEventListener("click", function () {
      commitAIGeneration("draft");
    });
  }

  if (confirmAISaveBtn) {
    confirmAISaveBtn.addEventListener("click", function () {
      commitAIGeneration("approved");
    });
  }
});

function renderAIGeneratedTestCases(testCases) {
  if (!aiPreviewContent) return;
  aiPreviewContent.innerHTML = "";
  if (!Array.isArray(testCases) || testCases.length === 0) {
    aiPreviewContent.innerHTML = `
            <div class="text-center py-10 text-slate-400">
                Không có Test Case nào được sinh.
            </div>
        `;
    return;
  }
  testCases.forEach(function (testCase, index) {
    const card = document.createElement("div");

    card.className =
      "bg-white border border-slate-200 rounded-xl p-5 shadow-sm";
    const priority = testCase.priority || "Medium";
    const steps = Array.isArray(testCase.steps) ? testCase.steps : [];
    card.innerHTML = `
            <div class="flex items-start justify-between gap-4">

                <div>
                    <p class="text-xs font-semibold text-indigo-600">
                        ${testCase.case_id || `TC_${String(index + 1).padStart(3, "0")}`}
                    </p>

                    <h3 class="mt-1 text-base font-semibold text-slate-900">
                        ${testCase.title || "Untitled Test Case"}
                    </h3>
                </div>

                <span class="
                    px-2.5 py-1
                    rounded-md
                    text-xs
                    font-medium
                    bg-indigo-50
                    text-indigo-600
                ">
                    ${priority}
                </span>

            </div>

            <div class="mt-4">

                <p class="text-xs font-semibold text-slate-500 uppercase">
                    Precondition
                </p>
                <p class="mt-1 text-sm text-slate-700">
                    ${testCase.precondition || "None"}
                </p>
            </div>
            <div class="mt-4">

                <p class="text-xs font-semibold text-slate-500 uppercase mb-2">
                    Test Steps
                </p>

                <div class="overflow-hidden border border-slate-200 rounded-lg">

                    <table class="w-full text-sm">

                        <thead class="bg-slate-50">
                            <tr>
                                <th class="px-3 py-2 text-left w-16">
                                    #
                                </th>

                                <th class="px-3 py-2 text-left">
                                    Action
                                </th>

                                <th class="px-3 py-2 text-left">
                                    Expected Result
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            ${steps
                              .map(function (step, stepIndex) {
                                return `
                                        <tr class="border-t border-slate-200">

                                            <td class="px-3 py-2 font-medium text-slate-500">
                                                ${stepIndex + 1}
                                            </td>

                                            <td class="px-3 py-2 text-slate-700">
                                                ${step.action || ""}
                                            </td>

                                            <td class="px-3 py-2 text-slate-700">
                                                ${step.expected || ""}
                                            </td>

                                        </tr>
                                    `;
                              })
                              .join("")}
                        </tbody>

                    </table>

                </div>

            </div>
        `;

    aiPreviewContent.appendChild(card);
  });

  if (aiPreviewCount) {
    aiPreviewCount.textContent = `${testCases.length} Test Cases generated`;
  }
}
function openAIPreviewModal(testCases, jobId) {
  generatedTestCases = testCases;
  generatedJobId = jobId;

  renderAIGeneratedTestCases(testCases);

  if (aiPreviewModal) {
    aiPreviewModal.classList.remove("hidden");
  }
}

// ==========================================
// COMMIT AI GENERATION
// ==========================================

// ==========================================
// COMMIT AI GENERATION API
// ==========================================

async function commitAIGeneration(decision) {
  if (!generatedJobId) {
    alert("Không tìm thấy AI generation job.");

    return;
  }
  const button = decision === "draft" ? saveAIDraftBtn : confirmAISaveBtn;

  if (!button) {
    return;
  }
  const originalText = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Saving...
    `;

  try {
    const response = await apiFetch("/api/testcases/commit-ai-generation/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        job_id: generatedJobId,
        decision: decision,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Commit AI failed:", data);

      alert(data.error || data.detail || "Không thể lưu Test Cases.");
      return;
    }
    if (decision === "draft") {
      alert("Test Cases đã được lưu ở trạng thái Draft.");
    } else {
      alert("Test Cases đã được Confirm & Save thành công.");
    }

    if (aiPreviewModal) {
      aiPreviewModal.classList.add("hidden");
    }

    window.location.href = `/projects/${currentProjectId}/test-cases/`;
  } catch (error) {
    console.error("Commit AI generation error:", error);

    alert("Đã xảy ra lỗi khi lưu Test Cases.");
  } finally {
    button.disabled = false;

    button.innerHTML = originalText;
  }
}
