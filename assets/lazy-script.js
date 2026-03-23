// ==========================================================================
// LAZY SCRIPT
// ==========================================================================
// Combines: custom-select.js · navigation.js · theme.js · font.js
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


// ==========================================================================
// DAILY MASS READINGS
// ==========================================================================
// Liturgical day calculator, lectionary lookup, and popup bar.
// The popup waits for lazy-style.css before becoming visible.
// ==========================================================================

// ---------------------------------------------------------------------------
// LITURGICAL DAY CALCULATOR
// ---------------------------------------------------------------------------

function getEaster(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month, day);
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function getOrdinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getLiturgicalDay(inputDate = new Date()) {
    const targetDate = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
    const year = targetDate.getFullYear();

    const easter = getEaster(year);
    const ashWednesday = addDays(easter, -46);
    const pentecost = addDays(easter, 49);

    const christmas = new Date(year, 11, 25);
    const prevChristmas = new Date(year - 1, 11, 25);

    let firstSundayOfAdvent = new Date(christmas);
    firstSundayOfAdvent.setDate(christmas.getDate() - christmas.getDay() - 21);

    let prevFirstSundayOfAdvent = new Date(prevChristmas);
    prevFirstSundayOfAdvent.setDate(prevChristmas.getDate() - prevChristmas.getDay() - 21);

    const daysOfWeek = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
    const dayOfWeekIndex = targetDate.getDay();
    const dayOfWeekStr = daysOfWeek[dayOfWeekIndex];

    let season = '';
    let weekNum = 0;

    if (targetDate >= firstSundayOfAdvent && targetDate < christmas) {
        season = 'Advent';
        const daysIntoAdvent = Math.floor((targetDate - firstSundayOfAdvent) / 86400000);
        weekNum = Math.floor(daysIntoAdvent / 7) + 1;
    } else if (targetDate >= ashWednesday && targetDate < easter) {
        season = 'Lent';
        const daysIntoLent = Math.floor((targetDate - addDays(ashWednesday, 4)) / 86400000);
        weekNum = Math.floor(daysIntoLent / 7) + 1;
        if (targetDate < addDays(ashWednesday, 4)) weekNum = 0;
    } else if (targetDate >= easter && targetDate <= pentecost) {
        season = 'Easter';
        const daysIntoEaster = Math.floor((targetDate - easter) / 86400000);
        weekNum = Math.floor(daysIntoEaster / 7) + 1;
    } else {
        season = 'Ord. Time';
        if (targetDate > pentecost && targetDate < firstSundayOfAdvent) {
            const targetSunday = new Date(targetDate);
            targetSunday.setDate(targetDate.getDate() - targetDate.getDay());
            const daysBeforeAdvent = Math.round((firstSundayOfAdvent - targetSunday) / 86400000);
            weekNum = 35 - daysBeforeAdvent / 7;
        }
    }

    if (dayOfWeekIndex === 0) {
        return season === 'Ord. Time'
            ? `${getOrdinal(weekNum)} Sunday in Ordinary Time`
            : `${getOrdinal(weekNum)} Sunday of ${season}`;
    }
    return `${season}, Week ${weekNum}, ${dayOfWeekStr}`;
}

// ---------------------------------------------------------------------------
// CSV PARSING
// ---------------------------------------------------------------------------

function dmrParseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const next = text[i + 1];
        if (inQuotes) {
            if (ch === '"' && next === '"') { field += '"'; i++; }
            else if (ch === '"') { inQuotes = false; }
            else { field += ch; }
        } else {
            if (ch === '"') { inQuotes = true; }
            else if (ch === ',') { row.push(field); field = ''; }
            else if (ch === '\r' && next === '\n') { row.push(field); field = ''; rows.push(row); row = []; i++; }
            else if (ch === '\n' || ch === '\r') { row.push(field); field = ''; rows.push(row); row = []; }
            else { field += ch; }
        }
    }
    if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }

    const headers = rows[1];
    const data = [];
    for (let r = 2; r < rows.length; r++) {
        if (rows[r].length < 2) continue;
        const obj = {};
        for (let c = 0; c < headers.length; c++) {
            if (headers[c] !== '' && !(headers[c] in obj)) {
                obj[headers[c]] = rows[r][c] || '';
            }
        }
        data.push(obj);
    }
    return data;
}

