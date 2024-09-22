// ==UserScript==
// @name        FreshRSS Duplicate Filter
// @namespace   https://github.com/hiroki-miya
// @version     1.0.1
// @description Mark as read and hide old articles with the same title and URL in the same category in the FreshRSS feed list.
// @author      hiroki-miya
// @license     MIT
// @match       https://freshrss.example.net
// @grant       GM_addStyle
// @grant       GM_getValue
// @grant       GM_registerMenuCommand
// @grant       GM_setValue
// @grant       GM_xmlhttpRequest
// @run-at      document-idle
// @downloadURL https://update.greasyfork.org/scripts/509575/FreshRSS%20Duplicate%20Filter.user.js
// @updateURL https://update.greasyfork.org/scripts/509575/FreshRSS%20Duplicate%20Filter.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // Default settings
    const DEFAULT_CATEGORY_LIST = [];
    const DEFAULT_CHECK_LIMIT = 100;

    // Load saved settings
    let selectedCategories = GM_getValue('selectedCategories', DEFAULT_CATEGORY_LIST);
    let checkLimit = GM_getValue('checkLimit', DEFAULT_CHECK_LIMIT);

    // Add styles
    GM_addStyle(`
        #freshrss-duplicate-filter {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            background-color: white;
            border: 1px solid black;
            padding:10px;
        }
        #freshrss-duplicate-filter > h2 {
            box-shadow: inset 0 0 0 0.5px black;
            padding: 5px 10px;
            text-align: center;
        }
        #freshrss-duplicate-filter > h4 {
            margin-top: 0;
        }
    `);

    // Normalize category name: remove spaces and everything after newlines
    function normalizeCategoryName(categoryName) {
        return categoryName.replace(/[ \r\n].*/g, '');
    }

    // Settings screen
    function showSettings() {
        const categories = Array.from(document.querySelectorAll('.tree-folder.category')).map(cat => normalizeCategoryName(cat.innerText));
        const selected = selectedCategories || [];

        let categoryOptions = categories.map(cat => {
            const checked = selected.includes(cat) ? 'checked' : '';
            return `<label><input type="checkbox" value="${cat}" ${checked}> ${cat}</label>`;
        }).join('');

        const limitInput = `<label>Check Limit: <input type="number" id="checkLimit" value="${checkLimit}" min="1"></label>`;

        const settingsHTML = `
                <h2>Duplicate Filter Settings</h2>
                <h4>Select Categories</h4>
                ${categoryOptions}
                ${limitInput}
                <br>
                <button id="fdfs-save">Save</button>
                <button id="fdfs-close">Close</button>
        `;

        const settingsDiv = document.createElement('div');
        settingsDiv.id = "freshrss-duplicate-filter";
        settingsDiv.innerHTML = settingsHTML;
        document.body.appendChild(settingsDiv);

        // Function to display the tooltip
        function showTooltip(message) {
            // Create the tooltip element
            const tooltip = document.createElement('div');
            tooltip.textContent = message;
            tooltip.style.position = 'fixed';
            tooltip.style.top = '50%';
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            tooltip.style.color = 'white';
            tooltip.style.padding = '10px 20px';
            tooltip.style.borderRadius = '5px';
            tooltip.style.zIndex = '10000';
            tooltip.style.fontSize = '16px';
            tooltip.style.textAlign = 'center';

            // Add the tooltip to the page
            document.body.appendChild(tooltip);

            // Automatically remove the tooltip after 1 second
            setTimeout(() => {
                document.body.removeChild(tooltip);
            }, 1000);
        }

        // Save button event
        document.getElementById('fdfs-save').addEventListener('click', () => {
            const selectedCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(el => el.value);
            const newLimit = parseInt(document.getElementById('checkLimit').value, 10);

            GM_setValue('selectedCategories', selectedCheckboxes);
            GM_setValue('checkLimit', newLimit);

            // Show tooltip instead of alert
            showTooltip('Saved');

            // Mark duplicates as read after saving
            markDuplicatesAsRead();
        });

        // Close button event
        document.getElementById('fdfs-close').addEventListener('click', () => {
            document.body.removeChild(settingsDiv);
        });
    }

    // Register settings screen
    GM_registerMenuCommand('Settings', showSettings);

    // Mark as read and hide articles
    function markAsDuplicate(articleElement) {
        if (!articleElement) return;
        mark_read(articleElement, true, true);
        articleElement.remove();
    }

    // Check for duplicate articles and mark older ones as read
    function markDuplicatesAsRead() {
        const articles = Array.from(document.querySelectorAll('#stream > .flux:not(:has(.duplicate))'));
        const articleMap = new Map();

        articles.slice(-checkLimit).forEach(article => {
            const titleElement = article.querySelector('a.item-element.title');
            if (!titleElement) return;

            const title = titleElement.innerText;
            const url = titleElement.href;
            const timeElement = article.querySelector('.date > time');
            if (!timeElement) return;

            const articleData = { element: article, timestamp: new Date(timeElement.datetime).getTime() };

            // Duplicate check
            if (articleMap.has(title)) {
                const existingArticle = articleMap.get(title);
                if (existingArticle.url === url) {
                    const older = existingArticle.timestamp <= articleData.timestamp ? existingArticle : articleData;

                    // Mark older articles as duplicates
                    markAsDuplicate(older.element);
                }
            } else {
                articleMap.set(title, { ...articleData, url });
            }
        });
    }

    // Get the current category
    function getCurrentCategory() {
        const categoryElement = document.querySelector('.category.active > a > span.title');
        return categoryElement ? normalizeCategoryName(categoryElement.innerText) : null;
    }

    // Setup MutationObserver
    function setupObserver() {
        const targetNode = document.querySelector('#stream');
        if (targetNode) {
            const observer = new MutationObserver(() => {
                const currentCategory = getCurrentCategory();
                if (currentCategory && selectedCategories.includes(currentCategory)) {
                    markDuplicatesAsRead();
                }
            });
            observer.observe(targetNode, { childList: true, subtree: true });

            // Initial run
            const currentCategory = getCurrentCategory();
            if (currentCategory && selectedCategories.includes(currentCategory)) {
                markDuplicatesAsRead();
            }
        } else {
            // Retry if #stream is not found
            setTimeout(setupObserver, 1000);
        }
    }

    // Start setupObserver when the script starts
    setupObserver();
})();
