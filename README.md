# ♟️ Master PGN Generator

A professional web-based PGN (Portable Game Notation) generator for chess games. Create and export perfectly formatted PGN files with comprehensive game metadata and annotations.

## ✨ Features

### 📝 PGN Generation
- **Complete PGN Headers**: Event, Site, Date, Round, Player info, Result, and more
- **Chess.com Compatible**: Generates PGNs with proper formatting for chess.com analysis
- **Move Annotations**: Support for NAG (Numeric Annotation Glyphs) and text annotations
- **Export Options**: Copy to clipboard or download as .pgn file

### 🏆 Annotation System
- **Comprehensive Move Analysis**:
  - ❌ Blunder (??), Mistake (?), Inaccuracy (?!)
  - ✅ Good (!), Excellent, Best Move, Great Find (!), Brilliant (!!)
  - 📚 Book moves, Interesting moves (!?)
  - 👁️ Missed opportunities

### 🎮 Interactive Chess Board
- **Visual Move Input**: Click or drag pieces to input moves
- **Move Validation**: Ensures legal chess moves only
- **Visual Feedback**: Highlights valid moves, captures, and checks
- **Analysis Tools**: Right-click to draw arrows and highlight squares

### 👥 Player Management
- **Professional Profiles**: Player names, titles (GM, IM, FM, etc.), Elo ratings
- **Country Flags**: Support for international player representation
- **Avatar URLs**: Chess.com compatible avatar links
- **Custom Metadata**: Event names, locations, dates

### 💾 Export Options
- **Copy to Clipboard**: One-click PGN copying
- **File Download**: Direct .pgn file download
- **Full Headers**: Complete PGN metadata for professional use

## 🚀 Quick Start

1. **Download all files**:
   - `index.html`
   - `style.css`
   - `chess.js`
   - `fonts/minecraft.ttf` (optional)
   - `sounds/` directory
   - `chess pieces/` directory

2. **Open `index.html`** in your web browser

3. **Set up game information** in the sidebar:
   - Match details (date, event, site)
   - Player information (names, titles, Elo, flags, avatars)

4. **Input the game moves** using the chess board

5. **Annotate moves** using the annotation panel

6. **Generate PGN** and export via copy or download

## 🎯 Usage Guide

### Setting Up Players
- **Titles**: Select from GM, IM, FM, CM, NM, WGM, WIM, WFM, WCM
- **Elo Ratings**: Input numerical ratings
- **Country Flags**: Use numeric flag IDs (0-245)
- **Avatars**: Paste full chess.com avatar URLs

### Inputting Moves
- Click a piece then click destination square
- Or drag pieces directly to target squares
- Promotion automatically triggers piece selection
- Castling, en passant, and all special moves supported

### Annotating the Game
- Use the annotation buttons after each move
- Right-click and drag to draw analysis arrows
- Right-click squares to highlight important positions
- Annotations appear in both move history and final PGN

### Generating PGN
- Click "Generate PGN" to view the complete notation
- Use "Copy PGN" to copy to clipboard
- Use "Download" to save as .pgn file

## 📋 PGN Output Format

The generator produces professional PGN files with:

```pgn
[Event "Event Name"]
[Site "Site Location"] 
[Date "2024.01.15"]
[Round "?"]
[White "Player Name"]
[Black "Opponent Name"]
[Result "*"]
[WhiteTitle "GM"]
[BlackTitle "IM"]
[WhiteElo "2650"]
[BlackElo "2520"]
[WhiteCountry "1"]
[BlackCountry "2"]
[WhiteUrl "avatar_url"]
[BlackUrl "avatar_url"]
[Termination ""]

1. e4 {[%c_effect e4;square;e4;type;Good;persistent;true]} e5 2. Nf3 $1 Nc6 $2
```

## 📸 Preview
<img width="672" height="371" alt="image_2025-11-24_163117547-removebg-preview" src="https://github.com/user-attachments/assets/17fc0df2-03e3-4f0c-b482-ca6ed5f87dd6" />

---

## 📜 License

This project is open-source and free to use under the MIT License.
