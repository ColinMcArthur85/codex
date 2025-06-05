/*
 * script.js
 * Generic boilerplate for project JavaScript.
 * Add your code below.
 */

'use strict';

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileCoursesButton = document.getElementById('mobile-courses-button');
    const mobileCoursesDropdown = document.getElementById('mobile-courses-dropdown');

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    if (mobileCoursesButton && mobileCoursesDropdown) {
        mobileCoursesButton.addEventListener('click', () => {
            mobileCoursesDropdown.classList.toggle('hidden');
        });
    }
});

