// 麻雀牌定義
const SUITS = ['wan', 'tong', 'tiao'];
const NUM_CHARS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
const HONORS = ['dong', 'nan', 'xi', 'bei', 'zhong', 'fa', 'bai'];
const HONOR_CHARS = ['東', '南', '西', '北', '中', '發', '白板'];

class MahjongGame {
    constructor(mode, playerName = '雀神') {
        this.mode = mode; // 'tutorial', 'ai_easy', 'ai_medium'
        this.playerNames = [playerName, 'AI 雀聖', 'AI 雀仙', 'AI 雀神'];
        this.scores = [0, 0, 0, 0]; // 4家得分 (初始為 0 分)
        this.deck = [];
        this.players = [[], [], [], []]; // 0: 玩家, 1: 右, 2: 上, 3: 左
        this.discards = [];
        this.turn = 0;
        this.tutorialStep = 0;
        this.aiTimer = null;     // 記錄 AI 出牌的定時器，方便返回時清除
        this.isDestroyed = false;
        this.init();
    }

    /* 結束並清理本局，供返回主選單時呼叫 */
    destroy() {
        this.isDestroyed = true;
        if (this.aiTimer) {
            clearTimeout(this.aiTimer);
            this.aiTimer = null;
        }
        document.getElementById('tutorial-overlay').classList.add('hidden');
        document.querySelectorAll('.hand').forEach(h => h.innerHTML = '');
        document.getElementById('discard-pile').innerHTML = '';
        document.getElementById('deck-count').innerText = '136';
    }

    init() {
        this.generateDeck();
        this.shuffleDeck();
        this.dealInitialHands();
        this.renderAllHands();
        this.updatePlayerInfoUI(); // 渲染 4 家名字與得分
        
        if (this.mode === 'tutorial') {
            this.startTutorial();
        } else {
            this.nextTurn();
        }
    }

    /* 新增：更新 4 家名字與得分 UI */
    updatePlayerInfoUI() {
        for (let i = 0; i < 4; i++) {
            const nameEl = document.getElementById(`name-${i}`);
            const scoreEl = document.getElementById(`score-${i}`);
            if (nameEl) nameEl.innerText = this.playerNames[i];
            if (scoreEl) {
                const s = this.scores[i];
                scoreEl.innerText = `${s >= 0 ? '+' : ''}${s} 分`;
                scoreEl.style.color = s > 0 ? '#00ff00' : (s < 0 ? '#ff4444' : '#ffd700');
            }
        }
    }

