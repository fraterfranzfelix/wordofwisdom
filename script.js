/**
 * =============================================================================
 * BIBLE APP CONTROLLER
 * =============================================================================
 * 
 * Main application controller for a Bible study web app with commentary support.
 * 
 * FEATURES:
 * - Multi-translation Bible text display
 * - Verse-by-verse commentary from multiple patristic/scholarly sources
 * - Filtering by language, author, and work
 * - Orthodoxy mode to filter for orthodox-only sources
 * - Multiple citation styles (Chicago, MLA, APA)
 * - Book/chapter caching for performance
 * 
 * ARCHITECTURE:
 * The app follows a simple MVC-ish pattern:
 * - State object holds all current selections
 * - Elements object caches DOM references
 * - Functions handle data fetching and UI updates
 * - Event listeners wire user interactions to state changes
 * 
 * DATA STRUCTURE:
 * - Translations live in: data/translations/{id}/{id}-meta.json, {id}-books.json, {book}.json
 * - Commentaries live in: data/commentaries/{author}/{work}/{book}/{chapter}.json
 * - Commentary catalog: data/commentaries/index.json
 * 
 * =============================================================================
 */

/* -----------------------------------------------------------------------------
 * SECTION 1: GLOBAL VARIABLES
 * -----------------------------------------------------------------------------
 * Variables declared outside the DOMContentLoaded scope for cross-function access.
 * These store commentary catalog data and currently loaded commentary "champions".
 */

/**
 * Stores the full commentary catalog loaded from index.json.
 * Contains all authors, works, and their inventory of available chapters.
 * @type {Object|null}
 */
let globalCatalog = null;

/**
 * Array of randomly selected commentary sources ("champions") for the current chapter.
 * Each champion object includes author info, work metadata, and file paths.
 * @type {Array}
 */
let currentChampions = [];

/**
 * Cache of prefetched commentary data keyed by work ID.
 * Structure: { workId: { content: {...}, meta: {...} } }
 * @type {Object}
 */
let championData = {};


/* =============================================================================
 * PSALM NUMBERING SYSTEM
 * =============================================================================
 * Canonical reference: Hebrew numbering, superscription = verse 1 when present.
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
        if (hebrewVerse <= superLen) {
            return null;
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
        hebrewVerse = hebrewVerse + superLen;
    }

    return { psalm: hebrewPsalm, verse: hebrewVerse };
}


// === TRANSLATION SYNC ===

function getTranslationPsalmDefaults(translationMeta) {
    return {
        textTradition: (translationMeta['psalms-structure'] === 'greek') ? 'septuagint' : 'masoretic',
        showSuperscription: translationMeta['psalms-superscription'] || false
    };
}


// === DISPLAY PSALM TO FILE MAPPING ===
// Maps a display psalm number to the file chapter(s) needed to render it
// Takes into account both the display system AND the translation's file system

function getFileChaptersForDisplayPsalm(displayPsalm, displaySystem, translationSystem) {
    let hebrewPsalms;

    if (displaySystem === 'hebrew') {
        hebrewPsalms = [{ psalm: displayPsalm, verseStart: null, verseEnd: null, displayOffset: 0 }];
    } else {
        if (displayPsalm >= 1 && displayPsalm <= 8) {
            hebrewPsalms = [{ psalm: displayPsalm, verseStart: null, verseEnd: null, displayOffset: 0 }];
        } else if (displayPsalm === 9) {
            hebrewPsalms = [
                { psalm: 9,  verseStart: null, verseEnd: null, displayOffset: 0  },
                { psalm: 10, verseStart: null, verseEnd: null, displayOffset: 21 }
            ];
        } else if (displayPsalm >= 10 && displayPsalm <= 112) {
            hebrewPsalms = [{ psalm: displayPsalm + 1, verseStart: null, verseEnd: null, displayOffset: 0 }];
        } else if (displayPsalm === 113) {
            hebrewPsalms = [
                { psalm: 114, verseStart: null, verseEnd: null, displayOffset: 0 },
                { psalm: 115, verseStart: null, verseEnd: null, displayOffset: 8 }
            ];
        } else if (displayPsalm === 114) {
            hebrewPsalms = [{ psalm: 116, verseStart: 1,  verseEnd: 9,  displayOffset: 0  }];
        } else if (displayPsalm === 115) {
            hebrewPsalms = [{ psalm: 116, verseStart: 10, verseEnd: 19, displayOffset: -9 }];
        } else if (displayPsalm >= 116 && displayPsalm <= 145) {
            hebrewPsalms = [{ psalm: displayPsalm + 1, verseStart: null, verseEnd: null, displayOffset: 0 }];
        } else if (displayPsalm === 146) {
            hebrewPsalms = [{ psalm: 147, verseStart: 1,  verseEnd: 11, displayOffset: 0   }];
        } else if (displayPsalm === 147) {
            hebrewPsalms = [{ psalm: 147, verseStart: 12, verseEnd: 20, displayOffset: -11 }];
        } else {
            hebrewPsalms = [{ psalm: displayPsalm, verseStart: null, verseEnd: null, displayOffset: 0 }];
        }
    }

    if (translationSystem === 'hebrew') {
        return hebrewPsalms.map(hp => ({
            fileChapter: hp.psalm,
            verseStart:  hp.verseStart,
            verseEnd:    hp.verseEnd,
            displayOffset: hp.displayOffset,
            hebrewPsalm: hp.psalm
        }));
    } else {
        let result = [];

        for (const hp of hebrewPsalms) {
            const hebrewPsalm = hp.psalm;

            if (hebrewPsalm >= 1 && hebrewPsalm <= 9) {
                result.push({ fileChapter: hebrewPsalm, verseStart: hp.verseStart, verseEnd: hp.verseEnd, displayOffset: hp.displayOffset, hebrewPsalm });
            } else if (hebrewPsalm === 10) {
                result.push({ fileChapter: 9, verseStart: 22, verseEnd: null, displayOffset: hp.displayOffset, hebrewPsalm });
            } else if (hebrewPsalm >= 11 && hebrewPsalm <= 113) {
                result.push({ fileChapter: hebrewPsalm - 1, verseStart: hp.verseStart, verseEnd: hp.verseEnd, displayOffset: hp.displayOffset, hebrewPsalm });
            } else if (hebrewPsalm === 114) {
                result.push({ fileChapter: 113, verseStart: 1, verseEnd: 8, displayOffset: hp.displayOffset, hebrewPsalm });
            } else if (hebrewPsalm === 115) {
                result.push({ fileChapter: 113, verseStart: 9, verseEnd: null, displayOffset: hp.displayOffset, hebrewPsalm });
            } else if (hebrewPsalm === 116) {
                if (hp.verseEnd && hp.verseEnd <= 9) {
                    result.push({ fileChapter: 114, verseStart: hp.verseStart, verseEnd: hp.verseEnd, displayOffset: hp.displayOffset, hebrewPsalm });
                } else if (hp.verseStart && hp.verseStart >= 10) {
                    result.push({ fileChapter: 115, verseStart: hp.verseStart - 9, verseEnd: hp.verseEnd ? hp.verseEnd - 9 : null, displayOffset: hp.displayOffset, hebrewPsalm });
                } else {
                    result.push({ fileChapter: 114, verseStart: hp.verseStart, verseEnd: 9, displayOffset: hp.displayOffset, hebrewPsalm });
                    result.push({ fileChapter: 115, verseStart: 1, verseEnd: hp.verseEnd ? hp.verseEnd - 9 : null, displayOffset: (hp.displayOffset || 0) + 9, hebrewPsalm });
                }
            } else if (hebrewPsalm >= 117 && hebrewPsalm <= 146) {
                result.push({ fileChapter: hebrewPsalm - 1, verseStart: hp.verseStart, verseEnd: hp.verseEnd, displayOffset: hp.displayOffset, hebrewPsalm });
            } else if (hebrewPsalm === 147) {
                if (hp.verseEnd && hp.verseEnd <= 11) {
                    result.push({ fileChapter: 146, verseStart: hp.verseStart, verseEnd: hp.verseEnd, displayOffset: hp.displayOffset, hebrewPsalm });
                } else if (hp.verseStart && hp.verseStart >= 12) {
                    result.push({ fileChapter: 147, verseStart: hp.verseStart - 11, verseEnd: hp.verseEnd ? hp.verseEnd - 11 : null, displayOffset: hp.displayOffset, hebrewPsalm });
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
    if (displaySystem === 'hebrew') return [displayPsalm];
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
        if (psalm >= 1 && psalm <= 9) return psalm;
        if (psalm === 10) return 9;
        if (psalm >= 11 && psalm <= 113) return psalm - 1;
        if (psalm === 114 || psalm === 115) return 113;
        if (psalm === 116) return 114;
        if (psalm >= 117 && psalm <= 146) return psalm - 1;
        if (psalm === 147) return 146;
        return psalm;
    } else {
        if (psalm >= 1 && psalm <= 8) return psalm;
        if (psalm === 9) return 9;
        if (psalm >= 10 && psalm <= 112) return psalm + 1;
        if (psalm === 113) return 114;
        if (psalm === 114) return 116;
        if (psalm === 115) return 116;
        if (psalm >= 116 && psalm <= 145) return psalm + 1;
        if (psalm === 146) return 147;
        if (psalm === 147) return 147;
        return psalm;
    }
}


/* =============================================================================
 * BOOK STRUCTURE VARIANTS
 * =============================================================================
 * Defines how books differ structurally between the Masoretic Text (MT) and
 * the Septuagint (LXX), and provides functions for virtual reshuffling.
 * Books covered: 1kgs, jer, prov  (ps handled above)
 */


// === 1 KINGS ===

const KINGS_CHAPTER_SWAP = { 20: 21, 21: 20 };

