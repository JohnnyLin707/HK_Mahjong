// =====================================================================
// 香港麻雀 (正宗香港牌 / 清章) - 完整規則
// 144 張牌：萬子 36 + 筒子 36 + 索子 36 + 番子(字牌) 28 + 花牌 8
// 支援：摸牌、補花、打牌、碰、上(吃)、明槓/暗槓/加槓、食糊/自摸、
//       三番起糊、門風/圈風、完整番數計分、花糊、大花糊(八仙過海)、
//       搶槓、槓上開花、連槓開花、海底撈月、十三么、例牌等。
// =====================================================================

const SUITS = ['wan', 'tong', 'tiao'];
const NUM_CHARS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
const SUIT_CHARS = { wan: '萬', tong: '筒', tiao: '索' };
const HONORS = ['dong', 'nan', 'xi', 'bei', 'zhong', 'fa', 'bai'];
const HONOR_CHARS = ['東', '南', '西', '北', '中', '發', '白板'];
const HONOR_ID = { dong: 31, nan: 32, xi: 33, bei: 34, zhong: 35, fa: 36, bai: 37 };

// 花牌定義：季節牌(春夏秋冬) + 四君子(梅蘭竹菊)，每張對應座位編號(1東/2南/3西/4北)
const FLOWER_DEFS = [
    { char: '春', kind: 'season', seat: 1 },
    { char: '夏', kind: 'season', seat: 2 },
    { char: '秋', kind: 'season', seat: 3 },
    { char: '冬', kind: 'season', seat: 4 },
    { char: '梅', kind: 'flower', seat: 1 },
    { char: '蘭', kind: 'flower', seat: 2 },
    { char: '竹', kind: 'flower', seat: 3 },
    { char: '菊', kind: 'flower', seat: 4 },
];

// 座位風（逆時針：東→南→西→北）；座位編號即風牌索引
const SEAT_WIND_CHAR = ['東', '南', '西', '北'];
const SEAT_WIND_NUM = [1, 2, 3, 4];

// =====================================================================
// 純函數：牌型數值化、胡牌判定、拆解、番數計算
// =====================================================================

/* 牌轉為數值 id（花牌返回 -1） */
function tileNumId(tile) {
    if (tile.type === 'suit') {
        return { wan: 0, tong: 10, tiao: 20 }[tile.suit] + tile.val;
    }
    if (tile.type === 'honor') {
        return HONOR_ID[tile.honor];
    }
    return -1;
}

function isSuitId(id) { return id >= 1 && id <= 29; }
function isHonorId(id) { return id >= 31 && id <= 37; }
function isDragonId(id) { return id >= 35 && id <= 37; }
function isWindId(id) { return id >= 31 && id <= 34; }
function windIndexOf(id) { return id - 31; }   // 0東 1南 2西 3北

function toCounts(tiles) {
    const counts = new Array(38).fill(0);
    tiles.forEach(t => {
        const id = tileNumId(t);
        if (id >= 1) counts[id]++;
    });
    return counts;
}

function allZero(counts) {
    for (let i = 1; i <= 37; i++) if (counts[i] !== 0) return false;
    return true;
}

/* 判斷一組 id 是否可形成順子（同花色且連續） */
function seqPossible(id) {
    return isSuitId(id) && id <= 27 && (id % 10) >= 1 && (id % 10) <= 7;
}

/* 找出所有「面子 + 眼」拆解方案 */
function decomposeHand(counts, setsNeeded) {
    const solutions = [];
    function genSets(cc, remaining, current, out) {
        if (remaining === 0) {
            if (allZero(cc)) out.push(current.slice());
            return;
        }
        let id = 1;
        while (id <= 37 && cc[id] === 0) id++;
        if (id > 37) return;

        // 嘗試刻子
        if (cc[id] >= 3) {
            cc[id] -= 3;
            current.push({ kind: 'pung', ids: [id, id, id] });
            genSets(cc, remaining - 1, current, out);
            current.pop();
            cc[id] += 3;
        }
        // 嘗試順子
        if (seqPossible(id) && cc[id + 1] > 0 && cc[id + 2] > 0) {
            cc[id]--; cc[id + 1]--; cc[id + 2]--;
            current.push({ kind: 'chow', ids: [id, id + 1, id + 2] });
            genSets(cc, remaining - 1, current, out);
            current.pop();
            cc[id + 2]++; cc[id + 1]++; cc[id]++;
        }
    }

    for (let id = 1; id <= 37; id++) {
        if (counts[id] >= 2) {
            counts[id] -= 2;
            const pair = id;
            const setSolutions = [];
            genSets(counts, setsNeeded, [], setSolutions);
            counts[id] += 2;
            for (const s of setSolutions) solutions.push({ pair, sets: s });
        }
    }
    return solutions;
}

/* 十三么（十三么）：1/9 各一 + 七隻番子各一 + 其中一隻做眼 */
function isThirteenOrphans(tiles) {
    if (tiles.length !== 14) return false;
    const counts = toCounts(tiles);
    const orphans = [1, 9, 11, 19, 21, 29, 31, 32, 33, 34, 35, 36, 37];
    for (let i = 1; i <= 37; i++) {
        if (counts[i] > 0 && !orphans.includes(i)) return false;
    }
    // 每種只出現一次，其中一種出現兩次
    let twos = 0, ones = 0;
    for (const o of orphans) {
        if (counts[o] === 2) twos++;
        else if (counts[o] === 1) ones++;
        else return false;
    }
    return twos === 1 && ones === 12;
}

/* 九蓮寶燈：門清一色 1112345678999 + 同門任何一隻 */
function isNineGates(tiles, melds) {
    if (melds.length !== 0 || tiles.length !== 14) return false;
    const counts = toCounts(tiles);
    // 只出現同一門數字
    const suitBase = Math.floor((tiles[0] && tileNumId(tiles[0])) / 10);
    if (suitBase > 2) return false;
    const base = suitBase * 10;
    for (let i = 1; i <= 37; i++) {
        if (counts[i] > 0) {
            if (i < base + 1 || i > base + 9) return false;
        }
    }
    // 檢查 1112345678999 型態
    const expect = [3, 1, 1, 1, 1, 1, 1, 1, 3];
    for (let d = 0; d < 9; d++) {
        if (counts[base + 1 + d] < expect[d]) return false;
    }
    return true;
}

/* 判斷牌是否為 1/9 或番子 */
function isTerminalOrHonor(id) {
    if (isHonorId(id)) return true;
    const v = id % 10;
    return v === 1 || v === 9;
}

