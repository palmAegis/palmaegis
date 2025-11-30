(async function loadSidebar() {
    const placeholder = document.getElementById('sidebarPlaceholder');
    if (!placeholder) return;
    try {
        const resp = await fetch('partials/sidebar.html', { cache: 'no-cache' });
        if (!resp.ok) throw new Error('Failed to load sidebar: ' + resp.status);
        placeholder.innerHTML = await resp.text();
        // mark sidebar as loaded
        window.__sidebarLoaded = true;

        // helper to apply any existing user profile data to the inserted sidebar
        const applyWindowProfileToSidebar = () => {
            try {
                const avatars = document.querySelectorAll('.user-avatar');
                const nameEl = document.querySelector('.user-name');
                const roleEl = document.querySelector('.user-role');
                const src = window.userData?.imageBase64 || window.userData?.picture || window.currentUser?.photoURL || 'images/default-avatar.png';
                avatars.forEach(img => {
                    if (!img) return;
                    img.src = src;
                    img.onerror = () => { img.onerror = null; img.src = 'images/default-avatar.png'; };
                });
                if (nameEl) {
                    const displayName = window.userData?.firstName && window.userData?.lastName
                        ? `${window.userData.firstName} ${window.userData.lastName}`
                        : window.userData?.username || window.currentUser?.displayName || (window.currentUser?.email||'').split('@')[0] || 'User';
                    nameEl.textContent = displayName;
                }
                if (roleEl) roleEl.textContent = window.userData?.bio || 'Farmer';
            } catch (e) { /* ignore */ }
        };

        // wire up sidebar toggle + logout safely
        const sidebar = document.querySelector('.sidebar');
        const sidebarToggle = sidebar?.querySelector('#sidebarToggle') || sidebar?.querySelector('.sidebar-toggle');
        const logoutBtn = sidebar?.querySelector('#logoutBtn');

        if (sidebarToggle) {
            const icon = sidebarToggle.querySelector('i');
            const updateIcon = () => { if (icon) icon.className = sidebar.classList.contains('collapsed') ? 'fas fa-chevron-right' : 'fas fa-chevron-left'; };
            updateIcon();
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                const main = document.querySelector('.main-content') || document.querySelector('main');
                if (main) main.classList.toggle('expanded');
                updateIcon();
            });
            sidebarToggle.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sidebarToggle.click(); }});
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('sidebar:logoutRequested')); });
        }

        // optionally highlight current link
        try {
            const path = window.location.pathname.split('/').pop() || 'index.html';
            sidebar.querySelectorAll('.sidebar-nav a').forEach(a => {
                const href = (a.getAttribute('href') || '').split('/').pop();
                const li = a.closest('li');
                if (href === path) li?.classList.add('active'); else li?.classList.remove('active');
            });
        } catch (err) { /* ignore */ }

        // ensure any global profile data is applied
        applyWindowProfileToSidebar();

        // notify other code the sidebar is ready
        window.dispatchEvent(new CustomEvent('sidebar:loaded'));
    } catch (err) {
        console.error('Sidebar loader error:', err);
    }
})();

window.addEventListener('sidebar:loaded', () => {
  // attach signOut to logout button if needed
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', /* signOut handler */);
});