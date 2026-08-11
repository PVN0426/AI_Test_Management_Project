document.addEventListener("DOMContentLoaded", async function() {
    const noProjectsState = document.getElementById('no-projects-state');
    const projectsTableContainer = document.getElementById('projects-table-container');
    const tableBody = document.getElementById('projects-table-body');
    const searchInput = document.getElementById('searchProjectInput');

    let allProjects = [];

    async function fetchProjects() {
        try {
            const response = await apiFetch('/api/projects/');
            if (response.ok) {
                allProjects = await response.json();
                renderProjects(allProjects);
            }
        } catch (error) {
            console.error('Lỗi khi tải danh sách project:', error);
            if (noProjectsState) noProjectsState.classList.remove('hidden');
            if (projectsTableContainer) projectsTableContainer.classList.add('hidden');
        }
    }

    function renderProjects(projects) {
        if (!noProjectsState || !projectsTableContainer || !tableBody) return;

        if (!projects || projects.length === 0) {
            noProjectsState.classList.remove('hidden');
            projectsTableContainer.classList.add('hidden');
        } else {
            noProjectsState.classList.add('hidden');
            projectsTableContainer.classList.remove('hidden');
            
            tableBody.innerHTML = '';
            projects.forEach(project => {
                const userRole = localStorage.getItem('user_role');
                const isQC = userRole === 'qc';

                const row = document.createElement('tr');
                row.className = "hover:bg-slate-50/60 transition";
                row.setAttribute('data-testid', 'project-row');
               row.innerHTML = `
                    <td class="py-4 px-6 font-mono text-xs text-slate-500">
                        ${project.id}
                    </td>

                    <td class="py-4 px-6">
                        <a
                            href="/projects/${project.id}/requirements/"
                            onclick="selectProject('${project.id}', '${project.name}')"
                            class="font-semibold text-indigo-600 hover:text-indigo-800 transition">
                            ${project.name}
                        </a>
                    </td>

                    <td class="py-4 px-6 text-slate-500">
                        ${project.description || 'No description'}
                    </td>

                    <td class="py-4 px-6 text-center">
                        0
                    </td>

                    <td class="py-4 px-6 text-center">
                        0
                    </td>

                    <td class="py-4 px-6 text-right">
                        <div class="flex items-center justify-end gap-2">
                            ${isQC ? `
                                <button
                                    onclick="editProject('${project.id}')"
                                    title="Edit"
                                    class="p-2 text-slate-400 hover:text-indigo-600 rounded-lg"
                                >
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>

                                <button
                                    onclick="deleteProject('${project.id}')"
                                    title="Delete"
                                    class="p-2 text-slate-400 hover:text-rose-600 rounded-lg"
                                >
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            ` : `
                                <span class="text-xs text-slate-400 italic">
                                    Chỉ xem
                                </span>
                            `}
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    }

    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const keyword = e.target.value.toLowerCase();
            const filtered = allProjects.filter(p => p.name.toLowerCase().includes(keyword) || (p.description && p.description.toLowerCase().includes(keyword)));
            renderProjects(filtered);
        });
    }

    if (tableBody) {
        fetchProjects();
    }
});

function selectProject(projectId, projectName) {

    localStorage.setItem(
        'current_project_id',
        projectId
    );

    localStorage.setItem(
        'current_project_name',
        projectName
    );

    window.location.href = `/projects/${projectId}/requirements/`;
}

function openProjectModal() {
    const modalTitle = document.querySelector('[data-testid="project-modal-title"]');
    if (modalTitle) modalTitle.textContent = "Create New Project";

    const submitBtn = document.querySelector('[data-testid="project-modal-submit-btn"]');
    if (submitBtn) submitBtn.textContent = "Create Project";

    const form = document.getElementById('createProjectForm');
    if (form) {
        form.reset();
        form.removeAttribute('data-editing-id');
    }

    loadTenantsForModal();

    const modal = document.getElementById('projectModal');
    if (modal) modal.classList.remove('hidden');
}


function closeProjectModal() {
    const modal = document.getElementById('projectModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function loadTenantsForModal() {
    const tenantSelect = document.getElementById('projectTenant');
    try {
        const res = await apiFetch('/api/tenants/');
        if (res.ok) {
            const tenants = await res.json();
            if (tenantSelect) {
                if (!tenants || tenants.length === 0) {
                    tenantSelect.innerHTML = '<option value="1" selected>Default Organization (Mặc định)</option>';
                    return;
                }
                tenantSelect.innerHTML = '<option value="" disabled selected>Select organization</option>';
                tenants.forEach(t => {
                    tenantSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
                });
            }
        } else {
            if (tenantSelect) {
                tenantSelect.innerHTML = '<option value="1" selected>Default Organization (Mặc định)</option>';
            }
        }
    } catch (e) {
        console.log('Không thể tải danh sách tenants:', e);
        if (tenantSelect) {
            tenantSelect.innerHTML = '<option value="1" selected>Default Organization (Mặc định)</option>';
        }
    }
}

// Xử lý Submit Form (Hỗ trợ cả POST tạo mới và PUT chỉnh sửa)
async function handleCreateProject(event) {
    event.preventDefault();
    
    const form = document.getElementById('createProjectForm');
    const editingId = form ? form.getAttribute('data-editing-id') : null;
    const isEdit = Boolean(editingId);

    const projectData = {
        name: document.getElementById('projectName').value,
        key: document.getElementById('projectKey').value,
        description: document.getElementById('projectDescription').value,
        tenant: document.getElementById('projectTenant').value || null
    };

    const url = isEdit ? `/api/projects/${editingId}/` : '/api/projects/';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const response = await apiFetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(projectData)
        });

        if (response && response.ok) {
            closeProjectModal();
            window.location.reload();
        } else {
            const errData = response ? await response.json().catch(() => ({})) : {};
            alert((isEdit ? 'Cập nhật' : 'Tạo') + ' dự án thất bại: ' + (JSON.stringify(errData) || 'Lỗi không xác định'));
        }
    } catch (err) {
        console.error(err);
        alert('Đã có lỗi xảy ra khi kết nối tới server.');
    }
}

// Sửa Project
async function editProject(id) {
    try {
        await loadTenantsForModal();

        const response = await apiFetch(`/api/projects/${id}/`);
        if (!response.ok) {
            throw new Error('Không thể tải thông tin dự án');
        }
        const project = await response.json();
        
        document.getElementById('projectName').value = project.name || '';
        document.getElementById('projectKey').value = project.key || '';
        document.getElementById('projectDescription').value = project.description || '';
        
        if (document.getElementById('projectTenant')) {
            document.getElementById('projectTenant').value = project.tenant || '';
        }

        const modalTitle = document.querySelector('[data-testid="project-modal-title"]');
        if (modalTitle) modalTitle.textContent = "Edit Project";

        const form = document.getElementById('createProjectForm');
        if (form) form.setAttribute('data-editing-id', id);

        const submitBtn = document.querySelector('[data-testid="project-modal-submit-btn"]');
        if (submitBtn) {
            submitBtn.textContent = "Save Changes";
        }

        const modal = document.getElementById('projectModal');
        if (modal) modal.classList.remove('hidden');

    } catch (error) {
        console.error('Lỗi khi lấy thông tin project để sửa:', error);
        alert('Không thể tải thông tin dự án để chỉnh sửa.');
    }
}

// Xóa Project
async function deleteProject(id) {
    if (confirm('Bạn có chắc chắn muốn xóa project này không?')) {
        try {
            const response = await apiFetch(`/api/projects/${id}/`, {
                method: 'DELETE'
            });
            if (response.ok) {
                window.location.reload();
            } else {
                alert('Xóa thất bại!');
            }
        } catch (err) {
            console.error(err);
            alert('Đã có lỗi xảy ra khi kết nối tới server.');
        }
    }
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}