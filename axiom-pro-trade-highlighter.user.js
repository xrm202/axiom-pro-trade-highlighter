// ==UserScript==
// @name         Axiom Pro Trade - Dev Highlighter
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Highlights new and existing coins from tracked developers on Axiom Pro Trade Pulse tab
// @author       xrm202
// @match        https://axiompro.trade/*
// @match        https://www.axiompro.trade/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Configuration - Edit these values
    const HIGHLIGHT_COLOR = 'rgba(255, 150, 190, 0.90)';
    
    // Default tracked developer wallets (can be modified in UI)
    let trackedDevs = GM_getValue('trackedDevs', [
        // Add Solana wallet addresses here
        // Example: '4zMMUHtyAfcFqkFFAGttnMvMLgvNUucYfNZpVRBEBmP'
    ]);

    // Inject CSS for highlighting
    GM_addStyle(`
        .dev-highlighted {
            background-color: ${HIGHLIGHT_COLOR} !important;
            box-shadow: 0 0 10px rgba(255, 150, 190, 0.5) !important;
            transition: background-color 0.3s ease !important;
        }
        
        .dev-tracker-panel {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(20, 20, 20, 0.95);
            border: 2px solid ${HIGHLIGHT_COLOR};
            border-radius: 8px;
            padding: 15px;
            width: 300px;
            max-height: 400px;
            overflow-y: auto;
            z-index: 10000;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: #fff;
        }
        
        .dev-tracker-header {
            font-weight: bold;
            color: ${HIGHLIGHT_COLOR};
            margin-bottom: 10px;
            border-bottom: 1px solid ${HIGHLIGHT_COLOR};
            padding-bottom: 5px;
        }
        
        .dev-input-group {
            margin-bottom: 10px;
        }
        
        .dev-input-group input {
            width: 100%;
            padding: 5px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid ${HIGHLIGHT_COLOR};
            border-radius: 4px;
            color: #fff;
            margin-bottom: 5px;
            box-sizing: border-box;
        }
        
        .dev-input-group input::placeholder {
            color: rgba(255, 255, 255, 0.5);
        }
        
        .dev-button {
            background: ${HIGHLIGHT_COLOR};
            border: none;
            color: #000;
            padding: 6px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            margin-right: 5px;
            font-size: 11px;
        }
        
        .dev-button:hover {
            opacity: 0.8;
        }
        
        .dev-button-remove {
            background: rgba(255, 150, 190, 0.5);
            color: #fff;
            padding: 3px 8px;
            font-size: 10px;
        }
        
        .dev-list {
            max-height: 200px;
            overflow-y: auto;
        }
        
        .dev-item {
            padding: 5px;
            margin: 3px 0;
            background: rgba(255, 150, 190, 0.1);
            border-left: 3px solid ${HIGHLIGHT_COLOR};
            word-break: break-all;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
    `);

    // Create control panel
    function createControlPanel() {
        const panel = document.createElement('div');
        panel.className = 'dev-tracker-panel';
        panel.innerHTML = `
            <div class="dev-tracker-header">🔍 Dev Tracker</div>
            <div class="dev-input-group">
                <input type="text" id="devWalletInput" placeholder="Enter Solana wallet address...">
                <button class="dev-button" id="addDevBtn">Add Dev</button>
                <button class="dev-button" id="togglePanelBtn" style="float: right;">−</button>
            </div>
            <div class="dev-list" id="devList"></div>
            <div style="margin-top: 10px; font-size: 10px; color: rgba(255, 255, 255, 0.6);">
                Active trackers: <span id="devCount">0</span>
            </div>
        `;
        document.body.appendChild(panel);
        
        // Event listeners
        document.getElementById('addDevBtn').addEventListener('click', addDev);
        document.getElementById('devWalletInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addDev();
        });
        document.getElementById('togglePanelBtn').addEventListener('click', () => {
            const devList = document.getElementById('devList');
            const inputGroup = panel.querySelector('.dev-input-group');
            const isHidden = devList.style.display === 'none';
            devList.style.display = isHidden ? 'block' : 'none';
            inputGroup.style.display = isHidden ? 'block' : 'none';
            document.getElementById('togglePanelBtn').textContent = isHidden ? '−' : '+';
        });
        
        updateDevList();
    }

    // Add developer to tracking list
    function addDev() {
        const input = document.getElementById('devWalletInput');
        const wallet = input.value.trim().toUpperCase();
        
        if (!wallet) return;
        if (!/^[1-9A-HJ-NP-Z]{32,34}$/.test(wallet)) {
            alert('Invalid Solana wallet address');
            return;
        }
        if (trackedDevs.includes(wallet)) {
            alert('This wallet is already tracked');
            return;
        }
        
        trackedDevs.push(wallet);
        GM_setValue('trackedDevs', trackedDevs);
        input.value = '';
        updateDevList();
        highlightPairs();
    }

    // Remove developer from tracking list
    function removeDev(wallet) {
        trackedDevs = trackedDevs.filter(d => d !== wallet);
        GM_setValue('trackedDevs', trackedDevs);
        updateDevList();
        highlightPairs();
    }

    // Update the displayed list
    function updateDevList() {
        const list = document.getElementById('devList');
        const count = document.getElementById('devCount');
        
        if (!list) return;
        
        list.innerHTML = '';
        count.textContent = trackedDevs.length;
        
        trackedDevs.forEach(wallet => {
            const item = document.createElement('div');
            item.className = 'dev-item';
            item.innerHTML = `
                <span>${wallet.substring(0, 8)}...${wallet.substring(-8)}</span>
                <button class="dev-button dev-button-remove" onclick="window.removeDev('${wallet}')">×</button>
            `;
            list.appendChild(item);
        });
    }

    // Make removeDev globally accessible
    window.removeDev = removeDev;

    // Highlight matching pairs
    function highlightPairs() {
        if (trackedDevs.length === 0) return;
        
        // Look for coin rows/elements on the page
        // This targets common trading interface patterns
        const rows = document.querySelectorAll(
            '[data-testid*="pair"], [class*="pair"], [class*="coin"], [class*="row"], tr'
        );
        
        rows.forEach(row => {
            const text = row.textContent.toUpperCase();
            const rowHTML = row.innerHTML.toUpperCase();
            
            // Check if any tracked dev wallet appears in this row
            for (let dev of trackedDevs) {
                if (text.includes(dev) || rowHTML.includes(dev)) {
                    row.classList.add('dev-highlighted');
                    return; // Stop checking once highlighted
                }
            }
            
            // Also check for creator/dev fields that might contain wallet addresses
            const addressElements = row.querySelectorAll('[class*="creator"], [class*="dev"], [class*="address"]');
            for (let el of addressElements) {
                const address = el.textContent.toUpperCase();
                for (let dev of trackedDevs) {
                    if (address.includes(dev)) {
                        row.classList.add('dev-highlighted');
                        return;
                    }
                }
            }
        });
    }

    // Watch for new pairs being added
    function observeNewPairs() {
        const observer = new MutationObserver(() => {
            highlightPairs();
        });
        
        // Observe the main content area
        const mainContent = document.querySelector('[class*="content"], main, [role="main"]') || document.body;
        observer.observe(mainContent, {
            childList: true,
            subtree: true,
            attributes: false
        });
    }

    // Initialize
    window.addEventListener('load', () => {
        setTimeout(() => {
            createControlPanel();
            highlightPairs();
            observeNewPairs();
        }, 1000);
    });

    // Fallback initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                createControlPanel();
                highlightPairs();
                observeNewPairs();
            }, 500);
        });
    } else {
        setTimeout(() => {
            createControlPanel();
            highlightPairs();
            observeNewPairs();
        }, 500);
    }

    console.log('Axiom Pro Trade Dev Highlighter loaded');
})();
