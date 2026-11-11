/**
 * Google Material You 3 Expressive
 * Theme Management (Light / Botanical Sage Dark)
 */

(function () {
  'use strict';

  var transitionTimer = null;

  // Safely get theme from localStorage or system preference
  function getPreferredTheme() {
    try {
      var saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    } catch (e) {
      console.warn('localStorage read error:', e);
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  // Current active theme from DOM attribute or fallback
  function getCurrentTheme() {
    var attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark' || attr === 'light') {
      return attr;
    }
    return getPreferredTheme();
  }

  // Update theme attribute, localStorage, and UI buttons
  function applyTheme(theme, transition) {
    var isDark = theme === 'dark';
    var targetTheme = isDark ? 'dark' : 'light';

    if (transition) {
      document.documentElement.classList.add('theme-transition');
    }

    // Set explicitly to 'dark' or 'light'
    document.documentElement.setAttribute('data-theme', targetTheme);

    // Save to localStorage safely
    try {
      localStorage.setItem('theme', targetTheme);
    } catch (e) {
      console.warn('localStorage write error:', e);
    }

    // Update buttons in DOM
    updateButtons(targetTheme);

    if (transition) {
      window.clearTimeout(transitionTimer);
      transitionTimer = window.setTimeout(function () {
        document.documentElement.classList.remove('theme-transition');
      }, 350);
    }
  }

  function updateButtons(theme) {
    var isDark = theme === 'dark';
    var buttons = document.querySelectorAll('#theme-toggle, .theme-toggle-btn');
    buttons.forEach(function (btn) {
      var icon = btn.querySelector('.theme-toggle-icon') || btn;
      icon.textContent = isDark ? '☀️' : '🌙';
      var label = isDark ? 'Включить светлую тему' : 'Включить тёмную тему';
      btn.setAttribute('title', label);
      btn.setAttribute('aria-label', label);
    });
  }

  // Handle toggle button click
  function onToggleClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    var current = getCurrentTheme();
    var next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next, true);
  }

  // Initial apply right away
  applyTheme(getCurrentTheme(), false);

  // Setup DOM listeners once ready
  function init() {
    // Re-sync buttons after DOM is parsed
    updateButtons(getCurrentTheme());

    var buttons = document.querySelectorAll('#theme-toggle, .theme-toggle-btn');
    buttons.forEach(function (btn) {
      btn.removeEventListener('click', onToggleClick);
      btn.addEventListener('click', onToggleClick);
    });

    // Listen for OS scheme change if user hasn't explicitly set a preference
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
        var hasSaved = false;
        try {
          hasSaved = !!localStorage.getItem('theme');
        } catch (err) {}
        if (!hasSaved) {
          applyTheme(e.matches ? 'dark' : 'light', true);
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