// =====================================================================
// 主遊戲類別
// =====================================================================
class MahjongGame {
    constructor(mode, playerName = '雀神') {
        this.mode = mode; // 'tutorial', 'ai_easy', 'ai_medium'
        this.playerNames = [playerName, 'AI 雀聖', 'AI 雀仙', 'AI 雀神'];
        this.scores = [0, 0, 0, 0];
        this.round = 0;          // 局數（0 起）
        this.dealer = 0;         // 莊家座位
        this.deck = [];
        this.hands = [[], [], [], []];
        this.melds = [[], [], [], []];      // 碰/吃/槓
        this.flowers = [[], [], [], []];    // 花牌
        this.discards = [];
        this.turn = 0;
        this.isDestroyed = false;
        this.aiTimer = null;
        this.isDealerFirstDiscard = true;   // 莊家開局是否尚未打第一隻牌
        this.kongStreak = 0;                // 連續開槓次數（連槓開花用）
        this.discardsMade = 0;              // 本局已打出的牌數
        this.pendingClaim = null;
        this.init();
    }

    /* 結束並清理本局 */
    destroy() {
        this.isDestroyed = true;
        if (this.aiTimer) { clearTimeout(this.aiTimer); this.aiTimer = null; }
        this.hideActionBar();
        this.hideResultOverlay();
        document.getElementById('tutorial-overlay').classList.add('hidden');
        document.querySelectorAll('.hand, .melds').forEach(h => h.innerHTML = '');
        document.getElementById('discard-pile').innerHTML = '';
        document.getElementById('deck-count').innerText = '144';
    }

