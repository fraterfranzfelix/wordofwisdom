// ==========================================================================
// FONT CONTROLS - Font Family & Font Size (REM Version)
// ==========================================================================

// --- Font Size Control ---
const btnDecrease = document.getElementById('btn-decrease');
const btnIncrease = document.getElementById('btn-increase');
const sizeDisplay = document.getElementById('font-size-display');

// 1. Initialize at 1.2 rem
let currentFontSize = 1.2; 

function updateFontSize(newSize) {
    // 2. Fix decimal precision to 1 digit (prevents 1.30000000004)
    // parseFloat turns the string "1.3" back into the number 1.3
    currentFontSize = parseFloat(newSize.toFixed(1));
    
    // Update the UI
    sizeDisplay.textContent = currentFontSize;
    
    // 3. Update the CSS variable using 'rem' instead of 'px'
    document.documentElement.style.setProperty('--font-size-base', currentFontSize + 'rem');
}

btnDecrease.addEventListener('click', function() {
    // 4. Set a lower limit in rem
    if (currentFontSize > 0.8) {
        updateFontSize(currentFontSize - 0.1);
    }
});

btnIncrease.addEventListener('click', function() {
    // 5. Set an upper limit in rem
    if (currentFontSize < 1.8) {
        updateFontSize(currentFontSize + 0.1);
    }
});

// --- Font Family Control (Unchanged) ---
const fontPicker = document.getElementById('font-picker');

fontPicker.addEventListener('change', function() {
    const selectedFont = fontPicker.value;
    document.documentElement.style.setProperty('--font-serif', selectedFont + ', serif');
});