// ==UserScript==
// @name         FormulaCopier
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Copy LaTeX formulas when copying text on Zhihu, Wikipedia and OpenReview.
// @author       Yuhang Chen(github.com/yuhangchen0), Dramwig(github.com/Dramwig)
// @match        https://www.zhihu.com/*
// @match        https://zhuanlan.zhihu.com/p/*
// @match        https://*.wikipedia.org/*
// @match        https://openreview.net/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    document.addEventListener('copy', function(event) {
        let selectedHtml = getSelectionHtml();

        if (window.location.hostname.includes('zhihu.com')) {
            handleZhihu(selectedHtml, event);
        } else if (window.location.hostname.includes('wikipedia.org')) {
            handleWiki(selectedHtml, event);
        } else if (window.location.hostname.includes('openreview.net')) {
            handleOpenReview(selectedHtml, event);
        }
    });

    document.addEventListener('selectionchange', function() {
        let formulaSelector = null;

        if (window.location.hostname.includes('zhihu.com')) {
            formulaSelector = '.ztext-math';
        } else if (window.location.hostname.includes('wikipedia.org')) {
            formulaSelector = '.mwe-math-element';
        } else if (window.location.hostname.includes('openreview.net')) {
            formulaSelector = 'mjx-container';
        }

        const allFormulas = document.querySelectorAll(formulaSelector);
        allFormulas.forEach(removeHighlightStyle);

        const sel = window.getSelection();
        if (!sel.rangeCount) {
            return;
        }

        for (let i = 0; i < sel.rangeCount; i++) {
            const range = sel.getRangeAt(i);
            allFormulas.forEach(formula => {
                if (range.intersectsNode(formula)) {
                    applyHighlightStyle(formula);
                }
            });
        }
    });

    function handleZhihu(selectedHtml, event) {
        if (selectedHtml.includes('data-tex')) {
            const container = document.createElement('div');
            container.innerHTML = selectedHtml;
            replaceZhihuFormulas(container);
            setClipboardData(event, container.textContent);
        }
    }

    function handleWiki(selectedHtml, event) {
        if (selectedHtml.includes('mwe-math-element')) {
            const container = document.createElement('div');
            container.innerHTML = selectedHtml;
            replaceWikipediaFormulas(container);
            setClipboardData(event, container.textContent);
        }
    }

    function handleOpenReview(selectedHtml, event) {
        if (selectedHtml.includes('mjx-container')) {
            const container = document.createElement('div');
            container.innerHTML = selectedHtml;
            replaceOpenReviewFormulas(container);
            setClipboardData(event, container.textContent);
        }
    }

    function applyHighlightStyle(formula) {
        const mathJaxSVG = formula.querySelector('.MathJax_SVG');
        if (mathJaxSVG && mathJaxSVG.style) {
            mathJaxSVG.style.backgroundColor = 'lightblue';
        }

        const mathJaxCHTML = formula.querySelector('mjx-math');
        if (mathJaxCHTML && mathJaxCHTML.style) {
            mathJaxCHTML.style.backgroundColor = 'lightblue';
        }

        if (formula && formula.style) {
            formula.style.backgroundColor = 'lightblue';
        }
    }

    function removeHighlightStyle(formula) {
        const mathJaxSVG = formula.querySelector('.MathJax_SVG');
        if (mathJaxSVG && mathJaxSVG.style) {
            mathJaxSVG.style.backgroundColor = '';
        }

        const mathJaxCHTML = formula.querySelector('mjx-math');
        if (mathJaxCHTML && mathJaxCHTML.style) {
            mathJaxCHTML.style.backgroundColor = '';
        }

        if (formula && formula.style) {
            formula.style.backgroundColor = '';
        }
    }

    function getLatexFromMjxContainer(container) {
        if (!window.MathJax?.startup?.document) return null;

        const counter = container.getAttribute('ctxtmenu_counter');
        const target = counter 
            ? document.querySelector(`mjx-container[ctxtmenu_counter="${counter}"]`) || container
            : container;

        const mathItems = MathJax.startup.document.getMathItemsWithin(target);
        const math = mathItems[0]?.math;
        return typeof math === 'string' ? math.trim() : null;
    }

    function replaceOpenReviewFormulas(container) {
        container.querySelectorAll('mjx-container').forEach(formula => {
            const texCode = getLatexFromMjxContainer(formula);
            if (texCode) {
                formula.replaceWith(document.createTextNode('$' + texCode + '$'));
            }
        });
    }

    function replaceWikipediaFormulas(container) {
        const formulas = container.querySelectorAll('.mwe-math-element');
        formulas.forEach(formula => {
            const annotation = formula.querySelector('annotation[encoding="application/x-tex"]');
            if (annotation) {
                const texCode = annotation.textContent;
                const texNode = document.createTextNode('$' + texCode + '$');
                formula.replaceWith(texNode);
            }
        });
    }

    function replaceZhihuFormulas(container) {
        const formulas = container.querySelectorAll('.ztext-math');
        formulas.forEach(formula => {
            const texCode = formula.getAttribute('data-tex');
            const texNode = document.createTextNode('$' + texCode + '$');
            formula.replaceWith(texNode);
        });
    }

    function setClipboardData(event, text) {
        event.clipboardData.setData('text/plain', text);
        event.preventDefault();
    }

    function convertLineBreaks(node) {
        if (node.nodeName === 'BR') {
            node.parentNode.replaceChild(document.createTextNode('\n'), node);
        } else if (node.nodeName === 'P' && node.nextElementSibling) {
            // Add a newline after the section
            node.appendChild(document.createTextNode('\n\n'));
        } else {
            const children = Array.from(node.childNodes);
            for (let child of children) {
                convertLineBreaks(child);
            }
        }
    }

    function getSelectionHtml() {
        const sel = window.getSelection();
        if (sel.rangeCount) {
            const container = document.createElement('div');
            for (let i = 0, len = sel.rangeCount; i < len; ++i) {
                container.appendChild(sel.getRangeAt(i).cloneContents());
            }

            // Keep newline
            convertLineBreaks(container);
            return container.innerHTML;
        }
        return '';
    }
})();