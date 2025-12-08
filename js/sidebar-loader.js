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

        // Function to create fallback avatar with initials
        function createFallbackAvatar(initials, size = 128) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            
            // Color palette for avatars (green theme matching your app)
            const colors = [
                '#2e7d32', // Primary green
                '#388e3c', // Secondary green
                '#43a047', // Light green
                '#4caf50', // Lighter green
                '#66bb6a'  // Very light green
            ];
            
            // Pick a color based on initials for consistency
            const colorIndex = initials.charCodeAt(0) % colors.length;
            
            // Draw background circle
            ctx.fillStyle = colors[colorIndex];
            ctx.beginPath();
            ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw initials
            ctx.fillStyle = 'white';
            ctx.font = `bold ${size * 0.35}px Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(initials, size/2, size/2);
            
            return canvas.toDataURL();
        }

        // Function to get user initials
        function getUserInitials(user) {
            if (!user) return '';
            
            if (user.displayName) {
                // Get initials from display name
                const nameParts = user.displayName.split(' ');
                if (nameParts.length >= 2) {
                    return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
                }
                return user.displayName.charAt(0).toUpperCase();
            }
            
            if (user.email) {
                // Use first letter of email
                return user.email.charAt(0).toUpperCase();
            }
            
            return '';
        }

        // Function to load user profile data for sidebar
        async function loadSidebarUserProfile() {
            try {
                const img = document.getElementById('sidebarUserAvatar');
                const nameEl = document.querySelector('.user-name');
                const roleEl = document.querySelector('.user-role');
                const bioEl = document.getElementById('sidebarUserBio');
                
                // Clear the fields first (show empty while loading)
                if (img) img.style.opacity = '0.5';
                if (nameEl) nameEl.textContent = 'Loading...';
                if (roleEl) roleEl.textContent = '';
                if (bioEl) bioEl.style.display = 'none';
                
                // Try to get current user from global auth object
                let currentUser = null;
                
                // Check for global auth instance (from your treehealth.html)
                if (window.currentUser) {
                    currentUser = window.currentUser;
                    console.log('Using window.currentUser:', currentUser.email);
                }
                // Check for Firebase auth
                else if (typeof firebase !== 'undefined' && firebase.auth) {
                    const auth = firebase.auth();
                    currentUser = auth.currentUser;
                    if (currentUser) {
                        console.log('Using firebase.auth().currentUser:', currentUser.email);
                    }
                }
                
                // If no user found, just keep loading state - don't show Guest
                if (!currentUser) {
                    console.log('Waiting for authenticated user...');
                    // Don't set Guest, just keep loading state
                    return;
                }
                
                // We have a user - load their profile
                const displayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
                const userInitials = getUserInitials(currentUser);
                let role = 'Farmer';
                let bio = '';
                let avatarSrc = '';
                
                // Try to load user profile from Firestore
                try {
                    if (typeof firebase !== 'undefined' && firebase.firestore) {
                        const db = firebase.firestore();
                        const userDoc = await db.collection('users').doc(currentUser.uid).get();
                        
                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            console.log('Loaded user data from Firestore:', userData);
                            
                            // Get avatar source (check multiple possible fields)
                            if (userData.profilePicture) {
                                avatarSrc = userData.profilePicture;
                            } else if (userData.imageBase64) {
                                avatarSrc = userData.imageBase64;
                            } else if (userData.picture) {
                                avatarSrc = userData.picture;
                            } else if (currentUser.photoURL) {
                                avatarSrc = currentUser.photoURL;
                            }
                            
                            // Get display name
                            if (userData.firstName && userData.lastName) {
                                displayName = `${userData.firstName} ${userData.lastName}`;
                            } else if (userData.username) {
                                displayName = userData.username;
                            }
                            
                            // Get role
                            if (userData.role) {
                                role = userData.role;
                            }
                            
                            // Get bio
                            bio = userData.bio || userData.description || '';
                        } else {
                            console.log('No Firestore document found, using auth data');
                            if (currentUser.photoURL) {
                                avatarSrc = currentUser.photoURL;
                            }
                        }
                    }
                } catch (dbError) {
                    console.warn('Could not load user from Firestore:', dbError);
                    // Fallback to auth user data
                    if (currentUser.photoURL) {
                        avatarSrc = currentUser.photoURL;
                    }
                }
                
                // Update DOM elements with real user data
                if (img) {
                    img.style.opacity = '1';
                    // Remove any previous error handlers
                    img.onerror = null;
                    
                    if (avatarSrc) {
                        // Try to load the actual avatar
                        img.src = avatarSrc;
                        img.onerror = function() {
                            console.log('Avatar image failed to load, using fallback with initials');
                            this.onerror = null; // Prevent infinite loop
                            if (userInitials) {
                                this.src = createFallbackAvatar(userInitials);
                            }
                        };
                    } else if (userInitials) {
                        // No avatar URL, but we have initials
                        console.log('No avatar URL available, using fallback with initials:', userInitials);
                        img.src = createFallbackAvatar(userInitials);
                    }
                    // If no avatar and no initials, leave it empty
                }
                
                if (nameEl) {
                    nameEl.textContent = displayName;
                }
                
                if (roleEl) {
                    roleEl.textContent = role;
                }
                
                if (bioEl) {
                    if (bio) {
                        bioEl.textContent = bio;
                        bioEl.style.display = 'block';
                    } else {
                        bioEl.style.display = 'none';
                    }
                }
                
                console.log('Sidebar profile loaded:', { 
                    displayName, 
                    role, 
                    initials: userInitials,
                    hasAvatar: !!avatarSrc,
                    hasBio: !!bio 
                });
                
            } catch (error) {
                console.error('Error loading sidebar user profile:', error);
                // On error, show minimal user info but NOT Guest
                const img = document.getElementById('sidebarUserAvatar');
                const nameEl = document.querySelector('.user-name');
                const roleEl = document.querySelector('.user-role');
                const bioEl = document.getElementById('sidebarUserBio');
                
                if (img) {
                    img.style.opacity = '1';
                    img.src = createFallbackAvatar('U');
                }
                if (nameEl) nameEl.textContent = 'User';
                if (roleEl) roleEl.textContent = '';
                if (bioEl) bioEl.style.display = 'none';
            }
        }

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

        // Load sidebar user profile immediately
        loadSidebarUserProfile();

        // Listen for auth state changes to update sidebar
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    console.log('Auth state changed, updating sidebar profile for:', user.email);
                    window.currentUser = user; // Store globally for access
                    loadSidebarUserProfile();
                }
            });
        }

        // Also try to load profile multiple times to ensure we get the user
        const retryProfileLoad = () => {
            console.log('Retrying sidebar profile load...');
            loadSidebarUserProfile();
        };
        
        // Try after 1 second, 3 seconds, and 5 seconds
        setTimeout(retryProfileLoad, 1000);
        setTimeout(retryProfileLoad, 3000);
        setTimeout(retryProfileLoad, 5000);

        // Expose a function to update sidebar profile from other scripts
        window.updateSidebarProfile = loadSidebarUserProfile;

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