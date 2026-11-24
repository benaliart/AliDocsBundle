/**
 * AliDocsBundle - Markdown editor of the edit page
 *
 * The page content stays plain Markdown in a textarea (never converted) :
 * - 3 displays : "Write / Preview" (side by side, live preview), "Write", "Preview"
 * - click in the preview : the cursor goes to the same text in the Markdown
 * - toolbar : the buttons insert the Markdown syntax around the selection (Ctrl + Z works),
 *   headings menu, table grid, link modal (address or page of the documentation)
 * - media files : navigation between the folders, upload (button, drag and drop, paste), insertion
 * - lists continued on Enter, Tab / Shift + Tab to indent, Ctrl + B / I / K
 * - warning before leaving the page with unsaved changes
 */
(function () {
    'use strict';

    const INDENT = '    ';
    // List markers : "- ", "* ", "+ ", "1. ", "1) ", "- [ ] "
    const LIST_PATTERN = /^([-*+]\s+(\[[ xX]\]\s+)?|\d+[.)]\s+)/;
    const MODE_STORAGE_KEY = 'aliDocsEditorMode';
    const PREVIEW_DELAY = 400;

    // Elements of the Markdown updated by the toolbar when the cursor is inside them
    const BOLD_PATTERN = /\*\*([^\n]+?)\*\*/;
    const ITALIC_PATTERNS = [/(?<![*\w])\*(?!\*)([^*\n]+?)\*(?!\*)/, /(?<![_\w])_(?!_)([^_\n]+?)_(?![_\w])/];
    const CODE_PATTERN = /`([^`\n]+)`/;
    const LINK_PATTERN = /(?<!!)\[([^\]\n]*)\]\(([^)\n]*)\)/;
    const IMAGE_PATTERN = /!\[([^\]\n]*)\]\(([^)\n]*)\)/;
    const HTML_IMAGE_PATTERN = /<img\b[^>]*>/;
    const VIDEO_PATTERN = /<video\b[\s\S]*?<\/video>/;
    const BOX_PATTERN = /:::(\w+)\s+([\s\S]+?)\s*:::/;
    const CODE_BLOCK_PATTERN = /^(`{3,}|~{3,})[^\n]*\n([\s\S]*?)\n?^\1[ \t]*$/m;
    const MEDIA_EXTENSIONS = /\.(pdf|jpe?g|png|gif|webp|mp4|webm)([?#].*)?$/i;

    // Text and attribute values (quotes included)
    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function escapeRegExp(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Comparison without case and accents (search of the pages)
    function normalize(text) {
        return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    }

    // Saved display : browser storage can be unavailable (private window...)
    function readStoredMode() {
        try {
            return window.localStorage.getItem(MODE_STORAGE_KEY);
        } catch (e) {
            return null;
        }
    }

    function storeMode(mode) {
        try {
            window.localStorage.setItem(MODE_STORAGE_KEY, mode);
        } catch (e) {
            // Not saved : the default display is used next time
        }
    }

    function setup(root) {
        if (root.dataset.ready) {
            return;
        }
        root.dataset.ready = '1';

        const textarea = root.querySelector('textarea');
        const preview = root.querySelector('.ali-docs-editor-preview');
        const modeButtons = [...root.querySelectorAll('[data-editor-mode]')];
        const form = textarea.form;
        const i18n = JSON.parse(root.dataset.i18n || '{}');
        const scroller = document.querySelector('.ali-docs-content');

        /* ------------------------------------------------------------------
           Text changes
           ------------------------------------------------------------------ */

        // Replaces a part of the text, then selects [selectStart, selectEnd]
        function replaceRange(start, end, text, selectStart, selectEnd) {
            if ('preview' === mode) {
                setMode('write');
            }
            textarea.focus();
            textarea.setSelectionRange(start, end);

            // execCommand keeps the native undo (Ctrl + Z) ; setRangeText otherwise
            let done = false;
            try {
                done = document.execCommand('insertText', false, text);
            } catch (e) {
                done = false;
            }
            if (!done || textarea.value.substring(start, start + text.length) !== text) {
                textarea.setRangeText(text, start, end, 'end');
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }

            const from = selectStart ?? start + text.length;
            textarea.setSelectionRange(from, selectEnd ?? from);
        }

        // Bold, italic, code : around the selection (or a placeholder), removed if already there
        function wrap(before, after, placeholder) {
            const { selectionStart: start, selectionEnd: end, value } = textarea;
            const selected = value.slice(start, end);

            if (value.slice(start - before.length, start) === before && value.slice(end, end + after.length) === after) {
                replaceRange(start - before.length, end + after.length, selected, start - before.length, end - before.length);
                return;
            }

            // No selection : the word of the cursor, otherwise a placeholder
            const word = selected ? null : wordAt(start);
            if (word) {
                const text = value.slice(word[0], word[1]);
                replaceRange(word[0], word[1], before + text + after, word[0] + before.length, word[0] + before.length + text.length);
                return;
            }

            const text = selected || placeholder;
            replaceRange(start, end, before + text + after, start + before.length, start + before.length + text.length);
        }

        // Word containing the position [start, end], null if the position is not in a word
        function wordAt(position) {
            const value = textarea.value;
            const isWordCharacter = character => undefined !== character && /[\p{L}\p{N}'’-]/u.test(character);
            let start = position;
            let end = position;
            while (start > 0 && isWordCharacter(value[start - 1])) {
                start--;
            }
            while (end < value.length && isWordCharacter(value[end])) {
                end++;
            }
            return start < end ? [start, end] : null;
        }

        // No selection : the paragraph of the cursor (lines until the empty lines) is selected, false if the line is empty
        function selectParagraph() {
            const { selectionStart: start, selectionEnd: end, value } = textarea;
            if (start !== end) {
                return true;
            }
            const lines = value.split('\n');
            const index = value.slice(0, start).split('\n').length - 1;
            if ('' === lines[index].trim()) {
                return false;
            }
            let first = index;
            while (first > 0 && '' !== lines[first - 1].trim()) {
                first--;
            }
            let last = index;
            while (last < lines.length - 1 && '' !== lines[last + 1].trim()) {
                last++;
            }
            const paragraphStart = lines.slice(0, first).join('\n').length + (first > 0 ? 1 : 0);
            textarea.setSelectionRange(paragraphStart, paragraphStart + lines.slice(first, last + 1).join('\n').length);
            return true;
        }

        // Lines of the selection : start and end positions in the text
        function selectedLines() {
            const { selectionStart: start, selectionEnd: end, value } = textarea;
            const lineStart = value.lastIndexOf('\n', start - 1) + 1;
            // Selection ending at the beginning of a line : this line is not included
            const last = end > start && '\n' === value[end - 1] ? end - 1 : end;
            let lineEnd = value.indexOf('\n', last);
            if (-1 === lineEnd) {
                lineEnd = value.length;
            }

            return { lineStart, lineEnd, lines: value.slice(lineStart, lineEnd).split('\n') };
        }

        /**
         * Element of the text containing the cursor / the selection (regex match), null if none
         * from, to : part of the text searched (default : all the text)
         */
        function enclosing(pattern, from, to) {
            const { selectionStart: start, selectionEnd: end, value } = textarea;
            const offset = from ?? 0;
            const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';

            for (const match of value.slice(offset, to ?? value.length).matchAll(new RegExp(pattern.source, flags))) {
                const matchStart = offset + match.index;
                const matchEnd = matchStart + match[0].length;
                if (matchStart > end) {
                    break;
                }
                // Cursor : strictly inside the element. Selection : inside or equal to the element
                const inside = start === end ? matchStart < start && start < matchEnd : matchStart <= start && end <= matchEnd;
                if (inside) {
                    return { match, start: matchStart, end: matchEnd };
                }
            }

            return null;
        }

        // Inline elements (link, bold...) : searched in the lines of the selection only
        function enclosingInLines(pattern) {
            const { lineStart, lineEnd } = selectedLines();
            return enclosing(pattern, lineStart, lineEnd);
        }

        // Bold, italic, code : removed when the cursor is inside, added otherwise
        function toggleInline(patterns, marker, placeholder) {
            for (const pattern of patterns) {
                const found = enclosingInLines(pattern);
                if (found) {
                    const text = found.match[1];
                    replaceRange(found.start, found.end, text, found.start, found.start + text.length);
                    return;
                }
            }
            wrap(marker, marker, placeholder);
        }

        // Box : same type => box removed (content kept), other type => type changed, no box => new box
        function toggleBox(type) {
            const found = enclosing(BOX_PATTERN);
            if (!found) {
                insertBox(type);
                return;
            }

            const [, current, content] = found.match;
            if (current === type) {
                replaceRange(found.start, found.end, content, found.start, found.start + content.length);
                return;
            }

            const { selectionStart: start, selectionEnd: end } = textarea;
            const shift = type.length - current.length;
            replaceRange(found.start + 3, found.start + 3 + current.length, type, start + shift, end + shift);
        }

        // Code block : fences removed when the cursor is inside, new block otherwise
        function toggleCodeBlock() {
            const found = enclosing(CODE_BLOCK_PATTERN);
            if (found) {
                const code = found.match[2];
                replaceRange(found.start, found.end, code, found.start, found.start + code.length);
                return;
            }
            selectParagraph();
            const { selectionStart: start, selectionEnd: end, value } = textarea;
            const code = value.slice(start, end) || i18n.text;
            insertBlock('```\n' + code + '\n```', 4, code.length);
        }

        // Headings, lists, quotes : prefix of each selected line, removed if all the lines have it
        function prefixLines(prefix, isPrefixed, strip) {
            const { lineStart, lineEnd, lines } = selectedLines();
            const filled = lines.filter(line => '' !== line.trim());
            const remove = filled.length > 0 && filled.every(line => isPrefixed.test(line));

            let index = 0;
            const result = lines.map(line => {
                // Empty lines of a multi-line selection are kept as is
                if (lines.length > 1 && '' === line.trim()) {
                    return line;
                }
                const bare = line.replace(strip, '');
                return remove ? bare : prefix(index++) + bare;
            }).join('\n');

            if (1 === lines.length) {
                replaceRange(lineStart, lineEnd, result);
            } else {
                replaceRange(lineStart, lineEnd, result, lineStart, lineStart + result.length);
            }
        }

        // Code block, table, boxes, videos : on their own lines, with an empty line before and after
        function insertBlock(text, selectFrom, selectLength) {
            const { selectionStart: start, selectionEnd: end, value } = textarea;
            const before = value.slice(0, start);
            const after = value.slice(end);

            let prefix = '';
            if ('' !== before && !before.endsWith('\n\n')) {
                prefix = before.endsWith('\n') ? '\n' : '\n\n';
            }
            let suffix = '\n';
            if (after.startsWith('\n\n')) {
                suffix = '';
            } else if ('' !== after) {
                suffix = after.startsWith('\n') ? '\n' : '\n\n';
            }

            const from = start + prefix.length + (selectFrom ?? text.length);
            replaceRange(start, end, prefix + text + suffix, from, from + (selectLength ?? 0));
        }

        function insertBox(type) {
            // Cursor in a paragraph : the paragraph goes in the box
            selectParagraph();
            const { selectionStart: start, selectionEnd: end, value } = textarea;
            const text = value.slice(start, end).trim() || i18n.text;
            const opening = ':::' + type + '\n';
            insertBlock(opening + text + '\n:::', opening.length, text.length);
        }

        /**
         * Table containing the cursor : lines of the table, cells, alignment of the columns, null if none
         */
        function currentTable() {
            const { selectionStart: cursor, value } = textarea;
            const isTableLine = line => /^\s*\|.*\|\s*$/.test(line);
            const lines = value.split('\n');

            // Line of the cursor
            let index = value.slice(0, cursor).split('\n').length - 1;
            if (!isTableLine(lines[index] || '')) {
                return null;
            }
            let first = index;
            while (first > 0 && isTableLine(lines[first - 1])) {
                first--;
            }
            let last = index;
            while (last < lines.length - 1 && isTableLine(lines[last + 1])) {
                last++;
            }

            // Second line : separator (| --- | :---: |)
            const cells = line => line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '').split(/(?<!\\)\|/).map(cell => cell.trim());
            if (last - first < 1 || !/^\s*\|?\s*:?-{3,}/.test(lines[first + 1])) {
                return null;
            }

            const start = lines.slice(0, first).join('\n').length + (first > 0 ? 1 : 0);
            const end = start + lines.slice(first, last + 1).join('\n').length;
            const rows = [lines[first], ...lines.slice(first + 2, last + 1)].map(cells);

            return { start, end, rows, aligns: cells(lines[first + 1]), cols: Math.max(...rows.map(row => row.length)) };
        }

        // Table containing the cursor : new size, the content of the cells is kept
        async function resizeTable(table, cols, rows) {
            const lost = table.rows.some((row, rowIndex) => row.some((cell, colIndex) => '' !== cell && (colIndex >= cols || rowIndex >= rows)));
            if (lost && !await window.aliDocsConfirm({ title: i18n.resizeTable, message: i18n.tableLoss, confirmLabel: i18n.resize })) {
                return;
            }

            const line = cells => '| ' + cells.join(' | ') + ' |';
            const result = [];
            for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
                const row = table.rows[rowIndex] || [];
                result.push(line(Array.from({ length: cols }, (_, colIndex) => row[colIndex] ?? (0 === rowIndex ? i18n.column + ' ' + (colIndex + 1) : ''))));
                if (0 === rowIndex) {
                    result.push(line(Array.from({ length: cols }, (_, colIndex) => table.aligns[colIndex] || '---')));
                }
            }

            const text = result.join('\n');
            replaceRange(table.start, table.end, text, table.start + 2, table.start + 2);
        }

        // Table : cols columns, rows lines (header line included)
        function insertTable(cols, rows) {
            const columns = Array.from({ length: cols }, (_, index) => i18n.column + ' ' + (index + 1));
            const lines = [
                '| ' + columns.join(' | ') + ' |',
                '| ' + Array(cols).fill('---').join(' | ') + ' |',
            ];
            for (let row = 1; row < rows; row++) {
                lines.push('| ' + Array(cols).fill(i18n.cell).join(' | ') + ' |');
            }
            insertBlock(lines.join('\n'), 2, columns[0].length);
        }

        const listStrip = new RegExp(LIST_PATTERN.source);
        const actions = {
            'bold': () => toggleInline([BOLD_PATTERN], '**', i18n.text),
            'italic': () => toggleInline(ITALIC_PATTERNS, '*', i18n.text),
            'code': () => toggleInline([CODE_PATTERN], '`', i18n.text),
            'ul': () => prefixLines(() => '- ', /^[-*+]\s+(?!\[[ xX]\])/, listStrip),
            'ol': () => prefixLines(index => (index + 1) + '. ', /^\d+[.)]\s+/, listStrip),
            'task': () => prefixLines(() => '- [ ] ', /^[-*+]\s+\[[ xX]\]\s+/, listStrip),
            'quote': () => prefixLines(() => '> ', /^>/, /^>\s?/),
            'link': () => openLinkModal(),
            'codeblock': toggleCodeBlock,
            'box-tip': () => toggleBox('tip'),
            'box-info': () => toggleBox('info'),
            'box-warning': () => toggleBox('warning'),
            'box-danger': () => toggleBox('danger'),
        };

        // Headings : "heading-0" = paragraph (prefix removed), "heading-1" to "heading-5"
        for (let level = 0; level <= 5; level++) {
            actions['heading-' + level] = 0 === level
                ? () => prefixLines(() => '', /(?!)/, /^#{1,6}\s+/)
                : () => prefixLines(() => '#'.repeat(level) + ' ', new RegExp('^#{' + level + '} '), /^#{1,6}\s+/);
        }

        root.querySelectorAll('[data-md-action]').forEach(button => {
            button.addEventListener('click', () => {
                const action = actions[button.dataset.mdAction];
                if (action) {
                    action();
                }
            });
        });

        /* ------------------------------------------------------------------
           Table grid : size chosen with the mouse or the keyboard
           ------------------------------------------------------------------ */
        const picker = root.querySelector('[data-table-picker]');
        if (picker) {
            const cells = [...picker.querySelectorAll('[data-cols]')];
            const sizeLabel = picker.querySelector('[data-table-size]');
            // Cursor in a table when the grid is opened : the grid resizes this table
            let table = null;
            const highlight = (cols, rows) => {
                cells.forEach(cell => cell.classList.toggle('active', +cell.dataset.cols <= cols && +cell.dataset.rows <= rows));
                const title = table ? i18n.resizeTable : i18n.table;
                sizeLabel.textContent = cols ? (table ? title + ' : ' : '') + cols + ' × ' + rows : title;
            };
            const currentSize = () => (table ? highlight(table.cols, table.rows.length) : highlight(0, 0));

            picker.parentElement.addEventListener('show.bs.dropdown', () => {
                table = currentTable();
                currentSize();
            });
            cells.forEach(cell => {
                const cols = +cell.dataset.cols;
                const rows = +cell.dataset.rows;
                cell.addEventListener('mouseenter', () => highlight(cols, rows));
                cell.addEventListener('focus', () => highlight(cols, rows));
                cell.addEventListener('click', () => (table ? resizeTable(table, cols, rows) : insertTable(cols, rows)));
            });
            picker.addEventListener('mouseleave', currentSize);
        }

        /* ------------------------------------------------------------------
           Keyboard
           ------------------------------------------------------------------ */

        // Enter in a list : next item ("- ", "2. ", "- [ ] ", "> "), empty item : end of the list
        function continueList(event) {
            const { selectionStart: start, selectionEnd: end, value } = textarea;
            if (start !== end) {
                return;
            }

            const lineStart = value.lastIndexOf('\n', start - 1) + 1;
            const line = value.slice(lineStart, start);
            const match = line.match(/^(\s*)([-*+]\s+\[[ xX]\]\s+|[-*+]\s+|(\d+)([.)])\s+|>\s?)/);
            if (!match) {
                return;
            }

            event.preventDefault();
            const [marker, indent] = match;

            // Empty item : the marker is removed
            if (line === marker) {
                replaceRange(lineStart, start, indent);
                return;
            }

            let next = match[2];
            if (match[3]) {
                next = (parseInt(match[3], 10) + 1) + match[4] + ' ';
            } else if (/\[[ xX]\]/.test(next)) {
                next = next.replace(/\[[ xX]\]/, '[ ]');
            }
            replaceRange(start, start, '\n' + indent + next);
        }

        // Tab / Shift + Tab : indentation of the selected lines (nested lists)
        function indentLines(outdent) {
            const { selectionStart: start, selectionEnd: end } = textarea;
            const { lineStart, lineEnd, lines } = selectedLines();

            if (!outdent && start === end && 1 === lines.length && !LIST_PATTERN.test(lines[0].trim())) {
                replaceRange(start, end, INDENT);
                return;
            }

            const result = lines.map(line => outdent ? line.replace(/^( {1,4}|\t)/, '') : INDENT + line).join('\n');
            replaceRange(lineStart, lineEnd, result, lineStart, lineStart + result.length);
        }

        textarea.addEventListener('keydown', event => {
            if (event.isComposing) {
                return;
            }

            const ctrl = event.ctrlKey || event.metaKey;
            const key = event.key.toLowerCase();

            if (ctrl && !event.shiftKey && !event.altKey && ['b', 'i', 'k'].includes(key)) {
                event.preventDefault();
                ({ b: actions.bold, i: actions.italic, k: actions.link })[key]();
            } else if ('Tab' === event.key && !ctrl && !event.altKey) {
                event.preventDefault();
                indentLines(event.shiftKey);
            } else if ('Enter' === event.key && !ctrl && !event.shiftKey && !event.altKey) {
                continueList(event);
            }
        });

        /* ------------------------------------------------------------------
           Height : in "Write", the textarea grows with its content (the page scrolls, the toolbar stays visible).
           Side by side : fixed height, each panel scrolls
           ------------------------------------------------------------------ */
        function autoResize() {
            if ('write' !== mode) {
                textarea.style.height = '';
                return;
            }
            const scrollTop = scroller ? scroller.scrollTop : 0;
            textarea.style.height = 'auto';
            textarea.style.height = (textarea.scrollHeight + 2) + 'px';
            if (scroller) {
                scroller.scrollTop = scrollTop;
            }
        }
        textarea.addEventListener('input', autoResize);
        window.addEventListener('resize', autoResize);

        /* ------------------------------------------------------------------
           Displays : "split" (side by side, large screens only), "write", "preview"
           ------------------------------------------------------------------ */
        const wideScreen = window.matchMedia('(min-width: 1200px)');
        let mode = 'write';
        let wantedMode = readStoredMode() || 'split';

        function setMode(requested, remember) {
            wantedMode = requested;
            if (remember) {
                storeMode(requested);
            }

            const textHeight = textarea.offsetHeight;
            mode = 'split' === requested && !wideScreen.matches ? 'write' : requested;
            modeButtons.forEach(button => {
                const active = button.dataset.editorMode === mode;
                button.classList.toggle('active', active);
                button.setAttribute('aria-pressed', active ? 'true' : 'false');
            });
            root.classList.toggle('is-split', 'split' === mode);
            root.classList.toggle('is-preview', 'preview' === mode);
            textarea.hidden = 'preview' === mode;
            preview.hidden = 'write' === mode;
            // Preview only : at least the height of the text, no jump of the page
            preview.style.minHeight = 'preview' === mode && textHeight ? textHeight + 'px' : '';

            autoResize();
            if ('write' !== mode) {
                loadPreview();
            }
        }

        modeButtons.forEach(button => button.addEventListener('click', () => {
            setMode(button.dataset.editorMode, true);
            if ('preview' !== mode) {
                textarea.focus({ preventScroll: true });
            }
        }));
        wideScreen.addEventListener('change', () => setMode(wantedMode, false));

        /* ------------------------------------------------------------------
           Preview : rendered by the server (same HTML as the page), live in the side by side display
           ------------------------------------------------------------------ */
        let previewTimer = null;
        let previewRequest = null;
        let renderedContent = null;
        let previewRetried = false;

        async function loadPreview() {
            const content = textarea.value;
            if (content === renderedContent) {
                return;
            }
            if ('' === content.trim()) {
                renderedContent = content;
                preview.innerHTML = '<p class="ali-docs-muted">' + escapeHtml(i18n.emptyPreview) + '</p>';
                return;
            }

            // Previous request still running : cancelled
            if (previewRequest) {
                previewRequest.abort();
            }
            const request = previewRequest = new AbortController();

            if (null === renderedContent) {
                preview.innerHTML = '<p class="ali-docs-muted">' + escapeHtml(i18n.loading) + '</p>';
            }

            const body = new FormData();
            body.append('content', content);
            body.append('path', root.dataset.path);
            body.append('_token', root.dataset.token);

            try {
                const response = await fetch(root.dataset.previewUrl, {
                    method: 'POST',
                    body,
                    headers: { 'X-Requested-With': 'XMLHttpRequest' },
                    signal: request.signal,
                });
                if (!response.ok) {
                    throw new Error(response.status);
                }
                const html = await response.text();

                // HTML cleaned by the server. The scroll position is kept while typing
                const scrollTop = preview.scrollTop;
                preview.innerHTML = html;
                preview.scrollTop = scrollTop;
                renderedContent = content;
                previewRetried = false;
            } catch (e) {
                if ('AbortError' === e.name) {
                    return;
                }
                renderedContent = null;
                // Server busy or network error : tried again once, after 2 seconds
                if (!previewRetried && 'write' !== mode) {
                    previewRetried = true;
                    clearTimeout(previewTimer);
                    previewTimer = setTimeout(loadPreview, 2000);
                    return;
                }
                preview.innerHTML = '<p class="text-danger">' + escapeHtml(i18n.previewError) + '</p>';
            } finally {
                if (previewRequest === request) {
                    previewRequest = null;
                }
            }
        }

        textarea.addEventListener('input', () => {
            if ('split' !== mode) {
                return;
            }
            clearTimeout(previewTimer);
            previewTimer = setTimeout(loadPreview, PREVIEW_DELAY);
        });

        // Side by side : the other panel follows the scroll (same percentage)
        let scrollFollower = null;
        function followScroll(source, target) {
            if ('split' !== mode) {
                return;
            }
            if (scrollFollower === source) {
                scrollFollower = null;
                return;
            }
            const sourceMax = source.scrollHeight - source.clientHeight;
            const top = Math.round((sourceMax > 0 ? source.scrollTop / sourceMax : 0) * (target.scrollHeight - target.clientHeight));
            if (Math.abs(target.scrollTop - top) > 1) {
                scrollFollower = target;
                target.scrollTop = top;
            }
        }
        textarea.addEventListener('scroll', () => followScroll(textarea, preview));
        preview.addEventListener('scroll', () => followScroll(preview, textarea));

        /* ------------------------------------------------------------------
           Click in the preview : the cursor goes to the same text in the Markdown
           (found from the text of the block clicked : approximate)
           ------------------------------------------------------------------ */
        const BLOCKS = 'p, li, h1, h2, h3, h4, h5, h6, td, th, dt, dd, pre, figcaption, summary, blockquote';

        // Text of a block, without its nested lists
        function ownText(block) {
            const clone = block.cloneNode(true);
            clone.querySelectorAll('ul, ol').forEach(list => list.remove());
            return clone.textContent;
        }

        // Position [start, end] of the source of a preview element in the Markdown, null if not found
        function findSource(element) {
            const value = textarea.value;

            // Image / video : file name
            const media = element.closest('img, video');
            if (media) {
                const source = media.matches('video') ? media.querySelector('source') : null;
                const src = (source || media).getAttribute('src') || '';
                const name = decodeURIComponent(src.split(/[?#]/)[0].split('/').pop() || '');
                for (const candidate of [name, name.replace(/ /g, '%20')]) {
                    const index = candidate ? value.indexOf(candidate) : -1;
                    if (-1 !== index) {
                        return [index, index + candidate.length];
                    }
                }
                return null;
            }

            const block = element.closest(BLOCKS);
            if (!block || !preview.contains(block)) {
                return null;
            }
            const words = ownText(block).match(/[\p{L}\p{N}]+/gu) || [];

            // First words of the block, the Markdown syntax can be between them (**, [, ](...)...)
            for (let count = Math.min(6, words.length); count >= 1; count--) {
                const pattern = new RegExp(words.slice(0, count).map(escapeRegExp).join('[^\\p{L}\\p{N}]+'), 'gu');
                const matches = [...value.matchAll(pattern)];
                if (0 === matches.length) {
                    continue;
                }

                // Same text several times : same rank as the block among the blocks starting with this text
                const similar = [...preview.querySelectorAll(BLOCKS)].filter(other => {
                    pattern.lastIndex = 0;
                    return pattern.test(ownText(other).match(/[\p{L}\p{N}]+/gu)?.slice(0, count).join(' ') || '');
                });
                pattern.lastIndex = 0;
                const rank = Math.max(0, similar.indexOf(block));
                const match = matches[Math.min(rank, matches.length - 1)];

                return [match.index, match.index + match[0].length];
            }

            return null;
        }

        // Invisible copy of the textarea : vertical position of a character
        let mirror = null;
        function caretTop(index) {
            if (!mirror) {
                mirror = textarea.cloneNode(false);
                mirror.removeAttribute('id');
                mirror.removeAttribute('name');
                mirror.setAttribute('aria-hidden', 'true');
                mirror.tabIndex = -1;
                Object.assign(mirror.style, { position: 'absolute', top: '0', left: '-9999px', height: '0', visibility: 'hidden', overflow: 'hidden' });
                textarea.parentNode.appendChild(mirror);
            }
            mirror.style.width = textarea.offsetWidth + 'px';
            mirror.value = textarea.value.slice(0, index);

            return mirror.scrollHeight;
        }

        function goToSource(element) {
            const range = findSource(element);
            if (!range) {
                return;
            }
            if ('preview' === mode) {
                setMode('write');
            }

            textarea.focus({ preventScroll: true });
            textarea.setSelectionRange(range[0], range[1]);

            // Line of the text : at one third of the visible height
            const top = caretTop(range[0]);
            if ('split' === mode) {
                scrollFollower = preview;
                textarea.scrollTop = Math.max(0, top - textarea.clientHeight / 3);
            } else if (scroller) {
                const offset = textarea.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
                scroller.scrollTop = Math.max(0, scroller.scrollTop + offset + top - scroller.clientHeight / 3);
            }
        }

        // Side by side : click. Preview only : double click (back to "Write" at this place)
        preview.addEventListener('click', event => {
            // Links of the preview : not followed (the page is being edited)
            if (event.target.closest('a')) {
                event.preventDefault();
            }
            if ('split' === mode && !event.target.closest('input')) {
                goToSource(event.target);
            }
        });
        preview.addEventListener('dblclick', event => {
            if ('preview' === mode) {
                goToSource(event.target);
            }
        });

        /* ------------------------------------------------------------------
           Link : address typed, or page / folder of the documentation
           ------------------------------------------------------------------ */
        const linkModal = document.getElementById('ali-docs-link-modal');
        const linkForm = linkModal ? linkModal.querySelector('[data-link-form]') : null;
        const linkText = linkModal ? linkModal.querySelector('[data-link-text]') : null;
        const linkUrl = linkModal ? linkModal.querySelector('[data-link-url]') : null;
        const linkSearch = linkModal ? linkModal.querySelector('[data-link-search]') : null;
        const linkList = linkModal ? linkModal.querySelector('[data-link-list]') : null;
        const linkSubmit = linkModal ? linkModal.querySelector('[data-link-submit]') : null;
        const linkTitle = linkModal ? linkModal.querySelector('.modal-title') : null;
        const linkRemove = linkModal ? linkModal.querySelector('[data-link-remove]') : null;
        let linkRange = null;
        let pendingLink = null;
        let pages = null;

        function openLinkModal() {
            if (!linkModal) {
                return;
            }
            const { selectionStart: start, selectionEnd: end, value } = textarea;

            // Cursor in a link : the link is updated (text and address), otherwise a new link
            const existing = enclosingInLines(LINK_PATTERN);
            if (existing) {
                linkRange = [existing.start, existing.end];
                linkText.value = existing.match[1];
                linkUrl.value = existing.match[2];
            } else {
                const selected = value.slice(start, end);
                const isUrl = /^(https?:\/\/|mailto:)\S+$/.test(selected);
                linkRange = [start, end];
                linkText.value = isUrl ? '' : selected;
                linkUrl.value = isUrl ? selected : '';
            }
            linkTitle.textContent = existing ? linkTitle.dataset.titleEdit : linkTitle.dataset.titleNew;
            linkSubmit.textContent = existing ? linkSubmit.dataset.labelEdit : linkSubmit.dataset.labelNew;
            linkRemove.hidden = !existing;
            linkSearch.value = '';
            updateLinkSubmit();
            renderPages();
            window.bootstrap.Modal.getOrCreateInstance(linkModal).show();
            loadPages();
        }

        function updateLinkSubmit() {
            linkSubmit.disabled = '' === linkUrl.value.trim();
        }

        async function loadPages() {
            if (pages) {
                return;
            }
            try {
                const response = await fetch(root.dataset.pagesUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
                pages = (await response.json()).items || [];
            } catch (e) {
                pages = [];
            }
            renderPages();
        }

        function renderPages() {
            if (!pages) {
                linkList.innerHTML = '<p class="ali-docs-muted small mb-0">' + escapeHtml(i18n.loading) + '</p>';
                return;
            }

            const search = normalize(linkSearch.value.trim());
            const items = search ? pages.filter(item => normalize(item.name).includes(search)) : pages;
            linkList.innerHTML = '';
            if (0 === items.length) {
                linkList.innerHTML = '<p class="ali-docs-muted small mb-0">' + escapeHtml(i18n.noPages) + '</p>';
                return;
            }

            items.forEach(item => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'ali-docs-link-item' + (linkUrl.value === item.link ? ' active' : '');
                button.style.paddingLeft = (0.75 + (search ? 0 : item.depth * 1.25)) + 'rem';
                button.innerHTML = '<i class="bi ' + ('folder' === item.type ? 'bi-folder2' : 'bi-file-earmark-text') + '"></i>'
                    + '<span class="ali-docs-link-item-name">' + escapeHtml(item.name) + '</span>';
                button.addEventListener('click', () => {
                    linkUrl.value = item.link;
                    if ('' === linkText.value.trim()) {
                        linkText.value = item.name;
                    }
                    updateLinkSubmit();
                    linkList.querySelectorAll('.ali-docs-link-item').forEach(other => other.classList.toggle('active', other === button));
                });
                button.addEventListener('dblclick', () => linkForm.requestSubmit());
                linkList.appendChild(button);
            });
        }

        if (linkModal) {
            linkUrl.addEventListener('input', updateLinkSubmit);
            linkSearch.addEventListener('input', renderPages);
            linkModal.addEventListener('shown.bs.modal', () => (linkText.value ? linkUrl : linkText).focus());

            linkForm.addEventListener('submit', event => {
                event.preventDefault();
                const url = linkUrl.value.trim().replace(/ /g, '%20');
                if ('' === url) {
                    return;
                }
                pendingLink = '[' + (linkText.value.trim() || url) + '](' + url + ')';
                window.bootstrap.Modal.getOrCreateInstance(linkModal).hide();
            });

            // Link removed : its text is kept
            linkRemove.addEventListener('click', () => {
                pendingLink = linkText.value;
                window.bootstrap.Modal.getOrCreateInstance(linkModal).hide();
            });

            // Insertion once the modal is hidden (Bootstrap gives the focus back first)
            linkModal.addEventListener('hidden.bs.modal', () => {
                if (null !== pendingLink && linkRange) {
                    const link = pendingLink;
                    const [start, end] = linkRange;
                    pendingLink = null;
                    setTimeout(() => replaceRange(start, end, link), 0);
                } else {
                    textarea.focus({ preventScroll: true });
                }
            });
        }

        /* ------------------------------------------------------------------
           Media files : navigation between the folders, upload, insertion
           ------------------------------------------------------------------ */
        const modal = document.getElementById('ali-docs-media-modal');
        const mediaList = modal ? modal.querySelector('[data-media-list]') : null;
        const mediaInput = modal ? modal.querySelector('[data-media-input]') : null;
        const dropzone = modal ? modal.querySelector('[data-media-dropzone]') : null;
        const progress = modal ? modal.querySelector('[data-media-progress]') : null;
        const errorsBox = modal ? modal.querySelector('[data-media-errors]') : null;
        const breadcrumbBox = modal ? modal.querySelector('[data-media-breadcrumb]') : null;
        const foldersBox = modal ? modal.querySelector('[data-media-folders]') : null;
        const targetLabel = modal ? modal.querySelector('[data-media-target]') : null;
        // Folder browsed : null = folder of the page
        let mediaFolder = null;
        let pendingInsert = null;

        function insertMedia(files) {
            files.forEach(file => {
                if (file.block || files.length > 1) {
                    insertBlock(file.markdown);
                } else {
                    const { selectionStart: start, selectionEnd: end } = textarea;
                    replaceRange(start, end, file.markdown);
                }
            });
        }

        // Errors of the media files : information window (no "Cancel" button)
        function alertErrors(errors) {
            if (errors.length) {
                window.aliDocsConfirm({ title: i18n.uploadError, items: errors, cancel: false });
            }
        }

        function showErrors(errors) {
            if (!errorsBox) {
                alertErrors(errors);
                return;
            }
            errorsBox.hidden = 0 === errors.length;
            errorsBox.innerHTML = errors.map(error => '<div>' + escapeHtml(error) + '</div>').join('');
        }

        async function loadMedia(folder) {
            if (!mediaList) {
                return;
            }
            const url = new URL(root.dataset.mediaListUrl, window.location.href);
            url.searchParams.set('path', root.dataset.path);
            if (null !== folder) {
                url.searchParams.set('folder', folder);
            }

            try {
                const response = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
                if (!response.ok) {
                    throw new Error(response.status);
                }
                const data = await response.json();
                mediaFolder = data.folder;
                renderFolders(data);
                renderMedia(data.files || []);
            } catch (e) {
                renderMedia([]);
            }
        }

        // Breadcrumb (root > folders) and sub-folders of the folder browsed
        function renderFolders(data) {
            const crumbs = [{ name: i18n.root, path: '' }, ...(data.breadcrumb || [])];
            breadcrumbBox.innerHTML = '';
            crumbs.forEach((crumb, index) => {
                const last = index === crumbs.length - 1;
                const item = document.createElement(last ? 'span' : 'button');
                item.className = 'ali-docs-media-crumb' + (last ? ' current' : '');
                item.innerHTML = (0 === index ? '<i class="bi bi-house-door"></i>' : '') + escapeHtml(crumb.name);
                if (!last) {
                    item.type = 'button';
                    item.addEventListener('click', () => loadMedia(crumb.path));
                }
                if (index > 0) {
                    breadcrumbBox.insertAdjacentHTML('beforeend', '<i class="bi bi-chevron-right ali-docs-media-crumb-separator"></i>');
                }
                breadcrumbBox.appendChild(item);
            });

            foldersBox.innerHTML = '';
            (data.folders || []).forEach(folder => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'ali-docs-media-folder';
                button.innerHTML = '<i class="bi bi-folder2"></i>' + escapeHtml(folder.name);
                button.addEventListener('click', () => loadMedia(folder.path));
                foldersBox.appendChild(button);
            });
            foldersBox.hidden = 0 === (data.folders || []).length;

            targetLabel.textContent = crumbs[crumbs.length - 1].name;
        }

        function renderMedia(files) {
            mediaList.innerHTML = '';
            if (0 === files.length) {
                mediaList.innerHTML = '<p class="ali-docs-muted small mb-0">' + escapeHtml(i18n.noMedia) + '</p>';
                return;
            }

            files.forEach(file => {
                const item = document.createElement('div');
                item.className = 'ali-docs-media-item';

                // Insertion in the page
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'ali-docs-media-pick';
                button.title = file.name;
                const icon = 'video' === file.kind ? 'bi-film' : 'bi-file-earmark-pdf';
                const thumb = 'image' === file.kind
                    ? '<img src="' + escapeHtml(file.url) + '" alt="" loading="lazy">'
                    : '<i class="bi ' + icon + '"></i>';
                button.innerHTML = '<span class="ali-docs-media-thumb">' + thumb + '</span>'
                    + '<span class="ali-docs-media-name">' + escapeHtml(file.name) + '</span>';
                button.addEventListener('click', () => closeModalAndInsert([file]));

                // Deletion of the file
                const remove = document.createElement('button');
                remove.type = 'button';
                remove.className = 'ali-docs-media-delete';
                remove.title = i18n.deleteFile;
                remove.setAttribute('aria-label', i18n.deleteFile + ' ' + file.name);
                remove.innerHTML = '<i class="bi bi-trash3"></i>';
                remove.addEventListener('click', () => deleteMedia(file, item));

                item.append(button, remove);
                mediaList.appendChild(item);
            });
        }

        // Deletion of a media file : confirmation, then a second one if pages use it
        async function deleteMedia(file, item) {
            const confirmed = await window.aliDocsConfirm({
                title: i18n.deleteFile,
                message: i18n.deleteMedia.replace('%name%', file.name),
                confirmLabel: i18n.delete,
            });
            if (!confirmed) {
                return;
            }

            const send = async force => {
                const body = new FormData();
                body.append('_token', root.dataset.token);
                body.append('folder', mediaFolder ?? '');
                body.append('file', file.file);
                if (force) {
                    body.append('force', '1');
                }
                const response = await fetch(root.dataset.mediaDeleteUrl, { method: 'POST', body, headers: { 'X-Requested-With': 'XMLHttpRequest' } });
                if (!response.ok) {
                    throw new Error(response.status);
                }
                return response.json();
            };

            item.classList.add('is-deleting');
            try {
                let result = await send(false);
                if (result.used_in) {
                    // Pages using the file : listed, second confirmation
                    const forced = await window.aliDocsConfirm({
                        title: i18n.deleteFile,
                        message: i18n.mediaUsed.replace('%name%', file.name),
                        items: result.used_in,
                        note: i18n.mediaUsedNote,
                        confirmLabel: i18n.deleteAnyway,
                    });
                    if (!forced) {
                        item.classList.remove('is-deleting');
                        return;
                    }
                    result = await send(true);
                }
                showErrors([]);
                loadMedia(mediaFolder);
            } catch (e) {
                item.classList.remove('is-deleting');
                showErrors([i18n.deleteError]);
            }
        }

        // The insertion is done once the modal is hidden : Bootstrap gives the focus back to the toolbar button
        function closeModalAndInsert(files) {
            pendingInsert = files;
            window.bootstrap.Modal.getOrCreateInstance(modal).hide();
        }

        // Upload in an "assets" folder. inModal : folder browsed, list refreshed. Otherwise : folder of the page, inserted directly
        function upload(fileList, inModal) {
            const files = [...fileList];
            if (0 === files.length) {
                return;
            }

            const body = new FormData();
            files.forEach(file => body.append('files[]', file));
            body.append('path', root.dataset.path);
            body.append('_token', root.dataset.token);
            if (inModal && null !== mediaFolder) {
                body.append('folder', mediaFolder);
            }

            const bar = progress ? progress.querySelector('.progress-bar') : null;
            if (progress && inModal) {
                progress.hidden = false;
                bar.style.width = '0%';
            }
            showErrors([]);
            root.classList.add('is-uploading');

            const request = new XMLHttpRequest();
            request.open('POST', root.dataset.mediaUploadUrl);
            request.responseType = 'json';
            request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            request.upload.addEventListener('progress', event => {
                if (bar && event.lengthComputable) {
                    bar.style.width = Math.round(event.loaded / event.total * 100) + '%';
                }
            });

            const done = (data, failed) => {
                root.classList.remove('is-uploading');
                if (progress) {
                    progress.hidden = true;
                }
                const uploaded = (data && data.files) || [];
                const errors = (data && data.errors) || [];
                if (failed && 0 === errors.length) {
                    errors.push(i18n.uploadError);
                }

                if (inModal) {
                    showErrors(errors);
                    loadMedia(mediaFolder);
                    if (uploaded.length && 0 === errors.length) {
                        closeModalAndInsert(uploaded);
                    }
                } else {
                    if (uploaded.length) {
                        insertMedia(uploaded);
                    }
                    alertErrors(errors);
                }
            };

            request.addEventListener('load', () => done(request.response, request.status >= 400));
            request.addEventListener('error', () => done(null, true));
            request.send(body);
        }

        /**
         * Media of the Markdown containing the cursor (image, video, link to a file) : replaced by the file chosen
         */
        let mediaReplace = null;
        const replaceBox = modal ? modal.querySelector('[data-media-replace]') : null;

        function currentMedia() {
            const srcOf = html => (html.match(/\ssrc\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
            let found = enclosingInLines(IMAGE_PATTERN);
            if (found) {
                return { ...found, kind: 'image', label: found.match[1], src: found.match[2] };
            }
            found = enclosing(VIDEO_PATTERN);
            if (found) {
                return { ...found, kind: 'video', label: '', src: srcOf(found.match[0]) };
            }
            found = enclosingInLines(HTML_IMAGE_PATTERN);
            if (found) {
                return { ...found, kind: 'image', label: '', src: srcOf(found.match[0]) };
            }
            found = enclosingInLines(LINK_PATTERN);
            if (found && MEDIA_EXTENSIONS.test(found.match[2])) {
                return { ...found, kind: 'file', label: found.match[1], src: found.match[2] };
            }
            return null;
        }

        // Documentation folder of a relative media path (ex : ../50__Exports/assets/a.png => 50__Exports), null if unknown
        function folderOfSrc(src) {
            if (!src || /^([a-z][a-z0-9+.-]*:|\/|#)/i.test(src)) {
                return null;
            }
            const segments = root.dataset.path.split('/').slice(0, -1);
            for (const segment of src.split(/[?#]/)[0].split('/')) {
                if ('..' === segment) {
                    if (0 === segments.length) {
                        return null;
                    }
                    segments.pop();
                } else if ('' !== segment && '.' !== segment) {
                    try {
                        segments.push(decodeURIComponent(segment));
                    } catch (e) {
                        segments.push(segment);
                    }
                }
            }
            // File of an "assets" folder, or stored directly in the folder
            const assets = segments.lastIndexOf('assets');
            return (-1 === assets ? segments.slice(0, -1) : segments.slice(0, assets)).join('/');
        }

        // File chosen in place of the media of the cursor : the text of the image / link is kept
        function replaceMedia(target, file) {
            let markdown = file.markdown;
            const path = (markdown.match(/\]\(([^)]*)\)$/) || [])[1];
            if (path && target.label && target.kind === file.kind && 'video' !== file.kind) {
                markdown = ('image' === file.kind ? '!' : '') + '[' + target.label + '](' + path + ')';
            }
            replaceRange(target.start, target.end, markdown, target.start, target.start + markdown.length);
        }

        if (modal) {
            modal.addEventListener('show.bs.modal', () => {
                showErrors([]);
                mediaReplace = currentMedia();
                replaceBox.hidden = !mediaReplace;
                if (mediaReplace) {
                    const name = decodeURIComponent(mediaReplace.src.split(/[?#]/)[0].split('/').pop() || '');
                    replaceBox.textContent = i18n.replaceMedia.replace('%name%', name);
                }
                // Folder of the media replaced, otherwise the last folder browsed (folder of the page the first time)
                const folder = mediaReplace ? folderOfSrc(mediaReplace.src) : null;
                loadMedia(null !== folder ? folder : mediaFolder);
            });
            modal.addEventListener('hidden.bs.modal', () => {
                if (pendingInsert) {
                    const files = pendingInsert;
                    const target = mediaReplace;
                    pendingInsert = null;
                    mediaReplace = null;
                    setTimeout(() => (target && 1 === files.length ? replaceMedia(target, files[0]) : insertMedia(files)), 0);
                }
            });

            mediaInput.addEventListener('change', () => {
                upload(mediaInput.files, true);
                mediaInput.value = '';
            });

            ['dragenter', 'dragover'].forEach(name => dropzone.addEventListener(name, event => {
                event.preventDefault();
                dropzone.classList.add('is-dragover');
            }));
            ['dragleave', 'drop'].forEach(name => dropzone.addEventListener(name, () => dropzone.classList.remove('is-dragover')));
            dropzone.addEventListener('drop', event => {
                event.preventDefault();
                upload(event.dataTransfer.files, true);
            });
        }

        // Files dropped or pasted (screenshot...) in the editor : uploaded and inserted at the cursor
        textarea.addEventListener('dragover', event => {
            if (event.dataTransfer && [...event.dataTransfer.types].includes('Files')) {
                event.preventDefault();
            }
        });
        textarea.addEventListener('drop', event => {
            if (event.dataTransfer && event.dataTransfer.files.length) {
                event.preventDefault();
                textarea.focus();
                upload(event.dataTransfer.files, false);
            }
        });
        textarea.addEventListener('paste', event => {
            const files = event.clipboardData ? [...event.clipboardData.files] : [];
            if (files.length) {
                event.preventDefault();
                upload(files, false);
            }
        });

        /* ------------------------------------------------------------------
           Unsaved changes
           ------------------------------------------------------------------ */
        const snapshot = () => [...form.elements]
            .filter(element => element.name && 'hidden' !== element.type)
            .map(element => element.value)
            .join('\u0000');
        const savedState = snapshot();
        let leaving = false;

        const isDirty = () => root.isConnected && !leaving && snapshot() !== savedState;

        form.addEventListener('submit', () => {
            leaving = true;
        });

        window.addEventListener('beforeunload', event => {
            if (isDirty()) {
                event.preventDefault();
                event.returnValue = '';
            }
        });

        // Links (sidebar, breadcrumb...) : confirmation, the content frame navigation does not unload the page
        document.addEventListener('click', event => {
            const link = event.target.closest('a[href]');
            if (!link || preview.contains(link) || '_blank' === link.target || link.getAttribute('href').startsWith('#') || !isDirty()) {
                return;
            }
            // The click is stopped, then done again once confirmed
            event.preventDefault();
            event.stopImmediatePropagation();
            window.aliDocsConfirm({ message: i18n.unsaved, confirmLabel: i18n.leave }).then(confirmed => {
                if (confirmed) {
                    leaving = true;
                    link.click();
                }
            });
        }, true);

        // Initial display : side by side on large screens (or the last display chosen)
        setMode(wantedMode, false);
    }

    function init() {
        document.querySelectorAll('[data-ali-docs-editor]').forEach(setup);
    }

    if ('loading' === document.readyState) {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    document.addEventListener('turbo:load', init);
    document.addEventListener('turbo:frame-load', init);
})();
