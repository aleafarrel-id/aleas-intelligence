document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-links a');
    const contentWrapper = document.querySelector('.content-wrapper');
    const navbar = document.querySelector('.navbar');
    const modelsContainer = document.getElementById('models-container');
    const loadingMessage = document.getElementById('loading-message');
    const noDataMessage = document.getElementById('no-data-message');
    const modelForm = document.getElementById('model-form');
    const modelIdInput = document.getElementById('model-id');
    const serviceNameInput = document.getElementById('service-name');
    const providerNameInput = document.getElementById('provider-name');
    const modelNameApiInput = document.getElementById('model-name');
    const apiKeyInput = document.getElementById('api-key');
    const baseUrlInput = document.getElementById('base-url');
    const isActiveInput = document.getElementById('is-active');
    const saveModelBtn = document.getElementById('save-model-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    let currentPageId = 'view-models';
    let isInitialNavigation = true;

    const settingsBtn = document.getElementById('settings-button');
    const settingsOverlay = document.getElementById('settings-overlay');
    const settingsClose = document.getElementById('settings-close');
    const clearHistory = document.getElementById('clear-history');

    // Show settings overlay
    settingsBtn?.addEventListener('click', e => {
        e.stopPropagation();
        settingsOverlay.classList.add('active');
        
        setTimeout(() => {
            const focusables = settingsOverlay.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusables.length) focusables[0].focus();
        }, 50);

        if (!settingsOverlay.dataset.trapAttached) {
            trapFocusInOverlay(settingsOverlay);
            settingsOverlay.dataset.trapAttached = "true";
        }
    });

    // Close settings overlay
    settingsClose?.addEventListener('click', () => {
        settingsOverlay.classList.remove('active');
    });

    settingsOverlay?.addEventListener('click', e => {
        if (e.target === settingsOverlay) {
            settingsOverlay.classList.remove('active');
        }
    });

    // Delete All AI Model
    clearHistory?.addEventListener('click', async () => {
        if (!confirm('Apakah anda yakin ingin menghapus seluruh model AI yang ada?')) return;
        
        try {
            const response = await fetch('../includes/endpoint/delete_model.php', { method: 'DELETE' });
            const data = await response.json();
            settingsOverlay.classList.remove('active');
        
            alert(data.message); 
            await loadModels(); 
        } catch (err) {
            console.error('Error deleting history:', err);
            
            alert('Terjadi kesalahan saat menghapus model AI. Silakan coba lagi');
        }
    });

    // Dark Mode Toggle Functionality
    const appHeader = document.querySelector('.nav-brand');
    const headerDropdown = document.getElementById('header-dropdown');
    const themeToggleButton = document.getElementById('theme-toggle-button');
    const moonIcon = document.getElementById('moon-icon');
    const sunIcon = document.getElementById('sun-icon');

    // Toggle dropdown visibility for header dropdown
    appHeader.addEventListener('click', (e) => {
        if (e.target === appHeader) {
            headerDropdown.classList.toggle('show');
        }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!appHeader.contains(e.target) && !headerDropdown.contains(e.target)) {
            headerDropdown.classList.remove('show');
        }
    });

    // Helper function to update theme icons and title
    function updateThemeIcons(isDarkMode) {
        if (isDarkMode) {
            moonIcon.style.display = 'none';
            sunIcon.style.display = 'block';
            themeToggleButton.title = "Switch to light mode";
        } else {
            moonIcon.style.display = 'block';
            sunIcon.style.display = 'none';
            themeToggleButton.title = "Switch to dark mode";
        }
    }

    // Theme toggle functionality
    themeToggleButton.addEventListener('click', (e) => {
        e.stopPropagation();
        
        requestAnimationFrame(() => {
            const isDarkMode = document.body.classList.toggle('dark');
            
            updateThemeIcons(isDarkMode);
            
            // Save user preference to localStorage
            localStorage.setItem('darkMode', isDarkMode);
        });
    });

    // Initialize theme based on user preference and system preference
    function initTheme() {
        const saved = localStorage.getItem('darkMode');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)'); // Get MediaQueryList object

        let isDark;

        if (saved !== null) {
            // If there is a saved preference, use it
            isDark = (saved === 'true');
        } else {
            // If there is no saved preference, use the system preference as default
            isDark = systemPrefersDark.matches;
            // And save the system preference to localStorage to ensure consistency
            localStorage.setItem('darkMode', isDark);
        }

        if (isDark) {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
        updateThemeIcons(isDark);
    }

    // Listen for changes in the system's color scheme preference
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        // When the system preference changes, update localStorage and reinitialize the theme
        const isSystemDark = e.matches;
        localStorage.setItem('darkMode', isSystemDark); // Save the system preference to localStorage
        initTheme();
    });

    // Initialize theme when the script loads
    initTheme();

    // Save last active page to localStorage
    const saveCurrentPage = () => localStorage.setItem('lastActivePage', currentPageId);
    const loadLastPage = () => localStorage.getItem('lastActivePage') || 'view-models';

    // Set inert attribute pada elemen yang tidak aktif
    const setPageInert = () => {
        document.getElementById('view-models').inert = currentPageId !== 'view-models';
        document.getElementById('add-edit-model').inert = currentPageId !== 'add-edit-model';
    };

    // Navigation to other pages
    const goToPage = (pageId) => {
        currentPageId = pageId;

        if (isInitialNavigation) {
            contentWrapper.style.transition = 'none';
            setTimeout(() => {
                contentWrapper.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                isInitialNavigation = false;
            }, 10);
        }

        // Move content wrapper to the correct page
        contentWrapper.style.transform = `translateX(-${pageId === 'view-models' ? 0 : 100}vw)`;

        setPageInert(); // Set inert to inactive page
        setActiveNavLink(pageId);
        saveCurrentPage();

        // Automatic scroll to top (if needed)
        setTimeout(() => {
            const targetSection = document.getElementById(pageId);
            if (targetSection) {
                const navbarHeight = navbar.offsetHeight;
                const targetPosition = targetSection.getBoundingClientRect().top + window.scrollY;
                window.scrollTo({
                    top: targetPosition - navbarHeight,
                    behavior: 'smooth'
                });
            }
        }, 300);
    };

    // Put active class on the current nav link
    const setActiveNavLink = (id) => {
        navLinks.forEach(link => link.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-links a[href="#${id}"]`);
        if (activeLink) activeLink.classList.add('active');
    };

    // Reset form to initial state
    const resetForm = () => {
        modelForm.reset();
        modelIdInput.value = '';
        saveModelBtn.textContent = 'Simpan';
        cancelEditBtn.style.display = 'none';
        isActiveInput.checked = true;
    };

    // Create a model card element
    const createModelCard = (model) => {
        const card = document.createElement('div');
        card.classList.add('model-card');
        card.setAttribute('data-id', model.id);

        const statusClass = model.is_active ? 'active-status' : 'inactive-status';
        const statusText = model.is_active ? 'Online' : 'Offline';

        card.innerHTML = `
            <div class="header">
                <h3>${model.display_name || 'Nama Model Tidak Ada'}</h3>
                <button class="btn-edit-card" data-id="${model.id}">
                    <i class='bx bx-edit'></i>
                </button>
            </div>
            <span class="provider">by ${model.provider || 'N/A'}</span>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-value ${statusClass}">${statusText}</div>
                    <div class="info-label">Status</div>
                </div>
                <div class="info-item">
                    <div class="info-value">${model.model_name || 'N/A'}</div>
                    <div class="info-label">Service</div>
                </div>
            </div>
            <button class="btn-delete-card" data-id="${model.id}">
                <i class='bx bx-trash'></i> Delete
            </button>
        `;
        return card;
    };

    // Get models from backend and display them
    const loadModels = async () => {
        try {
            loadingMessage.style.display = 'block';
            noDataMessage.style.display = 'none';
            modelsContainer.innerHTML = '';

            const response = await fetch('../includes/endpoint/get_models.php');
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to load models');
            }

            if (result.data && result.data.length > 0) {
                result.data.forEach(model => modelsContainer.appendChild(createModelCard(model)));
            } else {
                noDataMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading models:', error);
            noDataMessage.style.display = 'block';
        } finally {
            loadingMessage.style.display = 'none';
        }
    };

    // Insert model data into the form for editing
    const fillFormWithModelData = (model) => {
        modelIdInput.value = model.id;
        serviceNameInput.value = model.display_name;
        providerNameInput.value = model.provider;
        modelNameApiInput.value = model.model_name;
        apiKeyInput.value = model.api_key;
        baseUrlInput.value = model.base_url;
        isActiveInput.checked = model.is_active ? true : false;

        saveModelBtn.textContent = 'Perbarui';
        cancelEditBtn.style.display = 'inline-block';
    };

    // Delete a model by ID
    const deleteModel = async (modelId) => {
        if (!confirm('Apakah Anda yakin ingin menghapus model ini?')) return;

        try {
            const response = await fetch(`../includes/endpoint/delete_model.php?id=${modelId}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Gagal menghapus model');
            }

            alert('Model berhasil dihapus');
            await loadModels();
        } catch (error) {
            console.error('Error deleting model:', error);
            alert('Error: ' + error.message);
        }
    };

    // Handle navigation clicks
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            if (targetId === 'add-edit-model') resetForm();
            goToPage(targetId);
        });
    });

    // Save model data to backend
    modelForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            displayName: serviceNameInput.value.trim(),
            providerName: providerNameInput.value.trim(),
            modelName: modelNameApiInput.value.trim(),
            apiKey: apiKeyInput.value.trim(),
            baseUrl: baseUrlInput.value.trim(),
            isActive: isActiveInput.checked
        };

        if (modelIdInput.value) formData.id = modelIdInput.value;

        try {
            saveModelBtn.disabled = true;
            saveModelBtn.textContent = modelIdInput.value ? 'Memperbarui...' : 'Menyimpan...';

            const endpoint = modelIdInput.value
                ? '../includes/endpoint/edit_model.php'
                : '../includes/endpoint/add_model.php';

            const method = modelIdInput.value ? 'PUT' : 'POST';

            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Gagal menyimpan model');

            alert(modelIdInput.value ? 'Model berhasil diperbarui' : 'Model berhasil ditambahkan');
            resetForm();
            await loadModels();
            goToPage('view-models');
        } catch (error) {
            console.error('Error:', error);
            alert('Error: ' + error.message);
        } finally {
            saveModelBtn.disabled = false;
            saveModelBtn.textContent = modelIdInput.value ? 'Perbarui' : 'Simpan';
        }
    });

    cancelEditBtn.addEventListener('click', () => {
        resetForm();
        goToPage('view-models');
    });

    // Handle model card actions button clicks
    modelsContainer.addEventListener('click', async (e) => {
        const editButton = e.target.closest('.btn-edit-card');
        const deleteButton = e.target.closest('.btn-delete-card');

        if (editButton) {
            const modelId = editButton.dataset.id;
            try {
                const response = await fetch(`../includes/endpoint/edit_model.php?id=${modelId}`);
                const modelData = await response.json();
                if (!response.ok) throw new Error(modelData.error || 'Gagal memuat data model');
                fillFormWithModelData(modelData);
                goToPage('add-edit-model');
            } catch (error) {
                console.error('Error loading model:', error);
                alert('Error: ' + error.message);
            }
        } else if (deleteButton) {
            deleteModel(deleteButton.dataset.id);
        }
    });

    // Function to set the height of the navbar as a CSS variable
    const setNavbarHeightVar = () => {
        document.documentElement.style.setProperty('--navbar-height', `${navbar.offsetHeight}px`);
    };

    // Navigation toggle for mobile
    const createMobileNav = () => {
        const toggle = document.createElement('button');
        toggle.className = 'mobile-nav-toggle';
        toggle.innerHTML = '<i class="bx bx-chevron-down"></i>';
        toggle.setAttribute('aria-label', 'Toggle navigation menu');

        const navLinksElem = document.querySelector('.nav-links');

        toggle.addEventListener('click', () => {
            navLinksElem.classList.toggle('show');
            toggle.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!navbar.contains(e.target) && navLinksElem.classList.contains('show')) {
                navLinksElem.classList.remove('show');
                toggle.classList.remove('active');
            }
        });

        navLinksElem.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinksElem.classList.remove('show');
                toggle.classList.remove('active');
            });
        });

        navbar.insertBefore(toggle, navLinksElem);
    };

    // Trap focus within overlay
    function trapFocusInOverlay(overlayElement) {
        const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

        overlayElement.addEventListener('keydown', e => {
            if (e.key !== 'Tab') return;
            const focusables = overlayElement.querySelectorAll(focusableSelectors);
            if (focusables.length === 0) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                // Tab
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        });
    }

    // Initialize the application
    const initApp = async () => {
        setNavbarHeightVar();
        window.addEventListener('resize', setNavbarHeightVar);
        createMobileNav();
        await loadModels();
        goToPage(loadLastPage());
    };

    initApp();
});