// Chapter 8 verse reorder in LXX mode.
// MT order:  1-11 | 12-13 (dedication poem) | 14-53 | 54-66
// LXX order: 1-11 | 14-53 (displayed as 12-51) | 12-13 (poem, as 52-53) | 54-66
const KINGS_8_LXX_ORDER = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
    31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
    48, 49, 50, 51, 52, 53,
    12, 13,
    54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66,
];


// === JEREMIAH ===

// LXX chapter → MT content descriptor.
// Identity for LXX 1-24; map below applies for 25-52.
const JER_LXX_TO_MT = {
    25: { mtChapter: 25, verseStart: 1,  verseEnd: 13 },
    26: 46, 27: 50, 28: 51, 29: 47, 30: 49, 31: 48,
    32: { mtChapter: 25, verseStart: 14, verseEnd: 38 },
    33: 26, 34: 27, 35: 28, 36: 29, 37: 30, 38: 31,
    39: 32, 40: 33, 41: 34, 42: 35, 43: 36, 44: 37,
    45: 38, 46: 39, 47: 40, 48: 41, 49: 42, 50: 43, 51: 44,
    52: 52,
};

// Inverse map: MT chapter → best-match LXX chapter (for navigation on toggle)
const JER_MT_TO_LXX = {};
for (const [lxxCh, val] of Object.entries(JER_LXX_TO_MT)) {
    const lxx = parseInt(lxxCh);
    const mt  = typeof val === 'object' ? val.mtChapter : val;
    if (!(mt in JER_MT_TO_LXX)) JER_MT_TO_LXX[mt] = lxx;
}
for (let i = 1; i <= 24; i++) JER_MT_TO_LXX[i] = i;
JER_MT_TO_LXX[45] = 51;  // MT 45 has no LXX slot; map to nearest


// === PROVERBS ===

const PROV_LXX_24_SEGMENTS = [
    { mtChapter: 24, verseStart: 1,  verseEnd: 22 },
    { mtChapter: 30, verseStart: 1,  verseEnd: 14 },
    { mtChapter: 24, verseStart: 23, verseEnd: 34 },
    { mtChapter: 30, verseStart: 15, verseEnd: 33 },
    { mtChapter: 31, verseStart: 1,  verseEnd: 9  },
];

const PROV_LXX_31_VERSE_START = 10;


// === PUBLIC API ===

function hasStructureVariant(bookId) {
    return bookId === '1kgs' || bookId === 'jer' || bookId === 'prov';
}

function getChapterContent(bookId, displayChapter, tradition) {
    if (tradition !== 'septuagint' || !hasStructureVariant(bookId)) {
        return [{ mtChapter: displayChapter, verseStart: null, verseEnd: null, reorder: false }];
    }

    if (bookId === '1kgs') {
        const mtCh = KINGS_CHAPTER_SWAP[displayChapter] ?? displayChapter;
        return [{ mtChapter: mtCh, verseStart: null, verseEnd: null, reorder: (displayChapter === 8) }];
    }

    if (bookId === 'jer') {
        if (displayChapter >= 1 && displayChapter <= 24) {
            return [{ mtChapter: displayChapter, verseStart: null, verseEnd: null, reorder: false }];
        }
        const entry = JER_LXX_TO_MT[displayChapter];
        if (!entry) return [];
        if (typeof entry === 'object') {
            return [{ mtChapter: entry.mtChapter, verseStart: entry.verseStart, verseEnd: entry.verseEnd, reorder: false }];
        }
        return [{ mtChapter: entry, verseStart: null, verseEnd: null, reorder: false }];
    }

    if (bookId === 'prov') {
        if (displayChapter === 24) return PROV_LXX_24_SEGMENTS.map(s => ({ ...s, reorder: false }));
        if (displayChapter === 30) return [];
        if (displayChapter === 31) return [{ mtChapter: 31, verseStart: PROV_LXX_31_VERSE_START, verseEnd: null, reorder: false }];
        return [{ mtChapter: displayChapter, verseStart: null, verseEnd: null, reorder: false }];
    }

    return [{ mtChapter: displayChapter, verseStart: null, verseEnd: null, reorder: false }];
}

function isChapterEmpty(bookId, displayChapter, tradition) {
    if (tradition !== 'septuagint') return false;
    return bookId === 'prov' && displayChapter === 30;
}

function convertChapter(bookId, chapter, fromTradition, toTradition) {
    if (fromTradition === toTradition) return chapter;

    if (bookId === '1kgs') return KINGS_CHAPTER_SWAP[chapter] ?? chapter;

    if (bookId === 'jer') {
        if (fromTradition === 'masoretic') return JER_MT_TO_LXX[chapter] ?? chapter;
        if (chapter >= 1 && chapter <= 24) return chapter;
        const entry = JER_LXX_TO_MT[chapter];
        if (!entry) return chapter;
        return typeof entry === 'object' ? entry.mtChapter : entry;
    }

    if (bookId === 'prov') {
        if (fromTradition === 'masoretic') {
            if (chapter === 30) return 24;
            return chapter;
        }
        return chapter;
    }

    return chapter;
}

function getKings8LxxOrder() {
    return KINGS_8_LXX_ORDER;
}


