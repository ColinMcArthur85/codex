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

    const miniMenuLinks = document.querySelectorAll('#mini-menu a');
    const sections = document.querySelectorAll('[data-section]');

    if (miniMenuLinks.length && sections.length) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    miniMenuLinks.forEach(link => {
                        const targetId = link.getAttribute('href').substring(1);
                        if (targetId === entry.target.id) {
                            link.classList.add('active');
                        } else {
                            link.classList.remove('active');
                        }
                    });
                }
            });
        }, { threshold: 0.5 });

        sections.forEach(section => observer.observe(section));
    }
});