// ---------------------------------------------------------------------------
// BOOK ABBREVIATION MAP & REFERENCE PARSER
// ---------------------------------------------------------------------------

const DMR_BOOK_MAP = {
    'Gen': 'gen', 'Exod': 'exod', 'Lev': 'lev', 'Num': 'num', 'Deut': 'deut',
    'Josh': 'josh', 'Judg': 'judg', 'Ruth': 'ruth',
    '1 Sam': '1sam', '2 Sam': '2sam', '1 Kgs': '1kgs', '2 Kgs': '2kgs',
    '1 Chr': '1chr', '2 Chr': '2chr', 'Ezra': 'ezra', 'Neh': 'neh',
    'Tob': 'tob', 'Jdt': 'jdt', 'Esth': 'esth',
    '1 Macc': '1macc', '2 Macc': '2macc',
    'Job': 'job', 'Ps': 'ps', 'Prov': 'prov', 'Eccl': 'eccl',
    'Cant': 'song', 'Song': 'song', 'Wis': 'wis', 'Sir': 'sir',
    'Isa': 'isa', 'Jer': 'jer', 'Lam': 'lam', 'Bar': 'bar',
    'Ezek': 'ezek', 'Dan': 'dan',
    'Hos': 'hos', 'Joel': 'joel', 'Amos': 'amos', 'Obad': 'obad',
    'Jonah': 'jonah', 'Mic': 'mic', 'Nah': 'nah', 'Hab': 'hab',
    'Zeph': 'zeph', 'Hag': 'hag', 'Zech': 'zech', 'Mal': 'mal',
    'Matt': 'mt', 'Mark': 'mk', 'Luke': 'lk', 'John': 'jn', 'Acts': 'acts',
    'Rom': 'rom', '1 Cor': '1cor', '2 Cor': '2cor', 'Gal': 'gal',
    'Eph': 'eph', 'Phil': 'phil', 'Col': 'col',
    '1 Thess': '1thess', '2 Thess': '2thess',
    '1 Tim': '1tim', '2 Tim': '2tim',
    'Titus': 'titus', 'Philem': 'philem', 'Heb': 'heb',
    'Jas': 'jam', 'James': 'jam',
    '1 Pet': '1pet', '2 Pet': '2pet',
    '1 John': '1jn', '2 John': '2jn', '3 John': '3jn',
    'Jude': 'jude', 'Rev': 'rev',
};

const DMR_BOOK_KEYS = Object.keys(DMR_BOOK_MAP).sort((a, b) => b.length - a.length);

function dmrStripLetters(s) {
    return parseInt(s.replace(/[a-z]+$/i, ''), 10);
}

function dmrParseVerseSpec(spec, ch, segments) {
    for (const item of spec.split(',').map(s => s.trim()).filter(Boolean)) {
        const range = item.match(/^(\d+[a-z]*)\s*[-–]\s*(\d+[a-z]*)/i);
        const single = item.match(/^(\d+[a-z]*)/i);
        if (range) {
            segments.push({ ch, from: dmrStripLetters(range[1]), to: dmrStripLetters(range[2]) });
        } else if (single) {
            const v = dmrStripLetters(single[1]);
            segments.push({ ch, from: v, to: v });
        }
    }
}

