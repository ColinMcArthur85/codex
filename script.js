/*
 * script.js
 * Generic boilerplate for project JavaScript.
 * Add your code below.
 */

'use strict';

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function () {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileCoursesButton = document.getElementById('mobile-courses-button');
    const mobileCoursesDropdown = document.getElementById('mobile-courses-dropdown');

    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    if (mobileCoursesButton) {
        mobileCoursesButton.addEventListener('click', () => {
            mobileCoursesDropdown.classList.toggle('hidden');
        });
    }
});

