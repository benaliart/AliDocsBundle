document.addEventListener('keydown', function (event) {
    // Vérifie si CTRL (ou CMD sur Mac) + S est pressé
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault(); // Empêche l'ouverture de la fenêtre de sauvegarde

        // Soumettre le formulaire
        const form = document.getElementById('edit_form');
        if (form) {
            form.submit();
        }

    }
});

/**
 * SIDEBAR SYNCHRONISATION
 * Highlights the current page in the sidebar menu and opens the folders containing it.
 * Runs after every navigation : full page load, Turbo visit and "content" frame navigation
 * (sidebar links, previous / next links, internal links of the documentation...).
 *
 * Folders are opened by setting the Bootstrap classes directly, so it works
 * whichever Bootstrap JS is loaded (the bundle one or the application one).
 */

// Decoded pathname without trailing slash, to compare urls safely (accents, spaces...)
function aliDocsNormalizePath(url) {
    if (!url) {
        return null;
    }
    try {
        return decodeURIComponent(new URL(url, window.location.origin).pathname).replace(/\/+$/, '');
    } catch (e) {
        return url;
    }
}

function aliDocsExpandFolder(collapse) {
    collapse.classList.add('show');

    const button = document.querySelector('[data-bs-target="#' + collapse.id + '"]');
    if (button) {
        button.classList.remove('collapsed');
        button.setAttribute('aria-expanded', 'true');
    }
}

function updateActiveLink() {
    const menu = document.getElementById('menu');
    if (!menu) {
        return;
    }

    const current = aliDocsNormalizePath(window.location.href);
    let activeLink = null;

    // Active file link : exact match on the view url or the admin (edit) url
    menu.querySelectorAll('a.file_element').forEach(link => {
        const isActive = current === aliDocsNormalizePath(link.getAttribute('href'))
            || current === aliDocsNormalizePath(link.dataset.adminUrl);

        link.classList.toggle('active', isActive);
        if (isActive) {
            link.setAttribute('aria-current', 'page');
            activeLink = link;
        } else {
            link.removeAttribute('aria-current');
        }
    });

    // Folders : "current" when its index is displayed, "active" when it contains the current page
    let currentFolder = null;
    menu.querySelectorAll('.dir_element').forEach(folder => {
        const url = aliDocsNormalizePath(folder.dataset.url);
        const adminUrl = aliDocsNormalizePath(folder.dataset.adminUrl);
        const isCurrent = current === url;
        const isActive = isCurrent
            || (url && current.startsWith(url + '/'))
            || (adminUrl && current.startsWith(adminUrl + '/'));

        folder.classList.toggle('active', !!isActive);
        folder.classList.toggle('current', isCurrent);

        const folderLink = folder.querySelector('.ali-docs-nav-folder-link');
        if (folderLink) {
            isCurrent ? folderLink.setAttribute('aria-current', 'page') : folderLink.removeAttribute('aria-current');
        }
        if (isCurrent) {
            currentFolder = folder;
        }
    });

    // Folder index : open the folder itself
    if (currentFolder && currentFolder.nextElementSibling && currentFolder.nextElementSibling.classList.contains('accordion-collapse')) {
        aliDocsExpandFolder(currentFolder.nextElementSibling);
    }

    const target = activeLink || currentFolder;
    if (target) {
        // Open every folder containing the current page / folder
        let element = target.parentElement;
        while (element && element !== menu) {
            if (element.classList.contains('accordion-collapse')) {
                aliDocsExpandFolder(element);
            }
            element = element.parentElement;
        }

        target.scrollIntoView({ block: 'nearest' });
    }
}

// Small screens : close the sidebar panel (offcanvas) after a navigation
function aliDocsCloseSidebar() {
    const sidebar = document.getElementById('ali-docs-sidebar');
    if (sidebar && sidebar.classList.contains('show')) {
        const closeButton = sidebar.querySelector('[data-bs-dismiss="offcanvas"]');
        if (closeButton) {
            closeButton.click();
        }
    }
}

document.addEventListener('DOMContentLoaded', updateActiveLink);
document.addEventListener('turbo:load', updateActiveLink);
// Frame navigation : wait for Turbo to update the browser url
document.addEventListener('turbo:frame-load', () => setTimeout(() => {
    updateActiveLink();
    aliDocsCloseSidebar();
}, 0));

// A frame navigation returned a page without the "content" frame (error page, 404...) :
// display the whole page instead of silently ignoring the click
document.addEventListener('turbo:frame-missing', (event) => {
    if (event.target.id !== 'content') {
        return;
    }
    event.preventDefault();
    event.detail.visit(event.detail.response);
});

// Turbo progress bar (full page visits) : displayed after 150ms instead of 500ms
document.addEventListener('turbo:load', () => {
    if (!window.Turbo) {
        return;
    }
    if (window.Turbo.config && window.Turbo.config.drive) {
        window.Turbo.config.drive.progressBarDelay = 150;
    } else if (typeof window.Turbo.setProgressBarDelay === 'function') {
        window.Turbo.setProgressBarDelay(150);
    }
}, { once: true });