function dmrParseRef(refString) {
    if (!refString) return null;
    let ref = refString.split(' or ')[0].trim()
        .replace(/^cf\.\s*/i, '').replace(/\s*\([^)]*\)/g, '').trim();
    if (!ref) return null;

    let bookId = null, rest = '';
    for (const key of DMR_BOOK_KEYS) {
        if (ref.startsWith(key) && (ref.length === key.length || ref[key.length] === ' ')) {
            bookId = DMR_BOOK_MAP[key];
            rest = ref.slice(key.length).trim();
            break;
        }
    }
    if (!bookId || !rest) return null;

    rest = rest.replace(/\+/g, ',');
    const segments = [];

    if (rest.includes('—')) {
        const [sp, ep] = rest.split('—');
        const sm = sp.trim().match(/^(\d+):(\d+[a-z]*)/i);
        const em = ep.trim().match(/^(\d+):(\d+[a-z]*)/i);
        if (sm && em) {
            segments.push({ ch: +sm[1], from: dmrStripLetters(sm[2]), to: Infinity });
            if (+em[1] !== +sm[1]) segments.push({ ch: +em[1], from: 1, to: dmrStripLetters(em[2]) });
        }
        return segments.length ? { bookId, segments } : null;
    }

    let currentChapter = null;
    for (const part of rest.split(';').map(s => s.trim())) {
        const cm = part.match(/^(\d+):([\d,\s\-a-z]+)/i);
        if (cm) {
            currentChapter = +cm[1];
            dmrParseVerseSpec(cm[2], currentChapter, segments);
        } else if (currentChapter !== null) {
            dmrParseVerseSpec(part, currentChapter, segments);
        }
    }
    return segments.length ? { bookId, segments } : null;
}

// ---------------------------------------------------------------------------
// VERSE TEXT FETCHING
// ---------------------------------------------------------------------------

const dmrBookCache = {};

function dmrGetVerses(bookData, segments) {
    const texts = [];
    for (const { ch, from, to } of segments) {
        const chObj = bookData.chapters.find(c => c.chapter === ch);
        if (!chObj) continue;
        for (const v of chObj.verses) {
            if (v.v >= from && v.v <= to) texts.push(v.text);
        }
    }
    return texts.join(' ');
}

async function dmrFetchVerseText(refString) {
    if (!refString) return '';
    const parsed = dmrParseRef(refString);
    if (!parsed) return '';
    const { bookId, segments } = parsed;
    if (!dmrBookCache[bookId]) {
        try {
            const res = await fetch(`data/translations/1899drb/${bookId}.json`);
            if (!res.ok) return '';
            dmrBookCache[bookId] = await res.json();
        } catch { return ''; }
    }
    return dmrGetVerses(dmrBookCache[bookId], segments);
}

async function getReadingsForDate(date, csvPath = 'assets/us-lectionary.csv') {
    const occasion = getLiturgicalDay(date);
    let csvText;
    try {
        const res = await fetch(csvPath);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        csvText = await res.text();
    } catch (err) {
        return { occasion, error: `Could not load CSV: ${err.message}` };
    }

    const rows = dmrParseCSV(csvText);
    let match = rows.find(r => r['Occasion'] === occasion);

    if (!match && occasion.endsWith('Sunday of Easter')) {
        match = occasion.startsWith('1st')
            ? rows.find(r => r['Occasion'].startsWith('Easter Sunday:'))
            : rows.find(r => r['Occasion'].startsWith(occasion));
    }
    if (!match) {
        const easter = getEaster(date.getFullYear());
        const pentecost = addDays(easter, 49);
        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        if (d.getTime() === pentecost.getTime()) {
            match = rows.find(r => r['Occasion'].startsWith('Pentecost Sunday:') && !r['Occasion'].includes('Vigil'));
        }
    }
    if (!match) return { occasion, error: 'No readings found for this occasion.' };

    const firstReading  = match['1st Reading'] || '';
    const response      = match['Response']     || '';
    const secondReading = match['2nd Reading']  || '';
    const gospel        = match['Gospel']       || '';
    const lectionaryNum = match['Lectionary#']  || '';

    const [firstReadingText, responseText, secondReadingText, gospelText] = await Promise.all([
        dmrFetchVerseText(firstReading),
        dmrFetchVerseText(response),
        dmrFetchVerseText(secondReading),
        dmrFetchVerseText(gospel),
    ]);

    return { occasion, firstReading, firstReadingText, response, responseText,
             secondReading, secondReadingText, gospel, gospelText, lectionaryNum };
}

// ---------------------------------------------------------------------------
// POPUP BAR UI
// ---------------------------------------------------------------------------

