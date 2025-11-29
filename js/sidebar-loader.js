(async function loadSidebar() {
    const placeholder = document.getElementById('sidebarPlaceholder');
    if (!placeholder) return;

    try {
        const resp = await fetch('partials/sidebar.html', { cache: 'no-cache' });
        if (!resp.ok) throw new Error('Failed to load sidebar: ' + resp.status);
        const html = await resp.text();
        placeholder.innerHTML = html;

        // wire up toggle
        const sidebar = document.querySelector('.sidebar');
        const sidebarToggle = sidebar?.querySelector('#sidebarToggle');
        const mainContent = document.querySelector('.main-content');

        if (sidebarToggle && sidebar && mainContent) {
            const icon = sidebarToggle.querySelector('i');
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                mainContent.classList.toggle('expanded');
                if (sidebar.classList.contains('collapsed')) icon.className = 'fas fa-chevron-right';
                else icon.className = 'fas fa-chevron-left';
            });
        }

        // simple logout event hook (pages can also attach their own handler)
        const logoutBtn = sidebar?.querySelector('#logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                // dispatch an event so page-level firebase/logout logic can run
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('sidebar:logoutRequested', { detail: { source: 'sidebar' } }));
            });
        }

        // let pages know sidebar is loaded
        window.dispatchEvent(new CustomEvent('sidebar:loaded'));
    } catch (err) {
        console.error('Sidebar loader error:', err);
    }
})();