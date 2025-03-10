// ==UserScript==
// @name         Stage1 Local Time Replacer
// @name:zh-CN   Stage1本地时间替换
// @namespace    user-NITOUCHE
// @version      1.3.1
// @description  Replace and overwrite China Standard Time with local time on Stage1 forums.
// @description:zh-CN 用本地时间替换覆盖Stage1论坛中的中国时间。
// @author       DS泥头车
// @match        https://*.saraba1st.com/2b/*
// @icon         https://bbs.saraba1st.com/favicon.ico
// @grant        GM_addStyle
// @license      MIT
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    GM_addStyle(`
        .s1-local-time {
            font: inherit !important;
        }
        .s1-local-time.blue-replaced {
            color: #000000 !important;
        }
        .s1-local-time.orange-replaced {
            color: #F26C4F !important;
        }
    `);
    let isProcessing = false;
    function getElementColor(el) {
        const color = window.getComputedStyle(el).color;
        const rgb = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
        if (rgb) {
            return (parseInt(rgb[1]) << 16) | (parseInt(rgb[2]) << 8) | parseInt(rgb[3]);
        }
        return null;
    }
    function convertBeijingToLocal(beijingTime) {
        try {
            const date = new Date(beijingTime + '+08:00');
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).replace(/(\d+)\/(\d+)\/(\d+)/, '$1-$2-$3');
        } catch(e) {
            return beijingTime;
        }
    }
    function processElement(el) {
        if (el.dataset.timeReplaced || el.querySelector('[data-time-replaced]')) return;
        let processed = false;
        const timeRegex = /(\d{4}-\d{1,2}-\d{1,2} \d{1,2}:\d{1,2})/;
        const treeWalker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
        let textNode;
        while (textNode = treeWalker.nextNode()) {
            if (textNode.textContent.trim() && timeRegex.test(textNode.textContent)) {
                const match = textNode.textContent.match(timeRegex);
                if (!match) continue;
                const originalColor = getElementColor(textNode.parentElement);
                let colorClass = '';
                if (originalColor === 0xF26C4F) {
                    colorClass = 'orange-replaced';
                } else if (originalColor === 0x022C80 || originalColor === 0x22c || originalColor === 0x999999) {
                    colorClass = 'blue-replaced';
                }
                const timeSpan = document.createElement('span');
                timeSpan.className = `s1-local-time ${colorClass}`.trim();
                timeSpan.textContent = convertBeijingToLocal(match[0]);
                timeSpan.dataset.timeReplaced = "true";
                const beforeTimeText = document.createTextNode(textNode.textContent.substring(0, match.index));
                const afterTimeText = document.createTextNode(textNode.textContent.substring(match.index + match[0].length));
                const parentNode = textNode.parentNode;
                parentNode.replaceChild(timeSpan, textNode);
                if (afterTimeText.textContent) {
                    timeSpan.parentNode.insertBefore(afterTimeText, timeSpan.nextSibling);
                }
                if (beforeTimeText.textContent) {
                    timeSpan.parentNode.insertBefore(beforeTimeText, timeSpan);
                }
                processed = true;
                break;
            }
        }
        if (processed) {
            el.dataset.timeReplaced = "true";
        }
    }
    function processAll() {
        if (isProcessing) return;
        isProcessing = true;
        document.querySelectorAll(`
            em[id^="authorposton"],
            i.pstatus,
            cite,
            td.by em span,
            a[href*="forum.php?mod=redirect"],
            div.quote font,
            div.blockquote font,
            blockquote font,
            a[href*="forum.php?mod=misc"],
            ul#pbbs li,
            table td,
            span.xg1.xw0,
            p span,
            li.bbda span.xg1
        `).forEach(processElement);
        isProcessing = false;
    }
    processAll();
    new MutationObserver(mutations => {
        mutations.forEach(mut => {
            if (mut.type === 'childList') {
                mut.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        processAll();
                    }
                });
            }
        });
    }).observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false
    });
})();