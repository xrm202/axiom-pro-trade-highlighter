// ==UserScript==
// @name         Axiom Pro Trade - Dev Highlighter
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Highlights ALL coins from tracked developer addresses on Axiom Pro Trade Pulse tab
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

    // Configuration
    const HIGHLIGHT_COLOR = 'rgba(255, 150, 190, 0.90)';
    
    // Load tracked developer wallets
    let trackedDevs = GM_getValue('trackedDevs', []);

    // Inject CSS for highlighting
    GM_addStyle(`
        .dev-highlighted {
            background-color: ${HIGHLIGHT_COLOR} !important;
            box-shadow: 0 0 15px rgba(255, 150, 190, 0.6), inset 0 0 10px rgba(255, 150, 190, 0.3) !important;
            border: 2px solid rgba(255, 150, 190, 0.8) !important;
            transition: all 0.3s ease !important;
        }
        
        .dev-tracker-panel {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(15, 15, 15, 0.97);
            border: 2px solid ${HIGHLIGHT_COLOR};
            border-radius: 10px;
            padding: 15px;
            width: 320px;
            max-height: 450px;
            z-index: 10000;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: #fff;
            box-shadow: 0 0 20px rgba(255, 150, 190, 0.4);
        }
        
        .dev-tracker-header {
            font-weight: bold;
            color: ${HIGHLIGHT_COLOR};
            margin-bottom: 10px;
            border-bottom: 2px solid ${HIGHLIGHT_COLOR};
            padding-bottom: 8px;
            font-size: 14px;
        }
        
        .dev-input-group {
            margin-bottom: 12px;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        
        .dev-input-group input {
            width: 100%;
            padding: 8px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid ${HIGHLIGHT_COLOR};
            border-radius: 4px;
            color: #fff;
            box-sizing: border-box;
            font-size: 11px;
        }
        
        .dev-input-group input::placeholder {
            color: rgba(255, 255, 255, 0.4);
        }
        
        .dev-input-group input:focus {
            outline: none;
            background: rgba(255, 255, 255, 0.12);
            border-color: rgba(255, 150, 190, 1);
            box-shadow: 0 0 5px rgba(255, 150, 190, 0.3);
        }
        
        .dev-button-group {
            display: flex;
            gap: 5px;
            width: 100%;
        }
        
        .dev-button {
            flex: 1;
            background: ${HIGHLIGHT_COLOR};
            border: none;
            color: #000;
            padding: 7px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            font-size: 11px;
            transition: all 0.2s ease;
        }
        
        .dev-button:hover {
            opacity: 0.85;
            transform: scale(1.02);
        }
        
        .dev-button:active {
            transform: scale(0.98);
        }
        
        .dev-button-toggle {
            flex: 0 0 auto;
            padding: 7px 12px;
        }
        
        .dev-list {
            max-height: 250px;
            overflow-y: auto;
            margin-bottom: 10px;
            padding-right: 3px;
        }
        
        .dev-list::-webkit-scrollbar {
            width: 6px;
        }
        
        .dev-list::-webkit-scrollbar-track {
            background: rgba(255, 150, 190, 0.1);
            border-radius: 3px;
        }
        
        .dev-list::-webkit-scrollbar-thumb {
            background: rgba(255, 150, 190, 0.5);
            border-radius: 3px;
        }
        
        .dev-list::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 150, 190, 0.7);
        }
        
        .dev-item {
            padding: 7px 8px;
            margin: 4px 0;
            background: rgba(255, 150, 190, 0.08);
            border-left: 3px solid ${HIGHLIGHT_COLOR};
            word-break: break-all;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
            border-radius: 3px;
        }
        
        .dev-item-address {
            flex: 1;
            font-size: 10px;
            font-family: monospace;
        }
        
        .dev-item-remove {
            background: rgba(255, 150, 190, 0.6);
            color: #fff;
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
            transition: all 0.2s ease;
            flex-shrink: 0;
        }
        
        .dev-item-remove:hover {
            background: rgba(255, 150, 190, 0.9);
        }
        
        .dev-stats {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid rgba(255, 150, 190, 0.3);
            font-size: 10px;
            color: rgba(255, 255, 255, 0.7);
        }
        
        .dev-stats-item {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
        }
        
        .dev-collapsed .dev-list,
        .dev-collapsed .dev-button-group,
        .dev-collapsed .dev-stats {
            display: none;
        }
    `);

    // Create control panel
    function createControlPanel() {
        if (document.getElementById('devTrackerPanel')) return;
        
        const panel = document.createElement('div');
        panel.id = 'devTrackerPanel';
        panel.className = 'dev-tracker-panel';
        panel.innerHTML = `
            <div class="dev-tracker-header">🎯 DEV TRACKER</div>
            <div class="dev-input-group">
                <input type="text" id="devWalletInput" placeholder="Paste Solana dev wallet address...">
                <div class="dev-button-group">
                    <button class="dev-button" id="addDevBtn">Add Dev</button>
                    <button class="dev-button dev-button-toggle" id="togglePanelBtn" title="Collapse/Expand">−</button>
                </div>
            </div>
            <div class="dev-list" id="devList"></div>
            <div class="dev-stats">
                <div class="dev-stats-item">
                    <span>Tracked Devs:</span>
                    <span id="devCount" style="color: ${HIGHLIGHT_COLOR}; font-weight: bold;">0</span>
                </div>
                <div class="dev-stats-item">
                    <span>Highlighted Coins:</span>
                    <span id="coinCount" style="color: ${HIGHLIGHT_COLOR}; font-weight: bold;">0</span>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
        
        // Event listeners
        document.getElementById('addDevBtn').addEventListener('click', addDev);
        document.getElementById('devWalletInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addDev();
        });
        document.getElementById('togglePanelBtn').addEventListener('click', togglePanel);
        
        updateDevList();
    }

    // Toggle panel collapse
    function togglePanel() {
        const panel = document.getElementById('devTrackerPanel');
        const btn = document.getElementById('togglePanelBtn');
        panel.classList.toggle('dev-collapsed');
        btn.textContent = panel.classList.contains('dev-collapsed') ? '+' : '−';
    }

    // Add developer to tracking list
    function addDev() {
        const input = document.getElementById('devWalletInput');
        const wallet = input.value.trim().toUpperCase();
        
        if (!wallet) {
            alert('Please paste a wallet address');
            return;
        }
        
        // Validate Solana wallet format (32-34 chars, base58)
        if (!/^[1-9A-HJ-NP-Z]{32,34}$/.test(wallet)) {
            alert('Invalid Solana wallet format.\nMust be 32-34 characters (base58).');
            return;
        }
        
        if (trackedDevs.includes(wallet)) {
            alert('This wallet is already being tracked');
            return;
        }
        
        trackedDevs.push(wallet);
        GM_setValue('trackedDevs', trackedDevs);
        input.value = '';
        input.focus();
        updateDevList();
        highlightAllCoins();
        console.log(`Added dev: ${wallet}`);
    }

    // Remove developer from tracking list
    function removeDev(wallet) {
        trackedDevs = trackedDevs.filter(d => d !== wallet);
        GM_setValue('trackedDevs', trackedDevs);
        updateDevList();
        highlightAllCoins();
        console.log(`Removed dev: ${wallet}`);
    }

    // Update the displayed list
    function updateDevList() {
        const list = document.getElementById('devList');
        const count = document.getElementById('devCount');
        
        if (!list || !count) return;
        
        list.innerHTML = '';
        count.textContent = trackedDevs.length;
        
        if (trackedDevs.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.4); padding: 20px 0; font-size: 11px;">No devs tracked yet</div>';
            return;
        }
        
        trackedDevs.forEach(wallet => {
            const item = document.createElement('div');
            item.className = 'dev-item';
            const shortWallet = wallet.substring(0, 6) + '...' + wallet.substring(-6);
            item.innerHTML = `
                <span class="dev-item-address" title="${wallet}">${shortWallet}</span>
                <button class="dev-item-remove" onclick="window.removeDev('${wallet}')" title="Remove this dev">×</button>
            `;
            list.appendChild(item);
        });
    }

    // Make removeDev globally accessible
    window.removeDev = removeDev;

    // Highlight ALL coins matching tracked devs
    function highlightAllCoins() {
        if (trackedDevs.length === 0) {
            updateCoinCount(0);
            return;
        }
        
        let highlightedCount = 0;
        
        // Remove previous highlights to re-scan
        document.querySelectorAll('.dev-highlighted').forEach(el => {
            el.classList.remove('dev-highlighted');
        });
        
        // Get all coin/pair cards/rows (Axiom Pro uses various container types)
        const allElements = document.querySelectorAll(
            'div, tr, td, button, [role="row"], [role="button"], [data-testid*="pair"], [data-testid*="coin"]'
        );
        
        allElements.forEach(element => {
            const text = element.textContent;
            
            // Check if this element contains any tracked dev wallet
            for (let devWallet of trackedDevs) {
                if (text.includes(devWallet)) {
                    // Find the card container (usually a parent div or the closest selectable element)
                    let container = element;
                    
                    // Walk up the DOM to find a sensible card/row container
                    for (let i = 0; i < 10; i++) {
                        if (!container.parentElement) break;
                        
                        const parent = container.parentElement;
                        const classes = parent.className.toString();
                        
                        // Check if parent is likely a row/card container
                        if (classes.includes('row') || 
                            classes.includes('card') || 
                            classes.includes('item') ||
                            classes.includes('pair') ||
                            classes.includes('coin') ||
                            parent.tagName === 'TR' ||
                            parent.tagName === 'BUTTON' ||
                            (parent.style.display && parent.style.display !== 'inline')) {
                            container = parent;
                            break;
                        }
                        
                        container = parent;
                    }
                    
                    // Apply highlight
                    if (!container.classList.contains('dev-highlighted')) {
                        container.classList.add('dev-highlighted');
                        highlightedCount++;
                    }
                    break;
                }
            }
        });
        
        updateCoinCount(highlightedCount);
        console.log(`Highlighted ${highlightedCount} coins from tracked devs`);
    }

    // Update coin count display
    function updateCoinCount(count) {
        const coinCount = document.getElementById('coinCount');
        if (coinCount) {
            coinCount.textContent = count;
        }
    }

    // Watch for new pairs being added to the page
    function observeNewCoins() {
        const observer = new MutationObserver(() => {
            highlightAllCoins();
        });
        
        // Observe entire document body for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        });
    }

    // Initialize when page loads
    function init() {
        createControlPanel();
        highlightAllCoins();
        observeNewCoins();
        console.log('✓ Axiom Pro Trade Dev Highlighter initialized');
        console.log(`Tracking ${trackedDevs.length} developer wallets`);
    }

    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(init, 500);
        });
    } else {
        setTimeout(init, 500);
    }
    
    // Also run on complete load
    window.addEventListener('load', () => {
        setTimeout(() => {
            highlightAllCoins();
        }, 1000);
    });
})();
