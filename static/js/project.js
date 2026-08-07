document.addEventListener("DOMContentLoaded", async function() {
    const noProjectsState = document.getElementById('no-projects-state');
    const projectsTableContainer = document.getElementById('projects-table-container');
    const tableBody = document.getElementById('projects-table-body');
    const searchInput = document.getElementById('searchProjectInput');

    let allProjects = [];

    async function fetchProjects() {
        try {
            const response = await fetch('/api/projects/');
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
                const row = document.createElement('tr');
                row.className = "hover:bg-slate-50/60 transition";
                row.setAttribute('data-testid', 'project-row');
                row.innerHTML = `
                    <td class="py-4 px-6 font-mono text-xs text-slate-500" data-testid="project-id">${project.id}</td>
                    <td class="py-4 px-6" data-testid="project-name-cell">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                <i class="fa-solid fa-folder"></i>
                            </div>
                            <div>
                                <div class="font-semibold text-slate-900 flex items-center gap-2">
                                    <span data-testid="project-name">${project.name}</span>
                                    <span class="px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-600 rounded-full" data-testid="project-status">Active</span>
                                </div>
                            </div>
                        </div>
                    </td>
                    <td class="py-4 px-6 text-slate-500 truncate max-w-xs" data-testid="project-description">${project.description || 'No description'}</td>
                    <td class="py-4 px-6 text-center font-medium text-slate-800" data-testid="project-total-cases">0</td>
                    <td class="py-4 px-6 text-center font-medium text-slate-800" data-testid="project-open-bugs">0</td>
                    <td class="py-4 px-6 text-right">
                        <div class="flex items-center justify-end gap-2">
                            <button onclick="editProject('${project.id}')" data-testid="project-edit-btn" class="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition cursor-pointer" title="Edit">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button onclick="deleteProject('${project.id}')" data-testid="project-delete-btn" class="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer" title="Delete">
                                <i class="fa-solid fa-trash"></i>
                            </button>
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

// Các hàm điều khiển Modal và API
async function openProjectModal() {
    const modal = document.getElementById('projectModal');
    if (modal) modal.classList.remove('hidden');

    // Tải danh sách Tenant cho thẻ select
    try {
        const res = await fetch('/api/tenants/'); // Hoặc endpoint tenants tùy theo API nhóm ông
        if (res.ok) {
            const tenants = await res.json();
            const tenantSelect = document.getElementById('projectTenant');
            if (tenantSelect) {
                tenantSelect.innerHTML = '<option value="" disabled selected>Select organization</option>';
                tenants.forEach(t => {
                    tenantSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
                });
            }
        }
    } catch (e) {
        console.log('Không thể tải danh sách tenants:', e);
        const tenantSelect = document.getElementById('projectTenant');
        if (tenantSelect) {
            tenantSelect.innerHTML = '<option value="" disabled selected>Default Organization</option>';
        }
    }
}

function closeProjectModal() {
    const modal = document.getElementById('projectModal');
    if (modal) modal.classList.add('hidden');
}

async function handleCreateProject(event) {
    event.preventDefault();
    const name = document.getElementById('projectName').value;
    const key = document.getElementById('projectKey').value;
    const description = document.getElementById('projectDescription').value;
    const tenant = document.getElementById('projectTenant').value;

    try {
        const response = await fetch('/api/projects/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ name, key, description, tenant })
        });

        if (response.ok) {
            closeProjectModal();
            window.location.reload();
        } else {
            alert('Tạo dự án thất bại!');
        }
    } catch (err) {
        console.error(err);
        alert('Đã có lỗi xảy ra khi kết nối tới server.');
    }
}

function editProject(id) {
    alert('Chức năng sửa Project ID: ' + id);
}

async function deleteProject(id) {
    if (confirm('Bạn có chắc chắn muốn xóa project này không?')) {
        try {
            const response = await fetch(`/api/projects/${id}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                }
            });
            if (response.ok) {
                window.location.reload();
            } else {
                alert('Xóa thất bại!');
            }
        } catch (err) {
            console.error(err);
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