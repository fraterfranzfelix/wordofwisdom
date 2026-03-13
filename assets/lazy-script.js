// ==========================================================================
// LAZY SCRIPT
// ==========================================================================
// Combines: custom-select.js · navigation.js · theme.js
// ==========================================================================


// ==========================================================================
// CUSTOM SELECT DROPDOWN
// ==========================================================================
// Transforms native <select> elements into fully styled custom dropdowns
// while maintaining accessibility and form functionality.
// ==========================================================================

(function() {
    'use strict';

    // SVG arrow icon
    const ARROW_SVG = `
        <svg viewBox="0 0 24 24">
            <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
    `;

    /**
     * Initialize all custom selects on the page
     */
    function initCustomSelects() {
        const selects = document.querySelectorAll('select');
        selects.forEach(select => {
            // Skip if already initialized
            if (select.closest('.custom-select')) return;
            createCustomSelect(select);
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', handleOutsideClick);

        // Handle keyboard navigation
        document.addEventListener('keydown', handleKeyboard);
    }

    /**
     * Create custom select wrapper around native select
     */
    function createCustomSelect(nativeSelect) {
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select';

        // Transfer any existing classes (like 'glass')
        if (nativeSelect.classList.contains('glass')) {
            wrapper.dataset.hasGlass = 'true';
        }

        // Create trigger button
        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        trigger.setAttribute('tabindex', '0');
        trigger.setAttribute('role', 'combobox');
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');

        // Create value display
        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'custom-select-value';

        // Create arrow
        const arrow = document.createElement('span');
        arrow.className = 'custom-select-arrow';
        arrow.innerHTML = ARROW_SVG;

        trigger.appendChild(valueDisplay);
        trigger.appendChild(arrow);

        // Create dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'custom-select-dropdown';
        dropdown.setAttribute('role', 'listbox');

        // Create options container
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-select-options';
        dropdown.appendChild(optionsContainer);

        // Wrap native select
        nativeSelect.parentNode.insertBefore(wrapper, nativeSelect);
        wrapper.appendChild(nativeSelect);
        wrapper.appendChild(trigger);
        wrapper.appendChild(dropdown);

        // Populate options
        updateOptions(wrapper);

        // Update display
        updateDisplay(wrapper);

        // Event listeners
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown(wrapper);
        });

        trigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleDropdown(wrapper);
            }
        });

        // Watch for changes to native select (e.g., when options are dynamically added)
        const observer = new MutationObserver(() => {
            updateOptions(wrapper);
            updateDisplay(wrapper);
        });
        observer.observe(nativeSelect, { childList: true, subtree: true });

        // Sync if native select changes programmatically
        nativeSelect.addEventListener('change', () => {
            updateDisplay(wrapper);
            updateSelectedOption(wrapper);
        });
    }

    /**
     * Populate custom options from native select
     */
    function updateOptions(wrapper) {
        const nativeSelect = wrapper.querySelector('select');
        const optionsContainer = wrapper.querySelector('.custom-select-options');

        // Check which picker this is (for prefetch support)
        const isBookPicker = nativeSelect.id === 'book-picker';
        const isTranslationPicker = nativeSelect.id === 'translation-picker';

        // Clear existing options
        optionsContainer.innerHTML = '';

        // Create custom options
        Array.from(nativeSelect.options).forEach((option, index) => {
            const customOption = document.createElement('div');
            customOption.className = 'custom-select-option';
            customOption.dataset.value = option.value;
            customOption.dataset.index = index;
            customOption.textContent = option.textContent;
            customOption.setAttribute('role', 'option');

            if (option.disabled) {
                customOption.classList.add('disabled');
            }

            if (option.selected) {
                customOption.classList.add('selected');
            }

            // Mousedown prefetch for book picker
            if (isBookPicker && !option.disabled && window.biblePrefetch) {
                customOption.addEventListener('mousedown', (e) => {
                    const bookId = option.value;
                    console.log(`Mousedown prefetch: ${bookId}`);
                    window.biblePrefetch.prefetchBook(bookId);
                });
            }

            // Mousedown prefetch for translation picker
            if (isTranslationPicker && !option.disabled && window.biblePrefetch) {
                customOption.addEventListener('mousedown', (e) => {
                    const translationId = option.value;
                    console.log(`Mousedown prefetch: translation ${translationId}`);
                    window.biblePrefetch.prefetchTranslation(translationId);
                });
            }

            customOption.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!option.disabled) {
                    selectOption(wrapper, index);
                }
            });

            optionsContainer.appendChild(customOption);
        });
    }

    /**
     * Update the displayed value
     */
    function updateDisplay(wrapper) {
        const nativeSelect = wrapper.querySelector('select');
        const valueDisplay = wrapper.querySelector('.custom-select-value');
        const selectedOption = nativeSelect.options[nativeSelect.selectedIndex];

        if (selectedOption) {
            valueDisplay.textContent = selectedOption.textContent;

            // Check if it's a placeholder (disabled selected option)
            if (selectedOption.disabled) {
                valueDisplay.classList.add('placeholder');
            } else {
                valueDisplay.classList.remove('placeholder');
            }
        }
    }

    /**
     * Update which option appears selected
     */
    function updateSelectedOption(wrapper) {
        const nativeSelect = wrapper.querySelector('select');
        const options = wrapper.querySelectorAll('.custom-select-option');

        options.forEach((opt, index) => {
            if (index === nativeSelect.selectedIndex) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });
    }

    /**
     * Select an option
     */
    function selectOption(wrapper, index) {
        const nativeSelect = wrapper.querySelector('select');
        const options = wrapper.querySelectorAll('.custom-select-option');

        // Update native select
        nativeSelect.selectedIndex = index;

        // Trigger change event on native select
        nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));

        // Update visual selection
        options.forEach((opt, i) => {
            opt.classList.remove('selected', 'just-selected');
            if (i === index) {
                opt.classList.add('selected', 'just-selected');
                // Remove shimmer class after animation
                setTimeout(() => opt.classList.remove('just-selected'), 500);
            }
        });

        // Update display
        updateDisplay(wrapper);

        // Close dropdown
        closeDropdown(wrapper);
    }

    /**
     * Toggle dropdown open/closed
     */
    function toggleDropdown(wrapper) {
        if (wrapper.classList.contains('open')) {
            closeDropdown(wrapper);
        } else {
            openDropdown(wrapper);
        }
    }

    /**
     * Open dropdown
     */
    function openDropdown(wrapper) {
        // Close any other open dropdowns
        document.querySelectorAll('.custom-select.open').forEach(other => {
            if (other !== wrapper) closeDropdown(other);
        });

        wrapper.classList.add('open');
        wrapper.querySelector('.custom-select-trigger').setAttribute('aria-expanded', 'true');

        // Scroll selected option into view
        const selectedOption = wrapper.querySelector('.custom-select-option.selected');
        if (selectedOption) {
            selectedOption.scrollIntoView({ block: 'nearest' });
        }
    }

    /**
     * Close dropdown
     */
    function closeDropdown(wrapper) {
        wrapper.classList.remove('open');
        wrapper.querySelector('.custom-select-trigger').setAttribute('aria-expanded', 'false');
    }

    /**
     * Handle clicks outside dropdowns
     */
    function handleOutsideClick(e) {
        if (!e.target.closest('.custom-select')) {
            document.querySelectorAll('.custom-select.open').forEach(closeDropdown);
        }
    }

    /**
     * Handle keyboard navigation
     */
    function handleKeyboard(e) {
        const openSelect = document.querySelector('.custom-select.open');
        if (!openSelect) return;

        const options = openSelect.querySelectorAll('.custom-select-option:not(.disabled)');
        const currentIndex = Array.from(options).findIndex(opt => opt.classList.contains('selected'));

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (currentIndex < options.length - 1) {
                    highlightOption(openSelect, options, currentIndex + 1);
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (currentIndex > 0) {
                    highlightOption(openSelect, options, currentIndex - 1);
                }
                break;

            case 'Enter':
                e.preventDefault();
                const highlighted = openSelect.querySelector('.custom-select-option.highlighted');
                if (highlighted) {
                    const index = parseInt(highlighted.dataset.index);
                    selectOption(openSelect, index);
                }
                break;

            case 'Escape':
                e.preventDefault();
                closeDropdown(openSelect);
                openSelect.querySelector('.custom-select-trigger').focus();
                break;
        }
    }

    /**
     * Highlight option during keyboard navigation
     */
    function highlightOption(wrapper, options, newIndex) {
        options.forEach(opt => opt.classList.remove('highlighted'));
        options[newIndex].classList.add('highlighted');
        options[newIndex].scrollIntoView({ block: 'nearest' });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCustomSelects);
    } else {
        initCustomSelects();
    }

    // Expose reinit function for dynamically added selects
    window.initCustomSelects = initCustomSelects;

})();


