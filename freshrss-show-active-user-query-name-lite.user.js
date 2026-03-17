// ==UserScript==
// @name         FreshRSS - show active user query name lite
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Set current userQuery name to display on left button
// @match        https://freshrss.example.net/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const BADGE_ID = 'tm-user-query-badge';
  let lastRenderedText = '';

  function getCurrentParams() {
    const url = new URL(location.href);
    return {
      search: url.searchParams.get('search') || '',
      get: url.searchParams.get('get') || '',
      state: url.searchParams.get('state') || '',
      order: url.searchParams.get('order') || '',
    };
  }

  function findSettingsAnchor() {
    return (
      document.querySelector('#ql-label-buttons')
    );
  }

  function findUserQueryMenuLinks() {
    const toggle = document.querySelector('a[href="#dropdown-query"]');
    if (!toggle) return [];

    let menu = toggle.nextElementSibling;
    while (menu) {
      if (menu.matches?.('ul.dropdown-menu, .dropdown-menu')) break;
      menu = menu.nextElementSibling;
    }
    if (!menu) return [];

    return Array.from(menu.querySelectorAll('a[href*="search="]')).map((a) => {
      const u = new URL(a.href, location.origin);
      return {
        name: a.textContent.trim(),
        search: u.searchParams.get('search') || '',
        get: u.searchParams.get('get') || '',
        state: u.searchParams.get('state') || '',
        order: u.searchParams.get('order') || '',
      };
    });
  }

  function pickActiveUserQueryName() {
    const current = getCurrentParams();
    const links = findUserQueryMenuLinks();

    const hit = links.find((link) =>
      link.search === current.search &&
      link.get === current.get &&
      link.state === current.state &&
      link.order === current.order
    );

    return hit ? hit.name : null;
  }

  function fallbackQueryNameFromSearch() {
    const searchValue = new URL(location.href).searchParams.get('search') || '';
    if (!searchValue) return null;

    const decoded = decodeURIComponent(searchValue).trim();
    const m = decoded.match(/(?:^|\s)labels:([^\s]+)/);
    return m?.[1] || decoded || null;
  }

  function ensureBadge() {
    let badge = document.getElementById(BADGE_ID);
    if (badge) return badge;

    badge = document.createElement('div');
    badge.id = BADGE_ID;
    badge.style.display= 'inline-flex';
    badge.style.padding = '3px 10px';
    badge.style.borderRadius = '5px';
    badge.style.fontSize = '12px';
    badge.style.border = '1px solid gray';
    badge.style.background = '#c2ccd6';
    badge.style.whiteSpace = 'nowrap';
    badge.style.position = 'absolute';
    badge.style.top= '3px';
    badge.style.right = '72px';
    badge.style.lineHeight = '1.5';
    return badge;
  }

  function render() {
    const settingsAnchor = findSettingsAnchor();
    const old = document.getElementById(BADGE_ID);

    if (!settingsAnchor || !settingsAnchor.parentElement) return;

    const finalName = pickActiveUserQueryName() || fallbackQueryNameFromSearch();

    if (!finalName) {
      if (old) old.remove();
      lastRenderedText = '';
      return;
    }

    const text = `クエリ: ${finalName}`;
    const badge = ensureBadge();

    if (lastRenderedText !== text) {
      badge.textContent = text;
      badge.title = text;
      lastRenderedText = text;
    }

    if (badge.parentElement !== settingsAnchor.parentElement) {
      settingsAnchor.parentElement.insertBefore(badge, settingsAnchor);
    }
  }

  function hookHistory(type) {
    const original = history[type];
    history[type] = function (...args) {
      const result = original.apply(this, args);
      setTimeout(render, 50);
      return result;
    };
  }

  render();
  hookHistory('pushState');
  hookHistory('replaceState');
  window.addEventListener('popstate', render);
  window.addEventListener('load', render);
  setTimeout(render, 300);
})();