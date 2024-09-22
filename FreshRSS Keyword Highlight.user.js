// ==UserScript==
// @name        FreshRSS Keyword Highlight
// @namespace   https://github.com/hiroki-miya
// @version     1.0.0
// @description Highlight articles in FreshRSS that match the rule. Rules are described by regular expressions.
// @author      hiroki-miya
// @license     MIT
// @match       https://freshrss.example.net
// @grant       GM_addStyle
// @grant       GM_getValue
// @grant       GM_registerMenuCommand
// @grant       GM_setValue
// @run-at      document-idle
// @downloadURL https://update.greasyfork.org/scripts/509728/FreshRSS%20Keyword%20Highlight.user.js
// @updateURL https://update.greasyfork.org/scripts/509728/FreshRSS%20Keyword%20Highlight.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // Language for sorting
    const sortLocal = 'ja';

    // Highlight Color
    const highlightColor = '#ffff60';

    // Retrieve saved highlights
    let savedHighlights = GM_getValue('highlights', {});

    // Define editingHighlightName globally (the name of the highlight currently being edited)
    let editingHighlightName = null;

    // Add styles
    GM_addStyle(`
        #freshrss-keyword-highlight {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            background-color: white;
            border: 1px solid black;
            padding: 10px;
        }
        #freshrss-keyword-highlight > h2 {
            box-shadow: inset 0 0 0 0.5px black;
            padding: 5px 10px;
            text-align: center;
        }
        #freshrss-keyword-highlight > h4 {
            margin-top: 0;
        }
        .highlight-item,
        #highlight-edit > div {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
        }
        .highlight-name,
        #highlight-edit > div > label {
            flex-grow: 1;
            margin-right: 10px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .edit-highlight, .delete-highlight,
        #highlight-edit > div > input {
            margin-left: 5px;
        }
    `);

    // Function to render the highlight list
    function updateHighlightList() {
        // Sort highlights
        const highlightNames = Object.keys(savedHighlights).sort((a, b) => a.localeCompare(b, sortLocal));
        const highlightList = highlightNames.map(name => {
            return `
                <div class="highlight-item">
                    <div class="highlight-name">${name}</div>
                    <button class="edit-highlight" data-name="${name}">Edit</button>
                    <button class="delete-highlight" data-name="${name}">Delete</button>
                </div>
            `;
        }).join('');

        // Render the highlight list
        document.getElementById('highlight-list').innerHTML = highlightList || 'No registered highlight rules';

        // Re-register the highlight edit button events
        Array.from(document.querySelectorAll('.edit-highlight')).forEach(button => {
            button.addEventListener('click', () => {
                const highlightName = button.getAttribute('data-name');
                const highlight = savedHighlights[highlightName];

                // Pre-fill the form with the highlight values
                document.getElementById('highlight-name').value = highlightName;
                document.getElementById('highlight-title').value = highlight.title;
                document.getElementById('highlight-url').value = highlight.url;
                document.getElementById('highlight-summary').value = highlight.summary;

                editingHighlightName = highlightName;

                // Update the form heading for editing
                document.querySelector('#highlight-edit-title').innerText = 'Edit Existing Highlight Rule';
                document.querySelector('#fkh-save').innerText = 'Update';
            });
        });

        // Re-register the highlight delete button events
        Array.from(document.querySelectorAll('.delete-highlight')).forEach(button => {
            button.addEventListener('click', () => {
                const highlightName = button.getAttribute('data-name');
                delete savedHighlights[highlightName];
                GM_setValue('highlights', savedHighlights);
                updateHighlightList();
                applyAllHighlights();
            });
        });
    }

    // Display highlight settings
    function showHighlightSettings() {
        const settingsHTML = `
            <h2>Keyword Highlight Rule Settings</h2>
            <h4>Saved Highlight Rules</h4>
            <div id="highlight-list"></div>
            <br>
            <hr>
            <h4 id="highlight-edit-title">Create New Highlight Rule</h4>
            <div id="highlight-edit">
            <div><label>Highlight Name</label><input type="text" id="highlight-name"></div>
            <div><label>Title (Regex)</label><input type="text" id="highlight-title"></div>
            <div><label>URL (Regex)</label><input type="text" id="highlight-url"></div>
            <div><label>Summary (Regex)</label><input type="text" id="highlight-summary"></div>
            <br>
            </div>
            <button id="fkh-save">Save</button>
            <button id="fkh-clear">Clear</button>
            <button id="fkh-close">Close</button>
        `;

        const settingsDiv = document.createElement('div');
        settingsDiv.id = 'freshrss-keyword-highlight';
        settingsDiv.innerHTML = settingsHTML;
        document.body.appendChild(settingsDiv);

        // Initial render of saved highlight list
        updateHighlightList();

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

        // Save or update highlight button event
        document.getElementById('fkh-save').addEventListener('click', () => {
            const highlightName = document.getElementById('highlight-name').value;
            const highlightTitle = document.getElementById('highlight-title').value;
            const highlightUrl = document.getElementById('highlight-url').value;
            const highlightSummary = document.getElementById('highlight-summary').value;

            if (!highlightName) {
                alert('Please enter a highlight name');
                return;
            }

            // Save or update the highlight
            savedHighlights[highlightName] = {
                title: highlightTitle,
                url: highlightUrl,
                summary: highlightSummary
            };

            // If the highlight name was changed during editing, delete the old highlight
            if (editingHighlightName && editingHighlightName !== highlightName) {
                delete savedHighlights[editingHighlightName];
            }

            GM_setValue('highlights', savedHighlights);

            // ツールチップを表示
            showTooltip('Saved');

            // Clear text boxes and reset editingHighlightName
            document.getElementById('highlight-name').value = '';
            document.getElementById('highlight-title').value = '';
            document.getElementById('highlight-url').value = '';
            document.getElementById('highlight-summary').value = '';
            editingHighlightName = null;

            // Update highlight list
            updateHighlightList();

            // Apply highlights immediately after saving
            applyAllHighlights();
        });

        // Clear button event
        document.getElementById('fkh-clear').addEventListener('click', () => {
            editingHighlightName = null;
            document.getElementById('highlight-name').value = '';
            document.getElementById('highlight-title').value = '';
            document.getElementById('highlight-url').value = '';
            document.getElementById('highlight-summary').value = '';

            // Update the form heading for creating a new highlight
            document.querySelector('#highlight-edit-title').innerText = 'Create New Highlight Rule';
            document.querySelector('#fkh-save').innerText = 'Save';
        });

        // Close button event
        document.getElementById('fkh-close').addEventListener('click', () => {
            document.body.removeChild(settingsDiv);
        });
    }

    // Register highlight settings menu
    GM_registerMenuCommand('Settings', showHighlightSettings);

    // Apply all highlights automatically
    function applyAllHighlights() {
        const articles = Array.from(document.querySelectorAll('#stream > .flux'));

        articles.forEach(article => {
            const title = article.querySelector('a.item-element.title')?.innerText || '';
            const url = article.querySelector('a.item-element.title')?.href || '';
            const summary = article.querySelector('.summary')?.innerText || '';

            let matchesAnyHighlight = false;

            // Check all saved highlights
            for (let highlightName in savedHighlights) {
                const highlight = savedHighlights[highlightName];
                const titleMatch = !highlight.title || new RegExp(highlight.title, 'i').test(title);
                const urlMatch = !highlight.url || new RegExp(highlight.url, 'i').test(url);
                const summaryMatch = !highlight.summary || new RegExp(highlight.summary, 'i').test(summary);

                // Check if all highlight conditions are met (AND condition)
                if (titleMatch && urlMatch && summaryMatch) {
                    matchesAnyHighlight = true;
                    break;
                }
            }

            // Add ng class to articles matching the highlight
            if (matchesAnyHighlight) {
                article.classList.add('highlight');
                article.style.backgroundColor = highlightColor;
            }
        });
    }

    // Setup MutationObserver
    function setupObserver() {
        const targetNode = document.querySelector('#stream');
        if (targetNode) {
            const observer = new MutationObserver(applyAllHighlights);
            observer.observe(targetNode, { childList: true, subtree: true });
            // Initial highlight application
            applyAllHighlights();
        } else {
            // Retry if #stream is not found
            setTimeout(setupObserver, 1000);
        }
    }

    // Start setupObserver when the script starts
    setupObserver();
})();
