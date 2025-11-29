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
        const sidebarToggle = sidebar?.querySelector('#sidebarToggle') || sidebar?.querySelector('.sidebar-toggle');
        const logoutBtn = sidebar?.querySelector('#logoutBtn');

        // Ensure toggle is clickable (in case CSS interferes)
        if (sidebarToggle) {
            sidebarToggle.style.pointerEvents = 'auto';
            sidebarToggle.style.zIndex = '1200';
            sidebarToggle.setAttribute('role', 'button');
            sidebarToggle.tabIndex = 0;
        }

        // Toggle behavior: re-query main at click-time so loader can sit before main
        if (sidebarToggle && sidebar) {
            const icon = sidebarToggle.querySelector('i');

            const updateIcon = () => {
                if (!icon) return;
                icon.className = sidebar.classList.contains('collapsed') ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
            };

            updateIcon();

            sidebarToggle.addEventListener('click', function () {
                sidebar.classList.toggle('collapsed');

                // re-query the main content at click-time (handles loader before main)
                const mainContent = document.querySelector('.main-content') || document.querySelector('main');
                if (mainContent) mainContent.classList.toggle('expanded');

                updateIcon();
            });

            // keyboard support
            sidebarToggle.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    sidebarToggle.click();
                }
            });
        }

        // Simple logout dispatch (page scripts handle actual signOut)
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function (e) {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('sidebar:logoutRequested'));
            });
        }

        // Activate nav item based on current pathname
        try {
            const path = window.location.pathname.split('/').pop() || 'homepage.html';
            const links = sidebar.querySelectorAll('.sidebar-nav a');
            links.forEach(function (a) {
                const href = (a.getAttribute('href') || '').split('/').pop();
                if (href === path) {
                    a.closest('li')?.classList.add('active');
                } else {
                    a.closest('li')?.classList.remove('active');
                }
            });
        } catch (e) { /* ignore */ }

        // dispatch ready event for pages to attach behavior
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