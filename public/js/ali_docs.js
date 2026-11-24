// Edit page : Ctrl (Cmd on Mac) + S saves the page
document.addEventListener('keydown', function (event) {
    if ((event.ctrlKey || event.metaKey) && 's' === event.key.toLowerCase()) {
        const form = document.getElementById('edit_form');
        if (form) {
            // No "save the web page" window of the browser
            event.preventDefault();
            // requestSubmit : validation and submit event (no unsaved changes warning)
            form.requestSubmit();
        }
    }
});

/**
 * EDITION : new page / folder, deletion
 */
// Same modal for a new page and a new folder : the type comes from the menu button
document.addEventListener('show.bs.modal', (event) => {
    if ('ali-docs-create-modal' !== event.target.id) {
        return;
    }
    const type = (event.relatedTarget && event.relatedTarget.dataset.aliDocsCreate) || 'page';
    const modal = event.target;
    const title = modal.querySelector('.modal-title');

    modal.querySelector('input[name="type"]').value = type;
    title.textContent = 'folder' === type ? title.dataset.titleFolder : title.dataset.titlePage;
});
document.addEventListener('shown.bs.modal', (event) => {
    if ('ali-docs-create-modal' === event.target.id) {
        event.target.querySelector('input[name="title"]').focus();
    }
});

/**
 * VIDEOS AND AUDIOS : stopped and unloaded before a navigation
 * A video removed from the page by Turbo keeps loading its file : the next page waits for it.
 * The url is kept in data-ali-docs-src, then restored when a page is displayed (back button : page from the cache)
 */
function aliDocsReleaseMedia() {
    document.querySelectorAll('.ali-docs-content video, .ali-docs-content audio').forEach((media) => {
        media.pause();
        [media, ...media.querySelectorAll('source')].forEach((element) => {
            const src = element.getAttribute('src');
            if (src) {
                element.dataset.aliDocsSrc = src;
                element.removeAttribute('src');
            }
        });
        // No source : the download is stopped
        media.load();
    });
}

function aliDocsRestoreMedia() {
    const medias = new Set();
    document.querySelectorAll('[data-ali-docs-src]').forEach((element) => {
        element.setAttribute('src', element.dataset.aliDocsSrc);
        delete element.dataset.aliDocsSrc;
        medias.add(element.closest('video, audio'));
    });
    medias.forEach((media) => media && media.load());
}

document.addEventListener('turbo:before-fetch-request', (event) => {
    // Prefetch of a link (mouse over) : not a navigation
    const headers = (event.detail.fetchOptions && event.detail.fetchOptions.headers) || {};
    if ('prefetch' === headers['X-Sec-Purpose'] || 'prefetch' === headers['Sec-Purpose']) {
        return;
    }
    aliDocsReleaseMedia();
});
['turbo:load', 'turbo:render', 'turbo:frame-render', 'turbo:fetch-request-error'].forEach((name) => {
    document.addEventListener(name, aliDocsRestoreMedia);
});

/**
 * CONFIRMATION WINDOW (instead of window.confirm / window.alert)
 * aliDocsConfirm({ title, message, items, note, confirmLabel, danger, cancel }) => Promise<boolean>
 * - items : list displayed under the message (ex : pages using a file)
 * - cancel : false => only an "OK" button (information)
 * Displayed in its own modal, or over the modal already open (Bootstrap does not support 2 modals)
 */
window.aliDocsConfirm = function (options) {
    const settings = Object.assign({ title: null, message: '', items: [], note: '', confirmLabel: null, danger: true, cancel: true }, options || {});
    const template = document.getElementById('ali-docs-confirm-template');
    if (!template) {
        return Promise.resolve(settings.cancel ? window.confirm(settings.message) : (window.alert(settings.message), true));
    }

    return new Promise((resolve) => {
        const box = template.content.firstElementChild.cloneNode(true);
        const title = box.querySelector('[data-confirm-title]');
        const ok = box.querySelector('[data-confirm-ok]');
        const list = box.querySelector('[data-confirm-list]');

        if (settings.title) {
            title.textContent = settings.title;
        }
        box.querySelector('[data-confirm-message]').textContent = settings.message;
        box.querySelector('[data-confirm-message]').hidden = '' === settings.message;
        settings.items.forEach((item) => {
            const li = document.createElement('li');
            li.textContent = item;
            list.appendChild(li);
        });
        list.hidden = 0 === settings.items.length;
        box.querySelector('[data-confirm-note]').textContent = settings.note;
        box.querySelector('[data-confirm-note]').hidden = '' === settings.note;
        ok.textContent = settings.confirmLabel || (settings.cancel ? ok.dataset.labelConfirm : ok.dataset.labelOk);
        ok.classList.toggle('ali-docs-btn-danger-solid', settings.cancel && settings.danger);
        if (!settings.cancel) {
            box.querySelectorAll('[data-confirm-cancel]:not(.btn-close)').forEach((button) => button.remove());
        }

        let close;
        const openModalContent = document.querySelector('.modal.show:not(#ali-docs-confirm-modal) .modal-content');

        if (openModalContent) {
            // Over the modal already open
            const overlay = document.createElement('div');
            overlay.className = 'ali-docs-confirm-overlay';
            overlay.appendChild(box);
            openModalContent.appendChild(overlay);
            // Escape : closes the confirmation only, not the modal under it
            overlay.addEventListener('keydown', (event) => {
                if ('Escape' === event.key) {
                    event.stopPropagation();
                    close(false);
                }
            });
            close = (value) => {
                overlay.remove();
                resolve(value);
            };
            ok.focus();
        } else {
            const modalElement = document.getElementById('ali-docs-confirm-modal');
            modalElement.querySelector('.modal-content').replaceChildren(box);
            const modal = window.bootstrap.Modal.getOrCreateInstance(modalElement);
            let result = false;
            close = (value) => {
                result = value;
                modal.hide();
            };
            modalElement.addEventListener('shown.bs.modal', () => ok.focus(), { once: true });
            modalElement.addEventListener('hidden.bs.modal', () => resolve(result), { once: true });
            modal.show();
        }

        ok.addEventListener('click', () => close(true));
        box.querySelectorAll('[data-confirm-cancel]').forEach((button) => button.addEventListener('click', () => close(false)));
    });
};

