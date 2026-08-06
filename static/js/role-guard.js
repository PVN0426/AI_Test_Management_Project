// role-guard.js - Xử lý phân quyền giao diện dựa trên role của user
document.addEventListener('DOMContentLoaded', function() {
    const currentRole = localStorage.getItem('user_role'); 
    if (!currentRole) return;

    const createUserSection = document.getElementById('create-user-section'); 
    const adminActionButtons = document.querySelectorAll('.admin-only-action'); 
    const qcRequirementActions = document.querySelectorAll('.qc-requirement-action'); 
   
    if (currentRole === 'org_admin') {
        
        qcRequirementActions.forEach(el => el.style.display = 'none');
    } 
    else if (currentRole === 'qc') {
        
        if (createUserSection) createUserSection.style.display = 'none';
    } 
    else if (currentRole === 'dev') {
        if (createUserSection) createUserSection.style.display = 'none';
        adminActionButtons.forEach(el => el.style.display = 'none');
        qcRequirementActions.forEach(el => el.style.display = 'none');
    }
});