    generateDeck() {
        const addTiles = (type, val, className, label, isOneTiao = false, isBai = false, suit = null) => {
            for(let i = 0; i < 4; i++) {
                this.deck.push({ type, val, className, label, isOneTiao, isBai, suit });
            }
        }
        
        // 數字牌 (萬、筒、索)
        SUITS.forEach(suit => {
            for(let i = 1; i <= 9; i++) {
                let suitName = suit === 'wan' ? '萬' : (suit === 'tong' ? '筒' : '索');
                let label = NUM_CHARS[i - 1] + suitName;
                let isOneTiao = (suit === 'tiao' && i === 1);
                addTiles('suit', i, `suit-${suit}`, label, isOneTiao, false, suit);
            }
        });
        
        // 字牌 (東南西北中發白)
        HONORS.forEach((honor, index) => {
            let isBai = (honor === 'bai');
            addTiles('honor', index, `honor-${honor}`, HONOR_CHARS[index], false, isBai, null);
        });
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealInitialHands() {
        for (let i = 0; i < 13; i++) {
            for (let p = 0; p < 4; p++) {
                this.players[p].push(this.deck.pop());
            }
        }
        this.sortHand(this.players[0]);
    }

    sortHand(hand) {
        hand.sort((a, b) => {
            if (a.type !== b.type) return a.type.localeCompare(b.type);
            return a.val - b.val;
        });
    }

    /* 繪製三點式鏈條竹節 (索子) */
    drawStick(x, y1, y2, color = "#008000") {
        let ymid = (y1 + y2) / 2;
        let r = 2.8;
        let sw = 2.2;
        return `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" />
                <circle cx="${x}" cy="${y1}" r="${r}" fill="${color}" />
                <circle cx="${x}" cy="${ymid}" r="${r}" fill="${color}" />
                <circle cx="${x}" cy="${y2}" r="${r}" fill="${color}" />`;
    }
    /* 新增：斜向竹節繪製方法 */
    drawSlantedStick(x1, y1, x2, y2, color = "#008000") {
        let xmid = (x1 + x2) / 2;
        let ymid = (y1 + y2) / 2;
        let r = 2.5;
        let sw = 2.0;
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" />
                <circle cx="${x1}" cy="${y1}" r="${r}" fill="${color}" />
                <circle cx="${xmid}" cy="${ymid}" r="${r}" fill="${color}" />
                <circle cx="${x2}" cy="${y2}" r="${r}" fill="${color}" />`;
    }

    /* 生成 2索 - 9索 的三點鏈條 SVG */
    getSuoSVG(val) {
        let s = this.drawStick.bind(this);
        let ss = this.drawSlantedStick.bind(this); // 必須綁定斜向繪製方法
        let content = '';

        if (val === 2) {
            content = s(30, 18, 46, "#008000") + s(30, 54, 82, "#008000");
        } else if (val === 3) {
            content = s(30, 16, 42, "#008000") + s(18, 56, 84, "#008000") + s(42, 56, 84, "#cc0000");
        } else if (val === 4) {
            content = s(18, 16, 44, "#008000") + s(42, 16, 44, "#cc0000") + s(18, 56, 84, "#cc0000") + s(42, 56, 84, "#008000");
        } else if (val === 5) {
            content = s(16, 16, 42, "#008000") + s(44, 16, 42, "#008000") + s(30, 37, 63, "#cc0000") + s(16, 58, 84, "#008000") + s(44, 58, 84, "#008000");
        } else if (val === 6) {
            content = s(14, 16, 44, "#008000") + s(30, 16, 44, "#008000") + s(46, 16, 44, "#008000") + s(14, 56, 84, "#008000") + s(30, 56, 84, "#008000") + s(46, 56, 84, "#008000");
        } else if (val === 7) {
            // 七索：恢復原來的圖案 (上方 1 條紅索，下方 6 條綠索 3x2 排列)
            content = s(30, 12, 36, "#cc0000") + 
                      s(14, 46, 68, "#008000") + s(30, 46, 68, "#008000") + s(46, 46, 68, "#008000") + 
                      s(14, 72, 92, "#008000") + s(30, 72, 92, "#008000") + s(46, 72, 92, "#008000");
        } else if (val === 8) {
            // 八索：上方 4 條「W」形 (\ / \ /)，下方 4 條「M」形 (/ \ / \)
            content = ss(10, 16, 20, 38, "#008000") + ss(20, 38, 30, 16, "#008000") + ss(30, 16, 40, 38, "#008000") + ss(40, 38, 50, 16, "#008000") + 
                      ss(10, 78, 20, 56, "#008000") + ss(20, 56, 30, 78, "#008000") + ss(30, 78, 40, 56, "#008000") + ss(40, 56, 50, 78, "#008000");
        } else if (val === 9) {
            content = s(14, 14, 38, "#008000") + s(30, 14, 38, "#cc0000") + s(46, 14, 38, "#0033cc") + s(14, 42, 64, "#008000") + s(30, 42, 64, "#cc0000") + s(46, 42, 64, "#0033cc") + s(14, 68, 90, "#008000") + s(30, 68, 90, "#cc0000") + s(46, 68, 90, "#0033cc");
        }
        return `<svg class="tile-svg" viewBox="0 0 60 100">${content}</svg>`;
    }

    /* 繪製圓形點 (筒子) */
    drawDot(cx, cy, r = 7, color = "#0033cc") {
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" /><circle cx="${cx}" cy="${cy}" r="${(r*0.35).toFixed(1)}" fill="#faf9f5" />`;
    }

    /* 生成 1筒 - 9筒 的圓點 SVG */
    getTongSVG(val) {
        let d = this.drawDot.bind(this);
        let content = '';
        if (val === 1) {
            // 1筒：經典大彩餅/龍餅
            content = `<circle cx="30" cy="50" r="22" fill="none" stroke="#008000" stroke-width="3" />
                       <circle cx="30" cy="50" r="18" fill="none" stroke="#cc0000" stroke-width="2" />
                       <circle cx="30" cy="50" r="14" fill="#0033cc" />
                       <circle cx="30" cy="50" r="8" fill="#cc0000" />
                       <circle cx="30" cy="50" r="3" fill="#faf9f5" />`;
        } else if (val === 2) {
            content = d(30, 28, 11, "#0033cc") + d(30, 72, 11, "#008000");
        } else if (val === 3) {
            content = d(16, 24, 9, "#0033cc") + d(30, 50, 9, "#cc0000") + d(44, 76, 9, "#008000");
        } else if (val === 4) {
            content = d(18, 28, 9, "#0033cc") + d(42, 28, 9, "#008000") + d(18, 72, 9, "#008000") + d(42, 72, 9, "#0033cc");
        } else if (val === 5) {
            content = d(16, 22, 8, "#0033cc") + d(44, 22, 8, "#008000") + d(30, 50, 9, "#cc0000") + d(16, 78, 8, "#008000") + d(44, 78, 8, "#0033cc");
        } else if (val === 6) {
            content = d(18, 22, 7.5, "#008000") + d(42, 22, 7.5, "#008000") + d(18, 50, 7.5, "#cc0000") + d(42, 50, 7.5, "#cc0000") + d(18, 78, 7.5, "#cc0000") + d(42, 78, 7.5, "#cc0000");
        } else if (val === 7) {
            content = d(14, 18, 6.5, "#008000") + d(30, 27, 6.5, "#008000") + d(46, 36, 6.5, "#008000") + d(18, 60, 7, "#cc0000") + d(42, 60, 7, "#cc0000") + d(18, 82, 7, "#cc0000") + d(42, 82, 7, "#cc0000");
        } else if (val === 8) {
            content = d(18, 18, 6.5, "#0033cc") + d(42, 18, 6.5, "#0033cc") + d(18, 39, 6.5, "#0033cc") + d(42, 39, 6.5, "#0033cc") + d(18, 61, 6.5, "#0033cc") + d(42, 61, 6.5, "#0033cc") + d(18, 82, 6.5, "#0033cc") + d(42, 82, 6.5, "#0033cc");
        } else if (val === 9) {
            content = d(14, 20, 6.5, "#0033cc") + d(30, 20, 6.5, "#0033cc") + d(46, 20, 6.5, "#0033cc") + d(14, 50, 6.5, "#cc0000") + d(30, 50, 6.5, "#cc0000") + d(46, 50, 6.5, "#cc0000") + d(14, 80, 6.5, "#008000") + d(30, 80, 6.5, "#008000") + d(46, 80, 6.5, "#008000");
        }
        return `<svg class="tile-svg" viewBox="0 0 60 100">${content}</svg>`;
    }

    renderTileContent(tileDiv, tile, isHidden) {
        if (isHidden) {
            tileDiv.style.background = '#2e8b57';
            tileDiv.innerHTML = '';
            return;
        }
        
        tileDiv.style.background = 'var(--tile-bg)';
        
        if (tile.isBai) {
            tileDiv.innerHTML = '<div class="bai-frame"></div>';
        } else if (tile.isOneTiao) {
            // 一索彩鳳雀鳥
            tileDiv.innerHTML = `
                <svg class="bird-icon" viewBox="0 0 32 32">
                    <path d="M 5 28 Q 16 26 27 28" stroke="#008000" stroke-width="2" stroke-linecap="round" fill="none" />
                    <path d="M 11 27.5 L 11 28.5 M 21 27.5 L 21 28.5" stroke="#cc0000" stroke-width="1.5" />
                    <path d="M 15 24 L 14 27 M 18 24 L 18 27" stroke="#cc0000" stroke-width="1.2" stroke-linecap="round" />
                    <path d="M 13 18 C 6 18, 2 23, 6 28 C 8 29.5, 12 28, 14 25" stroke="#cc0000" stroke-width="2.2" stroke-linecap="round" fill="none" />
                    <path d="M 14 17 C 8 17, 5 21, 8 25 C 10 26.5, 13 25, 15 23" stroke="#008000" stroke-width="1.8" stroke-linecap="round" fill="none" />
                    <circle cx="5.5" cy="27" r="1.8" fill="#ffb300" />
                    <circle cx="5.5" cy="27" r="1" fill="#cc0000" />
                    <circle cx="8" cy="24.5" r="1.4" fill="#ffb300" />
                    <circle cx="8" cy="24.5" r="0.7" fill="#008000" />
                    <path d="M 14 12 C 11 15, 11 20, 15 24 C 19 24, 21 20, 20 15 Z" fill="#008000" />
                    <path d="M 14.5 15 C 13.5 17, 14 21, 16.5 23 C 18 21.5, 18.5 19, 17.5 17 Z" fill="#fff8e1" />
                    <path d="M 16 15 Q 23 16 24.5 22 Q 18.5 22 16 15" fill="#cc0000" />
                    <path d="M 17 16 Q 22 17 23 20" stroke="#ffb300" stroke-width="1" fill="none" />
                    <path d="M 18 17.5 Q 21.5 18.5 22.5 21" stroke="#008000" stroke-width="1" fill="none" />
                    <path d="M 15 12 C 15 9.5, 17 7.5, 19.5 7.5 C 20.5 7.5, 20.5 9, 19.5 12 Z" fill="#008000" />
                    <circle cx="19.5" cy="7.5" r="3.2" fill="#008000" />
                    <circle cx="20.8" cy="6.8" r="1" fill="#ffffff" />
                    <circle cx="21" cy="6.8" r="0.5" fill="#000000" />
                    <polygon points="22.5,7.2 26,8.2 22.5,9.2" fill="#e65100" />
                    <path d="M 18.5 5 C 17 3.2, 15 2.5, 13 2.5" stroke="#008000" stroke-width="0.8" fill="none" />
                    <circle cx="12.5" cy="2.5" r="1.2" fill="#cc0000" />
                    <path d="M 19 4.8 C 18.5 2.8, 18 1.8, 17 1" stroke="#008000" stroke-width="0.8" fill="none" />
                    <circle cx="16.8" cy="1" r="1.2" fill="#ffb300" />
                    <path d="M 19.8 5 C 20.8 3.2, 22 2.2, 23.5 1.8" stroke="#008000" stroke-width="0.8" fill="none" />
                    <circle cx="24" cy="1.8" r="1.2" fill="#cc0000" />
                </svg>`;
        } else if (tile.suit === 'tong') {
            // 筒子：圓形點
            tileDiv.innerHTML = this.getTongSVG(tile.val);
        } else if (tile.suit === 'tiao') {
            // 索子 (2索-9索)：三點鏈條狀
            tileDiv.innerHTML = this.getSuoSVG(tile.val);
        } else {
            // 萬子與字牌：經典楷體文字
            tileDiv.innerText = tile.label;
        }
    }

    renderAllHands() {
        for (let p = 0; p < 4; p++) {
            const handDiv = document.querySelector(`#player-${p} .hand`);
            handDiv.innerHTML = '';
            this.players[p].forEach((tile, index) => {
                const tileDiv = document.createElement('div');
                tileDiv.className = `tile ${tile.className}`;
                
                const isHidden = (p !== 0 && this.mode !== 'tutorial');
                this.renderTileContent(tileDiv, tile, isHidden);
                
                if (p === 0) {
                    tileDiv.onclick = () => this.playerDiscard(index);
                }
                handDiv.appendChild(tileDiv);
            });
        }
        document.getElementById('deck-count').innerText = this.deck.length;
    }

    nextTurn() {
        if (this.deck.length === 0) {
            alert("流局！");
            return;
        }

        const drawnTile = this.deck.pop();
        this.players[this.turn].push(drawnTile);
        this.renderAllHands();

        if (this.turn === 0) {
            if (this.mode === 'tutorial') this.triggerTutorialStep('player_draw');
        } else {
            if (this.aiTimer) clearTimeout(this.aiTimer);
            this.aiTimer = setTimeout(() => this.aiPlay(), 1000);
        }
    }

    playerDiscard(index) {
        if (this.turn !== 0 || this.isDestroyed) return;
        
        const discarded = this.players[0].splice(index, 1)[0];
        this.discards.push(discarded);
        this.renderDiscards();
        this.sortHand(this.players[0]);
        this.renderAllHands();

        if (this.mode === 'tutorial') this.triggerTutorialStep('player_discard');

        this.turn = (this.turn + 1) % 4;
        this.nextTurn();
    }

    aiPlay() {
        if (this.isDestroyed) return;
        const hand = this.players[this.turn];
        let discardIndex = 0;

        if (this.mode === 'ai_easy') {
            discardIndex = Math.floor(Math.random() * hand.length);
        } 
        else if (this.mode === 'ai_medium') {
            discardIndex = this.calculateBestDiscard(hand);
        }
        else if (this.mode === 'tutorial') {
            discardIndex = hand.length - 1; 
        }

        const discarded = hand.splice(discardIndex, 1)[0];
        this.discards.push(discarded);
        this.renderDiscards();
        this.renderAllHands();

        this.turn = (this.turn + 1) % 4;
        this.nextTurn();
    }

    calculateBestDiscard(hand) {
        let counts = {};
        hand.forEach((t) => {
            let key = `${t.type}_${t.val}`;
            counts[key] = (counts[key] || 0) + 1;
        });

        let worstScore = 999;
        let bestDiscardIdx = 0;

        hand.forEach((tile, index) => {
            let score = 0;
            let key = `${tile.type}_${tile.val}`;
            
            if (counts[key] >= 2) score += 50;
            
            if (tile.type === 'suit') {
                if (counts[`suit_${tile.val + 1}`]) score += 10;
                if (counts[`suit_${tile.val - 1}`]) score += 10;
                if (tile.val === 1 || tile.val === 9) score -= 5;
            } else {
                score -= 10;
            }

            if (score < worstScore) {
                worstScore = score;
                bestDiscardIdx = index;
            }
        });
        return bestDiscardIdx;
    }

    renderDiscards() {
        const pool = document.getElementById('discard-pile');
        pool.innerHTML = '';
        this.discards.forEach(tile => {
            const div = document.createElement('div');
            div.className = `tile ${tile.className}`;
            this.renderTileContent(div, tile, false);
            pool.appendChild(div);
        });
    }

    startTutorial() {
        document.getElementById('tutorial-overlay').classList.remove('hidden');
        this.tutorialSteps = [
            "歡迎來到香港麻雀！遊戲介面中，下方是你的手牌。你的目標是透過『上』、『碰』、『槓』湊齊四組牌加一對『眼』（將牌）。",
            "在上帝視角下，你可以看到AI的手牌（在實戰中它們是隱藏的）。",
            "現在輪到你摸牌了。點擊『下一步』開始你的回合。"
        ];
        this.updateTutorialText();
        
        document.getElementById('tutorial-next').onclick = () => {
            this.tutorialStep++;
            if (this.tutorialStep < this.tutorialSteps.length) {
                this.updateTutorialText();
            } else {
                document.getElementById('tutorial-overlay').classList.add('hidden');
                this.nextTurn();
            }
        };
    }

    updateTutorialText() {
        document.getElementById('tutorial-text').innerText = this.tutorialSteps[this.tutorialStep];
    }

    triggerTutorialStep(event) {
        const overlay = document.getElementById('tutorial-overlay');
        const text = document.getElementById('tutorial-text');
        const nextBtn = document.getElementById('tutorial-next');
        
        if (event === 'player_draw') {
            overlay.classList.remove('hidden');
            text.innerText = "你摸到了一張新牌。請審視你的手牌，點擊其中一張你認為最沒用的牌（通常是落單的字牌或一九牌）將其打出。";
            nextBtn.onclick = () => overlay.classList.add('hidden');
        } 
        else if (event === 'player_discard') {
            overlay.classList.remove('hidden');
            text.innerText = "漂亮！你打出了第一張牌。現在輪到其他三家出牌，如果他們打出的牌能和你手中的牌湊成『碰』或『上』，系統會提示你。";
            nextBtn.onclick = () => overlay.classList.add('hidden');
        }
    }
}

/* 是否可使用 History API 記錄頁面狀態（file:// 下可能被瀏覽器禁用） */
let historyApiAvailable = true;
let gameToken = 0;   // 每局唯一編號，避免「前進」時誤顯示已結束的牌局

/* 切換畫面 */
function showMenuScreen() {
    document.getElementById('mahjong-table').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    autoFitGameArea();
}

function showGameScreen() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('mahjong-table').classList.remove('hidden');
    autoFitGameArea();
}

