/**
 * PSALM NUMBERING SYSTEM
 * Canonical reference: Hebrew numbering, superscription = verse 1 when present
 */

// === DATA STRUCTURES ===

// Psalms with superscription-only first verse(s) - in HEBREW numbering
// Key = number of verses used by superscription
const SUPERSCRIPTION_VERSES = {
    1: [3,4,5,6,7,8,9,11,12,18,19,20,21,22,30,31,34,36,38,39,40,41,42,44,45,46,47,48,49,51,55,56,57,58,59,61,62,63,64,65,66,67,68,69,70,72,75,76,77,80,81,83,84,85,88,89,92,100,102,108,109,140,142,146],
    2: [52,54,60]
};

// Verse counts for merged psalms (needed for offset calculations)
const HEBREW_PSALM_VERSE_COUNTS = {
    9: 21,   // 20 content + 1 superscription
    114: 8   // no superscription
};


// === HELPER FUNCTIONS ===

function getSuperscriptionLength(hebrewPsalm) {
    if (SUPERSCRIPTION_VERSES[2].includes(hebrewPsalm)) return 2;
    if (SUPERSCRIPTION_VERSES[1].includes(hebrewPsalm)) return 1;
    return 0;
}

function hasSuperscription(hebrewPsalm) {
    return SUPERSCRIPTION_VERSES[1].includes(hebrewPsalm) || 
           SUPERSCRIPTION_VERSES[2].includes(hebrewPsalm);
}


// === PSALM NUMBER CONVERSION (number only, no verse) ===

function hebrewPsalmToGreek(hebrewPsalm) {
    if (hebrewPsalm >= 1 && hebrewPsalm <= 9) return hebrewPsalm;
    if (hebrewPsalm === 10) return 9;
    if (hebrewPsalm >= 11 && hebrewPsalm <= 113) return hebrewPsalm - 1;
    if (hebrewPsalm === 114 || hebrewPsalm === 115) return 113;
    if (hebrewPsalm === 116) return null;  // splits into Greek 114+115
    if (hebrewPsalm >= 117 && hebrewPsalm <= 146) return hebrewPsalm - 1;
    if (hebrewPsalm === 147) return null;  // splits into Greek 146+147
    if (hebrewPsalm >= 148 && hebrewPsalm <= 150) return hebrewPsalm;
    return null;
}

function greekPsalmToHebrew(greekPsalm) {
    if (greekPsalm >= 1 && greekPsalm <= 8) return greekPsalm;
    if (greekPsalm === 9) return 9;   // actually contains Hebrew 9+10
    if (greekPsalm >= 10 && greekPsalm <= 112) return greekPsalm + 1;
    if (greekPsalm === 113) return 114;  // actually contains Hebrew 114+115
    if (greekPsalm === 114 || greekPsalm === 115) return 116;
    if (greekPsalm >= 116 && greekPsalm <= 145) return greekPsalm + 1;
    if (greekPsalm === 146 || greekPsalm === 147) return 147;
    if (greekPsalm >= 148 && greekPsalm <= 150) return greekPsalm;
    return null;
}


// === FULL REFERENCE CONVERSION ===

