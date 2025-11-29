(async function loadSidebar() {
    const placeholder = document.getElementById('sidebarPlaceholder');
    if (!placeholder) return;

    try {
        const resp = await fetch('partials/sidebar.html', { cache: 'no-cache' });
        if (!resp.ok) throw new Error('Failed to load sidebar: ' + resp.status);
        const html = await resp.text();
        placeholder.innerHTML = html;

        // If FontAwesome not yet loaded, pages already include it; otherwise ensure icons render.
        // Optionally attach simple toggle behavior here if page scripts run before insertion.
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');

        if (sidebarToggle && sidebar && mainContent) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                mainContent.classList.toggle('expanded');
                const icon = sidebarToggle.querySelector('i');
                if (sidebar.classList.contains('collapsed')) icon.className = 'fas fa-chevron-right';
                else icon.className = 'fas fa-chevron-left';
            });
        }

        // Dispatch event so page-level scripts can react after sidebar inserted
        window.dispatchEvent(new CustomEvent('sidebar:loaded'));
    } catch (err) {
        console.error(err);
    }
})();