function dmrBuildLinks(refString) {
    if (!refString) return '';
    const parts = refString.split(' or ');
    // Extract book prefix from the first alternative (e.g. "John" from "John 9:1-41")
    const bookPrefix = parts[0].replace(/\s*\d+:.*$/, '').trim();
    return parts
        .map((part, i) => {
            // If a later alternative starts with a digit it has no book name — prepend it
            const ref = (i > 0 && /^\d/.test(part.trim()))
                ? `${bookPrefix} ${part.trim()}`
                : part;
            const display = part.replace(/-/g, '\u2013'); // hyphens → en-dashes in display
            return `<span class="dmr-reading" data-ref="${ref.replace(/"/g, '&quot;')}">${display}</span>`;
        })
        .join(' or ');
}

function dmrNavigateTo(refString) {
    const parsed = dmrParseRef(refString);
    if (!parsed) return;
    const { bookId, segments } = parsed;
    const targetChapter = segments[0].ch;
    const targetVerse   = segments[0].from;

    // Enable Orthodoxy Mode if not already active
    const orthodoxyBtn = document.getElementById('orthodoxy-mode-btn');
    if (orthodoxyBtn && !orthodoxyBtn.classList.contains('active')) {
        orthodoxyBtn.click();
    }

    const bookPicker    = document.getElementById('book-picker');
    const chapterPicker = document.getElementById('chapter-picker');
    const biblePanel    = document.getElementById('bible-text');

    bookPicker.value = bookId;
    bookPicker.dispatchEvent(new Event('change'));
    chapterPicker.value = targetChapter;
    chapterPicker.dispatchEvent(new Event('change'));

    const observer = new MutationObserver(() => {
        const verses = biblePanel.querySelectorAll('.verse');
        if (verses.length === 0) return;
        observer.disconnect();

        let target = biblePanel.querySelector(
            `[data-canonical-psalm="${targetChapter}"][data-canonical-verse="${targetVerse}"]`
        );
        if (!target) {
            for (const p of verses) {
                const s = p.querySelector('strong');
                if (s && parseInt(s.textContent, 10) === targetVerse) { target = p; break; }
            }
        }
        if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); target.click(); }
    });
    observer.observe(biblePanel, { childList: true, subtree: true });
}

// Calls callback once lazy-style.css has been applied (may be immediate).
function dmrOnStyleReady(callback) {
    const link = document.querySelector('link[href="assets/lazy-style.css"]');
    if (!link || link.rel === 'stylesheet') { callback(); return; }
    link.addEventListener('load', callback, { once: true });
}

async function initDailyMassBar() {
    const bar = document.getElementById('daily-mass-bar');
    if (!bar) return;

    let readings;
    try {
        readings = await getReadingsForDate(new Date());
    } catch { return; }
    if (readings.error) return;

    const { firstReading, response, secondReading, gospel } = readings;
    const parts = [firstReading, response, secondReading, gospel]
        .filter(Boolean).map(dmrBuildLinks);

    bar.innerHTML =
        `<div class="dmr-strip"><button class="dmr-collapse-btn" aria-label="Collapse daily readings">›</button></div>` +
        `<div class="dmr-body">` +
        `<div class="dmr-label">Daily Mass Readings</div>` +
        `<div class="dmr-list">${parts.join('; ')}</div>` +
        `</div>`;

    bar.addEventListener('click', (e) => {
        const span = e.target.closest('.dmr-reading');
        if (span?.dataset.ref) dmrNavigateTo(span.dataset.ref);
    });

    const collapseBtn = bar.querySelector('.dmr-collapse-btn');
    collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const collapsed = bar.classList.toggle('dmr-collapsed');
        collapseBtn.setAttribute('aria-label', collapsed ? 'Expand daily readings' : 'Collapse daily readings');
        localStorage.setItem('dmrCollapsed', collapsed);
    });

    dmrOnStyleReady(() => {
        bar.style.display = 'block';
        if (localStorage.getItem('dmrCollapsed') === 'true') {
            bar.classList.add('dmr-collapsed');
            collapseBtn.setAttribute('aria-label', 'Expand daily readings');
        }
    });
}