function canonicalToDisplay(hebrewPsalm, hebrewVerse, displaySystem, showSuperscription) {
    let displayPsalm = hebrewPsalm;
    let displayVerse = hebrewVerse;
    
    // Step 1: Convert psalm number and verse if showing Greek
    if (displaySystem === 'greek') {
        
        // Hebrew 9+10 → Greek 9 (merged)
        if (hebrewPsalm === 9) {
            displayPsalm = 9;
            displayVerse = hebrewVerse;
        } else if (hebrewPsalm === 10) {
            displayPsalm = 9;
            displayVerse = hebrewVerse + HEBREW_PSALM_VERSE_COUNTS[9];
        }
        
        // Hebrew 114+115 → Greek 113 (merged)
        else if (hebrewPsalm === 114) {
            displayPsalm = 113;
            displayVerse = hebrewVerse;
        } else if (hebrewPsalm === 115) {
            displayPsalm = 113;
            displayVerse = hebrewVerse + HEBREW_PSALM_VERSE_COUNTS[114];
        }
        
        // Hebrew 116 → Greek 114+115 (split at verse 9)
        else if (hebrewPsalm === 116) {
            if (hebrewVerse <= 9) {
                displayPsalm = 114;
                displayVerse = hebrewVerse;
            } else {
                displayPsalm = 115;
                displayVerse = hebrewVerse - 9;
            }
        }
        
        // Hebrew 147 → Greek 146+147 (split at verse 11)
        else if (hebrewPsalm === 147) {
            if (hebrewVerse <= 11) {
                displayPsalm = 146;
                displayVerse = hebrewVerse;
            } else {
                displayPsalm = 147;
                displayVerse = hebrewVerse - 11;
            }
        }
        
        // Standard offset cases
        else {
            displayPsalm = hebrewPsalmToGreek(hebrewPsalm);
        }
    }
    
    // Step 2: Adjust verse for superscription toggle
    if (!showSuperscription) {
        const superLen = getSuperscriptionLength(hebrewPsalm);
        if (superLen > 0) {
            if (hebrewVerse <= superLen) {
                return null;  // This verse IS the superscription, hide it
            }
            displayVerse = displayVerse - superLen;
        }
    }
    
    return { psalm: displayPsalm, verse: displayVerse };
}


function displayToCanonical(displayPsalm, displayVerse, displaySystem, showSuperscription) {
    let hebrewPsalm = displayPsalm;
    let hebrewVerse = displayVerse;
    
    // Step 1: Convert from Greek to Hebrew if needed
    if (displaySystem === 'greek') {
        
        // Greek 9 → Hebrew 9 or 10 (merged)
        if (displayPsalm === 9) {
            if (displayVerse <= HEBREW_PSALM_VERSE_COUNTS[9]) {
                hebrewPsalm = 9;
                hebrewVerse = displayVerse;
            } else {
                hebrewPsalm = 10;
                hebrewVerse = displayVerse - HEBREW_PSALM_VERSE_COUNTS[9];
            }
        }
        
        // Greek 113 → Hebrew 114 or 115 (merged)
        else if (displayPsalm === 113) {
            if (displayVerse <= HEBREW_PSALM_VERSE_COUNTS[114]) {
                hebrewPsalm = 114;
                hebrewVerse = displayVerse;
            } else {
                hebrewPsalm = 115;
                hebrewVerse = displayVerse - HEBREW_PSALM_VERSE_COUNTS[114];
            }
        }
        
        // Greek 114 → Hebrew 116:1-9
        else if (displayPsalm === 114) {
            hebrewPsalm = 116;
            hebrewVerse = displayVerse;
        }
        
        // Greek 115 → Hebrew 116:10-19
        else if (displayPsalm === 115) {
            hebrewPsalm = 116;
            hebrewVerse = displayVerse + 9;
        }
        
        // Greek 146 → Hebrew 147:1-11
        else if (displayPsalm === 146) {
            hebrewPsalm = 147;
            hebrewVerse = displayVerse;
        }
        
        // Greek 147 → Hebrew 147:12-20
        else if (displayPsalm === 147) {
            hebrewPsalm = 147;
            hebrewVerse = displayVerse + 11;
        }
        
        // Standard offset cases
        else {
            hebrewPsalm = greekPsalmToHebrew(displayPsalm);
        }
    }
    
    // Step 2: Reverse superscription offset
    if (!showSuperscription) {
        const superLen = getSuperscriptionLength(hebrewPsalm);
        if (superLen > 0) {
            hebrewVerse = hebrewVerse + superLen;
        }
    }
    
    return { psalm: hebrewPsalm, verse: hebrewVerse };
}


// === TRANSLATION FILE MAPPING ===
// Maps between canonical (Hebrew) and the translation's native file structure
// Canonical: Hebrew numbering, verse 1 = superscription when present
// Files: May or may not include superscriptions depending on translation

