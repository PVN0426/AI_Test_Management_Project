document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (!loginForm) return;

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault(); 

        const usernameInput = document.getElementById('username').value.trim();
        const passwordInput = document.getElementById('password').value;
        const errorBox = document.getElementById('errorBox');
        const errorMessage = document.getElementById('errorMessage');
        const submitBtn = document.getElementById('submitBtn');

        errorBox.classList.add('hidden');
        submitBtn.textContent = 'Đang xử lý...';
        submitBtn.disabled = true;

        try {
           
            const response = await fetch('/api/auth/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: usernameInput,
                    password: passwordInput
                })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('access_token', data.access);
                localStorage.setItem('refresh_token', data.refresh);
                window.location.href = '/dashboard/'; 
            } else {
                errorMessage.textContent = data.detail || data.non_field_errors?.[0] || 'Tên đăng nhập hoặc mật khẩu không chính xác!';
                errorBox.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Lỗi kết nối API:', error);
            errorMessage.textContent = 'Không thể kết nối đến máy chủ Backend. Vui lòng thử lại sau!';
            errorBox.classList.remove('hidden');
        } finally {
            submitBtn.textContent = 'Đăng nhập';
            submitBtn.disabled = false;
        }
    });
});