/* =============================================================================
 * MAIN APPLICATION
 * =============================================================================
 * Everything below runs after DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {

    /* -------------------------------------------------------------------------
     * SECTION 2: APPLICATION STATE
     * -------------------------------------------------------------------------
     * Single source of truth for the application's current status.
     * All UI components read from and write to this object.
     */
    const state = {
        // Bible Navigation
        translationId: '1899drb',       // Currently selected translation
        bookId: 'gen',                    // Currently selected book (e.g., 'jn' for John)
        chapter: 1,                      // Currently selected chapter number
        currentBookData: null,           // Cached book data to avoid re-fetching
        
        // Verse Selection
        selectedVerse: null,             // Currently locked/selected verse number
        lastSelectedVerseText: "Select a verse...",  // Display text for selected verse
        
        // Commentary Filters
        orthodoxyMode: false,            // When true, only show orthodox sources
        filterLanguage: 'all',           // Language filter for commentaries
        filterAuthor: 'all',             // Author filter for commentaries
        filterWork: 'all',               // Specific work filter for commentaries
        
        // Display Options
        citationStyle: 'chicago',        // Citation format: 'chicago', 'mla', or 'apa'
        
        // Text Tradition (global)
        textTradition: 'masoretic',      // 'masoretic' or 'septuagint'
        showSuperscription: false,       // Whether to show psalm superscriptions as verse 1
        
        // Canonical Verse Selection (always stored in Hebrew system, for Psalms only)
        canonicalPsalm: null,            // Hebrew psalm number of selected verse
        canonicalVerse: null,            // Hebrew verse number of selected verse
        
        // Translation Metadata Cache
        currentTranslationMeta: null,    // Full metadata object for current translation
        
        // Prefetch Cache for instant book switching
        prefetchCache: {},               // { 'bookId:translationId': { chapters: [...] } }
    };


    /* -------------------------------------------------------------------------
     * SECTION 3: DOM ELEMENT CACHE
     * -------------------------------------------------------------------------
     * Cached references to frequently-accessed DOM elements.
     * Organized by functional area to avoid repeated querySelector calls.
     */
    const elements = {
        // Translation metadata display elements
        meta: {
            year: document.getElementById('meta-year'),
            place: document.getElementById('meta-place'),
            language: document.getElementById('meta-language'),
            translator: document.getElementById('meta-translator'),
            editor: document.getElementById('meta-editor'),
            publisher: document.getElementById('meta-publisher'),
            imprimatur: document.getElementById('meta-imprimatur'),
            description: document.getElementById('meta-description'),
        },
        
        // Dropdown/select elements for navigation
        pickers: {
            translation: document.getElementById('translation-picker'),
            book: document.getElementById('book-picker'),
            chapter: document.getElementById('chapter-picker'),
            font: document.getElementById('font-picker'),
        },
        
        // Main display areas
        display: {
            biblePanel: document.getElementById('bible-text'),
            context: document.getElementById('verse-context'),
            orthodoxyBtn: document.getElementById('orthodoxy-mode-btn'),
        }
    };


    /* =========================================================================
     * SECTION 3.5: PREFETCH SYSTEM
     * =========================================================================
     * Enables instant book switching by prefetching book data on hover/mousedown.
     */

    /**
     * Prefetches a book's data into the cache for instant loading later.
     * Safe to call multiple times - will skip if already cached or fetching.
     * 
     * @param {string} bookId - The book identifier (e.g., 'gen', 'exod')
     * @param {string} [translationId] - Translation ID (defaults to current)
     * @returns {Promise<boolean>} - True if prefetch succeeded or was cached
     */
    async function prefetchBook(bookId, translationId = null) {
        const transId = translationId || state.translationId;
        const cacheKey = `${bookId}:${transId}`;
        
        // Skip if already cached
        if (state.prefetchCache[cacheKey]) {
            console.log(`Prefetch: ${bookId} already cached`);
            return true;
        }
        
        // Skip if this is the currently loaded book
        if (state.currentBookData && 
            state.currentBookData.id === bookId && 
            state.currentBookData.translationId === transId) {
            console.log(`Prefetch: ${bookId} is current book`);
            return true;
        }
        
        // Mark as "fetching" to prevent duplicate requests
        state.prefetchCache[cacheKey] = { fetching: true };
        
        try {
            const filePath = `data/translations/${transId}/${bookId}.json`;
            console.log(`Prefetch: Fetching ${bookId}...`);
            
            const response = await fetch(filePath);
            if (!response.ok) throw new Error("File not found");
            
            const data = await response.json();
            
            // Store in cache
            state.prefetchCache[cacheKey] = {
                id: bookId,
                translationId: transId,
                chapters: data.chapters
            };
            
            console.log(`Prefetch: ${bookId} cached successfully`);
            return true;
            
        } catch (err) {
            console.error(`Prefetch: Failed to fetch ${bookId}`, err);
            // Remove failed entry from cache
            delete state.prefetchCache[cacheKey];
            return false;
        }
    }

    /**
     * Gets a book ID by its index in the book picker.
     * Useful for prefetching adjacent books.
     * 
     * @param {number} index - The index in the book picker
     * @returns {string|null} - The book ID or null if invalid index
     */
    function getBookIdByIndex(index) {
        const option = elements.pickers.book.options[index];
        return option ? option.value : null;
    }

    /**
     * Gets the book ID adjacent to the current book.
     * 
     * @param {number} offset - -1 for previous, +1 for next
     * @returns {string|null} - The adjacent book ID or null
     */
    function getAdjacentBookId(offset) {
        const currentIndex = elements.pickers.book.selectedIndex;
        const totalBooks = elements.pickers.book.options.length;
        
        if (totalBooks === 0) return null;
        
        let newIndex;
        if (offset < 0) {
            newIndex = currentIndex > 0 ? currentIndex - 1 : totalBooks - 1;
        } else {
            newIndex = currentIndex < totalBooks - 1 ? currentIndex + 1 : 0;
        }
        
        return getBookIdByIndex(newIndex);
    }

    /**
     * Gets the currently selected book ID.
     * 
     * @returns {string} - The current book ID
     */
    function getCurrentBookId() {
        return state.bookId;
    }

    /**
     * Prefetches data for a translation switch.
     * Fetches the current book in the target translation.
     * 
     * @param {string} translationId - The translation to prefetch for
     * @returns {Promise<boolean>} - True if prefetch succeeded
     */
    async function prefetchTranslation(translationId) {
        // Skip if it's the current translation
        if (translationId === state.translationId) {
            console.log(`Prefetch: ${translationId} is current translation`);
            return true;
        }
        
        // Prefetch the current book in the new translation
        const currentBook = state.bookId;
        console.log(`Prefetch: Loading ${currentBook} in ${translationId}...`);
        
        return prefetchBook(currentBook, translationId);
    }

    // Expose prefetch functions globally for use by navigation.js and custom-select.js
    window.biblePrefetch = {
        prefetchBook: prefetchBook,
        prefetchTranslation: prefetchTranslation,
        getAdjacentBookId: getAdjacentBookId,
        getBookIdByIndex: getBookIdByIndex,
        getCurrentBookId: getCurrentBookId
    };


    /* =========================================================================
     * SECTION 4: COMMENTARY SYSTEM
     * =========================================================================
     * Functions for loading, filtering, and displaying verse commentaries.
     * Uses a "champion" system where random eligible commentaries are drafted
     * for each chapter, then queried per-verse.
     */

    /**
     * Drafts (selects) commentary "champions" for a given chapter.
     * 
     * This function:
     * 1. Filters the global catalog based on current filter settings
     * 2. Finds all works that have commentary for this specific chapter
     * 3. Randomly shuffles and selects up to 10 "champions"
     * 4. Prefetches both content and metadata for each champion
     * 5. Updates the commentary panel
     * 
     * @param {string} bookId - The book identifier (e.g., 'jn' for John)
     * @param {number} chapterNum - The chapter number
     * @returns {Promise<void>}
     */
    async function draftChampionsForChapter(bookId, chapterNum) {
        let eligibleWorks = [];
        let targetChapter = parseInt(chapterNum);
        
        // For Psalms: convert file chapter to canonical (Hebrew) for commentary lookup
        // Commentary inventory and files are always in Hebrew numbering
        if (bookId === 'ps') {
            const translationPsalmSystem = state.currentTranslationMeta?.['psalms-structure'] || 'hebrew';
            const translationHasSuperscription = state.currentTranslationMeta?.['psalms-superscription'] || false;
            const canonical = fileToCanonical(targetChapter, 1, translationPsalmSystem, translationHasSuperscription);
            targetChapter = canonical.psalm;
        }

        // STEP 1: Filter catalog to find eligible works
        if (globalCatalog.authors) {
            globalCatalog.authors.forEach(author => {
                // Filter: Orthodoxy mode
                if (state.orthodoxyMode && !author.orthodox) {
                    return;
                }

                // Filter: Specific author selected
                if (state.filterAuthor !== 'all' && author.id !== state.filterAuthor) {
                    return;
                }

                if (author.works) {
                    author.works.forEach(work => {
                        // Filter: Language
                        if (state.filterLanguage !== 'all' && work.language !== state.filterLanguage) {
                            return;
                        }

                        // Filter: Specific work selected
                        if (state.filterWork !== 'all' && work.id !== state.filterWork) {
                            return;
                        }

                        // Filter: Has this chapter in inventory
                        if (work.inventory && 
                            work.inventory[bookId] && 
                            work.inventory[bookId].includes(targetChapter)) {
                            
                            eligibleWorks.push({
                                ...work,
                                authorName: author.name,
                                authorId: author.id,
                                path: `data/commentaries/${author.id}/${work.id}/${bookId}/${targetChapter}.json`
                            });
                        }
                    });
                }
            });
        }

        // STEP 2: Fisher-Yates shuffle and pick top 10
        for (let i = eligibleWorks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [eligibleWorks[i], eligibleWorks[j]] = [eligibleWorks[j], eligibleWorks[i]];
        }
        
        currentChampions = eligibleWorks.slice(0, 10);
        console.log(`Drafting for ${bookId} ${targetChapter}. Champions found:`, currentChampions.length);

        // STEP 3: Prefetch content and metadata for all champions
        championData = {};
        
        await Promise.all(currentChampions.map(async (champ) => {
            try {
                const contentPath = champ.path;
                const metaPath = `data/commentaries/${champ.authorId}/${champ.id}/meta.json`;

                // Fetch content and metadata in parallel
                const [contentResponse, metaResponse] = await Promise.all([
                    fetch(contentPath),
                    fetch(metaPath).catch(e => null)  // Gracefully handle missing meta
                ]);

                if (!contentResponse.ok) throw new Error("Content missing");
                const contentData = await contentResponse.json();

                let metaData = null;
                if (metaResponse && metaResponse.ok) {
                    metaData = await metaResponse.json();
                }

                // Store both in memory
                championData[champ.id] = {
                    content: contentData,
                    meta: metaData
                };

            } catch (err) {
                console.warn(`Failed to load data for ${champ.id}`, err);
            }
        }));
        
        console.log("Champion data (with meta) ready:", championData);
        
        // STEP 4: Update UI
        if (state.selectedVerse) {
            // For Psalms, use canonical verse; for other books, use selected verse
            const verseToShow = (bookId === 'ps' && state.canonicalVerse) 
                ? state.canonicalVerse 
                : state.selectedVerse;
            updateCommentaryPanel(verseToShow);
        } else {
            updateCommentaryPanel(null);
        }
    }


    /**
     * Checks if a verse number matches a verse entry (single or range).
     * 
     * Handles:
     * - Single number: 39
     * - String number: "39"
     * - Range string: "22-24"
     * 
     * @param {number} verseNum - The verse number to check
     * @param {number|string} entryVerse - The verse entry (single or range)
     * @returns {boolean} - True if the verse matches
     */
    function verseMatchesEntry(verseNum, entryVerse) {
        const verse = parseInt(verseNum);
        
        // Handle numeric entry
        if (typeof entryVerse === 'number') {
            return verse === entryVerse;
        }
        
        // Handle string entry
        if (typeof entryVerse === 'string') {
            // Check if it's a range (contains hyphen)
            if (entryVerse.includes('-')) {
                const parts = entryVerse.split('-');
                const start = parseInt(parts[0]);
                const end = parseInt(parts[1]);
                return verse >= start && verse <= end;
            } else {
                // Single number as string
                return verse === parseInt(entryVerse);
            }
        }
        
        return false;
    }


    /**
     * Retrieves commentary entries for a specific verse from loaded champions.
     * 
     * Uses a "waterfall" approach: iterates through champions in order,
     * collecting up to 10 that have commentary for the requested verse.
     * Supports both single verse entries and verse ranges (e.g., "22-24").
     * 
     * @param {number} verseNum - The verse number to look up
     * @returns {Array} Array of winner objects with author, title, text, page, and meta
     */
    function getWaterfallCommentary(verseNum, psalmNum = null) {
        let winners = [];

        for (let i = 0; i < currentChampions.length; i++) {
            if (winners.length >= 10) break;

            const champ = currentChampions[i];
            
            // Get the right champion data entry
            // For psalms: keyed by workId_psalmNum
            // For other books: keyed by workId
            let fullData;
            if (psalmNum !== null && champ.hebrewPsalm) {
                if (champ.hebrewPsalm !== psalmNum) continue;
                fullData = championData[`${champ.id}_${champ.hebrewPsalm}`];
            } else {
                fullData = championData[champ.id];
            }

            if (fullData && fullData.content && fullData.content.verses) {
                // Get ALL entries that match this verse (single or range)
                const verseEntries = fullData.content.verses.filter(v => 
                    verseMatchesEntry(verseNum, v.v)
                );

                // Add each entry as a separate winner
                for (const verseEntry of verseEntries) {
                    if (winners.length >= 10) break;
                    
                    winners.push({
                        author: champ.authorName,
                        title: champ.title,
                        text: verseEntry.text,
                        page: verseEntry.p || null,
                        meta: fullData.meta
                    });
                }
            }
        }
        return winners;
    }


    /**
     * Updates the commentary panel UI based on the selected/hovered verse.
     * 
     * Handles three scenarios:
     * 1. No verse selected ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Shows placeholder text
     * 2. Verse selected, commentary found ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Renders commentary cards
     * 3. Verse selected, no commentary ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Shows "no commentary" message
     * 
     * @param {number|null} verseNum - The verse number to display, or null for placeholder
     */
    function updateCommentaryPanel(verseNum, psalmNum = null) {
        const displayContainer = document.getElementById('commentary-content');
        
        if (!displayContainer) return;

        // Scenario 1: No verse selected (idle/reset state)
        if (!verseNum) {
            displayContainer.innerHTML = '<div class="commentary-placeholder">Select a verse to see commentary...</div>';
            return;
        }

        // Scenario 2: Verse selected - query the champions
        const winners = getWaterfallCommentary(verseNum, psalmNum);

        if (winners.length > 0) {
            const cardsHTML = winners.map(winner => {
                const citationText = generateCitation(winner, state.citationStyle);
                
                const footnoteHTML = citationText 
                    ? `<div class="citation-footnote">${citationText}</div>` 
                    : '';
                
                // Format text with paragraph breaks
                const formattedText = formatCommentaryText(winner.text);

                return `
                <div class="commentary-card active-card">
                    <div class="card-meta">
                        <span class="source-author">${winner.author}</span>, 
                        <span class="source-work">${winner.title}</span>
                    </div>
                    
                    <div class="commentary-text">${formattedText}</div>
                    
                    <div class="card-footer">
                        ${footnoteHTML}
                    </div>
                </div>
            `}).join('');

            displayContainer.innerHTML = cardsHTML;
        } else {
            // Scenario 3: No commentary found for this verse
            displayContainer.innerHTML = '<div class="commentary-placeholder">No commentary available for this verse from current sources.</div>';
        }
    }


    /**
     * Formats commentary text by converting \n to proper paragraph elements.
     * First paragraph has no indent, subsequent paragraphs are indented.
     * 
     * @param {string} text - The raw commentary text with \n line breaks
     * @returns {string} - HTML string with properly formatted paragraphs
     */
    function formatCommentaryText(text) {
        if (!text) return '';
        
        // Split by newline characters
        const paragraphs = text.split('\n').filter(p => p.trim() !== '');
        
        if (paragraphs.length === 0) return '';
        if (paragraphs.length === 1) return `<p>${paragraphs[0]}</p>`;
        
        // First paragraph: no indent
        // Subsequent paragraphs: indented
        return paragraphs.map((para, index) => {
            if (index === 0) {
                return `<p>${para}</p>`;
            } else {
                return `<p class="commentary-indent">${para}</p>`;
            }
        }).join('');
    }


    /* =========================================================================
     * SECTION 5: CITATION GENERATION
     * =========================================================================
     * Generates properly formatted citations in Chicago, MLA, and APA styles.
     */

    /**
     * Generates a formatted citation string for a commentary entry.
     * 
     * Handles various authorship scenarios:
     * - Works with named authors
     * - Works known primarily by translator
     * - Works with both author and translator
     * 
     * @param {Object} winner - The commentary entry with meta and page info
     * @param {string} style - Citation style: 'chicago', 'mla', or 'apa'
     * @returns {string} Formatted citation HTML string, or empty string if no metadata
     */
    function generateCitation(winner, style) {
        // Skip if no metadata available
        if (!winner.meta || !winner.meta.metadata) {
            return "";
        }

        const m = winner.meta.metadata;
        const page = winner.page ? winner.page : "";

        // Determine authorship roles
        const hasAuthor = m.author && m.author.trim() !== "";
        const hasTranslator = m.translator && m.translator.trim() !== "";

        /**
         * Helper: Converts "Last, First" format to "First Last" format.
         * @param {string} name - Name in "Last, First" format
         * @returns {string} Name in "First Last" format
         */
        const flipName = (name) => {
            if (!name) return "";
            if (name.includes(',')) {
                const parts = name.split(',');
                return `${parts[1].trim()} ${parts[0].trim()}`;
            }
            return name;
        };

        const authorFirst = flipName(m.author);
        const translatorFirst = flipName(m.translator);

        // Determine primary creator (Author > Translator > Editor)
        let primaryNameRaw = hasAuthor ? m.author : (m.translator || m.editor);
        let primaryNameFirst = flipName(primaryNameRaw);

        let citation = "";

        // Format based on selected style
        switch (style) {
            case 'chicago':
                // Chicago: Author, *Title*, trans. Name (Place: Pub, Year), Page.
                citation = `${primaryNameFirst}`;
                
                if (!hasAuthor && hasTranslator) citation += `, trans.`;
                
                citation += `, <i>${m['book-title']}</i>`;
                
                if (hasAuthor && hasTranslator) {
                    citation += `, trans. ${translatorFirst}`;
                }
                
                citation += ` (${m.place}: ${m.publisher}, ${m.year})`;
                
                if (page) citation += `, ${page}`;
                
                citation += ".";
                break;

            case 'mla':
                // MLA: Last, First. *Title*. Trans. First Last. Publisher, Year.
                citation = `${primaryNameRaw}. <i>${m['book-title']}</i>. `;
                
                if (hasAuthor && hasTranslator) {
                    citation += `Trans. ${translatorFirst}. `;
                } else if (!hasAuthor && hasTranslator) {
                    citation = `${primaryNameRaw}, translator. <i>${m['book-title']}</i>. `;
                }

                citation += `${m.publisher}, ${m.year}.`;
                break;

            case 'apa':
                // APA: Last, F. (Year). *Title* (N. Translator, Trans.). Publisher.
                citation = `${primaryNameRaw} `;
                
                if (!hasAuthor) citation += `(Trans.) `;
                
                citation += `(${m.year}). <i>${m['book-title']}</i>`;
                
                if (hasAuthor && hasTranslator) {
                    citation += ` (${translatorFirst}, Trans.)`;
                }
                
                citation += `. ${m.publisher}.`;
                break;

            default:
                citation = "";
        }

        return citation;
    }


    /* =========================================================================
     * SECTION 6: CATALOG & FILTER MANAGEMENT
     * =========================================================================
     * Functions for loading the commentary catalog and populating filter dropdowns.
     */

    /**
     * Loads the master commentary catalog from the server.
     * 
     * The catalog contains all authors, their works, and an inventory
     * of which books/chapters each work covers. Once loaded, it populates
     * the filter dropdowns.
     * 
     * @returns {Promise<void>}
     */
    async function loadCatalog() {
        try {
            const response = await fetch('data/commentaries/index.json');
            const data = await response.json();
            
            globalCatalog = data;
            console.log("Catalog loaded successfully:", globalCatalog);

            // Populate filter dropdowns now that we have data
            populateLanguageDropdown();
            populateAuthorDropdown();
            populateWorkDropdown();

        } catch (error) {
            console.error("Could not load catalog:", error);
        }
    }


    /**
     * Populates the language filter dropdown with unique languages from the catalog.
     * 
     * Scans all works across all authors to build a deduplicated list
     * of available languages.
     */
    function populateLanguageDropdown() {
        console.log("Populating Language Dropdown...");

        const langSelect = document.getElementById('filter-language');
        langSelect.innerHTML = '<option value="all">All Languages</option>';
        
        const uniqueLanguages = new Set();

        if (globalCatalog.authors) {
            globalCatalog.authors.forEach(author => {
                if (author.works) {
                    author.works.forEach(work => {
                        if (work.language) {
                            uniqueLanguages.add(work.language);
                        }
                    });
                }
            });
        }

        // Add each unique language as an option, sorted alphabetically
        Array.from(uniqueLanguages).sort((a, b) => a.localeCompare(b)).forEach(language => {
            const option = document.createElement('option');
            option.value = language;
            option.textContent = language;
            langSelect.appendChild(option);
        });
        
        console.log("Dropdown population complete.");
    }


    /**
     * Populates the author filter dropdown based on the selected language.
     * 
     * Only shows authors who have at least one work in the currently
     * selected language. Preserves previous selection if still valid.
     */
    function populateAuthorDropdown() {
        const authorSelect = document.getElementById('filter-author');
        const currentLang = state.filterLanguage;

        authorSelect.innerHTML = '<option value="all">All Authors</option>';

        if (!globalCatalog.authors) return;

        const matchingAuthors = globalCatalog.authors.filter(author =>
            author.works && author.works.some(work =>
                currentLang === 'all' || work.language === currentLang
            )
        );

        matchingAuthors.sort((a, b) => a.name.localeCompare(b.name)).forEach(author => {
            const option = document.createElement('option');
            option.value = author.id;
            option.textContent = author.name;
            authorSelect.appendChild(option);
        });
        
        // Restore previous selection if still valid
        const previousValue = state.filterAuthor;
        const options = Array.from(authorSelect.options);
        if (options.some(opt => opt.value === previousValue)) {
            authorSelect.value = previousValue;
        } else {
            authorSelect.value = 'all';
            state.filterAuthor = 'all';
        }
    }


    /**
     * Populates the work filter dropdown based on selected language AND author.
     * 
     * Shows all works that match both the current language filter and
     * author filter. Preserves previous selection if still valid.
     */
    function populateWorkDropdown() {
        const workSelect = document.getElementById('filter-work');
        const currentLang = state.filterLanguage;
        const currentAuthorId = state.filterAuthor;

        workSelect.innerHTML = '<option value="all">All Works</option>';

        if (!globalCatalog.authors) return;

        const matchingWorks = [];
        globalCatalog.authors.forEach(author => {
            if (currentAuthorId !== 'all' && author.id !== currentAuthorId) return;

            if (author.works) {
                author.works.forEach(work => {
                    if (currentLang === 'all' || work.language === currentLang) {
                        matchingWorks.push(work);
                    }
                });
            }
        });

        const ITALIC_WORK_IDS = new Set([
            'findalprincipio/vatican-en',
            'gravesdecommunire/vatican-en',
            'rerumnovarum/vatican-en',
        ]);

        matchingWorks.sort((a, b) => a.title.localeCompare(b.title)).forEach(work => {
            const option = document.createElement('option');
            option.value = work.id;
            option.textContent = work.title;
            if (ITALIC_WORK_IDS.has(work.id)) option.style.fontStyle = 'italic';
            workSelect.appendChild(option);
        });
        
        // Restore previous selection if valid
        const previousValue = state.filterWork;
        const options = Array.from(workSelect.options);
        if (options.some(opt => opt.value === previousValue)) {
            workSelect.value = previousValue;
        } else {
            workSelect.value = 'all';
            state.filterWork = 'all';
        }
    }


    /* =========================================================================
     * SECTION 7: BIBLE DATA LOADING
     * =========================================================================
     * Functions for loading translations, books, chapters, and metadata.
     */

    /**
     * Loads the list of available Bible translations.
     * 
     * Respects Orthodoxy Mode by filtering out non-orthodox translations.
     * If the currently selected translation gets filtered out, automatically
     * switches to the first available option.
     */
    function loadTranslationList() {
        fetch('data/translations/index.json')
            .then(response => response.json())
            .then(translations => {
                elements.pickers.translation.innerHTML = "";

                translations.forEach(t => {
                    // Filter based on orthodoxy mode
                    if (state.orthodoxyMode && !t.orthodox) return;

                    const option = document.createElement('option');
                    option.value = t.id;
                    option.textContent = t.name;
                    elements.pickers.translation.appendChild(option);
                });

                // Safety check: if current translation was filtered out, reset to first available
                const options = Array.from(elements.pickers.translation.options);
                const currentStillExists = options.some(opt => opt.value === state.translationId);

                if (currentStillExists) {
                    elements.pickers.translation.value = state.translationId;
                } else if (options.length > 0) {
                    elements.pickers.translation.selectedIndex = 0;
                    state.translationId = elements.pickers.translation.value;
                    
                    // Translation changed, reload dependent data
                    loadMetadata(state.translationId);
                    loadBookList();
                }
            })
            .catch(err => console.error("Error loading translations:", err));
    }


    /**
     * Loads metadata for a specific translation.
     * 
     * Metadata includes: year, place, language, translator, editor,
     * publisher, imprimatur, and description.
     * 
     * @param {string} translationId - The translation identifier
     * @returns {Promise<Object>} The translation metadata
     */
    async function loadMetadata(translationId) {
        const filePath = `data/translations/${translationId}/${translationId}-meta.json`;

        try {
            const response = await fetch(filePath);
            const data = await response.json();
            
            // Cache the full metadata
            state.currentTranslationMeta = data;
            
            // Update UI with metadata
            const meta = data.metadata;
            elements.meta.year.textContent = meta.year;
            elements.meta.place.textContent = meta.place;
            elements.meta.language.textContent = meta.language;
            elements.meta.translator.textContent = meta.translator;
            elements.meta.editor.textContent = meta.editor;
            elements.meta.publisher.textContent = meta.publisher;
            elements.meta.imprimatur.textContent = meta.imprimatur;
            elements.meta.description.textContent = data.description;
            
            // Auto-sync tradition toggle and psalm options to translation defaults
            const psalmDefaults = getTranslationPsalmDefaults(data);
            state.textTradition = psalmDefaults.textTradition;
            state.showSuperscription = psalmDefaults.showSuperscription;

            // Update button text
            updateStructureButtonLabels();
            
            return data;
        } catch (err) {
            console.error("Error loading metadata:", err);
            return null;
        }
    }


    /**
     * Fetches and displays the list of books for the current translation.
     * 
     * Each book option stores additional data attributes:
     * - chapters: total number of chapters
     * - fulltitle: full book name
     * - subtitle: optional subtitle
     * - supertitle: optional supertitle (e.g., "The Gospel According to")
     */
    function loadBookList() {
        const filePath = `data/translations/${state.translationId}/${state.translationId}-books.json`;

        fetch(filePath)
            .then(response => response.json())
            .then(data => {
                elements.pickers.book.innerHTML = "";

                data.forEach(book => {
                    const option = document.createElement('option');
                    option.value = book.id;
                    option.textContent = book.shortName;
                    
                    // Store extra data in DOM for later use
                    option.dataset.chapters = book.chapters;
                    option.dataset.fulltitle = book.name;
                    option.dataset.subtitle = book.subtitle || "";
                    option.dataset.supertitle = book.supertitle || "";
                    
                    elements.pickers.book.appendChild(option);
                });

                // Sync dropdown with current state
                elements.pickers.book.value = state.bookId;
                
                // Trigger chapter list refresh
                loadChapterList();
            })
            .catch(error => console.error("Error loading book list:", error));
    }


    /**
     * Populates the chapter dropdown based on the selected book.
     * 
     * Reads the chapter count from the selected book's data attributes.
     */
    /**
     * Syncs the custom-select overlay display with the native chapter picker value.
     * Required because setting nativeSelect.value programmatically does not fire
     * a 'change' event, so the custom overlay's value display stays stale.
     */
    function syncChapterPickerDisplay() {
        const select = elements.pickers.chapter;
        const wrapper = select.closest('.custom-select');
        if (!wrapper) return;
        const valueDisplay = wrapper.querySelector('.custom-select-value');
        const selectedOption = select.options[select.selectedIndex];
        if (valueDisplay && selectedOption) {
            valueDisplay.textContent = selectedOption.textContent;
        }
        wrapper.querySelectorAll('.custom-select-option').forEach((opt, i) => {
            opt.classList.toggle('selected', i === select.selectedIndex);
        });
    }

    function loadChapterList() {
        const selectedOption = elements.pickers.book.options[elements.pickers.book.selectedIndex];
        const totalChapters = selectedOption ? (selectedOption.dataset.chapters || 1) : 1;

        elements.pickers.chapter.innerHTML = "";

        for (let i = 1; i <= totalChapters; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            elements.pickers.chapter.appendChild(option);
        }

        elements.pickers.chapter.value = state.chapter;
        
        // Now load the actual chapter text
        loadChapterText();
    }


    /**
     * Main content loader - fetches and renders Bible text.
     * 
     * Implements "Fetch Once, Read Many" caching:
     * - Fetches entire book JSON on first access
     * - Caches in state.currentBookData
     * - Subsequent chapter changes read from cache
     * 
     * @returns {Promise<void>}
     */
    async function loadChapterText() {
        // For Psalms with phantom psalm support, use special loader
        if (state.bookId === 'ps') {
            await loadPsalmChapterText();
            return;
        }

        // For LXX mode with structurally-variant books, use the LXX reshuffler
        if (state.textTradition === 'septuagint' && hasStructureVariant(state.bookId)) {
            await loadLxxChapterText();
            return;
        }

        // Standard loading for non-Psalms
        const needToFetch = !state.currentBookData || 
                            state.currentBookData.id !== state.bookId ||
                            state.currentBookData.translationId !== state.translationId;

        if (needToFetch) {
            const cacheKey = `${state.bookId}:${state.translationId}`;
            
            // Check prefetch cache first
            if (state.prefetchCache[cacheKey] && !state.prefetchCache[cacheKey].fetching) {
                console.log(`Using prefetched data for ${state.bookId}`);
                state.currentBookData = state.prefetchCache[cacheKey];
                // Clean up prefetch cache entry (now it's the current book)
                delete state.prefetchCache[cacheKey];
            } else {
                // Not prefetched - fetch normally
                try {
                    const filePath = `data/translations/${state.translationId}/${state.bookId}.json`;
                    console.log(`Fetching Book: ${filePath}`);

                    const response = await fetch(filePath);
                    if (!response.ok) throw new Error("File not found");
                    
                    const data = await response.json();

                    // Cache the book data
                    state.currentBookData = {
                        id: state.bookId,
                        translationId: state.translationId,
                        chapters: data.chapters
                    };
                    
                } catch (err) {
                    console.error("Error loading book:", err);
                    elements.display.biblePanel.innerHTML = '<div class="error">Could not load book data.</div>';
                    return;
                }
            }
        }

        // Render the specific chapter from cache
        const bookData = state.currentBookData;
        const targetChapter = parseInt(state.chapter);

        const chapterObj = bookData.chapters.find(c => c.chapter === targetChapter);

        if (chapterObj) {
            elements.display.biblePanel.innerHTML = "";
            renderHeaders();
            renderVerses(chapterObj.verses);
            
            // Draft commentaries for this chapter
            draftChampionsForChapter(state.bookId, state.chapter);
        } else {
            elements.display.biblePanel.innerHTML = `<div class="error">Chapter ${targetChapter} not found.</div>`;
        }
    }
    
    
    /**
     * LXX reshuffler loader.
     * Loads one or more MT chapters, slices verse ranges, and assembles them
     * in LXX display order. Used for 1 Kings, Jeremiah, and Proverbs in
     * Septuagint mode.
     */
    async function loadLxxChapterText() {
        const bookId = state.bookId;
        const displayChapter = parseInt(state.chapter);

        // Proverbs ch.30 is empty in LXX mode
        if (isChapterEmpty(bookId, displayChapter, 'septuagint')) {
            elements.display.biblePanel.innerHTML = "";
            renderHeaders();
            renderEmptyLxxChapter();
            draftChampionsForChapter(bookId, displayChapter);
            return;
        }

        const segments = getChapterContent(bookId, displayChapter, 'septuagint');
        if (!segments || segments.length === 0) {
            elements.display.biblePanel.innerHTML = `<div class="error">Chapter ${displayChapter} not found in LXX mapping.</div>`;
            return;
        }

        // Ensure book data is cached
        const needToFetch = !state.currentBookData ||
                            state.currentBookData.id !== bookId ||
                            state.currentBookData.translationId !== state.translationId;

        if (needToFetch) {
            const cacheKey = `${bookId}:${state.translationId}`;
            if (state.prefetchCache[cacheKey] && !state.prefetchCache[cacheKey].fetching) {
                state.currentBookData = state.prefetchCache[cacheKey];
                delete state.prefetchCache[cacheKey];
            } else {
                try {
                    const filePath = `data/translations/${state.translationId}/${bookId}.json`;
                    console.log(`Fetching Book (LXX): ${filePath}`);
                    const response = await fetch(filePath);
                    if (!response.ok) throw new Error("File not found");
                    const data = await response.json();
                    state.currentBookData = { id: bookId, translationId: state.translationId, chapters: data.chapters };
                } catch (err) {
                    console.error("Error loading book (LXX):", err);
                    elements.display.biblePanel.innerHTML = '<div class="error">Could not load book data.</div>';
                    return;
                }
            }
        }

        // Assemble verses from all segments in LXX order
        const kings8Order = getKings8LxxOrder();
        let allVerses = [];
        const firstMtChapter = segments[0].mtChapter;

        for (const seg of segments) {
            const chapterObj = state.currentBookData.chapters.find(c => c.chapter === seg.mtChapter);
            if (!chapterObj) {
                console.warn(`MT chapter ${seg.mtChapter} not found`);
                continue;
            }

            let verses = chapterObj.verses;
            if (seg.verseStart !== null && seg.verseStart !== undefined) {
                verses = verses.filter(v => v.v >= seg.verseStart);
            }
            if (seg.verseEnd !== null && seg.verseEnd !== undefined) {
                verses = verses.filter(v => v.v <= seg.verseEnd);
            }

            // 1 Kings ch.8: reorder verses into LXX display order
            if (seg.reorder) {
                const verseMap = {};
                verses.forEach(v => { verseMap[v.v] = v; });
                verses = kings8Order.map(mtV => verseMap[mtV]).filter(Boolean);
            }

            verses.forEach(v => {
                allVerses.push({ ...v, mtChapter: seg.mtChapter });
            });
        }

        // Render
        elements.display.biblePanel.innerHTML = "";
        renderHeaders();
        renderLxxVerses(allVerses, displayChapter);

        // Draft commentaries using the primary MT chapter for this LXX chapter
        draftChampionsForChapter(bookId, firstMtChapter);
    }


    /**
     * Renders verses assembled in LXX display order.
     * Each verse retains its MT verse number and stores its MT chapter as a
     * data attribute so commentary lookup can use the canonical MT reference.
     */
    function renderLxxVerses(verses, displayChapter) {
        const selectedOption = elements.pickers.book.options[elements.pickers.book.selectedIndex];
        const shortTitle = selectedOption?.textContent || "Book";

        verses.forEach(verseObj => {
            const pTag = document.createElement('p');
            pTag.className = "verse";
            pTag.dataset.mtChapter = verseObj.mtChapter;
            pTag.dataset.mtVerse = verseObj.v;

            const verseRef = `${shortTitle} ${displayChapter}:${verseObj.v}`;

            // --- Mouse Hover Events ---
            pTag.addEventListener('mouseenter', () => {
                if (state.selectedVerse) return;
                elements.display.context.textContent = verseRef;
                updateCommentaryPanel(verseObj.v);
            });

            pTag.addEventListener('mouseleave', () => {
                if (state.selectedVerse) {
                    elements.display.context.textContent = state.lastSelectedVerseText;
                    return;
                }
                elements.display.context.textContent = "Select a verse...";
                updateCommentaryPanel(null);
            });

            // --- Click Selection Events ---
            pTag.addEventListener('click', function() {
                const isAlreadySelected = this.classList.contains('selected');
                document.querySelectorAll('.verse').forEach(v => v.classList.remove('selected'));

                if (!isAlreadySelected) {
                    this.classList.add('selected');
                    state.selectedVerse = verseObj.v;
                    state.canonicalPsalm = null;
                    state.canonicalVerse = null;
                    state.lastSelectedVerseText = verseRef;
                    elements.display.context.textContent = verseRef;
                    updateCommentaryPanel(verseObj.v);
                } else {
                    state.selectedVerse = null;
                    state.canonicalPsalm = null;
                    state.canonicalVerse = null;
                    state.lastSelectedVerseText = "Select a verse...";
                    elements.display.context.textContent = state.lastSelectedVerseText;
                    updateCommentaryPanel(null);
                }
            });

            // Build verse HTML structure
            const strongTag = document.createElement('strong');
            strongTag.textContent = verseObj.v;
            pTag.appendChild(strongTag);
            pTag.insertAdjacentHTML('beforeend', ` ${verseObj.text}`);

            elements.display.biblePanel.appendChild(pTag);
        });
    }


    /**
     * Renders an informational message for chapters that are empty in LXX mode
     * (Proverbs ch.30 — all content moved to ch.24 in LXX structure).
     */
    function renderEmptyLxxChapter() {
        const note = document.createElement('p');
        note.className = "lxx-empty-note";
        note.innerHTML = `In the Septuagint, the content of this chapter has been moved into Chapter 24.`;
        elements.display.biblePanel.appendChild(note);
    }


    /**
     * Special loader for Psalms that supports phantom psalms.
     * Loads one or more file chapters and combines them into a single display psalm.
     */
    async function loadPsalmChapterText() {
        const displayPsalm = parseInt(state.chapter);
        const translationSystem = state.currentTranslationMeta?.['psalms-structure'] || 'hebrew';
        const translationHasSuperscription = state.currentTranslationMeta?.['psalms-superscription'] || false;
        
        // Get the file chapter(s) we need to load
        const psalmSystem = state.textTradition === 'septuagint' ? 'greek' : 'hebrew';
        const fileChapters = getFileChaptersForDisplayPsalm(displayPsalm, psalmSystem, translationSystem);

        console.log(`Loading Psalm ${displayPsalm} (${psalmSystem}), need file chapters:`, fileChapters);
        
        // Ensure book data is cached
        if (!state.currentBookData || 
            state.currentBookData.id !== 'ps' ||
            state.currentBookData.translationId !== state.translationId) {
            
            const cacheKey = `ps:${state.translationId}`;
            
            // Check prefetch cache first
            if (state.prefetchCache[cacheKey] && !state.prefetchCache[cacheKey].fetching) {
                console.log(`Using prefetched data for Psalms`);
                state.currentBookData = state.prefetchCache[cacheKey];
                delete state.prefetchCache[cacheKey];
            } else {
                // Not prefetched - fetch normally
                try {
                    const filePath = `data/translations/${state.translationId}/ps.json`;
                    console.log(`Fetching Psalms: ${filePath}`);

                    const response = await fetch(filePath);
                    if (!response.ok) throw new Error("File not found");
                    
                    const data = await response.json();

                    state.currentBookData = {
                        id: 'ps',
                        translationId: state.translationId,
                        chapters: data.chapters
                    };
                    
                } catch (err) {
                    console.error("Error loading Psalms:", err);
                    elements.display.biblePanel.innerHTML = '<div class="error">Could not load Psalms data.</div>';
                    return;
                }
            }
        }
        
        // Collect verses from all needed file chapters
        let combinedVerses = [];
        let displayVerseNumber = 1;
        
        for (const fc of fileChapters) {
            const chapterObj = state.currentBookData.chapters.find(c => c.chapter === fc.fileChapter);
            
            if (!chapterObj) {
                console.warn(`File chapter ${fc.fileChapter} not found`);
                continue;
            }
            
            // Filter verses if needed (for partial chapters)
            let verses = chapterObj.verses;
            if (fc.verseStart !== null || fc.verseEnd !== null) {
                verses = verses.filter(v => {
                    if (fc.verseStart !== null && v.v < fc.verseStart) return false;
                    if (fc.verseEnd !== null && v.v > fc.verseEnd) return false;
                    return true;
                });
            }
            
            // Add verses with metadata for proper handling
            verses.forEach(v => {
                combinedVerses.push({
                    v: v.v,
                    text: v.text,
                    fileChapter: fc.fileChapter,
                    hebrewPsalm: fc.hebrewPsalm,
                    displayOffset: fc.displayOffset || 0
                });
            });
        }
        
        // Render
        elements.display.biblePanel.innerHTML = "";
        renderHeaders();
        renderPsalmVerses(combinedVerses, displayPsalm, translationSystem, translationHasSuperscription);
        
        // Draft commentaries - use Hebrew psalm(s) for lookup
        const hebrewPsalms = getHebrewPsalmsForDisplay(displayPsalm, psalmSystem);
        draftChampionsForPsalm(hebrewPsalms);
    }
    
    
    /**
     * Renders psalm verses with proper numbering transformation.
     * Handles verses from multiple file chapters combined into one display psalm.
     */
    function renderPsalmVerses(verses, displayPsalm, translationSystem, translationHasSuperscription) {
        let displayVerseNum = 1;
        let lastFileChapter = null;
        
        verses.forEach(verseObj => {
            const fileVerse = verseObj.v;
            const hebrewPsalm = verseObj.hebrewPsalm;
            
            // Convert file verse to canonical (Hebrew)
            const canonical = fileToCanonical(verseObj.fileChapter, fileVerse, translationSystem, translationHasSuperscription);
            const canonicalPsalm = canonical.psalm;
            const canonicalVerse = canonical.verse;
            
            // Convert canonical to display
            const display = canonicalToDisplay(
                canonicalPsalm,
                canonicalVerse,
                state.textTradition === 'septuagint' ? 'greek' : 'hebrew',
                state.showSuperscription
            );
            
            // If null, this verse should be hidden (superscription)
            if (display === null) {
                return;
            }
            
            const displayVerse = display.verse;
            
            const pTag = document.createElement('p');
            pTag.className = "verse";
            
            // Store canonical reference as data attributes
            pTag.dataset.canonicalPsalm = canonicalPsalm;
            pTag.dataset.canonicalVerse = canonicalVerse;
            pTag.dataset.fileChapter = verseObj.fileChapter;
            pTag.dataset.fileVerse = fileVerse;
            
            const verseRef = `Psalm ${displayPsalm}:${displayVerse}`;

            // --- Mouse Hover Events ---
            pTag.addEventListener('mouseenter', () => {
                if (state.selectedVerse) return;
                elements.display.context.textContent = verseRef;
                updateCommentaryPanel(canonicalVerse, canonicalPsalm);
            });

            pTag.addEventListener('mouseleave', () => {
                if (state.selectedVerse) {
                    elements.display.context.textContent = state.lastSelectedVerseText;
                    return;
                }
                elements.display.context.textContent = "Select a verse...";
                updateCommentaryPanel(null);
            });

            // --- Click Selection Events ---
            pTag.addEventListener('click', function() {
                const isAlreadySelected = this.classList.contains('selected');
                document.querySelectorAll('.verse').forEach(v => v.classList.remove('selected'));

                if (!isAlreadySelected) {
                    this.classList.add('selected');
                    state.selectedVerse = fileVerse;
                    state.canonicalPsalm = canonicalPsalm;
                    state.canonicalVerse = canonicalVerse;
                    state.lastSelectedVerseText = verseRef;
                    elements.display.context.textContent = verseRef;
                    updateCommentaryPanel(canonicalVerse, canonicalPsalm);
                } else {
                    state.selectedVerse = null;
                    state.canonicalPsalm = null;
                    state.canonicalVerse = null;
                    state.lastSelectedVerseText = "Select a verse...";
                    elements.display.context.textContent = state.lastSelectedVerseText;
                    updateCommentaryPanel(null);
                }
            });

            // Build verse HTML structure
            const strongTag = document.createElement('strong');
            strongTag.textContent = displayVerse;
            pTag.appendChild(strongTag);
            pTag.insertAdjacentHTML('beforeend', ` ${verseObj.text}`);
            
            elements.display.biblePanel.appendChild(pTag);
        });
    }
    
    
    /**
     * Drafts commentary champions for psalm(s).
     * Handles cases where a display psalm maps to multiple Hebrew psalms.
     */
    async function draftChampionsForPsalm(hebrewPsalms) {
        let eligibleWorks = [];
        
        if (globalCatalog.authors) {
            globalCatalog.authors.forEach(author => {
                if (state.orthodoxyMode && !author.orthodox) return;
                if (state.filterAuthor !== 'all' && author.id !== state.filterAuthor) return;

                if (author.works) {
                    author.works.forEach(work => {
                        if (state.filterLanguage !== 'all' && work.language !== state.filterLanguage) return;
                        if (state.filterWork !== 'all' && work.id !== state.filterWork) return;

                        // Check if work has commentary for ANY of the Hebrew psalms
                        for (const hebrewPsalm of hebrewPsalms) {
                            if (work.inventory && 
                                work.inventory['ps'] && 
                                work.inventory['ps'].includes(hebrewPsalm)) {
                                
                                eligibleWorks.push({
                                    ...work,
                                    authorName: author.name,
                                    authorId: author.id,
                                    hebrewPsalm: hebrewPsalm,
                                    path: `data/commentaries/${author.id}/${work.id}/ps/${hebrewPsalm}.json`
                                });
                            }
                        }
                    });
                }
            });
        }

        // Shuffle and pick champions
        for (let i = eligibleWorks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [eligibleWorks[i], eligibleWorks[j]] = [eligibleWorks[j], eligibleWorks[i]];
        }
        
        currentChampions = eligibleWorks.slice(0, 10);
        console.log(`Drafting for Psalms ${hebrewPsalms.join(', ')}. Champions found:`, currentChampions.length);

        // Prefetch content and metadata
        championData = {};
        
        await Promise.all(currentChampions.map(async (champ) => {
            try {
                const [contentResponse, metaResponse] = await Promise.all([
                    fetch(champ.path),
                    fetch(`data/commentaries/${champ.authorId}/${champ.id}/meta.json`).catch(() => null)
                ]);

                if (!contentResponse.ok) throw new Error("Content missing");
                const contentData = await contentResponse.json();

                let metaData = null;
                if (metaResponse && metaResponse.ok) {
                    metaData = await metaResponse.json();
                }

                // Key by work ID + psalm to handle multiple psalms from same work
                const key = `${champ.id}_${champ.hebrewPsalm}`;
                championData[key] = {
                    content: contentData,
                    meta: metaData,
                    hebrewPsalm: champ.hebrewPsalm
                };

            } catch (err) {
                console.warn(`Failed to load data for ${champ.id}`, err);
            }
        }));
        
        console.log("Champion data ready:", championData);
        
        if (state.selectedVerse && state.canonicalVerse) {
            updateCommentaryPanel(state.canonicalVerse, state.canonicalPsalm);
        } else {
            updateCommentaryPanel(null);
        }
    }


    /* =========================================================================
     * SECTION 8: UI RENDERING
     * =========================================================================
     * Functions for rendering Bible text elements to the DOM.
     */

    /**
     * Renders the book title, subtitle, supertitle, and chapter heading.
     * 
     * Creates a semantic <header> element containing:
     * - Supertitle (if exists): e.g., "The Gospel According to"
     * - Main title (h1): e.g., "Saint John"
     * - Subtitle (if exists): e.g., "The Evangelist"
     * - Chapter title (h2, if multi-chapter book): e.g., "Chapter 1"
     */
    function renderHeaders() {
        let fullTitle = "Book Title";
        let supertitle = "";
        let subtitle = "";
        let totalChapters = 1;
        
        // Get data from selected option
        if (elements.pickers.book.selectedIndex !== -1) {
            const selectedOpt = elements.pickers.book.options[elements.pickers.book.selectedIndex];
            
            fullTitle = selectedOpt.dataset.fulltitle;
            subtitle = selectedOpt.dataset.subtitle;
            supertitle = selectedOpt.dataset.supertitle;
            totalChapters = parseInt(selectedOpt.dataset.chapters);
        }

        // Create header wrapper
        const headerWrapper = document.createElement('header');
        headerWrapper.className = "chapter-header";

        // Supertitle (optional)
        if (supertitle) {
            const superTag = document.createElement('div');
            superTag.className = "book-supertitle";
            superTag.textContent = supertitle;
            headerWrapper.appendChild(superTag);
        }

        // Main title
        const titleTag = document.createElement('h1');
        titleTag.textContent = fullTitle;
        headerWrapper.appendChild(titleTag);

        // Subtitle (optional)
        if (subtitle) {
            const subtitleTag = document.createElement('div');
            subtitleTag.className = "book-subtitle";
            subtitleTag.textContent = subtitle;
            headerWrapper.appendChild(subtitleTag);
        }
        
        // Chapter title (only for multi-chapter books)
        if (totalChapters > 1) {
            const chapterTag = document.createElement('h2');
            
            // For Psalms: state.chapter is already in display numbering system
            if (state.bookId === 'ps') {
                chapterTag.textContent = `Psalm ${state.chapter}`;
            } else {
                chapterTag.textContent = `Chapter ${state.chapter}`;
            }
            
            headerWrapper.appendChild(chapterTag);
        }

        elements.display.biblePanel.appendChild(headerWrapper);
    }


    /**
     * Renders verse elements with interactive hover and click behavior.
     * NOTE: For Psalms, use renderPsalmVerses() instead.
     * 
     * Each verse:
     * - Shows commentary on hover (if no verse is locked)
     * - Can be clicked to lock/unlock selection
     * - Displays verse reference in context area
     * 
     * @param {Array} verses - Array of verse objects with 'v' (number) and 'text' properties
     */
    function renderVerses(verses) {
        const selectedOption = elements.pickers.book.options[elements.pickers.book.selectedIndex];
        const shortTitle = selectedOption?.textContent || "Book";
        const totalChapters = parseInt(selectedOption?.dataset.chapters || "1");

        verses.forEach(verseObj => {
            const pTag = document.createElement('p');
            pTag.className = "verse";
            
            // Format verse reference based on book type
            // Multi-chapter: "John 1:1" | Single-chapter: "3 John 1"
            const verseRef = totalChapters > 1 
                ? `${shortTitle} ${state.chapter}:${verseObj.v}` 
                : `${shortTitle} ${verseObj.v}`;

            // --- Mouse Hover Events ---
            pTag.addEventListener('mouseenter', () => {
                if (state.selectedVerse) return;
                elements.display.context.textContent = verseRef;
                updateCommentaryPanel(verseObj.v);
            });

            pTag.addEventListener('mouseleave', () => {
                if (state.selectedVerse) {
                    elements.display.context.textContent = state.lastSelectedVerseText;
                    return;
                }
                elements.display.context.textContent = "Select a verse...";
                updateCommentaryPanel(null);
            });

            // --- Click Selection Events ---
            pTag.addEventListener('click', function() {
                const isAlreadySelected = this.classList.contains('selected');
                document.querySelectorAll('.verse').forEach(v => v.classList.remove('selected'));

                if (!isAlreadySelected) {
                    this.classList.add('selected');
                    state.selectedVerse = verseObj.v;
                    state.lastSelectedVerseText = verseRef;
                    elements.display.context.textContent = verseRef;
                    state.canonicalPsalm = null;
                    state.canonicalVerse = null;
                    updateCommentaryPanel(verseObj.v);
                } else {
                    state.selectedVerse = null;
                    state.canonicalPsalm = null;
                    state.canonicalVerse = null;
                    state.lastSelectedVerseText = "Select a verse...";
                    elements.display.context.textContent = state.lastSelectedVerseText;
                    updateCommentaryPanel(null);
                }
            });

            // Build verse HTML structure
            const strongTag = document.createElement('strong');
            strongTag.textContent = verseObj.v;
            pTag.appendChild(strongTag);
            pTag.insertAdjacentHTML('beforeend', ` ${verseObj.text}`);
            
            elements.display.biblePanel.appendChild(pTag);
        });
    }


    /* =========================================================================
     * SECTION 9: EVENT LISTENERS
     * =========================================================================
     * Wire up user interactions to state changes and UI updates.
     */

    // --- Commentary Filter Events ---

    /**
     * Language filter change handler.
     * Updates author and work dropdowns, then re-drafts champions.
     */
    document.getElementById('filter-language').addEventListener('change', (e) => {
        state.filterLanguage = e.target.value;
        populateAuthorDropdown();
        populateWorkDropdown();
        draftChampionsForChapter(state.bookId, state.chapter);
    });

    /**
     * Author filter change handler.
     * Updates work dropdown, then re-drafts champions.
     */
    document.getElementById('filter-author').addEventListener('change', (e) => {
        state.filterAuthor = e.target.value;
        populateWorkDropdown();
        draftChampionsForChapter(state.bookId, state.chapter);
    });

    /**
     * Work filter change handler.
     * Re-drafts champions with new filter.
     */
    document.getElementById('filter-work').addEventListener('change', (e) => {
        state.filterWork = e.target.value;
        draftChampionsForChapter(state.bookId, state.chapter);
    });


    // --- Bible Navigation Events ---

    /**
     * Font picker change handler.
     * Updates the CSS custom property for the serif font.
     */
    elements.pickers.font.addEventListener('change', (e) => {
        document.documentElement.style.setProperty('--serif-font', e.target.value);
    });

    /**
     * Translation picker change handler.
     * Loads new translation metadata and book list.
     * For Psalms: preserves verse selection by navigating to correct display psalm.
     */
    elements.pickers.translation.addEventListener('change', async (e) => {
        state.translationId = e.target.value;
        
        // Load metadata first (this sets textTradition and showSuperscription to translation defaults)
        const newMeta = await loadMetadata(state.translationId);

        // If in Psalms with a canonical selection, calculate the correct display chapter
        if (state.bookId === 'ps' && state.canonicalPsalm && state.canonicalVerse && newMeta) {
            // Use the new display system (set by loadMetadata)
            const displayRef = canonicalToDisplay(
                state.canonicalPsalm,
                state.canonicalVerse,
                state.textTradition === 'septuagint' ? 'greek' : 'hebrew',
                state.showSuperscription
            );
            
            if (displayRef) {
                state.chapter = displayRef.psalm;
            }
        }
        
        // Now load the book list (which will load chapter list and text)
        loadBookList();
        
        // Restore verse selection after rendering
        if (state.bookId === 'ps' && state.canonicalPsalm) {
            // Small delay to ensure rendering completes
            setTimeout(() => restorePsalmVerseSelection(), 100);
        }
    });

    /**
     * Book picker change handler.
     * Resets to chapter 1 and loads new chapter list.
     */
    elements.pickers.book.addEventListener('change', (e) => {
        state.bookId = e.target.value;
        state.chapter = 1;
        updateStructureButtonLabels();  // Show/hide superscription button
        loadChapterList();
    });

    /**
     * Chapter picker change handler.
     * Loads the selected chapter text.
     */
    elements.pickers.chapter.addEventListener('change', (e) => {
        state.chapter = parseInt(e.target.value);
        loadChapterText();
    });


    // --- Mode Toggle Events ---

    /**
     * Orthodoxy mode toggle handler.
     * Filters translations and commentaries to orthodox-only sources.
     */
    elements.display.orthodoxyBtn.addEventListener('click', function() {
        state.orthodoxyMode = !state.orthodoxyMode;

        // Update button appearance
        if (state.orthodoxyMode) {
            this.classList.add('active');
            this.textContent = "Orthodoxy Mode";
            console.log("Mode: Orthodoxy");
        } else {
            this.classList.remove('active');
            this.textContent = "Heterodoxy Mode";
            console.log("Mode: Heterodoxy");
        }

        // External hook for potential extensions
        if (typeof loadCommentaries === "function") {
            loadCommentaries();
        }

        // Refresh all filtered lists
        loadTranslationList();
        draftChampionsForChapter(state.bookId, state.chapter);
    });

    /**
     * Citation style toggle handler.
     * Cycles through Chicago ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ MLA ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ APA ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Chicago...
     */
    const citationBtn = document.getElementById('citation-style-btn');
    const styles = ['chicago', 'mla', 'apa'];
    citationBtn.textContent = state.citationStyle.charAt(0).toUpperCase() + state.citationStyle.slice(1);
    
    citationBtn.addEventListener('click', () => {
        // Cycle to next style
        let currentIndex = styles.indexOf(state.citationStyle);
        let nextIndex = (currentIndex + 1) % styles.length;
        
        state.citationStyle = styles[nextIndex];
        
        // Update button text (capitalize first letter)
        citationBtn.textContent = state.citationStyle.charAt(0).toUpperCase() + state.citationStyle.slice(1);
        
        // Refresh panel to show new citation format
        if (state.selectedVerse) {
            updateCommentaryPanel(state.selectedVerse);
        }
    });


    /**
     * Updates the Structure section button labels to reflect current state.
     * Also shows/hides the superscription button (psalm-specific).
     */
    function updateStructureButtonLabels() {
        const traditionBtn = document.getElementById('tradition-btn');
        const superscriptionBtn = document.getElementById('psalm-superscription-btn');

        if (traditionBtn) {
            traditionBtn.textContent = state.textTradition === 'masoretic'
                ? 'Masoretic'
                : 'Septuagint';
        }

        if (superscriptionBtn) {
            // Show superscription toggle only when viewing Psalms
            superscriptionBtn.style.display = (state.bookId === 'ps') ? '' : 'none';
            superscriptionBtn.textContent = state.showSuperscription
                ? 'With Superscriptions'
                : 'Without Superscriptions';
        }
    }

    /**
     * Restores verse selection after re-render.
     * Finds the verse element matching the canonical reference and selects it.
     */
    function restorePsalmVerseSelection() {
        if (!state.canonicalPsalm || !state.canonicalVerse) return;
        
        // Find the verse element with matching canonical reference
        const verseElements = document.querySelectorAll('.verse[data-canonical-psalm]');
        
        for (const el of verseElements) {
            const elPsalm = parseInt(el.dataset.canonicalPsalm);
            const elVerse = parseInt(el.dataset.canonicalVerse);
            
            if (elPsalm === state.canonicalPsalm && elVerse === state.canonicalVerse) {
                // Found it - simulate selection
                el.classList.add('selected');
                
                // Update display reference using current display settings
                const display = canonicalToDisplay(
                    state.canonicalPsalm,
                    state.canonicalVerse,
                    state.textTradition === 'septuagint' ? 'greek' : 'hebrew',
                    state.showSuperscription
                );
                
                if (display) {
                    const verseRef = `Psalm ${display.psalm}:${display.verse}`;
                    state.selectedVerse = parseInt(el.dataset.fileVerse);
                    state.lastSelectedVerseText = verseRef;
                    elements.display.context.textContent = verseRef;
                }
                
                return;
            }
        }
        
        // Verse not found (might be hidden superscription) - clear selection
        state.selectedVerse = null;
        state.canonicalPsalm = null;
        state.canonicalVerse = null;
        state.lastSelectedVerseText = "Select a verse...";
        elements.display.context.textContent = state.lastSelectedVerseText;
    }

    /**
     * Text tradition toggle handler (global).
     * Switches between Masoretic and Septuagint display for all affected books.
     * Converts the current chapter to the nearest equivalent in the new tradition.
     */
    const traditionBtn = document.getElementById('tradition-btn');

    traditionBtn.addEventListener('click', async () => {
        const oldTradition = state.textTradition;
        const newTradition = oldTradition === 'masoretic' ? 'septuagint' : 'masoretic';

        // Convert current chapter to the equivalent in the new tradition
        if (state.bookId === 'ps') {
            const oldSys = oldTradition === 'septuagint' ? 'greek' : 'hebrew';
            const newSys = newTradition === 'septuagint' ? 'greek' : 'hebrew';
            state.chapter = convertDisplayPsalm(state.chapter, oldSys, newSys);
            elements.pickers.chapter.value = state.chapter;
            syncChapterPickerDisplay();
        } else if (hasStructureVariant(state.bookId)) {
            state.chapter = convertChapter(state.bookId, state.chapter, oldTradition, newTradition);
            elements.pickers.chapter.value = state.chapter;
            syncChapterPickerDisplay();
        }

        // Update state
        state.textTradition = newTradition;

        // Update button text
        updateStructureButtonLabels();

        // Re-render the current chapter
        if (state.bookId === 'ps') {
            await loadChapterText();
            restorePsalmVerseSelection();
        } else if (hasStructureVariant(state.bookId)) {
            await loadChapterText();
        }
    });

    /**
     * Superscription toggle handler.
     * Shows or hides psalm superscriptions (Psalms only).
     */
    const superscriptionBtn = document.getElementById('psalm-superscription-btn');

    superscriptionBtn.addEventListener('click', async () => {
        // Toggle superscription visibility
        state.showSuperscription = !state.showSuperscription;

        // Update button text
        updateStructureButtonLabels();

        // Re-render if we're in Psalms
        if (state.bookId === 'ps') {
            await loadChapterText();
            restorePsalmVerseSelection();
        }
    });

    // Set initial structure button labels
    updateStructureButtonLabels();


    /* =========================================================================
     * SECTION 10: INITIALIZATION
     * =========================================================================
     * Application startup sequence.
     */

    /**
     * Initializes the application.
     * 
     * Load order:
     * 1. Commentary catalog (needed for filters)
     * 2. Translation list
     * 3. Translation metadata
     * 4. Book list (which triggers chapter list ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ chapter text)
     */
    async function init() {
        await loadCatalog();
        loadTranslationList();
        loadMetadata(state.translationId);
        loadBookList();
    }

    // Start the app!
    init();

});