function canonicalToFile(hebrewPsalm, hebrewVerse, translationPsalmSystem, translationHasSuperscription) {
    let filePsalm = hebrewPsalm;
    let fileVerse = hebrewVerse;
    
    // Handle superscription difference
    const superLen = getSuperscriptionLength(hebrewPsalm);
    if (superLen > 0 && !translationHasSuperscription) {
        // Translation doesn't have superscription, but canonical does
        // Canonical v1 (superscription) doesn't exist in file
        if (hebrewVerse <= superLen) {
            return null; // This verse doesn't exist in the translation file
        }
        fileVerse = hebrewVerse - superLen;
    }
    
    // Handle psalm number conversion for Greek translations
    if (translationPsalmSystem === 'greek') {
        const display = canonicalToDisplay(hebrewPsalm, fileVerse, 'greek', true);
        if (display) {
            filePsalm = display.psalm;
            fileVerse = display.verse;
        }
    }
    
    return { psalm: filePsalm, verse: fileVerse };
}

function fileToCanonical(filePsalm, fileVerse, translationPsalmSystem, translationHasSuperscription) {
    let hebrewPsalm = filePsalm;
    let hebrewVerse = fileVerse;
    
    // Handle psalm number conversion from Greek
    if (translationPsalmSystem === 'greek') {
        const canonical = displayToCanonical(filePsalm, fileVerse, 'greek', true);
        hebrewPsalm = canonical.psalm;
        hebrewVerse = canonical.verse;
    }
    
    // Handle superscription difference
    const superLen = getSuperscriptionLength(hebrewPsalm);
    if (superLen > 0 && !translationHasSuperscription) {
        // Translation doesn't have superscription, but canonical does
        // File v1 = canonical v2 (first content verse)
        hebrewVerse = hebrewVerse + superLen;
    }
    
    return { psalm: hebrewPsalm, verse: hebrewVerse };
}


// === TRANSLATION SYNC ===

function getTranslationPsalmDefaults(translationMeta) {
    return {
        psalmNumbering: translationMeta['psalms-structure'] || 'hebrew',
        showSuperscription: translationMeta['psalms-superscription'] || false
    };
}


// === DISPLAY PSALM TO FILE MAPPING ===
// Maps a display psalm number to the file chapter(s) needed to render it
// Takes into account both the display system AND the translation's file system

