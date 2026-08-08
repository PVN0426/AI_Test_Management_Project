function openProjectModal() {
    const modal = document.getElementById('projectModal');
    if (modal) {
        modal.classList.remove('hidden');
        loadTenantsForModal();
    }
}

function closeProjectModal() {
    const modal = document.getElementById('projectModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function loadTenantsForModal() {
    try {
        const res = await fetch('/api/tenants/');
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
}// Mở modal tạo mới
function openProjectModal() {
    const modalTitle = document.querySelector('[data-testid="project-modal-title"]');
    if (modalTitle) modalTitle.textContent = "Create New Project";

    const submitBtn = document.querySelector('[data-testid="project-modal-submit-btn"]');
    if (submitBtn) submitBtn.textContent = "Create Project";

    const form = document.getElementById('createProjectForm');
    if (form) {
        form.reset();
        form.removeAttribute('data-editing-id'); // Xóa ID để hệ thống hiểu đây là tạo mới
    }

    const modal = document.getElementById('projectModal');
    if (modal) {
        modal.classList.remove('hidden');
        loadTenantsForModal();
    }
}

// Đóng modal
function closeProjectModal() {
    const modal = document.getElementById('projectModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Load danh sách Tenant bằng apiFetch
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

// Xử lý Submit form (Tự động phân biệt Tạo mới hay Lưu chỉnh sửa)
async function handleCreateProject(event) {
    event.preventDefault();
    
    const form = document.getElementById('createProjectForm');
    const editingId = form ? form.getAttribute('data-editing-id') : null;
    const isEdit = Boolean(editingId);

    const projectData = {
        name: document.getElementById('projectName').value,
        key: document.getElementById('projectKey').value,
        description: document.getElementById('projectDescription').value,
        tenant: document.getElementById('projectTenant').value
    };

    try {
        let response;
        if (isEdit) {
            // Nếu đang sửa -> Gọi API PUT/PATCH
            response = await apiFetch(`/api/projects/${editingId}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(projectData)
            });
        } else {
            // Nếu đang tạo mới -> Gọi API POST
            response = await apiFetch('/api/projects/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(projectData)
            });
        }

        if (response.ok) {
            closeProjectModal();
            window.location.reload();
        } else {
            alert(isEdit ? 'Cập nhật dự án thất bại!' : 'Tạo dự án thất bại!');
        }
    } catch (err) {
        console.error(err);
        alert('Đã có lỗi xảy ra khi kết nối tới server.');
    }
}