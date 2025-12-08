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

        // Function to load user profile data for sidebar with Firebase support
        async function loadSidebarUserProfile() {
            try {
                const img = document.getElementById('sidebarUserAvatar');
                const nameEl = document.querySelector('.user-name');
                const roleEl = document.querySelector('.user-role');
                const bioEl = document.getElementById('sidebarUserBio');
                
                // Default values
                let avatarSrc = 'images/default-avatar.png';
                let displayName = 'Guest';
                let role = 'Visitor';
                let bio = '';
                
                // Check if Firebase is available and user is authenticated
                if (typeof firebase !== 'undefined' && firebase.auth) {
                    const auth = firebase.auth();
                    const user = auth.currentUser;
                    
                    if (user) {
                        displayName = user.displayName || user.email?.split('@')[0] || 'User';
                        
                        // Try to get user data from Firestore
                        try {
                            const db = firebase.firestore();
                            const userDoc = await db.collection('users').doc(user.uid).get();
                            
                            if (userDoc.exists) {
                                const userData = userDoc.data();
                                
                                // Get avatar source
                                if (userData.imageBase64) {
                                    avatarSrc = userData.imageBase64;
                                } else if (userData.profilePicture) {
                                    avatarSrc = userData.profilePicture;
                                } else if (userData.picture) {
                                    avatarSrc = userData.picture;
                                } else if (user.photoURL) {
                                    avatarSrc = user.photoURL;
                                }
                                
                                // Get display name
                                if (userData.firstName && userData.lastName) {
                                    displayName = `${userData.firstName} ${userData.lastName}`;
                                } else if (userData.username) {
                                    displayName = userData.username;
                                }
                                
                                // Get role
                                role = userData.role || 'Farmer';
                                
                                // Get bio
                                bio = userData.bio || userData.description || '';
                            } else {
                                // Fallback to auth user data
                                if (user.photoURL) {
                                    avatarSrc = user.photoURL;
                                }
                                role = 'Farmer';
                            }
                        } catch (dbError) {
                            console.warn('Could not load user from Firestore:', dbError);
                            // Fallback to auth user data
                            if (user.photoURL) {
                                avatarSrc = user.photoURL;
                            }
                            role = 'Farmer';
                        }
                    }
                } 
                // Check for legacy user data
                else if (window.userData) {
                    const userData = window.userData;
                    
                    if (userData.imageBase64) {
                        avatarSrc = userData.imageBase64;
                    } else if (userData.profilePicture) {
                        avatarSrc = userData.profilePicture;
                    } else if (userData.picture) {
                        avatarSrc = userData.picture;
                    }
                    
                    if (userData.firstName && userData.lastName) {
                        displayName = `${userData.firstName} ${userData.lastName}`;
                    } else if (userData.username) {
                        displayName = userData.username;
                    }
                    
                    role = userData.role || 'Farmer';
                    bio = userData.bio || userData.description || '';
                }
                
                // Update DOM elements
                if (img) {
                    // Set src and handle errors
                    img.src = avatarSrc;
                    img.onerror = () => {
                        img.onerror = null; // Prevent infinite loop
                        img.src = 'images/default-avatar.png';
                        console.log('Avatar image failed to load, using default');
                    };
                }
                
                if (nameEl) {
                    nameEl.textContent = displayName;
                }
                
                if (roleEl) {
                    roleEl.textContent = role;
                }
                
                if (bioEl && bio) {
                    bioEl.textContent = bio;
                    bioEl.style.display = 'block';
                } else if (bioEl) {
                    bioEl.style.display = 'none';
                }
                
                console.log('Sidebar profile loaded:', { displayName, role, bio: bio ? 'Yes' : 'No' });
                
            } catch (error) {
                console.error('Error loading sidebar user profile:', error);
                // Set defaults on error
                const img = document.getElementById('sidebarUserAvatar');
                const nameEl = document.querySelector('.user-name');
                const roleEl = document.querySelector('.user-role');
                const bioEl = document.getElementById('sidebarUserBio');
                
                if (img) img.src = 'images/default-avatar.png';
                if (nameEl) nameEl.textContent = 'User';
                if (roleEl) roleEl.textContent = 'Farmer';
                if (bioEl) bioEl.style.display = 'none';
            }
        }

        // Load sidebar user profile immediately
        loadSidebarUserProfile();

        // Expose a function to update sidebar profile from other scripts
        window.updateSidebarProfile = loadSidebarUserProfile;

        // Listen for auth state changes to update sidebar
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(() => {
                loadSidebarUserProfile();
            });
        }

        // Also try to load profile after a short delay to ensure Firebase is initialized
        setTimeout(loadSidebarUserProfile, 1000);

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
                const auth = window.firebaseAuth || (typeof firebase !== 'undefined' && firebase.auth && firebase.auth());
                if (auth && typeof auth.signOut === 'function') {
                    auth.signOut().catch(() => { }).finally(() => { window.location.href = 'signin.html'; });
                } else {
                    window.location.href = logoutBtn.getAttribute('href') || 'signin.html';
                }
            });
        }

        // Mobile Menu Setup
        (function setupMobileMenu() {
            // 1. Create Overlay
            let overlay = document.querySelector('.sidebar-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'sidebar-overlay';
                document.body.appendChild(overlay);
            }

            // 2. Create Hamburger Button
            // Try to find the header-left to inject the button
            const headerLeft = document.querySelector('.header-left');
            if (headerLeft && !document.querySelector('.mobile-menu-btn')) {
                const btn = document.createElement('button');
                btn.className = 'mobile-menu-btn';
                btn.innerHTML = '<i class="fas fa-bars"></i>';
                headerLeft.insertBefore(btn, headerLeft.firstChild);

                // 3. Event Listeners
                const sidebar = document.querySelector('.sidebar');

                if (sidebar) {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        sidebar.classList.toggle('active');
                        overlay.classList.toggle('active');
                    });

                    overlay.addEventListener('click', () => {
                        sidebar.classList.remove('active');
                        overlay.classList.remove('active');
                    });

                    // Close sidebar when clicking a link on mobile
                    const navLinks = sidebar.querySelectorAll('a');
                    navLinks.forEach(link => {
                        link.addEventListener('click', () => {
                            if (window.innerWidth <= 768) {
                                sidebar.classList.remove('active');
                                overlay.classList.remove('active');
                            }
                        });
                    });
                }
            }
        })();

        // notify other scripts
        window.dispatchEvent(new CustomEvent('sidebar:loaded'));
        
    } catch (err) {
        console.error('Sidebar loader error:', err);
    }
})();