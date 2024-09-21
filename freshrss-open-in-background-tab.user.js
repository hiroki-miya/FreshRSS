// ==UserScript==
// @name        FreshRSS Open in Background Tab
// @namespace   https://github.com/hiroki-miya
// @version     1.0.0
// @description Open the selected link in a new background tab
// @author      hiroki-miya
// @match       https://freshrss.example.net
// @grant       GM_openInTab
// ==/UserScript==

(function() {
    'use strict';

    // Shortcut key setting
    const shortcutKey = ';';

    // Function to execute when the shortcut key is pressed
    function handleShortcut(event) {
        if (event.key === shortcutKey) {
            const activeLink = document.querySelector('.current .item.titleAuthorSummaryDate a[href^="http"]');
            if (activeLink) {
                GM_openInTab(activeLink.href);
            }
        }
    }

    // Add event listener for the shortcut key
    document.addEventListener('keydown', handleShortcut);
})();