/* 返回上一頁（主選單）：結束並清理目前牌局 */
function returnToMenu() {
    if (window.game) {
        window.game.destroy();
        window.game = null;
    }
    showMenuScreen();
}

function startGame(mode) {
    const inputVal = document.getElementById('player-name-input').value.trim();
    const playerName = inputVal !== '' ? inputVal : '雀神'; // 若未填則預設為「雀神」

    showGameScreen();
    window.game = new MahjongGame(mode, playerName);
    window.game.token = ++gameToken;

    // 壓入一筆歷史記錄，讓瀏覽器的「上一頁」也能返回主選單
    try {
        history.pushState({ page: 'game', token: gameToken }, '');
    } catch (e) {
        historyApiAvailable = false;
    }
}

/* 點擊返回按鈕：優先走瀏覽器歷史，讓返回行為與瀏覽器一致 */
function goBack() {
    if (historyApiAvailable && history.state && history.state.page === 'game') {
        history.back();   // 觸發 popstate，由下方監聽器統一處理
    } else {
        returnToMenu();   // 瀏覽器不支援 History API 時的直接降級方案
    }
}

/* 瀏覽器上一頁 / 下一頁 */
window.addEventListener('popstate', (e) => {
    const page = (e.state && e.state.page) || 'menu';
    if (page === 'game' && window.game && window.game.token === e.state.token) {
        showGameScreen();
    } else {
        if (page === 'game') {
            // 沒有可恢復的牌局，修正歷史狀態並留在主選單
            try { history.replaceState({ page: 'menu' }, ''); } catch (err) {}
        }
        returnToMenu();
    }
});

/* ESC 快捷返回 */
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('mahjong-table').classList.contains('hidden')) {
        goBack();
    }
});

/* 1800x1400 視窗自適應 */
function autoFitGameArea() {
    const container = document.getElementById('game-container');
    if (!container) return;

    const targetWidth = 1800;
    const targetHeight = 1400;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const scaleX = windowWidth / targetWidth;
    const scaleY = windowHeight / targetHeight;
    const scale = Math.min(scaleX, scaleY) * 0.95;

    container.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

window.addEventListener('DOMContentLoaded', () => {
    try {
        history.replaceState({ page: 'menu' }, '');
    } catch (e) {
        historyApiAvailable = false;
    }
    autoFitGameArea();
});
window.addEventListener('load', autoFitGameArea);
window.addEventListener('resize', autoFitGameArea);