initDailyMassBar();


/* ==========================================================================
   SETTINGS PANEL COLLAPSE
   ========================================================================== */

(function initSettingsCollapse() {
    const panel = document.querySelector('.settings-panel');
    const btn = document.querySelector('.settings-collapse-btn');
    if (!panel || !btn) return;

    function applyCollapsed(collapsed) {
        panel.classList.toggle('collapsed', collapsed);
        btn.innerHTML = collapsed ? '›' : '‹';
        btn.setAttribute('aria-label', collapsed ? 'Expand settings' : 'Collapse settings');
    }

    btn.addEventListener('click', () => {
        const collapsed = !panel.classList.contains('collapsed');
        applyCollapsed(collapsed);
        localStorage.setItem('settingsCollapsed', collapsed);
    });

    if (localStorage.getItem('settingsCollapsed') === 'true') {
        applyCollapsed(true);
    }
})();


/* ==========================================================================
   PANEL RESIZE (BIBLE ↔ COMMENTARY)
   ========================================================================== */

(function initPanelResize() {
    const resizer = document.querySelector('.panel-resizer');
    if (!resizer) return;

    const root = document.documentElement;
    const MIN = 1 / 3;
    const MAX = 2 / 3;

    function applyRatio(ratio) {
        ratio = Math.max(MIN, Math.min(MAX, ratio));
        const bibleFr = ratio / (1 - ratio);
        root.style.setProperty('--bible-width', bibleFr + 'fr');
        root.style.setProperty('--commentary-width', '1fr');
    }

    // Restore saved ratio
    const saved = parseFloat(localStorage.getItem('panelRatio'));
    if (saved && saved >= MIN && saved <= MAX) applyRatio(saved);

    let startX, startBibleWidth, totalWidth;

    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        resizer.classList.add('dragging');

        const biblePanel = document.querySelector('.bibletext-panel');
        const commentaryPanel = document.querySelector('.commentary-panel');
        startX = e.clientX;
        startBibleWidth = biblePanel.getBoundingClientRect().width;
        totalWidth = startBibleWidth + commentaryPanel.getBoundingClientRect().width;

        function onMouseMove(e) {
            const dx = e.clientX - startX;
            const newBibleWidth = startBibleWidth + dx;
            const ratio = newBibleWidth / totalWidth;
            applyRatio(ratio);
        }

        function onMouseUp(e) {
            resizer.classList.remove('dragging');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            const dx = e.clientX - startX;
            const ratio = Math.max(MIN, Math.min(MAX, (startBibleWidth + dx) / totalWidth));
            localStorage.setItem('panelRatio', ratio);
        }

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
})();

/* =============================================================================
   PERPETUAL PRAYER
============================================================================= */

let isKyrie = true;

setInterval(() => {
  if (isKyrie) {
    console.log("Kyrie eleison");
  } else {
    console.log("Christe eleison");
  }
  
  // Flip the toggle for the next round
  isKyrie = !isKyrie; 
}, 3000);


// ==========================================================================
// FONT CONTROLS - Font Family & Font Size
// ==========================================================================

const btnDecrease = document.getElementById('btn-decrease');
const btnIncrease = document.getElementById('btn-increase');
const sizeDisplay = document.getElementById('font-size-display');

let currentFontSize = 1.2;

function updateFontSize(newSize) {
    currentFontSize = parseFloat(newSize.toFixed(1));
    sizeDisplay.textContent = currentFontSize;
    document.documentElement.style.setProperty('--font-size-base', currentFontSize + 'rem');
}

btnDecrease.addEventListener('click', function() {
    if (currentFontSize > 0.8) {
        updateFontSize(currentFontSize - 0.1);
    }
});

btnIncrease.addEventListener('click', function() {
    if (currentFontSize < 1.8) {
        updateFontSize(currentFontSize + 0.1);
    }
});

const fontPicker = document.getElementById('font-picker');

fontPicker.addEventListener('change', function() {
    const selectedFont = fontPicker.value;
    document.documentElement.style.setProperty('--font-serif', selectedFont + ', serif');
});