// Forms with a confirmation message (deletion) : submitted once confirmed
document.addEventListener('submit', (event) => {
    const form = event.target;
    const message = form.dataset ? form.dataset.aliDocsConfirm : null;
    if (!message) {
        return;
    }
    if ('1' === form.dataset.aliDocsConfirmed) {
        delete form.dataset.aliDocsConfirmed;
        return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    window.aliDocsConfirm({ message, confirmLabel: form.dataset.aliDocsConfirmLabel }).then((confirmed) => {
        if (confirmed) {
            form.dataset.aliDocsConfirmed = '1';
            form.requestSubmit();
        }
    });
}, true);

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

/**
 * LINKS TO A SECTION OF ANOTHER PAGE (page.md#my-section)
 * The content frame is loaded with fetch, which never sends the anchor : it is kept on click,
 * then added back to the url and the section is scrolled into view when the page is loaded.
 */
let aliDocsPendingHash = null;

document.addEventListener('click', (event) => {
    const link = event.target.closest('.ali-docs a[href*="#"]');
    if (!link) {
        return;
    }
    const url = new URL(link.href, window.location.href);
    if (url.hash && url.pathname !== window.location.pathname) {
        aliDocsPendingHash = url.hash;
    }
}, true);

// Returns true if the page was scrolled to a section
function aliDocsScrollToHash() {
    const hash = aliDocsPendingHash || window.location.hash;
    aliDocsPendingHash = null;
    if (!hash) {
        return false;
    }
    if (!window.location.hash) {
        history.replaceState(history.state, '', hash);
    }
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (target) {
        target.scrollIntoView();
        return true;
    }
    return false;
}

// New page in the content frame : back to the top (the scrolled container is outside the frame,
// so its scroll position would be kept from the previous page)
function aliDocsScrollToTop() {
    const content = document.querySelector('.ali-docs-content');
    if (content) {
        content.scrollTop = 0;
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

/**
 * TABLE OF CONTENTS ("On this page") : highlights the section currently read
 * (last heading above the top of the content, or the last one at the bottom of the page)
 */
function aliDocsUpdateToc() {
    const toc = document.querySelector('.ali-docs-toc');
    const content = document.querySelector('.ali-docs-content');
    if (!toc || !content) {
        return;
    }

    const links = [...toc.querySelectorAll('a[href^="#"]')];
    const limit = content.getBoundingClientRect().top + 80;
    let current = links[0] || null;

    for (const link of links) {
        const heading = document.getElementById(decodeURIComponent(link.getAttribute('href').slice(1)));
        if (heading && heading.getBoundingClientRect().top <= limit) {
            current = link;
        }
    }
    if (links.length && content.scrollTop + content.clientHeight >= content.scrollHeight - 2 && content.scrollTop > 0) {
        current = links[links.length - 1];
    }

    links.forEach(link => link.classList.toggle('active', link === current));
}

// Scroll of the content (scroll events do not bubble : listened in the capture phase)
let aliDocsTocTicking = false;
document.addEventListener('scroll', (event) => {
    if (aliDocsTocTicking || !event.target.classList || !event.target.classList.contains('ali-docs-content')) {
        return;
    }
    aliDocsTocTicking = true;
    requestAnimationFrame(() => {
        aliDocsTocTicking = false;
        aliDocsUpdateToc();
    });
}, true);

document.addEventListener('DOMContentLoaded', () => {
    updateActiveLink();
    aliDocsUpdateToc();
});
document.addEventListener('turbo:load', () => {
    updateActiveLink();
    aliDocsUpdateToc();
});
// Frame navigation : wait for Turbo to update the browser url
document.addEventListener('turbo:frame-load', () => setTimeout(() => {
    updateActiveLink();
    aliDocsCloseSidebar();
    // Link to a section (page#my-section) : scroll to it, otherwise back to the top of the page
    if (!aliDocsScrollToHash()) {
        aliDocsScrollToTop();
    }
    aliDocsUpdateToc();
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
