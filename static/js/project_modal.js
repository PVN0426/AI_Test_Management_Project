function openProjectModal() {
    const modal = document.getElementById('projectModal');
    if (modal) {
        modal.classList.remove('hidden');
        // loadTenantsForModal();
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
}