function getFileChaptersForDisplayPsalm(displayPsalm, displaySystem, translationSystem) {
    // First, figure out which Hebrew psalm(s) we need
    let hebrewPsalms;
    
    if (displaySystem === 'hebrew') {
        // Display is Hebrew - simple mapping
        hebrewPsalms = [{ psalm: displayPsalm, verseStart: null, verseEnd: null, displayOffset: 0 }];
    } else {
        // Display is Greek - may need to merge or split
        if (displayPsalm >= 1 && displayPsalm <= 8) {
            hebrewPsalms = [{ psalm: displayPsalm, verseStart: null, verseEnd: null, displayOffset: 0 }];
        } else if (displayPsalm === 9) {
            // Greek 9 = Hebrew 9 + Hebrew 10
            hebrewPsalms = [
                { psalm: 9, verseStart: null, verseEnd: null, displayOffset: 0 },
                { psalm: 10, verseStart: null, verseEnd: null, displayOffset: 21 }  // Hebrew 9 has 21 verses (with superscription)
            ];
        } else if (displayPsalm >= 10 && displayPsalm <= 112) {
            hebrewPsalms = [{ psalm: displayPsalm + 1, verseStart: null, verseEnd: null, displayOffset: 0 }];
        } else if (displayPsalm === 113) {
            // Greek 113 = Hebrew 114 + Hebrew 115
            hebrewPsalms = [
                { psalm: 114, verseStart: null, verseEnd: null, displayOffset: 0 },
                { psalm: 115, verseStart: null, verseEnd: null, displayOffset: 8 }  // Hebrew 114 has 8 verses
            ];
        } else if (displayPsalm === 114) {
            // Greek 114 = Hebrew 116:1-9
            hebrewPsalms = [{ psalm: 116, verseStart: 1, verseEnd: 9, displayOffset: 0 }];
        } else if (displayPsalm === 115) {
            // Greek 115 = Hebrew 116:10-19
            hebrewPsalms = [{ psalm: 116, verseStart: 10, verseEnd: 19, displayOffset: -9 }];
        } else if (displayPsalm >= 116 && displayPsalm <= 145) {
            hebrewPsalms = [{ psalm: displayPsalm + 1, verseStart: null, verseEnd: null, displayOffset: 0 }];
        } else if (displayPsalm === 146) {
            // Greek 146 = Hebrew 147:1-11
            hebrewPsalms = [{ psalm: 147, verseStart: 1, verseEnd: 11, displayOffset: 0 }];
        } else if (displayPsalm === 147) {
            // Greek 147 = Hebrew 147:12-20
            hebrewPsalms = [{ psalm: 147, verseStart: 12, verseEnd: 20, displayOffset: -11 }];
        } else {
            hebrewPsalms = [{ psalm: displayPsalm, verseStart: null, verseEnd: null, displayOffset: 0 }];
        }
    }
    
    // Now convert Hebrew psalm numbers to file chapter numbers based on translation system
    if (translationSystem === 'hebrew') {
        // Files use Hebrew numbering - return as-is
        return hebrewPsalms.map(hp => ({
            fileChapter: hp.psalm,
            verseStart: hp.verseStart,
            verseEnd: hp.verseEnd,
            displayOffset: hp.displayOffset,
            hebrewPsalm: hp.psalm
        }));
    } else {
        // Files use Greek numbering - convert Hebrew psalm numbers to Greek file chapters
        let result = [];
        
        for (const hp of hebrewPsalms) {
            const hebrewPsalm = hp.psalm;
            
            // Hebrew to Greek file chapter mapping
            if (hebrewPsalm >= 1 && hebrewPsalm <= 9) {
                result.push({ fileChapter: hebrewPsalm, verseStart: hp.verseStart, verseEnd: hp.verseEnd, displayOffset: hp.displayOffset, hebrewPsalm });
            } else if (hebrewPsalm === 10) {
                // Hebrew 10 is part of Greek file 9 (after Hebrew 9's verses)
                result.push({ fileChapter: 9, verseStart: 22, verseEnd: null, displayOffset: hp.displayOffset, hebrewPsalm });
            } else if (hebrewPsalm >= 11 && hebrewPsalm <= 113) {
                result.push({ fileChapter: hebrewPsalm - 1, verseStart: hp.verseStart, verseEnd: hp.verseEnd, displayOffset: hp.displayOffset, hebrewPsalm });
            } else if (hebrewPsalm === 114) {
                // Hebrew 114 is in Greek file 113 (first part)
                result.push({ fileChapter: 113, verseStart: 1, verseEnd: 8, displayOffset: hp.displayOffset, hebrewPsalm });
            } else if (hebrewPsalm === 115) {
                // Hebrew 115 is in Greek file 113 (second part, after verse 8)
                result.push({ fileChapter: 113, verseStart: 9, verseEnd: null, displayOffset: hp.displayOffset, hebrewPsalm });
            } else if (hebrewPsalm === 116) {
                // Hebrew 116 splits into Greek files 114 + 115
                if (hp.verseEnd && hp.verseEnd <= 9) {
                    // Only need first part
                    result.push({ fileChapter: 114, verseStart: hp.verseStart, verseEnd: hp.verseEnd, displayOffset: hp.displayOffset, hebrewPsalm });
                } else if (hp.verseStart && hp.verseStart >= 10) {
                    // Only need second part
                    result.push({ fileChapter: 115, verseStart: hp.verseStart ? hp.verseStart - 9 : 1, verseEnd: hp.verseEnd ? hp.verseEnd - 9 : null, displayOffset: hp.displayOffset, hebrewPsalm });
                } else {
                    // Need both files
                    result.push({ fileChapter: 114, verseStart: hp.verseStart, verseEnd: 9, displayOffset: hp.displayOffset, hebrewPsalm });
                    result.push({ fileChapter: 115, verseStart: 1, verseEnd: hp.verseEnd ? hp.verseEnd - 9 : null, displayOffset: (hp.displayOffset || 0) + 9, hebrewPsalm });
                }
            } else if (hebrewPsalm >= 117 && hebrewPsalm <= 146) {
                result.push({ fileChapter: hebrewPsalm - 1, verseStart: hp.verseStart, verseEnd: hp.verseEnd, displayOffset: hp.displayOffset, hebrewPsalm });
            } else if (hebrewPsalm === 147) {
                // Hebrew 147 splits into Greek files 146 + 147
                if (hp.verseEnd && hp.verseEnd <= 11) {
                    result.push({ fileChapter: 146, verseStart: hp.verseStart, verseEnd: hp.verseEnd, displayOffset: hp.displayOffset, hebrewPsalm });
                } else if (hp.verseStart && hp.verseStart >= 12) {
                    result.push({ fileChapter: 147, verseStart: hp.verseStart ? hp.verseStart - 11 : 1, verseEnd: hp.verseEnd ? hp.verseEnd - 11 : null, displayOffset: hp.displayOffset, hebrewPsalm });
                } else {
                    result.push({ fileChapter: 146, verseStart: hp.verseStart, verseEnd: 11, displayOffset: hp.displayOffset, hebrewPsalm });
                    result.push({ fileChapter: 147, verseStart: 1, verseEnd: hp.verseEnd ? hp.verseEnd - 11 : null, displayOffset: (hp.displayOffset || 0) + 11, hebrewPsalm });
                }
            } else {
                result.push({ fileChapter: hebrewPsalm, verseStart: hp.verseStart, verseEnd: hp.verseEnd, displayOffset: hp.displayOffset, hebrewPsalm });
            }
        }
        
        return result;
    }
}


