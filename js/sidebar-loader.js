(async function loadSidebar() {
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

        // parse fetched HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        // remove dev/live-reload scripts (explicit script elements)
        const badScriptPattern = /livereload|webpack|sockjs|browser-sync|__webpack__|reload/gi;
        doc.querySelectorAll('script').forEach(s => {
            const combined = (s.src || '') + ' ' + (s.textContent || '');
            if (badScriptPattern.test(combined)) s.remove();
        });

        // SANITIZE: strip injected comments/scripts that may appear inside attributes or text nodes
        // 1) Clean attributes on all elements (remove inline script/comment fragments)
        doc.querySelectorAll('*').forEach(el => {
            Array.from(el.attributes).forEach(attr => {
                // If attribute value contains script/comment markers, strip them out
                if (/(<script|<\/script|<!--|Code injected by live-server)/i.test(attr.value)) {
                    let v = attr.value;
                    // remove HTML comments and any <script>...</script> blocks
                    v = v.replace(/<!--[\s\S]*?-->/g, '');
                    v = v.replace(/<script[\s\S]*?<\/script>/gi, '');
                    // remove stray marker text
                    v = v.replace(/Code injected by live-server/gi, '');
                    // trim leftover accidental broken fragments
                    v = v.replace(/document\.getElementsByTagName\([^\)]*\)/gi, '');
                    attr.value = v;
                }
            });
        });

        // 2) Remove text nodes that contain raw <script> or injected markers
        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null, false);
        const toRemove = [];
        while (walker.nextNode()) {
            const txt = walker.currentNode.nodeValue || '';
            if (/(<script|<\/script|Code injected by live-server|document\.getElementsByTagName\([^\)]*\))/i.test(txt)) {
                toRemove.push(walker.currentNode);
            }
        }
        toRemove.forEach(n => n.parentNode && n.parentNode.removeChild(n));

        // recreate nodes and scripts so inline scripts execute (but dev scripts already removed)
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

        // inject parsed content
        placeholder.innerHTML = '';
        placeholder.appendChild(frag);

        window.__sidebarLoaded = true;

        // --- set active nav item based on current location and add click feedback ---
        (function updateSidebarActive() {
            function setActiveByPath() {
                try {
                    const current = (window.location.pathname || '').split('/').pop() || 'homepage.html';
                    document.querySelectorAll('.sidebar-nav a').forEach(a => {
                        const href = (a.getAttribute('href') || '').split('/').pop();
                        const li = a.closest('li');
                        if (!li) return;
                        if (href === current) li.classList.add('active'); else li.classList.remove('active');
                    });
                } catch (e) { /* ignore */ }
            }

            // immediate highlight
            setActiveByPath();

            // update on clicks for instant feedback (page will normally reload, but this helps single-page or anchor navigation)
            document.querySelectorAll('.sidebar-nav a').forEach(a => {
                a.addEventListener('click', (ev) => {
                    // allow normal navigation, but update class for immediate visual feedback
                    document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
                    const li = a.closest('li');
                    if (li) li.classList.add('active');
                });
            });

            // also expose a function other pages can call after dynamic navigation
            window.setSidebarActive = setActiveByPath;
        })();

        // apply profile if available
        (function applyProfile() {
            try {
                const img = document.getElementById('sidebarUserAvatar');
                const nameEl = document.querySelector('.user-name');
                const roleEl = document.querySelector('.user-role');
                const src = window.userData?.imageBase64 || window.userData?.picture || window.currentUser?.photoURL || null;
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

        // wire toggle safely
        const sidebar = document.querySelector('.sidebar');
        const toggle = document.getElementById('sidebarToggle') || sidebar?.querySelector('.sidebar-toggle');
        if (toggle && sidebar) {
            toggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                const main = document.querySelector('.main-content') || document.querySelector('main');
                if (main) main.classList.toggle('expanded');
                const icon = toggle.querySelector('i');
                if (icon) icon.className = sidebar.classList.contains('collapsed') ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
            });
            toggle.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle.click(); } });
        }

        // wire logout -> try firebase signOut if available, otherwise fallback to href
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (ev) => {
                ev.preventDefault();
                const auth = window.firebaseAuth || (window.firebase && window.firebase.auth && window.firebase.auth());
                if (auth && typeof auth.signOut === 'function') {
                    auth.signOut().catch(() => { }).finally(() => { window.location.href = 'signin.html'; });
                } else {
                    window.location.href = logoutBtn.getAttribute('href') || 'signin.html';
                }
            });
        }

        // notify other scripts
        window.dispatchEvent(new CustomEvent('sidebar:loaded'));
    } catch (err) {
        console.error('Sidebar loader error:', err);
    }
})();