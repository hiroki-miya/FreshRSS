// ==UserScript==
// @name        FreshRSS NG Filter
// @namespace   https://github.com/hiroki-miya
// @version     1.0.0
// @description Hides articles matching the rule in FreshRSS. Rules are described by regular expressions.
// @author      hiroki-miya
// @license     MIT
// @match       https://freshrss.example.net
// @grant       GM_addStyle
// @grant       GM_getValue
// @grant       GM_registerMenuCommand
// @grant       GM_setValue
// @run-at      document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Language for sorting
    const sortLocal = 'ja';

    // Retrieve saved filters
    let savedFilters = GM_getValue('filters', {});

    // Define editingFilterName globally (the name of the filter currently being edited)
    let editingFilterName = null;

    // Add styles
    GM_addStyle(`
        #freshrss-ng-filter {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            background-color: white;
            border: 1px solid black;
            padding: 10px;
        }
        #freshrss-ng-filter > h2 {
            box-shadow: inset 0 0 0 0.5px black;
            padding: 5px 10px;
            text-align: center;
        }
        #freshrss-ng-filter > h4 {
            margin-top: 0;
        }
        .filter-item,
        #filter-edit > div {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
        }
        .filter-name,
        #filter-edit > div > label {
            flex-grow: 1;
            margin-right: 10px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .edit-filter, .delete-filter,
        #filter-edit > div > input {
            margin-left: 5px;
        }
    `);

    // Function to render the filter list
    function updateFilterList() {
        // Sort filters
        const filterNames = Object.keys(savedFilters).sort((a, b) => a.localeCompare(b, sortLocal));
        const filterList = filterNames.map(name => {
            return `
                <div class="filter-item">
                    <div class="filter-name">${name}</div>
                    <button class="edit-filter" data-name="${name}">Edit</button>
                    <button class="delete-filter" data-name="${name}">Delete</button>
                </div>
            `;
        }).join('');

        // Render the filter list
        document.getElementById('filter-list').innerHTML = filterList || 'No registered filters';

        // Re-register the filter edit button events
        Array.from(document.querySelectorAll('.edit-filter')).forEach(button => {
            button.addEventListener('click', () => {
                const filterName = button.getAttribute('data-name');
                const filter = savedFilters[filterName];

                // Pre-fill the form with the filter values
                document.getElementById('filter-name').value = filterName;
                document.getElementById('filter-title').value = filter.title;
                document.getElementById('filter-url').value = filter.url;
                document.getElementById('filter-summary').value = filter.summary;

                editingFilterName = filterName;

                // Update the form heading for editing
                document.querySelector('#filter-edit-title').innerText = 'Edit Existing Filter';
                document.querySelector('#fnfs-save').innerText = 'Update';
            });
        });

        // Re-register the filter delete button events
        Array.from(document.querySelectorAll('.delete-filter')).forEach(button => {
            button.addEventListener('click', () => {
                const filterName = button.getAttribute('data-name');
                delete savedFilters[filterName];
                GM_setValue('filters', savedFilters);
                updateFilterList();
                applyAllFilters();
            });
        });
    }

    // Display filter settings
    function showFilterSettings() {
        const settingsHTML = `
            <h2>NG Filter Settings</h2>
            <h4>Saved Filters</h4>
            <div id="filter-list"></div>
            <br>
            <hr>
            <h4 id="filter-edit-title">Create New Filter</h4>
            <div id="filter-edit">
            <div><label>Filter Name</label><input type="text" id="filter-name"></div>
            <div><label>Title (Regex)</label><input type="text" id="filter-title"></div>
            <div><label>URL (Regex)</label><input type="text" id="filter-url"></div>
            <div><label>Summary (Regex)</label><input type="text" id="filter-summary"></div>
            <br>
            </div>
            <button id="fnfs-save">Save</button>
            <button id="fnfs-clear">Clear</button>
            <button id="fnfs-close">Close</button>
        `;

        const settingsDiv = document.createElement('div');
        settingsDiv.id = 'freshrss-ng-filter';
        settingsDiv.innerHTML = settingsHTML;
        document.body.appendChild(settingsDiv);

        // Initial render of saved filter list
        updateFilterList();

        // Function to display the tooltip
        function showTooltip(message) {
            // Create the tooltip element
            const tooltip = document.createElement('div');
            tooltip.textContent = message;
            tooltip.style.position = 'fixed';
            tooltip.style.top = '50%';
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
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

        // Save or update filter button event
        document.getElementById('fnfs-save').addEventListener('click', () => {
            const filterName = document.getElementById('filter-name').value;
            const filterTitle = document.getElementById('filter-title').value;
            const filterUrl = document.getElementById('filter-url').value;
            const filterSummary = document.getElementById('filter-summary').value;

            if (!filterName) {
                alert('Please enter a filter name');
                return;
            }

            // Save or update the filter
            savedFilters[filterName] = {
                title: filterTitle,
                url: filterUrl,
                summary: filterSummary
            };

            // If the filter name was changed during editing, delete the old filter
            if (editingFilterName && editingFilterName !== filterName) {
                delete savedFilters[editingFilterName];
            }

            GM_setValue('filters', savedFilters);

            // ツールチップを表示
            showTooltip('Saved');

            // Clear text boxes and reset editingFilterName
            document.getElementById('filter-name').value = '';
            document.getElementById('filter-title').value = '';
            document.getElementById('filter-url').value = '';
            document.getElementById('filter-summary').value = '';
            editingFilterName = null;

            // Update filter list
            updateFilterList();

            // Apply filters immediately after saving
            applyAllFilters();
        });

        // Clear button event
        document.getElementById('fnfs-clear').addEventListener('click', () => {
            editingFilterName = null;
            document.getElementById('filter-name').value = '';
            document.getElementById('filter-title').value = '';
            document.getElementById('filter-url').value = '';
            document.getElementById('filter-summary').value = '';

            // Update the form heading for creating a new filter
            document.querySelector('#filter-edit-title').innerText = 'Create New Filter';
            document.querySelector('#fnfs-save').innerText = 'Save';
        });

        // Close button event
        document.getElementById('fnfs-close').addEventListener('click', () => {
            document.body.removeChild(settingsDiv);
        });
    }

    // Register filter settings menu
    GM_registerMenuCommand('Settings', showFilterSettings);

    // Apply all filters automatically
    function applyAllFilters() {
        const articles = Array.from(document.querySelectorAll('#stream > .flux'));

        articles.forEach(article => {
            const title = article.querySelector('a.item-element.title')?.innerText || '';
            const url = article.querySelector('a.item-element.title')?.href || '';
            const summary = article.querySelector('.summary')?.innerText || '';

            let matchesAnyFilter = false;

            // Check all saved filters
            for (let filterName in savedFilters) {
                const filter = savedFilters[filterName];
                const titleMatch = !filter.title || new RegExp(filter.title, 'i').test(title);
                const urlMatch = !filter.url || new RegExp(filter.url, 'i').test(url);
                const summaryMatch = !filter.summary || new RegExp(filter.summary, 'i').test(summary);

                // Check if all filter conditions are met (AND condition)
                if (titleMatch && urlMatch && summaryMatch) {
                    matchesAnyFilter = true;
                    break;
                }
            }

            // Add ng class to articles matching the filter
            if (matchesAnyFilter) {
                article.classList.add('ng');
                article.style.display = 'none';
            }
        });
    }

    // Setup MutationObserver
    function setupObserver() {
        const targetNode = document.querySelector('#stream');
        if (targetNode) {
            const observer = new MutationObserver(applyAllFilters);
            observer.observe(targetNode, { childList: true, subtree: true });
            // Initial filter application
            applyAllFilters();
        } else {
            // Retry if #stream is not found
            setTimeout(setupObserver, 1000);
        }
    }

    // Start setupObserver when the script starts
    setupObserver();
})();
