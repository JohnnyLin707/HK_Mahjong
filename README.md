<p align="center">
  <h1 align="center">🀄 Hong Kong Mahjong (香港麻雀)</h1>
</p>

<p align="center">
  <b>Select Language / 選擇語言 / 选择语言</b><br>
  <a href="./README.md">English</a> •
  <a href="./README.zh-TW.md">繁體中文</a> •
  <a href="./README.zh-CN.md">简体中文</a>
</p>

---

## 🌐 English

### 🚀 Live Demo
Play directly in your browser: **[https://johnnylin707.github.io/HK_Mahjong/](https://johnnylin707.github.io/HK_Mahjong/)**

### ✨ Key Features
* **🎨 Authentic SVG Tile Rendering**: Custom SVG code rendering crisp tiles for Wanzi, Tongzi, and Suozi (including classical 7, 8, and 9 Suo patterns, 1-Tiao Peacock, and Dragon White Frame).
* **👤 Customizable Player Profile**: Enter your own nickname on the main menu, displayed alongside 3 AI opponents (`AI 雀聖`, `AI 雀仙`, `AI 雀神`) with real-time score tracking.
* **🤖 Multiple Game Modes**: Includes **Tutorial Mode** for beginners, as well as **Easy** and **Medium AI** play modes.
* **📱 Adaptive Layout Scaling**: Optimized for a 1800x1400 canvas while auto-scaling seamlessly across desktop and laptop screens.
* **⚡ Zero Dependencies**: 100% Vanilla JS, HTML, and CSS without any heavy frameworks or external packages.

### 🛠️ Local Development
1. Clone the repository:
   ```bash
   git clone https://github.com/JohnnyLin707/HK_Mahjong.git
   ```
2. Open `index.html` in your browser, or serve it locally:
   ```bash
   cd HK_Mahjong
   python3 -m http.server 8000
   # then visit http://localhost:8000
   ```

### 📖 Rules
This project implements authentic Hong Kong Mahjong scoring: 144 tiles (including 8 bonus/flower tiles 春 夏 秋 冬 梅 蘭 竹 菊), self-draw (自摸), melds (碰 / 吃 / 杠), and a full fan (番) scoring system — 平糊, 對對糊, 混一色, 清一色, 大三元, 十三么, and more.

### 📄 License
MIT
