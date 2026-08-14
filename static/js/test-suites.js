document.addEventListener("DOMContentLoaded", function () {

    // =====================================================
    // CURRENT PROJECT
    // =====================================================

    const pathParts = window.location.pathname.split("/");

    const projectIndex = pathParts.indexOf("projects");

    const currentProjectId =
        projectIndex !== -1
            ? Number(pathParts[projectIndex + 1])
            : null;


    // =====================================================
    // ROLE
    // =====================================================

    const currentRole =
        localStorage.getItem("user_role") || "";

    const canManageSuites =
        currentRole === "qc";


    // =====================================================
    // ELEMENTS
    // =====================================================

    const suiteList =
        document.getElementById("suiteList");

    const suiteLoading =
        document.getElementById("suiteLoading");

    const suiteEmpty =
        document.getElementById("suiteEmpty");

    const suiteError =
        document.getElementById("suiteError");

    const suiteErrorMessage =
        document.getElementById("suiteErrorMessage");

    const searchInput =
        document.getElementById("searchSuiteInput");

    const refreshBtn =
        document.getElementById("refreshSuitesBtn");

    const createBtn =
        document.getElementById("createSuiteBtn");

    const emptyCreateBtn =
        document.getElementById("emptyCreateSuiteBtn");


    // =====================================================
    // FORM
    // =====================================================

    const formModal =
        document.getElementById("suiteFormModal");

    const form =
        document.getElementById("suiteForm");

    const formTitle =
        document.getElementById("suiteFormTitle");

    const suiteNameInput =
        document.getElementById("suiteNameInput");

    const closeFormBtn =
        document.getElementById("closeSuiteFormBtn");

    const cancelFormBtn =
        document.getElementById("cancelSuiteFormBtn");

    const saveBtn =
        document.getElementById("saveSuiteBtn");

    const formError =
        document.getElementById("suiteFormError");


    // =====================================================
    // DETAIL
    // =====================================================

    const detailModal =
        document.getElementById("suiteDetailModal");

    const detailTitle =
        document.getElementById("suiteDetailTitle");

    const detailSubtitle =
        document.getElementById("suiteDetailSubtitle");

    const detailContent =
        document.getElementById("suiteTestCasesContent");

    const closeDetailBtn =
        document.getElementById("closeSuiteDetailBtn");


    // =====================================================
    // DELETE
    // =====================================================

    const deleteModal =
        document.getElementById("deleteSuiteModal");

    const deleteMessage =
        document.getElementById("deleteSuiteMessage");

    const cancelDeleteBtn =
        document.getElementById("cancelDeleteSuiteBtn");

    const confirmDeleteBtn =
        document.getElementById("confirmDeleteSuiteBtn");


    // =====================================================
    // STATE
    // =====================================================

    let allSuites = [];

    let filteredSuites = [];

    let editingSuiteId = null;

    let deletingSuiteId = null;


    // =====================================================
    // CHECK PROJECT
    // =====================================================

    if (!currentProjectId) {

        showToast(
            "Không xác định được Project.",
            true
        );

        return;
    }


    // =====================================================
    // ROLE UI
    // =====================================================

    if (!canManageSuites) {

        if (createBtn) {
            createBtn.classList.add("hidden");
        }

        if (emptyCreateBtn) {
            emptyCreateBtn.classList.add("hidden");
        }
    }


    // =====================================================
    // API REQUEST
    // =====================================================

    async function apiRequest(
        url,
        options = {}
    ) {

        const response = await fetch(
            url,
            {
                credentials: "include",

                headers: {
                    "Content-Type": "application/json",

                    ...(options.headers || {})
                },

                ...options
            }
        );


        let data = null;

        try {

            data = await response.json();

        } catch (error) {

            data = null;
        }


        if (!response.ok) {

            let message =
                `Request failed: ${response.status}`;


            if (data) {

                if (data.detail) {

                    message = data.detail;

                } else if (
                    typeof data === "object"
                ) {

                    message =
                        Object.values(data)
                            .flat()
                            .join(" ");
                }
            }


            throw new Error(message);
        }


        return data;
    }


    // =====================================================
    // GET PROJECT TEST SUITES
    // =====================================================

    async function fetchSuites() {

        showLoading(true);

        hideEmpty();

        hideError();


        try {

            /*
             * GET
             * /api/projects/{project_id}/test-suites/
             */

            const response =
                await apiRequest(
                    `/api/projects/${currentProjectId}/test-suites/`
                );


            /*
             * Support:
             *
             * [
             *   ...
             * ]
             *
             * OR
             *
             * {
             *   count,
             *   results: [...]
             * }
             */

            allSuites =
                Array.isArray(response)
                    ? response
                    : Array.isArray(response?.results)
                        ? response.results
                        : [];


            filteredSuites =
                [...allSuites];


            renderSuites();


        } catch (error) {

            console.error(
                "Load test suites failed:",
                error
            );


            showError(
                error.message
            );

        } finally {

            showLoading(false);

        }
    }


    // =====================================================
    // RENDER SUITES
    // =====================================================

    function renderSuites() {

        suiteList.innerHTML = "";


        if (!filteredSuites.length) {

            suiteList.classList.add("hidden");

            showEmpty(true);

            return;
        }


        showEmpty(false);

        suiteList.classList.remove("hidden");


        filteredSuites.forEach(
            suite => {

                suiteList.appendChild(
                    createSuiteElement(
                        suite
                    )
                );

            }
        );
    }


    // =====================================================
    // CREATE SUITE CARD
    // =====================================================

    function createSuiteElement(
        suite
    ) {

        const card =
            document.createElement("div");


        card.className = `
            bg-white
            border
            border-slate-200
            rounded-2xl
            shadow-sm
            hover:shadow-md
            transition
        `;


        card.innerHTML = `

            <div
                class="px-5 py-4 flex items-center justify-between gap-4"
            >

                <!-- LEFT -->

                <div
                    class="flex items-center gap-4 min-w-0"
                >

                    <div
                        class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"
                    >

                        <i class="fa-solid fa-layer-group text-lg"></i>

                    </div>


                    <div class="min-w-0">

                        <h3
                            class="font-semibold text-slate-800 truncate"
                        >
                            ${escapeHtml(
                                suite.name || "Untitled Suite"
                            )}
                        </h3>


                        <div
                            class="flex items-center gap-4 mt-1"
                        >

                            ${
                                suite.test_cases_count !== undefined
                                    ? `
                                        <span class="text-xs text-slate-400">

                                            <i class="fa-solid fa-vials mr-1"></i>

                                            ${suite.test_cases_count}
                                            Test Cases

                                        </span>
                                    `
                                    : `
                                        <span class="text-xs text-slate-400">

                                            <i class="fa-solid fa-layer-group mr-1"></i>

                                            Test Suite

                                        </span>
                                    `
                            }


                            ${
                                suite.priority
                                    ? `
                                        <span class="text-xs text-slate-400">

                                            <i class="fa-solid fa-flag mr-1"></i>

                                            ${escapeHtml(
                                                suite.priority
                                            )}

                                        </span>
                                    `
                                    : ""
                            }


                            ${
                                suite.test_type
                                    ? `
                                        <span class="text-xs text-slate-400">

                                            <i class="fa-solid fa-vial-circle-check mr-1"></i>

                                            ${escapeHtml(
                                                suite.test_type
                                            )}

                                        </span>
                                    `
                                    : ""
                            }

                        </div>

                    </div>

                </div>


                <!-- ACTIONS -->

                <div
                    class="flex items-center gap-1 shrink-0"
                >

                    <!-- VIEW -->

                    <button
                        type="button"
                        class="view-suite-btn p-2.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        data-id="${suite.id}"
                        title="View Test Cases"
                    >

                        <i class="fa-solid fa-eye"></i>

                    </button>


                    ${
                        canManageSuites
                            ? `

                                <!-- EDIT -->

                                <button
                                    type="button"
                                    class="edit-suite-btn p-2.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                                    data-id="${suite.id}"
                                    title="Edit Suite"
                                >

                                    <i class="fa-solid fa-pen"></i>

                                </button>


                                <!-- DELETE -->

                                <button
                                    type="button"
                                    class="delete-suite-btn p-2.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                    data-id="${suite.id}"
                                    title="Delete Suite"
                                >

                                    <i class="fa-solid fa-trash"></i>

                                </button>

                            `
                            : ""
                    }

                </div>

            </div>

        `;


        return card;
    }


    // =====================================================
    // SEARCH
    // =====================================================

    function searchSuites() {

        const keyword =
            searchInput.value
                .trim()
                .toLowerCase();


        if (!keyword) {

            filteredSuites =
                [...allSuites];

        } else {

            filteredSuites =
                allSuites.filter(
                    suite =>
                        suite.name
                            ?.toLowerCase()
                            .includes(keyword)
                );
        }


        renderSuites();
    }


    // =====================================================
    // OPEN CREATE
    // =====================================================

    function openCreateForm() {

        if (!canManageSuites) {
            return;
        }


        editingSuiteId = null;


        formTitle.textContent =
            "Create Test Suite";


        saveBtn.textContent =
            "Create Suite";


        suiteNameInput.value = "";


        formError.classList.add(
            "hidden"
        );


        formModal.classList.remove(
            "hidden"
        );


        setTimeout(
            () => suiteNameInput.focus(),
            100
        );
    }


    // =====================================================
    // OPEN EDIT
    // =====================================================

    function openEditForm(
        suiteId
    ) {

        if (!canManageSuites) {
            return;
        }


        const suite =
            allSuites.find(
                item =>
                    Number(item.id) ===
                    Number(suiteId)
            );


        if (!suite) {
            return;
        }


        editingSuiteId =
            suite.id;


        formTitle.textContent =
            "Edit Test Suite";


        saveBtn.textContent =
            "Save Changes";


        suiteNameInput.value =
            suite.name || "";


        formError.classList.add(
            "hidden"
        );


        formModal.classList.remove(
            "hidden"
        );


        setTimeout(
            () => suiteNameInput.focus(),
            100
        );
    }


    // =====================================================
    // CLOSE FORM
    // =====================================================

    function closeForm() {

        formModal.classList.add(
            "hidden"
        );


        editingSuiteId =
            null;


        suiteNameInput.value = "";


        formError.classList.add(
            "hidden"
        );
    }


    // =====================================================
    // SAVE SUITE
    // =====================================================

    async function saveSuite(
        event
    ) {

        event.preventDefault();


        if (!canManageSuites) {
            return;
        }


        const name =
            suiteNameInput.value.trim();


        if (!name) {

            showFormError(
                "Suite name is required."
            );

            return;
        }


        saveBtn.disabled = true;


        saveBtn.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin mr-1"></i>
            Saving...
        `;


        try {

            // =================================================
            // EDIT
            // =================================================

            if (editingSuiteId) {

                /*
                 * PATCH
                 * /api/test-suites/{id}/
                 */

                await apiRequest(
                    `/api/test-suites/${editingSuiteId}/`,
                    {
                        method: "PATCH",

                        body: JSON.stringify({
                            name: name
                        })
                    }
                );


                showToast(
                    "Suite updated successfully."
                );


            }

            // =================================================
            // CREATE
            // =================================================

            else {

                /*
                 * POST
                 * /api/projects/{project_id}/test-suites/
                 */

                await apiRequest(
                    `/api/projects/${currentProjectId}/test-suites/`,
                    {
                        method: "POST",

                        body: JSON.stringify({
                            name: name
                        })
                    }
                );


                showToast(
                    "Suite created successfully."
                );
            }


            closeForm();

            await fetchSuites();


        } catch (error) {

            console.error(
                "Save suite failed:",
                error
            );


            showFormError(
                error.message
            );

        } finally {

            saveBtn.disabled = false;


            saveBtn.textContent =
                editingSuiteId
                    ? "Save Changes"
                    : "Create Suite";
        }
    }


    // =====================================================
    // VIEW SUITE TEST CASES
    // =====================================================

    async function viewSuite(
        suiteId
    ) {

        const suite =
            allSuites.find(
                item =>
                    Number(item.id) ===
                    Number(suiteId)
            );


        if (!suite) {
            return;
        }


        detailTitle.textContent =
            suite.name;


        detailSubtitle.textContent =
            "Test cases in this suite";


        detailContent.innerHTML = `

            <div class="py-10 text-center">

                <i
                    class="fa-solid fa-spinner fa-spin text-xl text-indigo-600"
                ></i>

                <p class="mt-3 text-sm text-slate-500">
                    Loading test cases...
                </p>

            </div>

        `;


        detailModal.classList.remove(
            "hidden"
        );


        try {

            /*
             * Nếu BE TestCase API hỗ trợ:
             *
             * GET /api/test-cases/?suite={suiteId}
             *
             */

            const response =
                await apiRequest(
                    `/api/test-cases/?suite=${suiteId}`
                );


            const testCases =
                Array.isArray(response)
                    ? response
                    : Array.isArray(response?.results)
                        ? response.results
                        : [];


            renderSuiteTestCases(
                testCases
            );


        } catch (error) {

            console.error(
                "Load suite test cases failed:",
                error
            );


            detailContent.innerHTML = `

                <div class="py-10 text-center">

                    <div
                        class="w-12 h-12 mx-auto rounded-xl bg-rose-50 flex items-center justify-center"
                    >

                        <i
                            class="fa-solid fa-triangle-exclamation text-rose-600"
                        ></i>

                    </div>


                    <h3
                        class="mt-3 font-semibold text-rose-700"
                    >
                        Failed to load test cases
                    </h3>


                    <p
                        class="mt-1 text-sm text-rose-500"
                    >
                        ${escapeHtml(
                            error.message
                        )}
                    </p>

                </div>

            `;
        }
    }


    // =====================================================
    // RENDER TEST CASES
    // =====================================================

    function renderSuiteTestCases(
        testCases
    ) {

        if (!testCases.length) {

            detailContent.innerHTML = `

                <div class="py-12 text-center">

                    <div
                        class="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center"
                    >

                        <i
                            class="fa-solid fa-vials text-xl text-slate-400"
                        ></i>

                    </div>


                    <h3
                        class="mt-4 font-semibold text-slate-700"
                    >
                        No Test Cases
                    </h3>


                    <p
                        class="mt-1 text-sm text-slate-400"
                    >
                        This suite does not contain any test cases yet.
                    </p>

                </div>

            `;

            return;
        }


        detailContent.innerHTML = `

            <div class="mb-4">

                <p class="text-sm font-semibold text-slate-700">

                    ${testCases.length}

                    ${
                        testCases.length === 1
                            ? "Test Case"
                            : "Test Cases"
                    }

                </p>

            </div>


            <div
                class="border border-slate-200 rounded-xl overflow-hidden"
            >

                <div class="overflow-x-auto">

                    <table class="w-full text-sm">

                        <thead
                            class="bg-slate-50 border-b border-slate-200"
                        >

                            <tr>

                                <th
                                    class="px-4 py-3 text-left font-semibold text-slate-600"
                                >
                                    ID
                                </th>


                                <th
                                    class="px-4 py-3 text-left font-semibold text-slate-600"
                                >
                                    Title
                                </th>


                                <th
                                    class="px-4 py-3 text-left font-semibold text-slate-600"
                                >
                                    Priority
                                </th>


                                <th
                                    class="px-4 py-3 text-left font-semibold text-slate-600"
                                >
                                    Status
                                </th>


                                <th
                                    class="px-4 py-3 text-left font-semibold text-slate-600"
                                >
                                    Source
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            ${testCases.map(
                                testCase => `

                                    <tr
                                        class="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                                    >

                                        <td
                                            class="px-4 py-3"
                                        >

                                            <span
                                                class="font-mono font-semibold text-indigo-600"
                                            >

                                                ${escapeHtml(
                                                    testCase.case_id ||
                                                    `TC-${testCase.id}`
                                                )}

                                            </span>

                                        </td>


                                        <td
                                            class="px-4 py-3"
                                        >

                                            <span
                                                class="font-medium text-slate-800"
                                            >

                                                ${escapeHtml(
                                                    testCase.title ||
                                                    "Untitled Test Case"
                                                )}

                                            </span>

                                        </td>


                                        <td
                                            class="px-4 py-3"
                                        >

                                            <span
                                                class="inline-flex px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium"
                                            >

                                                ${escapeHtml(
                                                    testCase.priority ||
                                                    "medium"
                                                )}

                                            </span>

                                        </td>


                                        <td
                                            class="px-4 py-3"
                                        >

                                            <span
                                                class="inline-flex px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium"
                                            >

                                                ${escapeHtml(
                                                    testCase.review_status ||
                                                    testCase.status ||
                                                    "draft"
                                                )}

                                            </span>

                                        </td>


                                        <td
                                            class="px-4 py-3"
                                        >

                                            ${
                                                testCase.source === "ai"
                                                    ? `
                                                        <span
                                                            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-violet-50 text-violet-600 text-xs font-medium"
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

                                    </tr>

                                `
                            ).join("")}

                        </tbody>

                    </table>

                </div>

            </div>

        `;
    }


    // =====================================================
    // DELETE MODAL
    // =====================================================

    function openDeleteModal(
        suiteId
    ) {

        if (!canManageSuites) {
            return;
        }


        const suite =
            allSuites.find(
                item =>
                    Number(item.id) ===
                    Number(suiteId)
            );


        if (!suite) {
            return;
        }


        deletingSuiteId =
            suite.id;


        deleteMessage.textContent =
            `Are you sure you want to delete "${suite.name}"?`;


        deleteModal.classList.remove(
            "hidden"
        );
    }


    // =====================================================
    // CONFIRM DELETE
    // =====================================================

    async function confirmDelete() {

        if (
            !canManageSuites ||
            !deletingSuiteId
        ) {

            return;
        }


        confirmDeleteBtn.disabled =
            true;


        confirmDeleteBtn.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin mr-1"></i>
            Deleting...
        `;


        try {

            /*
             * DELETE
             * /api/test-suites/{id}/
             */

            await apiRequest(
                `/api/test-suites/${deletingSuiteId}/`,
                {
                    method: "DELETE"
                }
            );


            showToast(
                "Suite deleted successfully."
            );


            closeDeleteModal();


            await fetchSuites();


        } catch (error) {

            console.error(
                "Delete suite failed:",
                error
            );


            showToast(
                error.message,
                true
            );


        } finally {

            confirmDeleteBtn.disabled =
                false;


            confirmDeleteBtn.textContent =
                "Delete";
        }
    }


    // =====================================================
    // CLOSE DELETE
    // =====================================================

    function closeDeleteModal() {

        deleteModal.classList.add(
            "hidden"
        );


        deletingSuiteId =
            null;
    }


    // =====================================================
    // FORM ERROR
    // =====================================================

    function showFormError(
        message
    ) {

        formError.textContent =
            message;


        formError.classList.remove(
            "hidden"
        );
    }


    // =====================================================
    // ERROR
    // =====================================================

    function showError(
        message
    ) {

        suiteErrorMessage.textContent =
            message;


        suiteError.classList.remove(
            "hidden"
        );


        suiteList.classList.add(
            "hidden"
        );
    }


    function hideError() {

        suiteError.classList.add(
            "hidden"
        );
    }


    // =====================================================
    // TOAST
    // =====================================================

    function showToast(
        message,
        isError = false
    ) {

        const toast =
            document.getElementById(
                "suiteToast"
            );


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
            ${isError
                ? "bg-rose-600"
                : "bg-slate-900"}
        `;


        toast.classList.remove(
            "hidden"
        );


        setTimeout(
            () => {

                toast.classList.add(
                    "hidden"
                );

            },
            3000
        );
    }


    // =====================================================
    // LOADING
    // =====================================================

    function showLoading(
        loading
    ) {

        if (loading) {

            suiteLoading.classList.remove(
                "hidden"
            );

            suiteList.classList.add(
                "hidden"
            );

        } else {

            suiteLoading.classList.add(
                "hidden"
            );
        }
    }


    // =====================================================
    // EMPTY
    // =====================================================

    function showEmpty(
        show
    ) {

        if (show) {

            suiteEmpty.classList.remove(
                "hidden"
            );

        } else {

            suiteEmpty.classList.add(
                "hidden"
            );
        }
    }


    function hideEmpty() {

        showEmpty(false);
    }


    // =====================================================
    // ESCAPE HTML
    // =====================================================

    function escapeHtml(
        value
    ) {

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


    // =====================================================
    // EVENTS
    // =====================================================

    if (createBtn) {

        createBtn.addEventListener(
            "click",
            openCreateForm
        );
    }


    if (emptyCreateBtn) {

        emptyCreateBtn.addEventListener(
            "click",
            openCreateForm
        );
    }


    if (refreshBtn) {

        refreshBtn.addEventListener(
            "click",
            fetchSuites
        );
    }


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            searchSuites
        );
    }


    if (form) {

        form.addEventListener(
            "submit",
            saveSuite
        );
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


    if (closeDetailBtn) {

        closeDetailBtn.addEventListener(
            "click",
            () => {

                detailModal.classList.add(
                    "hidden"
                );

            }
        );
    }


    if (cancelDeleteBtn) {

        cancelDeleteBtn.addEventListener(
            "click",
            closeDeleteModal
        );
    }


    if (confirmDeleteBtn) {

        confirmDeleteBtn.addEventListener(
            "click",
            confirmDelete
        );
    }


    // =====================================================
    // EVENT DELEGATION
    // =====================================================

    suiteList.addEventListener(
        "click",
        function (event) {

            const viewBtn =
                event.target.closest(
                    ".view-suite-btn"
                );


            const editBtn =
                event.target.closest(
                    ".edit-suite-btn"
                );


            const deleteBtn =
                event.target.closest(
                    ".delete-suite-btn"
                );


            if (viewBtn) {

                viewSuite(
                    viewBtn.dataset.id
                );

                return;
            }


            if (editBtn) {

                openEditForm(
                    editBtn.dataset.id
                );

                return;
            }


            if (deleteBtn) {

                openDeleteModal(
                    deleteBtn.dataset.id
                );

                return;
            }

        }
    );


    // =====================================================
    // CLOSE MODALS OUTSIDE
    // =====================================================

    formModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                formModal
            ) {

                closeForm();
            }
        }
    );


    detailModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                detailModal
            ) {

                detailModal.classList.add(
                    "hidden"
                );
            }
        }
    );


    deleteModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                deleteModal
            ) {

                closeDeleteModal();
            }
        }
    );
    fetchSuites();

});