// ==========================================================================
// NAVIGATION CONTROLS - Book & Chapter Navigation
// ==========================================================================
// Adds previous/next navigation buttons for books and chapters.
// Works alongside the existing dropdowns in script.js.
// ==========================================================================

(function() {
    'use strict';

    // --- DOM Elements ---
    const bookPicker = document.getElementById('book-picker');
    const chapterPicker = document.getElementById('chapter-picker');

    const btnPrevBook = document.getElementById('btn-prev-book');
    const btnNextBook = document.getElementById('btn-next-book');
    const btnPrevChapter = document.getElementById('btn-prev-chapter');
    const btnNextChapter = document.getElementById('btn-next-chapter');

    // --- Book Navigation ---

    /**
     * Navigate to the previous book in the list.
     * Wraps around to the last book if at the beginning.
     */
    function goToPrevBook() {
        const currentIndex = bookPicker.selectedIndex;
        const totalBooks = bookPicker.options.length;

        if (totalBooks === 0) return;

        // Calculate new index (wrap to end if at beginning)
        const newIndex = currentIndex > 0 ? currentIndex - 1 : totalBooks - 1;

        bookPicker.selectedIndex = newIndex;
        bookPicker.dispatchEvent(new Event('change', { bubbles: true }));
    }

    /**
     * Navigate to the next book in the list.
     * Wraps around to the first book if at the end.
     */
    function goToNextBook() {
        const currentIndex = bookPicker.selectedIndex;
        const totalBooks = bookPicker.options.length;

        if (totalBooks === 0) return;

        // Calculate new index (wrap to beginning if at end)
        const newIndex = currentIndex < totalBooks - 1 ? currentIndex + 1 : 0;

        bookPicker.selectedIndex = newIndex;
        bookPicker.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // --- Chapter Navigation ---

    /**
     * Navigate to the previous chapter.
     * If at chapter 1, goes to the previous book's last chapter.
     */
    function goToPrevChapter() {
        const currentChapter = chapterPicker.selectedIndex;
        const totalChapters = chapterPicker.options.length;

        if (totalChapters === 0) return;

        if (currentChapter > 0) {
            // Go to previous chapter in same book
            chapterPicker.selectedIndex = currentChapter - 1;
            chapterPicker.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            // At chapter 1 - go to previous book's last chapter
            const currentBookIndex = bookPicker.selectedIndex;
            const totalBooks = bookPicker.options.length;

            if (totalBooks === 0) return;

            // Go to previous book (wrap if needed)
            const newBookIndex = currentBookIndex > 0 ? currentBookIndex - 1 : totalBooks - 1;
            bookPicker.selectedIndex = newBookIndex;

            // Trigger book change (this will reset chapter to 1)
            bookPicker.dispatchEvent(new Event('change', { bubbles: true }));

            // After a brief delay, set to last chapter of new book
            setTimeout(() => {
                const newTotalChapters = chapterPicker.options.length;
                if (newTotalChapters > 0) {
                    chapterPicker.selectedIndex = newTotalChapters - 1;
                    chapterPicker.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }, 50);
        }
    }

    /**
     * Navigate to the next chapter.
     * If at the last chapter, goes to the next book's first chapter.
     */
    function goToNextChapter() {
        const currentChapter = chapterPicker.selectedIndex;
        const totalChapters = chapterPicker.options.length;

        if (totalChapters === 0) return;

        if (currentChapter < totalChapters - 1) {
            // Go to next chapter in same book
            chapterPicker.selectedIndex = currentChapter + 1;
            chapterPicker.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            // At last chapter - go to next book's first chapter
            const currentBookIndex = bookPicker.selectedIndex;
            const totalBooks = bookPicker.options.length;

            if (totalBooks === 0) return;

            // Go to next book (wrap if needed)
            const newBookIndex = currentBookIndex < totalBooks - 1 ? currentBookIndex + 1 : 0;
            bookPicker.selectedIndex = newBookIndex;

            // Trigger book change (this will automatically set chapter to 1)
            bookPicker.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    // --- Event Listeners ---

    if (btnPrevBook) {
        btnPrevBook.addEventListener('click', goToPrevBook);

        // Hover prefetch: start loading previous book when user hovers
        btnPrevBook.addEventListener('mouseenter', () => {
            if (window.biblePrefetch) {
                const prevBookId = window.biblePrefetch.getAdjacentBookId(-1);
                if (prevBookId) {
                    window.biblePrefetch.prefetchBook(prevBookId);
                }
            }
        });
    }

    if (btnNextBook) {
        btnNextBook.addEventListener('click', goToNextBook);

        // Hover prefetch: start loading next book when user hovers
        btnNextBook.addEventListener('mouseenter', () => {
            if (window.biblePrefetch) {
                const nextBookId = window.biblePrefetch.getAdjacentBookId(1);
                if (nextBookId) {
                    window.biblePrefetch.prefetchBook(nextBookId);
                }
            }
        });
    }

    if (btnPrevChapter) {
        btnPrevChapter.addEventListener('click', goToPrevChapter);
    }

    if (btnNextChapter) {
        btnNextChapter.addEventListener('click', goToNextChapter);
    }

    // --- Keyboard Shortcuts (Optional) ---

    document.addEventListener('keydown', (e) => {
        // Only trigger if not focused on an input/select
        if (document.activeElement.tagName === 'INPUT' ||
            document.activeElement.tagName === 'SELECT' ||
            document.activeElement.tagName === 'TEXTAREA') {
            return;
        }

        // Arrow Left/Right for chapter navigation
        if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            goToPrevChapter();
        } else if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            goToNextChapter();
        }

        // Ctrl/Cmd + Arrow for book navigation
        if (e.key === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            goToPrevBook();
        } else if (e.key === 'ArrowRight' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            goToNextBook();
        }
    });

    // Expose functions globally for potential external use
    window.bibleNav = {
        prevBook: goToPrevBook,
        nextBook: goToNextBook,
        prevChapter: goToPrevChapter,
        nextChapter: goToNextChapter
    };

})();


// ==========================================================================
// THEME SYSTEM - Color Mode Cycling
// ==========================================================================
// Handles theme switching with localStorage persistence.
// Works with color-themes.css which defines [data-theme="dark"] etc.
//
// NOTE: The initial theme application happens in a <script> in the <head>
// to prevent flash of wrong theme. This script handles the toggle button.
// ==========================================================================

(function() {
    'use strict';

    // Available themes in cycle order
    const THEMES = ['light', 'dark'];

    // Display names for the button
    const THEME_NAMES = {
        'light': 'Light Mode',
        'dark': 'Dark Mode'
    };

    const STORAGE_KEY = 'color-theme';

    // State to track if we have already prefetched the image
    let isLogoPrefetched = false;

    /**
     * Prefetches the dark mode logo so it is ready immediately upon click.
     */
    function prefetchDarkLogo() {
        // If we've already fetched it, don't do it again
        if (isLogoPrefetched) return;

        const img = new Image();
        img.src = '/assets/logo-negative.png';
        isLogoPrefetched = true;
    }

    /**
     * Gets the current theme from the document.
     * @returns {string} Current theme name
     */
    function getCurrentTheme() {
        return document.documentElement.dataset.theme || 'light';
    }

    /**
     * Sets the theme on the document and saves to localStorage.
     * @param {string} theme - Theme name to apply
     */
    function setTheme(theme) {
        if (theme === 'light') {
            // Light is the default, so remove the attribute
            delete document.documentElement.dataset.theme;
        } else {
            document.documentElement.dataset.theme = theme;
        }

        localStorage.setItem(STORAGE_KEY, theme);
        updateButtonText();
    }

    /**
     * Cycles to the next theme in the list.
     */
    function cycleTheme() {
        const current = getCurrentTheme();
        const currentIndex = THEMES.indexOf(current);
        const nextIndex = (currentIndex + 1) % THEMES.length;
        setTheme(THEMES[nextIndex]);
    }

    /**
     * Updates the button text to show current theme.
     */
    function updateButtonText() {
        const btn = document.getElementById('theme-toggle-btn');
        if (btn) {
            const current = getCurrentTheme();
            btn.textContent = THEME_NAMES[current] || current;
        }
    }

    /**
     * Initialize the theme toggle button.
     */
    function init() {
        const btn = document.getElementById('theme-toggle-btn');

        if (btn) {
            btn.addEventListener('click', cycleTheme);

            // Prefetch the negative logo when the mouse enters the button area
            btn.addEventListener('mouseenter', prefetchDarkLogo);

            updateButtonText();
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for potential external use
    window.themeSystem = {
        cycle: cycleTheme,
        set: setTheme,
        get: getCurrentTheme
    };

})();