    /* ---------------- 建牌 / 洗牌 / 發牌 ---------------- */
    generateDeck() {
        const deck = [];
        const push4 = (tile) => { for (let i = 0; i < 4; i++) deck.push({ ...tile }); };

        SUITS.forEach(suit => {
            for (let i = 1; i <= 9; i++) {
                push4({
                    type: 'suit', suit, val: i,
                    className: `suit-${suit}`,
                    label: NUM_CHARS[i - 1] + SUIT_CHARS[suit],
                    isOneTiao: (suit === 'tiao' && i === 1),
                    isBai: false,
                });
            }
        });

        HONORS.forEach((honor, index) => {
            push4({
                type: 'honor', honor, val: index,
                className: `honor-${honor}`,
                label: HONOR_CHARS[index],
                isOneTiao: false, isBai: (honor === 'bai'),
            });
        });

        FLOWER_DEFS.forEach(f => {
            deck.push({
                type: 'flower', kind: f.kind, seat: f.seat,
                val: f.seat, char: f.char, label: f.char,
                className: `flower-${f.kind}`,
                isOneTiao: false, isBai: false,
            });
        });

        this.deck = deck;
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    tileOrder(t) {
        if (t.type === 'suit') return SUITS.indexOf(t.suit) * 10 + t.val;
        if (t.type === 'honor') return 100 + t.val;
        return 200;
    }

    sortHand(hand) { hand.sort((a, b) => this.tileOrder(a) - this.tileOrder(b)); }

    dealInitialHands() {
        for (let i = 0; i < 13; i++) {
            for (let p = 0; p < 4; p++) this.hands[p].push(this.deck.pop());
        }
        // 莊家多摸一張（14 張）
        this.hands[this.dealer].push(this.deck.pop());
        for (let p = 0; p < 4; p++) this.sortHand(this.hands[p]);
        // 起手補花
        for (let p = 0; p < 4; p++) this.replaceFlowers(p);
    }

    /* 補花：手牌中的花牌翻出，並從牌山補牌，直到無花 */
    replaceFlowers(p) {
        while (true) {
            const hand = this.hands[p];
            const idx = hand.findIndex(t => t.type === 'flower');
            if (idx === -1) break;
            const flower = hand.splice(idx, 1)[0];
            this.flowers[p].push(flower);
            const fw = this.checkFlowerWin(p);
            if (fw) { this.declareWin(p, { winType: 'zimo', source: fw }); return; }
            if (this.deck.length > 0) hand.push(this.deck.pop());
        }
        this.sortHand(this.hands[p]);
    }

    /* 花糊 / 大花糊判定（七花糊、八仙過海） */
    checkFlowerWin(p) {
        const n = this.flowers[p].length;
        if (n >= 8) return 'flower8';
        if (n === 7) return 'flower7';
        return null;
    }

    /* ---------------- 初始化 / 開新局 ---------------- */
    init() {
        this.startNewRound();
    }

    startNewRound() {
        this.generateDeck();
        this.shuffleDeck();
        this.hands = [[], [], [], []];
        this.melds = [[], [], [], []];
        this.flowers = [[], [], [], []];
        this.discards = [];
        this.turn = this.dealer;
        this.isDealerFirstDiscard = true;
        this.kongStreak = 0;
        this.discardsMade = 0;
        this.pendingClaim = null;
        this.roundOver = false;
        this.hideActionBar();
        this.hideResultOverlay();

        this.dealInitialHands();
        if (this.roundOver) return; // 起手補花已花糊/大花糊
        this.renderAll();
        this.updatePlayerInfoUI();
        this.updateRoundInfoUI();
        this.renderDiscards();

        if (this.mode === 'tutorial') {
            this.showTutorialIntro();
        }

        // 莊家天糊判定
        const d = this.dealer;
        const res = this.evaluateWin(d, { winType: 'zimo', source: 'heavenly' });
        if (res) { this.declareWin(d, { winType: 'zimo', source: 'heavenly', preComputed: res }); return; }

        // 莊家開局：已有 14 張，直接進入出牌階段
        this.afterDraw(this.dealer, false);
    }

    /* ---------------- 摸牌 / 出牌 ---------------- */
    startTurn() {
        if (this.isDestroyed) return;
        if (this.deck.length === 0) { this.drawGame(); return; }
        this.drawTile(this.turn);
    }

    drawTile(p) {
        if (this.isDestroyed) return;
        if (this.deck.length === 0) { this.drawGame(); return; }
        const tile = this.deck.pop();
        this.updateDeckCount();

        if (tile.type === 'flower') {
            this.flowers[p].push(tile);
            this.renderAll();
            this.setStatus(`${this.playerNames[p]} 摸到花牌「${tile.char}」，補牌`);
            const fw = this.checkFlowerWin(p);
            if (fw) { this.declareWin(p, { winType: 'zimo', source: fw }); return; }
            if (p === 0) {
                this.drawTile(p);
            } else {
                this.aiTimer = setTimeout(() => this.drawTile(p), 550);
            }
            return;
        }

        this.hands[p].push(tile);
        this.sortHand(this.hands[p]);
        this.renderAll();

        if (p === 0) {
            this.setStatus('輪到你：點擊手牌出牌，或點「自摸 / 槓」');
            this.refreshPlayerActionBar();
        } else {
            this.aiTimer = setTimeout(() => this.aiTurn(p), 750);
        }
    }

    afterDraw(p, drewTile = true) {
        this.renderAll();
        if (p === 0) {
            this.setStatus('輪到你：點擊手牌出牌，或點「自摸 / 槓」');
            this.refreshPlayerActionBar();
        } else {
            this.aiTimer = setTimeout(() => this.aiTurn(p), 750);
        }
    }

    /* 玩家（自己）出牌 */
    playerDiscard(index) {
        if (this.turn !== 0 || this.isDestroyed) return;
        if (this.pendingClaim) return;
        const hand = this.hands[0];
        if (index < 0 || index >= hand.length) return;
        const tile = hand.splice(index, 1)[0];
        this.discardFrom(0, tile);
    }

    discardFrom(p, tile) {
        this.discards.push(tile);
        this.discardsMade++;
        this.kongStreak = 0;
        this.hideActionBar();
        this.renderAll();
        this.renderDiscards();
        this.setStatus(`${this.playerNames[p]} 打出「${tile.label}」`);

        // 檢查是否有人可食糊/碰/槓/吃
        const claims = this.findClaims(tile, p);
        if (claims.length === 0) {
            this.turn = (p + 1) % 4;
            this.aiTimer = setTimeout(() => this.startTurn(), 400);
        } else {
            this.offerClaims(claims, tile, p);
        }
    }

    /* AI 出牌邏輯 */
    aiTurn(p) {
        if (this.isDestroyed) return;
        const hand = this.hands[p];

        // 自摸
        const winSrc = this.selfDrawSource(p);
        const win = this.evaluateWin(p, { winType: 'zimo', source: winSrc });
        if (win) { this.declareWin(p, { winType: 'zimo', source: winSrc, preComputed: win }); return; }

        // 暗槓 / 加槓
        const kong = this.findAvailableKong(p);
        if (kong) { this.executeKong(p, kong); return; }

        // 出牌
        const idx = (this.mode === 'ai_easy')
            ? Math.floor(Math.random() * hand.length)
            : this.calculateBestDiscard(hand);
        const tile = hand.splice(idx, 1)[0];
        this.discardFrom(p, tile);
    }

    calculateBestDiscard(hand) {
        const counts = {};
        hand.forEach(t => {
            const id = tileNumId(t);
            counts[id] = (counts[id] || 0) + 1;
        });
        let bestIdx = 0, bestScore = 99999;
        hand.forEach((tile, idx) => {
            const id = tileNumId(tile);
            let score = 0;
            if (counts[id] >= 2) score -= 60;          // 保留對子/刻子
            if (isDragonId(id) || isWindId(id)) score -= 25; // 保留番子
            if (isSuitId(id)) {
                const v = id % 10;
                if (counts[id + 1] > 0) score -= 12;     // 順子相鄰
                if (counts[id - 1] > 0) score -= 12;
                if (counts[id + 2] > 0 && v <= 7) score -= 6;
                if (counts[id - 2] > 0 && v >= 3) score -= 6;
                if (v === 1 || v === 9) score += 8;      // 一九較無用
                else score += 2;
            } else {
                score += 15;                             // 無對番子較易被棄
            }
            if (score < bestScore) { bestScore = score; bestIdx = idx; }
        });
        return bestIdx;
    }

    /* ---------------- 鳴牌（碰/吃/槓）判定 ---------------- */
    findClaims(tile, discarder) {
        const wins = [];
        const pongs = [];
        // 地糊：莊家打出的第一隻牌被閒家食糊
        const winSource = (discarder === this.dealer && this.discardsMade === 1) ? 'earthly'
            : (this.deck.length === 0 ? 'lastTile' : 'normal');
        // 檢查胡（最高優先）
        for (let i = 1; i <= 3; i++) {
            const p = (discarder + i) % 4;
            if (this.canWinOnDiscard(p, tile, winSource)) wins.push({ player: p, action: 'win', priority: 3, source: winSource });
        }
        if (wins.length > 0) return wins;

        // 碰 / 明槓
        for (let i = 1; i <= 3; i++) {
            const p = (discarder + i) % 4;
            const count = this.hands[p].filter(t => tileNumId(t) === tileNumId(tile)).length;
            if (count >= 2) {
                const action = (count >= 3) ? 'kong' : 'pong';
                pongs.push({ player: p, action, priority: 2 });
            }
        }
        if (pongs.length > 0) return pongs;

        // 吃（僅限下家）
        const next = (discarder + 1) % 4;
        if (this.canChow(next, tile)) return [{ player: next, action: 'chow', priority: 1 }];
        return [];
    }

    canChow(p, tile) {
        if (tile.type !== 'suit') return false;
        const id = tileNumId(tile);
        const suit = tile.suit;
        const v = id % 10;
        const hand = this.hands[p];
        const has = (val) => hand.some(t => t.type === 'suit' && t.suit === suit && t.val === val);
        if (v >= 3 && has(v - 2) && has(v - 1)) return true;
        if (v >= 2 && v <= 8 && has(v - 1) && has(v + 1)) return true;
        if (v <= 7 && has(v + 1) && has(v + 2)) return true;
        return false;
    }

    findAvailableKong(p) {
        const hand = this.hands[p];
        const counts = {};
        hand.forEach(t => { const id = tileNumId(t); counts[id] = (counts[id] || 0) + 1; });
        // 暗槓：手牌有 4 隻
        for (const id in counts) {
            if (counts[id] === 4) {
                return { type: 'ankong', numId: Number(id) };
            }
        }
        // 加槓：已碰的牌，手牌中還有第 4 隻
        for (let m = 0; m < this.melds[p].length; m++) {
            const meld = this.melds[p][m];
            if (meld.type === 'pong') {
                const id = tileNumId(meld.tiles[0]);
                if (hand.some(t => tileNumId(t) === id)) {
                    return { type: 'jiagang', numId: id, meldIndex: m };
                }
            }
        }
        return null;
    }

    /* ---------------- 執行鳴牌 ---------------- */
    offerClaims(claims, tile, discarder) {
        this.pendingClaim = { tile, discarder, claims };
        const playerClaim = claims.find(c => c.player === 0);
        if (playerClaim) {
            this.showActionBar(playerClaim.action, tile);
        } else {
            this.resolveAiClaim(claims, tile, discarder);
        }
    }

    resolveAiClaim(claims, tile, discarder) {
        const c = claims[0];
        this.executeClaim(c.player, c.action, tile, discarder, c.source);
    }

    executeClaim(p, action, tile, discarder, source = 'normal') {
        this.pendingClaim = null;
        this.hideActionBar();
        const id = tileNumId(tile);

        if (action === 'win') {
            this.hands[p].push(tile);
            this.declareWin(p, { winType: 'discard', discarder, source });
            return;
        }
        if (action === 'pong') {
            this.setStatus(`${this.playerNames[p]} 碰「${tile.label}」`);
            const removed = this.hands[p].filter(t => tileNumId(t) === id).slice(0, 2);
            removed.forEach(t => this.hands[p].splice(this.hands[p].indexOf(t), 1));
            this.melds[p].push({ type: 'pong', tiles: [tile, removed[0], removed[1]] });
            this.discards.pop(); // 從棄牌堆移除被碰走的牌
        } else if (action === 'kong') {
            this.setStatus(`${this.playerNames[p]} 明槓「${tile.label}」`);
            const removed = this.hands[p].filter(t => tileNumId(t) === id).slice(0, 3);
            removed.forEach(t => this.hands[p].splice(this.hands[p].indexOf(t), 1));
            this.melds[p].push({ type: 'mingkong', tiles: [tile, removed[0], removed[1], removed[2]] });
            this.discards.pop();
        } else if (action === 'chow') {
            this.executeChow(p, tile);
        }

        this.sortHand(this.hands[p]);
        this.renderAll();
        this.renderDiscards();

        // 碰/吃後出牌；槓後補牌
        if (action === 'kong' || action === 'mingkong') {
            this.turn = p;
            this.kongStreak = 1;
            this.drawReplacement(p, 'kong');
        } else {
            this.turn = p;
            this.afterDraw(p, false);
        }
    }

    /* 吃牌：選取一種合法組合（自動選第一種） */
    executeChow(p, tile) {
        const id = tileNumId(tile);
        const suit = tile.suit;
        const v = id % 10;
        const hand = this.hands[p];
        const combos = [
            [v - 2, v - 1], [v - 1, v + 1], [v + 1, v + 2]
        ].filter(c => c.every(x => x >= 1 && x <= 9));
        for (const combo of combos) {
            const t1 = hand.find(t => t.type === 'suit' && t.suit === suit && t.val === combo[0]);
            const t2 = hand.find(t => t.type === 'suit' && t.suit === suit && t.val === combo[1]);
            if (t1 && t2) {
                this.hands[p].splice(hand.indexOf(t1), 1);
                this.hands[p].splice(hand.indexOf(t2), 1);
                const sorted = [tile, t1, t2].sort((a, b) => a.val - b.val);
                this.melds[p].push({ type: 'chow', tiles: sorted });
                this.discards.pop();
                this.setStatus(`${this.playerNames[p]} 上「${sorted.map(t => t.label).join('')}」`);
                return;
            }
        }
    }

    /* 執行暗槓 / 加槓 */
    executeKong(p, kongInfo) {
        this.hideActionBar();
        const id = kongInfo.numId;
        if (kongInfo.type === 'ankong') {
            const removed = this.hands[p].filter(t => tileNumId(t) === id);
            removed.forEach(t => this.hands[p].splice(this.hands[p].indexOf(t), 1));
            this.melds[p].push({ type: 'ankong', tiles: removed });
            this.setStatus(`${this.playerNames[p]} 暗槓`);
        } else if (kongInfo.type === 'jiagang') {
            const meld = this.melds[p][kongInfo.meldIndex];
            const extra = this.hands[p].find(t => tileNumId(t) === id);
            this.hands[p].splice(this.hands[p].indexOf(extra), 1);
            meld.type = 'jiagang';
            meld.tiles.push(extra);
            this.setStatus(`${this.playerNames[p]} 加槓「${extra.label}」`);
            // 搶槓判定
            const robber = this.findRobbingKong(p, extra);
            if (robber) {
                this.hands[robber].push(extra);
                this.declareWin(robber, { winType: 'discard', discarder: p, source: 'robbingKong' });
                return;
            }
        }
        this.sortHand(this.hands[p]);
        this.renderAll();
        this.turn = p;
        this.kongStreak++;
        this.drawReplacement(p, 'kong');
    }

    findRobbingKong(p, tile) {
        for (let i = 1; i <= 3; i++) {
            const q = (p + i) % 4;
            if (this.canWinOnDiscard(q, tile, 'robbingKong')) return q;
        }
        return null;
    }

    /* 槓後補牌 */
    drawReplacement(p, reason) {
        if (this.isDestroyed) return;
        if (this.deck.length === 0) { this.drawGame(); return; }
        const tile = this.deck.pop();
        this.updateDeckCount();

        if (tile.type === 'flower') {
            this.flowers[p].push(tile);
            this.renderAll();
            this.setStatus(`${this.playerNames[p]} 補牌摸到花牌「${tile.char}」，再補`);
            const fw = this.checkFlowerWin(p);
            if (fw) { this.declareWin(p, { winType: 'zimo', source: fw }); return; }
            this.aiTimer = setTimeout(() => this.drawReplacement(p, reason), 500);
            return;
        }

        this.hands[p].push(tile);
        this.sortHand(this.hands[p]);
        this.renderAll();

        // 槓上開花 / 連槓開花
        const source = this.kongStreak >= 2 ? 'doubleKong' : 'kong';
        const win = this.evaluateWin(p, { winType: 'zimo', source });
        if (win) { this.declareWin(p, { winType: 'zimo', source, preComputed: win }); return; }

        this.afterDraw(p, false);
    }

    /* ---------------- 胡牌判定與番數 ---------------- */
    isWinningHand(p) {
        const hand = this.hands[p];
        const melds = this.melds[p];
        // 十三么
        if (melds.length === 0 && hand.length === 14 && isThirteenOrphans(hand)) return true;
        const setsNeeded = 4 - melds.length;
        const expected = 3 * setsNeeded + 2;
        if (hand.length !== expected) return false;
        const counts = toCounts(hand);
        return decomposeHand(counts, setsNeeded).length > 0;
    }

    canWinOnDiscard(p, tile, source = 'normal') {
        this.hands[p].push(tile);
        const res = this.evaluateWin(p, { winType: 'discard', source });
        this.hands[p].pop();
        return res != null;
    }

    /* 自摸時的番種來源（人糊、海底撈月等） */
    selfDrawSource(p) {
        if (p !== this.dealer && this.discardsMade === 1) return 'human';
        if (this.deck.length === 0) return 'lastTile';
        return 'normal';
    }

    evaluateWin(p, winInfo) {
        if (!this.isWinningHand(p)) return null;
        const result = this.calculateFan(p, winInfo);
        if (!result) return null;
        if (result.fan < 3) return null; // 三番起糊
        return result;
    }

    calculateFan(p, winInfo) {
        const hand = this.hands[p];
        const melds = this.melds[p];
        const flowers = this.flowers[p];

        // 花糊 / 大花糊
        if (winInfo.source === 'flower7') return { fan: 3, details: ['花糊（七花）'] };
        if (winInfo.source === 'flower8') return { fan: 8, details: ['大花糊（八仙過海）'] };

        // 例牌（獨立計算）
        if (melds.length === 0 && hand.length === 14 && isThirteenOrphans(hand))
            return { fan: 13, details: ['十三么'] };
        if (melds.length === 4 && melds.every(m => ['mingkong', 'ankong', 'jiagang'].includes(m.type)))
            return { fan: 13, details: ['十八羅漢'] };
        if (winInfo.source === 'heavenly') return { fan: 13, details: ['天糊'] };
        if (winInfo.source === 'earthly') return { fan: 13, details: ['地糊'] };
        if (winInfo.source === 'human') return { fan: 13, details: ['人糊'] };
        if (isNineGates(hand, melds)) return { fan: 10, details: ['九蓮寶燈'] };

        // 拆解手牌
        const counts = toCounts(hand);
        const setsNeeded = 4 - melds.length;
        const solutions = decomposeHand(counts, setsNeeded);
        if (solutions.length === 0) return null;

        let best = null;
        for (const sol of solutions) {
            const r = this.scoreHand(p, hand, melds, flowers, sol, winInfo);
            if (!best || r.fan > best.fan) best = r;
        }
        return best;
    }

    scoreHand(p, hand, melds, flowers, sol, winInfo) {
        let fan = 0;
        const details = [];

        // 組合所有面子
        const allSets = [];
        melds.forEach(m => {
            allSets.push({
                kind: (m.type === 'chow') ? 'chow' : 'pung',
                ids: m.tiles.map(t => tileNumId(t)),
                concealed: (m.type === 'ankong'),
                kong: ['mingkong', 'ankong', 'jiagang'].includes(m.type),
            });
        });
        sol.sets.forEach(s => allSets.push({ kind: s.kind, ids: s.ids, concealed: true, kong: false }));
        const pairId = sol.pair;

        // 例牌：大四喜 / 字一色 / 清么九
        const allIds = [];
        allSets.forEach(s => s.ids.forEach(id => allIds.push(id)));
        allIds.push(pairId);
        if (isBigFourWinds(allSets)) return { fan: 13, details: ['大四喜'] };
        if (allIds.every(isHonorId)) return { fan: 10, details: ['字一色'] };
        if (allIds.every(isTerminalOrHonor) && !allIds.some(isHonorId)) return { fan: 10, details: ['清么九'] };

        const allChow = allSets.every(s => s.kind === 'chow');
        const allPung = allSets.every(s => s.kind === 'pung');
        const allConcealed = allSets.every(s => s.concealed);

        // 三元牌 / 風牌統計
        const dragonTriplets = allSets.filter(s => s.kind === 'pung' && isDragonId(s.ids[0])).length;
        const windTriplets = allSets.filter(s => s.kind === 'pung' && isWindId(s.ids[0])).map(s => windIndexOf(s.ids[0]));
        const dragonPair = isDragonId(pairId);
        const windPair = isWindId(pairId);
        const isSmallThreeDragons = dragonTriplets === 2 && dragonPair;
        const isSmallFourWinds = windTriplets.length === 3 && windPair;

        // 花色
        const suitBase = (() => {
            let base = -1, mixed = false, hasHonor = false;
            allIds.forEach(id => {
                if (isHonorId(id)) hasHonor = true;
                else {
                    const b = Math.floor(id / 10);
                    if (base === -1) base = b;
                    else if (base !== b) mixed = true;
                }
            });
            return { base, mixed, hasHonor };
        })();
        const numSuits = suitBase.base === -1 ? 0 : (suitBase.mixed ? 2 : 1);
        const isMixedTerminals = allIds.every(isTerminalOrHonor) && allIds.some(isHonorId);

        // 坎坎糊（四組暗刻自摸）
        const isKankan = allPung && allConcealed && winInfo.winType === 'zimo';

        // ---- 結構番 ----
        if (isKankan) {
            fan += 8; details.push('坎坎糊');
        } else {
            if (allChow) { fan += 1; details.push('平糊'); }
            if (allPung && !isMixedTerminals) { fan += 3; details.push('對對糊'); }
        }

        // ---- 花色番 ----
        if (numSuits === 1 && !suitBase.hasHonor) { fan += 7; details.push('清一色'); }
        else if (numSuits === 1 && suitBase.hasHonor) { fan += 3; details.push('混一色'); }

        // ---- 花么九 ----
        if (isMixedTerminals) { fan += 4; details.push('花么九'); }

        // ---- 三元牌 ----
        if (dragonTriplets === 3) { fan += 8; details.push('大三元'); }
        else if (isSmallThreeDragons) { fan += 5; details.push('小三元'); }
        else if (dragonTriplets > 0) { fan += dragonTriplets; details.push(`三元牌 ×${dragonTriplets}`); }

        // ---- 風牌（門風/圈風） ----
        if (isSmallFourWinds) { fan += 6; details.push('小四喜'); }
        else {
            const roundWindIdx = Math.floor(this.round / 4) % 4;
            windTriplets.forEach(wi => {
                if (wi === roundWindIdx) { fan += 1; details.push('圈風刻'); }
                if (wi === p) { fan += 1; details.push('門風刻'); }
            });
        }

        // ---- 花牌番 ----
        const f = this.scoreFlowers(p, flowers);
        fan += f.fan;
        details.push(...f.details);

        // ---- 附加番 ----
        if (winInfo.winType === 'zimo' && !isKankan) { fan += 1; details.push('自摸'); }
        if (melds.length === 0 && !isKankan) { fan += 1; details.push('門前清'); }
        if (winInfo.source === 'robbingKong') { fan += 1; details.push('搶槓'); }
        if (winInfo.source === 'kong') { fan += 1; details.push('槓上開花'); }
        if (winInfo.source === 'doubleKong') { fan += 8; details.push('連槓開花'); }
        if (winInfo.source === 'lastTile') { fan += 1; details.push('海底撈月'); }

        // 封頂 13 番
        fan = Math.min(fan, 13);
        return { fan, details };
    }

    scoreFlowers(p, flowers) {
        let fan = 0;
        const details = [];
        if (flowers.length === 0) { fan += 1; details.push('無花'); return { fan, details }; }

        const seatNum = SEAT_WIND_NUM[p];
        ['season', 'flower'].forEach(kind => {
            const ofKind = flowers.filter(f => f.kind === kind);
            if (ofKind.length === 4) {
                fan += 2; details.push(kind === 'season' ? '一台花（春夏秋冬）' : '一台花（梅蘭竹菊）');
            } else {
                ofKind.forEach(f => {
                    if (f.seat === seatNum) { fan += 1; details.push('正花'); }
                });
            }
        });
        return { fan, details };
    }

    isBigFourWinds(allSets) {
        const windSet = new Set(allSets.filter(s => s.kind === 'pung' && isWindId(s.ids[0])).map(s => s.ids[0]));
        return windSet.size === 4;
    }

    /* ---------------- 結算 ---------------- */
    fanToBase(fan) {
        const scale = { 3: 4, 4: 8, 5: 16, 6: 24, 7: 32, 8: 48, 9: 64, 10: 96, 11: 128, 12: 192, 13: 256 };
        return scale[Math.min(fan, 13)] || 0;
    }

    declareWin(p, winInfo) {
        if (this.isDestroyed) return;
        if (this.aiTimer) { clearTimeout(this.aiTimer); this.aiTimer = null; }
        this.hideActionBar();

        let result = winInfo.preComputed || this.calculateFan(p, winInfo);
        if (!result) result = { fan: 3, details: ['食糊'] };

        // 三番起糊：不足三番不可食糊（自摸亦然）
        if (result.fan < 3) {
            if (p === 0) {
                this.setStatus('番數不足（需 3 番起糊），不能食糊。請繼續出牌。');
                this.afterDraw(p, false);
            } else {
                this.aiTimer = setTimeout(() => this.aiTurn(p), 600);
            }
            return;
        }

        const base = this.fanToBase(result.fan);
        let points = 0;
        if (winInfo.winType === 'zimo') {
            points = base * 3;
            for (let i = 0; i < 4; i++) {
                if (i !== p) this.scores[i] -= base;
            }
            this.scores[p] += points;
        } else {
            const d = winInfo.discarder;
            points = base * 3;
            this.scores[d] -= points;
            this.scores[p] += points;
        }

        this.renderAll();
        this.updatePlayerInfoUI();

        const winTypeText = winInfo.winType === 'zimo' ? '自摸' : '食糊';
        this.roundOver = true;
        this.showResultOverlay(p, winTypeText, result.details, result.fan, points);
    }

    drawGame() {
        if (this.isDestroyed) return;
        if (this.aiTimer) { clearTimeout(this.aiTimer); this.aiTimer = null; }
        this.hideActionBar();
        this.roundOver = true;
        this.showResultOverlay(-1, null, ['流局'], 0, 0);
    }

    showResultOverlay(winner, winTypeText, details, fan, points) {
        const overlay = document.getElementById('result-overlay');
        const text = document.getElementById('result-text');
        const nextBtn = document.getElementById('result-next');
        overlay.classList.remove('hidden');

        if (winner === -1) {
            text.innerHTML = '🀄 流局 🀄<br>牌山已摸完，無人食糊。';
        } else {
            const name = this.playerNames[winner];
            const fanStr = fan >= 13 ? `${fan} 番（爆棚）` : `${fan} 番`;
            text.innerHTML =
                `🀄 ${name} ${winTypeText}！ 🀄<br>` +
                `牌型：${details.join(' + ')}<br>` +
                `番數：${fanStr}<br>` +
                `得分：+${points} 分`;
        }

        nextBtn.onclick = () => {
            this.hideResultOverlay();
            this.round++;
            this.dealer = (this.dealer + 1) % 4;
            this.startNewRound();
        };
    }

    hideResultOverlay() {
        document.getElementById('result-overlay').classList.add('hidden');
    }

    /* ---------------- 玩家動作列 ---------------- */
    refreshPlayerActionBar() {
        if (this.turn !== 0) { this.hideActionBar(); return; }
        const winSrc = this.selfDrawSource(0);
        const win = this.evaluateWin(0, { winType: 'zimo', source: winSrc });
        const kong = this.findAvailableKong(0);
        const bar = document.getElementById('action-bar');
        const show = (id, on) => document.getElementById(id).classList.toggle('hidden', !on);

        const hasAny = !!(win || kong);
        bar.classList.toggle('hidden', !hasAny);
        show('btn-zimo', !!win);
        show('btn-kong-self', !!kong);
        if (win) {
            document.getElementById('btn-zimo').onclick = () => {
                this.declareWin(0, { winType: 'zimo', source: winSrc, preComputed: win });
            };
        }
        if (kong) {
            document.getElementById('btn-kong-self').onclick = () => this.executeKong(0, kong);
        }
        if (!hasAny) this.setStatus('輪到你：點擊手牌出牌');
    }

    showActionBar(action, tile) {
        const bar = document.getElementById('action-bar');
        bar.classList.remove('hidden');
        ['btn-hu', 'btn-pong', 'btn-kong', 'btn-chow', 'btn-zimo', 'btn-kong-self'].forEach(id =>
            document.getElementById(id).classList.add('hidden'));
        document.getElementById('btn-pass').classList.remove('hidden');

        if (action === 'win') {
            document.getElementById('btn-hu').classList.remove('hidden');
            document.getElementById('btn-hu').onclick = () => this.playerClaim('win');
        } else if (action === 'pong') {
            document.getElementById('btn-pong').classList.remove('hidden');
            document.getElementById('btn-pong').onclick = () => this.playerClaim('pong');
        } else if (action === 'kong') {
            document.getElementById('btn-kong').classList.remove('hidden');
            document.getElementById('btn-kong').onclick = () => this.playerClaim('kong');
        } else if (action === 'chow') {
            document.getElementById('btn-chow').classList.remove('hidden');
            document.getElementById('btn-chow').onclick = () => this.playerClaim('chow');
        }
        document.getElementById('btn-pass').onclick = () => this.playerPass();
        this.setStatus('有人打出牌，你可以鳴牌或過');
    }

    playerClaim(action) {
        if (!this.pendingClaim) return;
        const { tile, discarder, claims } = this.pendingClaim;
        const c = claims.find(x => x.player === 0 && x.action === action);
        this.executeClaim(0, action, tile, discarder, c ? c.source : 'normal');
    }

    playerPass() {
        if (!this.pendingClaim) return;
        const { claims, tile, discarder } = this.pendingClaim;
        this.pendingClaim = null;
        this.hideActionBar();
        // 過後若有其他家可鳴牌（同優先級），由 AI 鳴牌；否則進入下家摸牌
        const others = claims.filter(c => c.player !== 0);
        if (others.length > 0) {
            this.resolveAiClaim(others, tile, discarder);
        } else {
            this.turn = (discarder + 1) % 4;
            this.aiTimer = setTimeout(() => this.startTurn(), 400);
        }
    }

    /* ---------------- UI 渲染 ---------------- */
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

    updateRoundInfoUI() {
        const roundWind = SEAT_WIND_CHAR[Math.floor(this.round / 4) % 4];
        const el = document.getElementById('round-info');
        if (el) el.innerText = `第 ${this.round + 1} 局 · ${roundWind}風圈 · 莊家：${this.playerNames[this.dealer]}`;
    }

    updateDeckCount() {
        document.getElementById('deck-count').innerText = this.deck.length;
    }

    setStatus(msg) {
        const el = document.getElementById('status-bar');
        if (el) el.innerText = msg;
    }

    hideActionBar() {
        document.getElementById('action-bar').classList.add('hidden');
    }

    makeTileElement(tile, hidden) {
        const div = document.createElement('div');
        div.className = `tile ${tile.className}`;
        if (hidden) {
            div.style.background = '#2e8b57';
            div.innerHTML = '';
            return div;
        }
        this.renderTileContent(div, tile, false);
        return div;
    }

    renderAll() {
        for (let p = 0; p < 4; p++) {
            const handDiv = document.querySelector(`#player-${p} .hand`);
            const meldsDiv = document.querySelector(`#player-${p} .melds`);
            handDiv.innerHTML = '';
            meldsDiv.innerHTML = '';

            // 手牌
            this.hands[p].forEach((tile, index) => {
                const hidden = (p !== 0);
                const tileDiv = this.makeTileElement(tile, hidden);
                if (p === 0) tileDiv.onclick = () => this.playerDiscard(index);
                handDiv.appendChild(tileDiv);
            });

            // 花牌（翻開）
            this.flowers[p].forEach(f => {
                meldsDiv.appendChild(this.makeTileElement(f, false));
            });

            // 鳴牌
            this.melds[p].forEach(m => {
                const group = document.createElement('div');
                group.className = 'meld-group';
                m.tiles.forEach((t, i) => {
                    let hidden = false;
                    if (m.type === 'ankong') hidden = (i === 1 || i === 2);
                    group.appendChild(this.makeTileElement(t, hidden));
                });
                meldsDiv.appendChild(group);
            });
        }
        this.updateDeckCount();
        this.updateRoundInfoUI();
    }

    renderTileContent(tileDiv, tile, isHidden) {
        if (isHidden) {
            tileDiv.style.background = '#2e8b57';
            tileDiv.innerHTML = '';
            return;
        }
        tileDiv.style.background = 'var(--tile-bg)';

        if (tile.type === 'flower') {
            tileDiv.style.background = (tile.kind === 'season') ? '#eaf3ff' : '#fff0f0';
            tileDiv.innerHTML = `<div class="flower-inner">${tile.char}</div>`;
        } else if (tile.isBai) {
            tileDiv.innerHTML = '<div class="bai-frame"></div>';
        } else if (tile.isOneTiao) {
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
            tileDiv.innerHTML = this.getTongSVG(tile.val);
        } else if (tile.suit === 'tiao') {
            tileDiv.innerHTML = this.getSuoSVG(tile.val);
        } else {
            tileDiv.innerText = tile.label;
        }
    }

    renderDiscards() {
        const pool = document.getElementById('discard-pile');
        pool.innerHTML = '';
        this.discards.forEach(tile => {
            pool.appendChild(this.makeTileElement(tile, false));
        });
    }

    /* ---------------- SVG 繪製（筒子/索子） ---------------- */
    drawStick(x, y1, y2, color = "#008000") {
        const ymid = (y1 + y2) / 2, r = 2.8, sw = 2.2;
        return `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" />
                <circle cx="${x}" cy="${y1}" r="${r}" fill="${color}" />
                <circle cx="${x}" cy="${ymid}" r="${r}" fill="${color}" />
                <circle cx="${x}" cy="${y2}" r="${r}" fill="${color}" />`;
    }
    drawSlantedStick(x1, y1, x2, y2, color = "#008000") {
        const xmid = (x1 + x2) / 2, ymid = (y1 + y2) / 2, r = 2.5, sw = 2.0;
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" />
                <circle cx="${x1}" cy="${y1}" r="${r}" fill="${color}" />
                <circle cx="${xmid}" cy="${ymid}" r="${r}" fill="${color}" />
                <circle cx="${x2}" cy="${y2}" r="${r}" fill="${color}" />`;
    }
    getSuoSVG(val) {
        const s = this.drawStick.bind(this);
        const ss = this.drawSlantedStick.bind(this);
        let content = '';
        if (val === 2) content = s(30, 18, 46) + s(30, 54, 82);
        else if (val === 3) content = s(30, 16, 42) + s(18, 56, 84) + s(42, 56, 84, "#cc0000");
        else if (val === 4) content = s(18, 16, 44) + s(42, 16, 44, "#cc0000") + s(18, 56, 84, "#cc0000") + s(42, 56, 84);
        else if (val === 5) content = s(16, 16, 42) + s(44, 16, 42) + s(30, 37, 63, "#cc0000") + s(16, 58, 84) + s(44, 58, 84);
        else if (val === 6) content = s(14, 16, 44) + s(30, 16, 44) + s(46, 16, 44) + s(14, 56, 84) + s(30, 56, 84) + s(46, 56, 84);
        else if (val === 7) content = s(30, 12, 36, "#cc0000") + s(14, 46, 68) + s(30, 46, 68) + s(46, 46, 68) + s(14, 72, 92) + s(30, 72, 92) + s(46, 72, 92);
        else if (val === 8) content = ss(10, 16, 20, 38) + ss(20, 38, 30, 16) + ss(30, 16, 40, 38) + ss(40, 38, 50, 16) + ss(10, 78, 20, 56) + ss(20, 56, 30, 78) + ss(30, 78, 40, 56) + ss(40, 56, 50, 78);
        else if (val === 9) content = s(14, 14, 38) + s(30, 14, 38, "#cc0000") + s(46, 14, 38, "#0033cc") + s(14, 42, 64) + s(30, 42, 64, "#cc0000") + s(46, 42, 64, "#0033cc") + s(14, 68, 90) + s(30, 68, 90, "#cc0000") + s(46, 68, 90, "#0033cc");
        return `<svg class="tile-svg" viewBox="0 0 60 100">${content}</svg>`;
    }
    drawDot(cx, cy, r = 7, color = "#0033cc") {
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" /><circle cx="${cx}" cy="${cy}" r="${(r * 0.35).toFixed(1)}" fill="#faf9f5" />`;
    }
    getTongSVG(val) {
        const d = this.drawDot.bind(this);
        let content = '';
        if (val === 1) content = `<circle cx="30" cy="50" r="22" fill="none" stroke="#008000" stroke-width="3" /><circle cx="30" cy="50" r="18" fill="none" stroke="#cc0000" stroke-width="2" /><circle cx="30" cy="50" r="14" fill="#0033cc" /><circle cx="30" cy="50" r="8" fill="#cc0000" /><circle cx="30" cy="50" r="3" fill="#faf9f5" />`;
        else if (val === 2) content = d(30, 28, 11) + d(30, 72, 11, "#008000");
        else if (val === 3) content = d(16, 24, 9) + d(30, 50, 9, "#cc0000") + d(44, 76, 9, "#008000");
        else if (val === 4) content = d(18, 28, 9) + d(42, 28, 9, "#008000") + d(18, 72, 9, "#008000") + d(42, 72, 9);
        else if (val === 5) content = d(16, 22, 8) + d(44, 22, 8, "#008000") + d(30, 50, 9, "#cc0000") + d(16, 78, 8, "#008000") + d(44, 78, 8);
        else if (val === 6) content = d(18, 22, 7.5, "#008000") + d(42, 22, 7.5, "#008000") + d(18, 50, 7.5, "#cc0000") + d(42, 50, 7.5, "#cc0000") + d(18, 78, 7.5, "#cc0000") + d(42, 78, 7.5, "#cc0000");
        else if (val === 7) content = d(14, 18, 6.5) + d(30, 27, 6.5) + d(46, 36, 6.5) + d(18, 60, 7, "#cc0000") + d(42, 60, 7, "#cc0000") + d(18, 82, 7, "#cc0000") + d(42, 82, 7, "#cc0000");
        else if (val === 8) content = d(18, 18, 6.5) + d(42, 18, 6.5) + d(18, 39, 6.5) + d(42, 39, 6.5) + d(18, 61, 6.5) + d(42, 61, 6.5) + d(18, 82, 6.5) + d(42, 82, 6.5);
        else if (val === 9) content = d(14, 20, 6.5) + d(30, 20, 6.5) + d(46, 20, 6.5) + d(14, 50, 6.5, "#cc0000") + d(30, 50, 6.5, "#cc0000") + d(46, 50, 6.5, "#cc0000") + d(14, 80, 6.5, "#008000") + d(30, 80, 6.5, "#008000") + d(46, 80, 6.5, "#008000");
        return `<svg class="tile-svg" viewBox="0 0 60 100">${content}</svg>`;
    }

    /* ---------------- 教學 ---------------- */
    showTutorialIntro() {
        const overlay = document.getElementById('tutorial-overlay');
        const text = document.getElementById('tutorial-text');
        const nextBtn = document.getElementById('tutorial-next');
        overlay.classList.remove('hidden');
        text.innerText = '歡迎來到香港麻雀（正宗清章）！下方是你的手牌。目標是湊齊「四組面子（順子/刻子/槓子）+ 一對眼」，或特殊牌型（十三么、大三元等）。\n\n打牌流程：摸牌 → 補花 → 出牌；別人打出的牌你可「碰 / 上（吃）/ 槓 / 胡」。花牌（春夏秋冬、梅蘭竹菊）摸到即翻開並補牌。\n\n本局採「3 番起糊」。點「下一步」開始。';
        nextBtn.onclick = () => overlay.classList.add('hidden');
    }
}

// =====================================================================
// 畫面切換 / History / 自適應（保持原有行為）
// =====================================================================
let historyApiAvailable = true;
let gameToken = 0;

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

function returnToMenu() {
    if (window.game) { window.game.destroy(); window.game = null; }
    showMenuScreen();
}

function startGame(mode) {
    const inputVal = document.getElementById('player-name-input').value.trim();
    const playerName = inputVal !== '' ? inputVal : '雀神';
    showGameScreen();
    window.game = new MahjongGame(mode, playerName);
    window.game.token = ++gameToken;
    try { history.pushState({ page: 'game', token: gameToken }, ''); }
    catch (e) { historyApiAvailable = false; }
}

function goBack() {
    if (historyApiAvailable && history.state && history.state.page === 'game') {
        history.back();
    } else {
        returnToMenu();
    }
}

window.addEventListener('popstate', (e) => {
    const page = (e.state && e.state.page) || 'menu';
    if (page === 'game' && window.game && window.game.token === e.state.token) {
        showGameScreen();
    } else {
        if (page === 'game') {
            try { history.replaceState({ page: 'menu' }, ''); } catch (err) {}
        }
        returnToMenu();
    }
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('mahjong-table').classList.contains('hidden')) {
        goBack();
    }
});

function autoFitGameArea() {
    const container = document.getElementById('game-container');
    if (!container) return;
    const targetWidth = 1800, targetHeight = 1400;
    const scale = Math.min(window.innerWidth / targetWidth, window.innerHeight / targetHeight) * 0.95;
    container.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

window.addEventListener('DOMContentLoaded', () => {
    try { history.replaceState({ page: 'menu' }, ''); } catch (e) { historyApiAvailable = false; }
    autoFitGameArea();
});
window.addEventListener('load', autoFitGameArea);
window.addEventListener('resize', autoFitGameArea);
