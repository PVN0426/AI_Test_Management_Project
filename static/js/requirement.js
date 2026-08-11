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

  // ==========================================
  // ROLE
  // ==========================================

  const currentRole = localStorage.getItem("user_role");

  const canManageRequirement = currentRole === "qc";
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

  const currentProjectId =
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
      console.log("Requirement:", req);

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
          (checkbox) => checkbox.checked
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
      if (count > 0) {
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
  window.generateTestCasesWithAI = function () {
    const selectedIds = Array.from(selectedRequirementIds);
    if (selectedIds.length === 0) {
      alert("Vui lòng chọn ít nhất một requirement!");
      return;
    }
    alert(
      `Đang gửi yêu cầu sinh Test Case bằng AI cho các ID: ${selectedIds.join(", ")}`,
    );
  };
});
