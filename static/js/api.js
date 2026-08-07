
async function apiFetch(url, options = {}) {
    const accessToken = localStorage.getItem('access_token');
    options.headers = options.headers || {};
    
    if (accessToken) {
        options.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    if (options.body && !(options.body instanceof FormData)) {
        options.headers['Content-Type'] = 'application/json';
    }

    try {
        const response = await fetch(url, options);

        if (response.status === 401) {

            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user_role');

            alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
            window.location.href = '/'; 
            return;
        }

        return response;
    } catch (error) {
        console.error('Lỗi khi gọi API:', error);
        throw error;
    }
}