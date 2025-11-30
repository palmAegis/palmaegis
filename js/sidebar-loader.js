(async function loadSidebar() {
    // ensure placeholder exists
    let placeholder = document.getElementById('sidebarPlaceholder');
    if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.id = 'sidebarPlaceholder';
        document.body.insertBefore(placeholder, document.body.firstChild);
    }

    try {
        const res = await fetch('partials/sidebar.html', { cache: 'no-cache' });
        if (!res.ok) throw new Error('Failed to load sidebar: ' + res.status);
        const htmlText = await res.text();

        // parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        // remove dev/live-reload scripts that can show raw text
        const badScriptPattern = /livereload|webpack|sockjs|browser-sync|__webpack__|reload/gi;
        doc.querySelectorAll('script').forEach(s => {
            const combined = (s.src || '') + ' ' + (s.textContent || '');
            if (badScriptPattern.test(combined)) s.remove();
        });

        // recreate nodes and scripts so script tags execute
        const frag = document.createDocumentFragment();
        Array.from(doc.body.childNodes).forEach(node => {
            if (node.nodeName.toLowerCase() === 'script') {
                const newScript = document.createElement('script');
                if (node.src) newScript.src = node.src;
                newScript.text = node.textContent || '';
                if (node.type) newScript.type = node.type;
                if (node.async) newScript.async = true;
                frag.appendChild(newScript);
            } else {
                frag.appendChild(node.cloneNode(true));
            }
        });

        placeholder.innerHTML = '';
        placeholder.appendChild(frag);

        // mark loaded
        window.__sidebarLoaded = true;

        // apply profile if available
        (function applyProfile(){
            try {
                const img = document.getElementById('sidebarUserAvatar');
                const nameEl = document.querySelector('.user-name');
                const roleEl = document.querySelector('.user-role');
                const src = window.userData?.imageBase64 || window.userData?.picture || window.currentUser?.photoURL;
                if (img && src) {
                    img.src = src;
                    img.onerror = () => { img.onerror = null; img.src = img.getAttribute('data-default') || img.src; };
                }
                if (nameEl) {
                    const display = window.userData?.firstName && window.userData?.lastName
                        ? `${window.userData.firstName} ${window.userData.lastName}`
                        : window.userData?.username || window.currentUser?.displayName || (window.currentUser?.email || '').split('@')[0] || 'User';
                    nameEl.textContent = display;
                }
                if (roleEl) roleEl.textContent = window.userData?.bio || 'Farmer';
            } catch (e) { /* ignore */ }
        })();

        // wire up sidebar toggle safely
        const sidebar = document.querySelector('.sidebar');
        const toggle = document.getElementById('sidebarToggle') || sidebar?.querySelector('.sidebar-toggle');
        if (toggle && sidebar) {
            toggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                const main = document.querySelector('.main-content') || document.querySelector('main');
                if (main) main.classList.toggle('sidebar-collapsed');
                const icon = toggle.querySelector('i');
                if (icon) icon.className = sidebar.classList.contains('collapsed') ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
            });
            toggle.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle.click(); }});
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('sidebar:logoutRequested')); });

        // notify others
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