document.addEventListener('DOMContentLoaded', function() {
    const currentRole = localStorage.getItem('user_role'); 
    if (!currentRole) return;

    const createUserSection = document.getElementById('create-user-section'); 
    const adminActionButtons = document.querySelectorAll('.admin-only-action'); 
    const qcRequirementActions = document.querySelectorAll('.qc-requirement-action, .qc-only-action'); 
   
    if (currentRole === 'org_admin' || currentRole === 'dev') {
        qcRequirementActions.forEach(el => el.style.display = 'none');
    } 
    else if (currentRole === 'qc') {
        if (createUserSection) createUserSection.style.display = 'none';
    } 
});