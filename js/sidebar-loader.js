(async function loadSidebar() {
    const placeholder = document.getElementById('sidebarPlaceholder');
    if (!placeholder) return;

    try {
        const resp = await fetch('partials/sidebar.html', { cache: 'no-cache' });
        if (!resp.ok) throw new Error('Failed to load sidebar: ' + resp.status);
        const html = await resp.text();
        placeholder.innerHTML = html;

        // mark loaded for pages that check this flag
        window.__sidebarLoaded = true;

        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        const sidebarToggle = sidebar?.querySelector('#sidebarToggle') || sidebar?.querySelector('.sidebar-toggle');
        const logoutBtn = sidebar?.querySelector('#logoutBtn');

        // Toggle behavior
        if (sidebarToggle && sidebar) {
            const icon = sidebarToggle.querySelector('i');
            const updateIcon = () => {
                if (icon) icon.className = sidebar.classList.contains('collapsed') ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
            };

            // initialize icon state
            updateIcon();

            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                if (mainContent) mainContent.classList.toggle('expanded');
                updateIcon();
            });

            // keyboard support
            sidebarToggle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    sidebarToggle.click();
                }
            });
        }

        // Simple logout dispatch (page scripts can handle actual signOut)
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('sidebar:logoutRequested'));
            });
        }

        // Activate nav item based on current pathname (optional)
        try {
            const path = window.location.pathname.split('/').pop() || 'homepage.html';
            const links = sidebar.querySelectorAll('.sidebar-nav a');
            links.forEach(a => {
                const href = a.getAttribute('href')?.split('/').pop();
                if (href === path) {
                    a.closest('li')?.classList.add('active');
                } else {
                    a.closest('li')?.classList.remove('active');
                }
            });
        } catch (e) { /* ignore */ }

        // Let pages know sidebar is ready
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