// Get all Hebrew psalms that contribute to a display psalm (for commentary lookup)
function getHebrewPsalmsForDisplay(displayPsalm, displaySystem) {
    if (displaySystem === 'hebrew') {
        return [displayPsalm];
    }
    
    // Greek display
    if (displayPsalm === 9) return [9, 10];
    if (displayPsalm >= 10 && displayPsalm <= 112) return [displayPsalm + 1];
    if (displayPsalm === 113) return [114, 115];
    if (displayPsalm === 114 || displayPsalm === 115) return [116];
    if (displayPsalm >= 116 && displayPsalm <= 145) return [displayPsalm + 1];
    if (displayPsalm === 146 || displayPsalm === 147) return [147];
    return [displayPsalm];
}


// Convert a psalm number from one display system to another
// Returns the "best match" psalm in the new system
function convertDisplayPsalm(psalm, fromSystem, toSystem) {
    if (fromSystem === toSystem) return psalm;
    
    if (fromSystem === 'hebrew' && toSystem === 'greek') {
        // Hebrew → Greek
        if (psalm >= 1 && psalm <= 9) return psalm;
        if (psalm === 10) return 9;  // Part of Greek 9
        if (psalm >= 11 && psalm <= 113) return psalm - 1;
        if (psalm === 114 || psalm === 115) return 113;  // Both become Greek 113
        if (psalm === 116) return 114;  // First half
        if (psalm >= 117 && psalm <= 146) return psalm - 1;
        if (psalm === 147) return 146;  // First half
        return psalm;
    } else {
        // Greek → Hebrew
        if (psalm >= 1 && psalm <= 8) return psalm;
        if (psalm === 9) return 9;  // First part of merged psalm
        if (psalm >= 10 && psalm <= 112) return psalm + 1;
        if (psalm === 113) return 114;  // First part of merged psalm
        if (psalm === 114) return 116;
        if (psalm === 115) return 116;  // Same Hebrew psalm
        if (psalm >= 116 && psalm <= 145) return psalm + 1;
        if (psalm === 146) return 147;
        if (psalm === 147) return 147;  // Same Hebrew psalm
        return psalm;
    }
}