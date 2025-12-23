class ChessGame {
	constructor() {
	    // Game state
	    this.board = Array(8).fill().map(() => Array(8).fill(null));
	    this.currentPlayer = 'white';
	    this.selectedPiece = null;
	    this.validMoves = [];
	    this.moveHistory = [];
	    this.redoStack = [];
	    this.gameOver = false;
	    this.enPassantTarget = null;
	    this.castlingRights = {
		   white: { kingside: true, queenside: true },
		   black: { kingside: true, queenside: true }
	    };
 
	    // UI state
	    this.rightClickHighlights = new Set();
	    this.arrows = [];
	    this.arrowDragStart = null;
	    this.pendingPromotion = null;
	    this.isFlipped = false;
	    
	    // Drag & Drop State
	    this.dragOrigin = null;
	    this.draggedPiece = null;
	    this.dragGhost = null;
 
	    // Audio
	    this.sounds = {};
	    this.audioUnlocked = false;
 
	    // Simplified notation system - only one active notation
	    this.notationIcons = {
		   'Brilliant': 'notation icons/brilliant.png',
		   'GreatFind': 'notation icons/great.png', 
		   'BestMove': 'notation icons/best.png',
		   'Excellent': 'notation icons/excellent.png',
		   'Good': 'notation icons/good.png',
		   'Book': 'notation icons/book.png',
		   'Inaccuracy': 'notation icons/inaccuracy.png',
		   'Interesting': 'notation icons/interesting.png',
		   'Miss': 'notation icons/miss.png',
		   'Mistake': 'notation icons/mistake.png',
		   'Blunder': 'notation icons/blunder.png',
		   'None': null
	    };
	    
	    // Track only the current move's annotation
	    this.currentMoveAnnotation = null;
	    this.currentMoveSquare = null; // {row, col} of the move being annotated
 
	    // PGN Headers
	    const now = new Date();
	    this.pgnHeaders = {
		   Event: "OTB", 
		   Site: "Chess.com", 
		   Date: now.toISOString().split('T')[0].replace(/-/g, '.'),
		   Round: "?",
		   White: "White", 
		   Black: "Black",
		   Result: "*",
		   WhiteElo: "",
		   BlackElo: "",
		   WhiteTitle: "",
		   BlackTitle: "",
		   WhiteUrl: "",
		   BlackUrl: "",
		   WhiteCountry: "",
		   BlackCountry: "",
		   Termination: ""
	    };
 
	    // Initialization Sequence
	    this.initInputs();
	    this.injectCustomStyles();
	    this.loadSounds();
	    this.setupAudioUnlock();
	    this.attachEventListeners();
	    this.setupGame();
	}
 
	setupGame() {
		this.currentPlayer = 'white';
		this.moveHistory = [];
		this.redoStack = [];
		this.gameOver = false;
		this.rightClickHighlights.clear();
		this.arrows = [];
		this.selectedPiece = null;
		this.validMoves = [];
		this.castlingRights = {
		    white: { kingside: true, queenside: true },
		    black: { kingside: true, queenside: true }
		};
		this.enPassantTarget = null;
		
		// Clear current annotation
		this.currentMoveAnnotation = null;
		this.currentMoveSquare = null;
	 
		this.createBoard();
		this.setupPieces();
		this.updateDisplay();
		this.updateCoordinates();
		this.updatePlayerHeaders();
		
		setTimeout(() => this.playSound('start'), 500);
	 }
 
	loadCountryData() {
	    fetch('country_code.txt')
		   .then(response => response.text())
		   .then(text => {
			  const countries = this.parseCountryData(text);
			  this.populateCountrySelects(countries);
		   })
		   .catch(error => {
			  console.error('Error loading country data:', error);
		   });
	}
 
	parseCountryData(text) {
	    const lines = text.split('\n');
	    const countries = [];
	    for(const line of lines) {
		   const match = line.match(/^(\d+)\.(.+)$/);
		   if(match) {
			  const code = parseInt(match[1]);
			  const name = match[2].trim();
			  countries.push({code, name});
		   }
	    }
	    return countries.sort((a, b) => a.name.localeCompare(b.name));
	}
 
	populateCountrySelects(countries) {
	    ['white-country', 'black-country'].forEach(id => {
		   const select = document.getElementById(id);
		   if(select) {
			  // Clear existing options except the first one
			  select.innerHTML = '<option value="">Select Country</option>';
			  
			  countries.forEach(country => {
				 const option = document.createElement('option');
				 option.value = country.code;
				 option.textContent = country.name;
				 select.appendChild(option);
			  });
			  
			  // Set current value if it exists
			  const color = id.split('-')[0];
			  const headerKey = color.charAt(0).toUpperCase() + color.slice(1) + 'Country';
			  if(this.pgnHeaders[headerKey]) {
				 select.value = this.pgnHeaders[headerKey];
			  }
		   }
	    });
	}
 
	// ========== INPUT & SETTINGS ==========
	initInputs() {
	    // Load country data
	    this.loadCountryData();
	    
	    if(document.getElementById('date-dd')) {
		   const [yyyy, mm, dd] = this.pgnHeaders.Date.split('.');
		   document.getElementById('date-dd').value = dd;
		   document.getElementById('date-mm').value = mm;
		   document.getElementById('date-yyyy').value = yyyy;
	    }
	 
	    const bindInput = (id, headerKey) => {
		   const el = document.getElementById(id);
		   if(el) el.addEventListener('input', (e) => {
			  this.pgnHeaders[headerKey] = e.target.value;
			  this.updatePlayerHeaders();
		   });
	    };
	 
	    bindInput('match-event', 'Event');
	    bindInput('match-site', 'Site');
	    bindInput('white-name', 'White');
	    bindInput('black-name', 'Black');
	    bindInput('white-elo', 'WhiteElo');
	    bindInput('black-elo', 'BlackElo');
	    bindInput('white-title', 'WhiteTitle');
	    bindInput('black-title', 'BlackTitle');
	    bindInput('white-country', 'WhiteCountry');
	    bindInput('black-country', 'BlackCountry');
	    
	    // Add event listeners for direct player name inputs
	    const bindNameInput = (id, headerKey) => {
		   const el = document.getElementById(id);
		   if(el) el.addEventListener('input', (e) => {
			  this.pgnHeaders[headerKey] = e.target.value;
			  // Also update the sidebar input for consistency
			  const sidebarEl = document.getElementById(headerKey.toLowerCase() + '-name');
			  if(sidebarEl) sidebarEl.value = e.target.value;
		   });
	    };
	 
	    bindNameInput('disp-white-name', 'White');
	    bindNameInput('disp-black-name', 'Black');
	 
	    ['date-dd', 'date-mm', 'date-yyyy'].forEach(id => {
		   const el = document.getElementById(id);
		   if(el) el.addEventListener('input', () => {
			  const d = (document.getElementById('date-dd').value || '??').padStart(2,'0');
			  const m = (document.getElementById('date-mm').value || '??').padStart(2,'0');
			  const y = document.getElementById('date-yyyy').value || '????';
			  this.pgnHeaders.Date = `${y}.${m}.${d}`;
		   });
	    });
	 
	    // Simple avatar URL handling - users type full URL
	    ['white', 'black'].forEach(color => {
	    const el = document.getElementById(`${color}-avatar`);
	    if(el) el.addEventListener('input', (e) => {
		   this.pgnHeaders[`${color.charAt(0).toUpperCase() + color.slice(1)}Url`] = e.target.value || "";
		   this.updatePlayerHeaders();
	    });
	    });
	 }
 
	updatePlayerHeaders() {
	    const updateSide = (color) => {
		   const cap = color.charAt(0).toUpperCase() + color.slice(1);
		   
		   // Update display name input
		   const nameInputEl = document.getElementById(`disp-${color}-name`);
		   if(nameInputEl && nameInputEl.value !== this.pgnHeaders[cap]) {
			  nameInputEl.value = this.pgnHeaders[cap] || cap;
		   }
		   
		   const title = this.pgnHeaders[`${cap}Title`];
		   const titleEl = document.getElementById(`disp-${color}-title`);
		   if(titleEl) {
			  titleEl.textContent = title;
			  titleEl.style.display = title ? 'inline-block' : 'none';
		   }
	 
		   const elo = this.pgnHeaders[`${cap}Elo`];
		   const flag = this.pgnHeaders[`${cap}Country`];
		   const eloEl = document.getElementById(`disp-${color}-elo`);
		   if(eloEl) eloEl.textContent = elo ? `(${elo})` : '';
		   const flagEl = document.getElementById(`disp-${color}-flag`);
		   if(flagEl) {
			  if(flag) {
				 flagEl.innerHTML = `<img src="https://images.chesscomfiles.com/uploads/v1/flags/${flag}.png" 
										alt="${flag}" 
										onerror="this.style.display='none'"
										style="width: 20px; height: 15px; vertical-align: middle; margin-left: 5px; border-radius: 2px;">`;
			  } else {
				 flagEl.innerHTML = '';
			  }
		   }
	 
		   const url = this.pgnHeaders[`${cap}Url`];
		   const imgEl = document.getElementById(`img-${color}`);
		   if(imgEl) imgEl.src = url || "https://www.chess.com/bundles/web/images/noavatar_l.84a92436.gif";
	    };
	    updateSide('white');
	    updateSide('black');
	 }
 
	// ========== AUDIO & STYLES ==========
	injectCustomStyles() {
	    const style = document.createElement('style');
	    style.innerHTML = `
		   .arrow-layer { pointer-events: none; z-index: 90; }
		   .notation-icon-layer {
			  position: absolute;
			  top: 0;
			  left: 0;
			  width: 100%;
			  height: 100%;
			  pointer-events: none;
			  z-index: 25;
		   }
		   .notation-icon {
			  position: absolute;
			  width: 20px;
			  height: 20px;
			  pointer-events: none;
			  z-index: 26;
			  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.7));
		   }
	    `;
	    document.head.appendChild(style);
	}
 
	loadSounds() {
	    // RESTORED: Your custom local file paths based on your screenshot
	    this.soundFiles = {
		   'white-move': 'sounds/white move.mp3',
		   'black-move': 'sounds/black move.mp3',
		   'white-capture': 'sounds/white capture.mp3',
		   'black-capture': 'sounds/black capture.mp3',
		   'white-castle': 'sounds/white castle.mp3',
		   'black-castle': 'sounds/black castle.mp3',
		   'white-check': 'sounds/white check.mp3',
		   'black-check': 'sounds/black check.mp3',
		   'game-over': 'sounds/game over.mp3',
		   'promote': 'sounds/promote.mp3',
		   'start': 'sounds/start.mp3'
	    };
 
	    for (const [name, url] of Object.entries(this.soundFiles)) {
		   this.sounds[name] = new Audio(url);
		   this.sounds[name].preload = 'auto';
	    }
	}
 
	setupAudioUnlock() {
	    const unlock = () => {
		   this.audioUnlocked = true;
		   const s = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
		   s.play().catch(()=>{});
		   ['click','keydown','mousedown'].forEach(e => document.removeEventListener(e, unlock));
	    };
	    ['click','keydown','mousedown'].forEach(e => document.addEventListener(e, unlock));
	}
 
	playSound(name) {
	    if(this.sounds[name]) {
		   const s = this.sounds[name].cloneNode();
		   s.volume = 0.7;
		   s.play().catch(e => console.warn("Sound error:", e));
	    }
	}
 
	// ========== BOARD & PIECES ==========
	createBoard() {
	    const board = document.getElementById('chessboard');
	    if(!board) return;
	    board.innerHTML = '';
	    
	    // Create notation icon layer
	    this.notationLayer = document.createElement('div');
	    this.notationLayer.className = 'notation-icon-layer';
	    board.appendChild(this.notationLayer);
	    
	    const svgNS = "http://www.w3.org/2000/svg";
	    this.svgLayer = document.createElementNS(svgNS, "svg");
	    this.svgLayer.setAttribute("class", "arrow-layer");
	    this.svgLayer.setAttribute("viewBox", "0 0 100 100");
	    this.svgLayer.style.position = "absolute";
	    this.svgLayer.style.width = "100%";
	    this.svgLayer.style.height = "100%";
	    board.appendChild(this.svgLayer);
 
	    for(let r=0; r<8; r++){
		   for(let c=0; c<8; c++){
			  const sq = document.createElement('div');
			  sq.className = `square ${(r+c)%2===0?'light':'dark'}`;
			  sq.dataset.row = r;
			  sq.dataset.col = c;
			  sq.addEventListener('click', (e) => this.handleSquareClick(e, r, c));
			  sq.addEventListener('mousedown', (e) => this.handleMouseDown(e, r, c));
			  sq.addEventListener('mouseup', (e) => this.handleMouseUp(e, r, c));
			  sq.addEventListener('contextmenu', (e) => e.preventDefault());
			  board.appendChild(sq);
		   }
	    }
	}
 
	setupPieces() {
	    this.board.map(r => r.fill(null));
	    const setRow = (c, r, p) => p.forEach((t, col) => this.board[r][col] = {type: t, color: c});
	    setRow('black', 0, ['rook','knight','bishop','queen','king','bishop','knight','rook']);
	    setRow('black', 1, Array(8).fill('pawn'));
	    setRow('white', 6, Array(8).fill('pawn'));
	    setRow('white', 7, ['rook','knight','bishop','queen','king','bishop','knight','rook']);
	}
 
	getPieceImage(type, color) {
	    const map = {
		   white: {king:'wk',queen:'wq',rook:'wr',bishop:'wb',knight:'wn',pawn:'wp'},
		   black: {king:'bk',queen:'bq',rook:'br',bishop:'bb',knight:'bn',pawn:'bp'}
	    };
	    return `chess pieces/${map[color][type]}.png`;
	}
 
	getLogicalPos(domRow, domCol) {
	    return this.isFlipped ? {row: 7-domRow, col: 7-domCol} : {row: domRow, col: domCol};
	}
 
	// ========== UI UPDATES ==========
	updateDisplay() {
	    this.updateBoardSquares();
	    this.updateSelectionAndMoves();
	    this.updateCheckHighlight();
	    this.updatePlayerStates();
	    this.updateStatus();
	    this.drawArrows();
	    this.drawNotationIcon();
	}
 
	updateBoardSquares() {
	    document.querySelectorAll('.square').forEach(sq => {
		   const vr = parseInt(sq.dataset.row);
		   const vc = parseInt(sq.dataset.col);
		   const {row, col} = this.getLogicalPos(vr, vc);
		   const p = this.board[row][col];
		   sq.innerHTML = '';
		   
		   // Clear ALL visual classes first
		   sq.classList.remove('selected', 'valid-move', 'valid-capture', 'in-check', 'castle-move', 'right-click-highlight');
		   
		   // Then add back what's needed
		   if(this.rightClickHighlights.has(`${row},${col}`)) {
			  sq.classList.add('right-click-highlight');
		   }
		   
		   if(p) {
			  const img = document.createElement('img');
			  img.src = this.getPieceImage(p.type, p.color);
			  
			  if (this.draggedPiece && 
				 this.dragOrigin && 
				 this.dragOrigin.row === row && 
				 this.dragOrigin.col === col) {
				 img.classList.add('drag-hide');
			  }
			  sq.appendChild(img);
		   }
	    });
	 }
 
	// Simplified - only draw one notation icon
	drawNotationIcon() {
		// Clear existing notation icon
		this.notationLayer.innerHTML = '';
		
		// Only draw if we have an active annotation and move square
		if (this.currentMoveAnnotation && this.currentMoveSquare && this.currentMoveAnnotation !== 'None') {
		    const iconPath = this.notationIcons[this.currentMoveAnnotation];
		    const { row, col } = this.currentMoveSquare;
		    
		    if (iconPath) {
			   const icon = document.createElement('img');
			   icon.src = iconPath;
			   icon.className = 'notation-icon';
			   icon.alt = this.currentMoveAnnotation;
			   
			   // Correct positioning logic for both orientations
			   const squareSize = 100 / 8; // 12.5% of board
			   
			   let xPos, yPos;
			   if (this.isFlipped) {
				  // When flipped: position at top-right intersection (from black's perspective)
				  xPos = (7 - col) * squareSize + squareSize;
				  yPos = (7 - row) * squareSize;
			   } else {
				  // Normal orientation: position at top-right intersection (from white's perspective)
				  xPos = col * squareSize + squareSize;
				  yPos = row * squareSize;
			   }
			   
			   // Position at the intersection point with proper centering
			   icon.style.left = `${xPos}%`;
			   icon.style.top = `${yPos}%`;
			   icon.style.transform = 'translate(-50%, -50%)';
			   
			   this.notationLayer.appendChild(icon);
		    }
		}
	 }
 
	updateSelectionAndMoves() {
	    if(!this.selectedPiece) return;
	    const {row, col} = this.selectedPiece;
	    const getSel = (r,c) => {
		   let vr=r, vc=c;
		   if(this.isFlipped) { vr=7-r; vc=7-c; }
		   return `[data-row="${vr}"][data-col="${vc}"]`;
	    };
	    
	    // Clear ALL move indicators first
	    document.querySelectorAll('.square').forEach(sq => {
		   sq.classList.remove('valid-move', 'valid-capture', 'castle-move');
	    });
	    
	    // Then add the current selection and valid moves
	    document.querySelector(getSel(row,col))?.classList.add('selected');
	    this.validMoves.forEach(m => {
		   const t = document.querySelector(getSel(m.row, m.col));
		   if(t) {
			  if(m.isCastle) {
				 t.classList.add('castle-move');
			  } else if(this.board[m.row][m.col]) {
				 t.classList.add('valid-capture');
			  } else {
				 t.classList.add('valid-move');
			  }
		   }
	    });
	 }
 
	 updateCheckHighlight() {
	    // Clear ALL check highlights first
	    document.querySelectorAll('.square').forEach(sq => {
		   sq.classList.remove('in-check');
	    });
	    
	    // Only show check if the king is actually in check
	    const kingPos = this.findKing(this.currentPlayer);
	    if(kingPos && this.isSquareAttacked(kingPos.row, kingPos.col, this.currentPlayer === 'white' ? 'black' : 'white')) {
		   let vr = kingPos.row, vc = kingPos.col;
		   if(this.isFlipped) { 
			  vr = 7 - vr; 
			  vc = 7 - vc; 
		   }
		   document.querySelector(`[data-row="${vr}"][data-col="${vc}"]`)?.classList.add('in-check');
	    }
	 }
 
	updatePlayerStates() {
	    const w = document.getElementById('player-white-display');
	    const b = document.getElementById('player-black-display');
	    if(w) w.classList.toggle('active', this.currentPlayer === 'white');
	    if(b) b.classList.toggle('active', this.currentPlayer === 'black');
	}
 
	updateCoordinates() {
	    const f = this.isFlipped ? ['H','G','F','E','D','C','B','A'] : ['A','B','C','D','E','F','G','H'];
	    const r = this.isFlipped ? ['1','2','3','4','5','6','7','8'] : ['8','7','6','5','4','3','2','1'];
	    
	    const ft = document.querySelector('.files-top');
	    const fb = document.querySelector('.files-bottom');
	    const rl = document.querySelector('.ranks-left');
	    const rr = document.querySelector('.ranks-right');
 
	    if(ft) ft.innerHTML = f.map(x=>`<span>${x}</span>`).join('');
	    if(fb) fb.innerHTML = f.map(x=>`<span>${x}</span>`).join('');
	    if(rl) rl.innerHTML = r.map(x=>`<span>${x}</span>`).join('');
	    if(rr) rr.innerHTML = r.map(x=>`<span>${x}</span>`).join('');
	}
 
	updateStatus() {
	    if(this.gameOver) return;
	    const p = this.currentPlayer==='white'?'White':'Black';
	    const k = this.findKing(this.currentPlayer);
	    const chk = k && this.isSquareAttacked(k.row, k.col, this.currentPlayer);
	    const st = document.getElementById('status');
	    if(st) st.textContent = `${p}'s turn${chk?' - CHECK!':''}`;
	}
 
	updateMoveHistory() {
	    const list = document.getElementById('move-list');
	    if(!list) return;
	    list.innerHTML = '';
	    for(let i=0; i<this.moveHistory.length; i+=2) {
		   const num = Math.floor(i/2)+1;
		   const w = this.moveHistory[i];
		   const b = this.moveHistory[i+1];
		   const d = document.createElement('div');
		   
		   let wText = w.notation + (w.nag ? this.getSymbol(w.annotation) : '');
		   let bText = b ? (b.notation + (b.nag ? this.getSymbol(b.annotation) : '')) : '';
		   
		   d.innerHTML = `<b>${num}.</b> <span style="color:${this.getColor(w.annotation)}">${wText}</span> ${b ? `<span style="color:${this.getColor(b.annotation)}">${bText}</span>` : ''}`;
		   list.appendChild(d);
	    }
	    list.scrollTop = list.scrollHeight;
	}
 
	getSymbol(type) {
	    const map = { 'Brilliant':'!!', 'GreatFind':'!', 'BestMove':'', 'Excellent':'', 'Good':'!', 'Book':'', 'Inaccuracy':'?!', 'Mistake':'?', 'Miss':'?', 'Blunder':'??' };
	    return map[type] || '';
	}
 
	getColor(type) {
	    const map = { 'Brilliant':'#1baca6', 'GreatFind':'#5c8bb0', 'BestMove':'#96bc4b', 'Blunder':'#fa412d', 'Mistake':'#e6912c', 'Inaccuracy':'#f0c15c' };
	    return map[type] || '#fff';
	}
 
	annotateLastMove(type) {
		if(this.moveHistory.length === 0) return;
		const last = this.moveHistory[this.moveHistory.length-1];
		
		// Update current annotation - clear if "None" is selected
		if (type === 'None') {
		    this.currentMoveAnnotation = null;
		    this.currentMoveSquare = null;
		} else {
		    this.currentMoveAnnotation = type;
		    this.currentMoveSquare = { row: last.to.row, col: last.to.col };
		}
		
		// Also update the move history record
		last.annotation = type === 'None' ? null : type;
		const nagMap = { 'Brilliant':'$3', 'GreatFind':'$1', 'Good':'$1', 'Inaccuracy':'$6', 'Mistake':'$2', 'Miss':'$2', 'Blunder':'$4' };
		last.nag = nagMap[type] || '';
		
		this.updateDisplay();
		this.updateMoveHistory();
	 }
 
	// ========== MOUSE & DRAG HANDLING ==========
	handleSquareClick(e, r, c) {
	    if(e.button!==0) return;
	    const {row, col} = this.getLogicalPos(r,c);
	    
	    if(this.arrows.length>0 || this.rightClickHighlights.size>0) { this.clearAllAnnotations(); return; }
	    if(this.gameOver) return;
 
	    const p = this.board[row][col];
	    
	    if(this.selectedPiece) {
		   const m = this.validMoves.find(mv => mv.row===row && mv.col===col);
		   if(m) { this.makeMove(this.selectedPiece.row, this.selectedPiece.col, row, col, m); return; }
		   if(p && p.color===this.currentPlayer) { this.selectPiece(row, col); return; }
		   this.clearSelection(); return;
	    }
	    if(p && p.color===this.currentPlayer) this.selectPiece(row, col);
	}
 
	handleMouseDown(e, r, c) {
	    e.preventDefault();
	    const {row, col} = this.getLogicalPos(r,c);
	    
	    if(e.button===2) { 
		   this.arrowDragStart={row,col}; 
		   return; 
	    }
	    
	    if(e.button===0) {
		   const p = this.board[row][col];
		   if(p && p.color===this.currentPlayer && !this.gameOver) {
			  this.startDrag(e, row, col);
		   }
	    }
	}
 
	handleMouseUp(e, r, c) {
	    if(e.button===2 && this.arrowDragStart) {
		   const to = this.getLogicalPos(r,c);
		   const from = this.arrowDragStart;
		   
		   if(from.row===to.row && from.col===to.col) {
			  // Right-click on same square - toggle highlight
			  const k = `${from.row},${from.col}`;
			  this.rightClickHighlights.has(k) ? this.rightClickHighlights.delete(k) : this.rightClickHighlights.add(k);
		   } else {
			  // Check if this arrow already exists
			  const existingArrowIndex = this.arrows.findIndex(arrow => 
				 arrow.from.row === from.row && 
				 arrow.from.col === from.col && 
				 arrow.to.row === to.row && 
				 arrow.to.col === to.col
			  );
			  
			  if (existingArrowIndex !== -1) {
				 // Remove existing arrow
				 this.arrows.splice(existingArrowIndex, 1);
			  } else {
				 // Add new arrow
				 this.arrows.push({from, to});
			  }
		   }
		   
		   this.arrowDragStart=null; 
		   this.updateDisplay();
	    }
	 }
 
	selectPiece(r, c) { 
	    this.selectedPiece={row:r,col:c}; 
	    this.validMoves=this.calculateValidMoves(r,c); 
	    this.updateDisplay(); 
	}
 
	clearSelection() { 
		this.selectedPiece = null; 
		this.validMoves = []; 
		this.updateDisplay(); 
	 }
 
	clearAllAnnotations() { 
		this.rightClickHighlights.clear(); 
		this.arrows = []; 
		this.currentMoveAnnotation = null;
		this.currentMoveSquare = null;
		
		// Also clear annotation from the last move if it exists
		if (this.moveHistory.length > 0) {
		    const lastMove = this.moveHistory[this.moveHistory.length - 1];
		    lastMove.annotation = null;
		    lastMove.nag = '';
		}
		
		this.updateDisplay(); 
	 }
 
	// --- DRAG AND DROP LOGIC ---
	startDrag(e, r, c) {
	    this.dragOrigin = { row: r, col: c };
	    this.selectPiece(r, c);
	    
	    let vr = r, vc = c;
	    if (this.isFlipped) { vr = 7 - r; vc = 7 - c; }
	    const square = document.querySelector(`[data-row="${vr}"][data-col="${vc}"]`);
	    const img = square?.querySelector('img');
	    
	    if(img) {
		   this.createDragGhost(e, img);
		   this.draggedPiece = img;
		   this.draggedPiece.classList.add('drag-hide');
	    }
 
	    this.dragMoveHandler = (ev) => this.handleDragMove(ev);
	    this.dragEndHandler = (ev) => this.handleDragEnd(ev);
	    
	    document.addEventListener('mousemove', this.dragMoveHandler);
	    document.addEventListener('mouseup', this.dragEndHandler);
	}
 
	createDragGhost(e, originalImg) {
	    const board = document.getElementById('chessboard');
	    const rect = board.getBoundingClientRect();
	    const squareSize = rect.width / 8;
 
	    const ghost = originalImg.cloneNode(true);
	    ghost.classList.add('dragging-piece');
	    ghost.style.width = squareSize + 'px';
	    ghost.style.height = squareSize + 'px';
	    ghost.style.position = 'fixed';
	    ghost.style.left = (e.clientX - squareSize / 2) + 'px';
	    ghost.style.top = (e.clientY - squareSize / 2) + 'px';
	    
	    document.body.appendChild(ghost);
	    this.dragGhost = ghost;
	}
 
	handleDragMove(e) {
	    if (!this.dragGhost) return;
	    const size = parseFloat(this.dragGhost.style.width);
	    this.dragGhost.style.left = (e.clientX - size / 2) + 'px';
	    this.dragGhost.style.top = (e.clientY - size / 2) + 'px';
	}
 
	handleDragEnd(e) {
	    document.removeEventListener('mousemove', this.dragMoveHandler);
	    document.removeEventListener('mouseup', this.dragEndHandler);
	 
	    if (!this.dragOrigin) return;
	 
	    const board = document.getElementById('chessboard');
	    const rect = board.getBoundingClientRect();
	    const squareSize = rect.width / 8;
	 
	    let x = e.clientX - rect.left;
	    let y = e.clientY - rect.top;
	 
	    if (this.isFlipped) {
		   x = rect.width - x;
		   y = rect.height - y;
	    }
	 
	    const c = Math.floor(x / squareSize);
	    const r = Math.floor(y / squareSize);
	 
	    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
		   let move = this.validMoves.find(m => m.row === r && m.col === c);
		   
		   if (!move && this.board[r][c] && 
			  this.board[r][c].color === this.board[this.dragOrigin.row][this.dragOrigin.col].color &&
			  this.board[r][c].type === 'rook') {
				   const side = c > this.dragOrigin.col ? 'kingside' : 'queenside';
				   move = this.validMoves.find(m => m.isCastle && m.side === side);
		   }
	 
		   if (move) {
			  this.makeMove(this.dragOrigin.row, this.dragOrigin.col, r, c, move);
		   } else {
			  // Clear selection if move is invalid
			  this.clearSelection();
		   }
	    } else {
		   // Clear selection if dropped outside board
		   this.clearSelection();
	    }
	 
	    if (this.dragGhost) this.dragGhost.remove();
	    this.dragGhost = null;
	    this.dragOrigin = null;
	    this.draggedPiece = null;
	 }
 
	// ========== GAME LOGIC (CORRECTED) ==========
	// Robust attack detection for checks and castling
	isSquareAttacked(r, c, checkingColor) {
	    // 1. Pawns
	    const pawnDir = checkingColor === 'white' ? -1 : 1; // White moves Up (-1)
	    // Attacking pawns come from the opposite direction
	    // If I am checking if White attacks (r,c), I look for white pawns at (r+1, c-1) and (r+1, c+1)
	    const attackRow = r - pawnDir; 
	    if(attackRow >= 0 && attackRow < 8) {
		   if(c-1 >= 0 && this.board[attackRow][c-1]?.type === 'pawn' && this.board[attackRow][c-1].color === checkingColor) return true;
		   if(c+1 < 8 && this.board[attackRow][c+1]?.type === 'pawn' && this.board[attackRow][c+1].color === checkingColor) return true;
	    }
 
	    // 2. Knights
	    const kMoves = [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
	    for(let m of kMoves) {
		   const nr = r + m[0], nc = c + m[1];
		   if(this.isInBounds(nr,nc)) {
			  const p = this.board[nr][nc];
			  if(p && p.color === checkingColor && p.type === 'knight') return true;
		   }
	    }
 
	    // 3. Sliding (Rook/Queen)
	    const ort = [[1,0],[-1,0],[0,1],[0,-1]];
	    for(let d of ort) {
		   for(let i=1; i<8; i++) {
			  const nr = r + d[0]*i, nc = c + d[1]*i;
			  if(!this.isInBounds(nr,nc)) break;
			  const p = this.board[nr][nc];
			  if(p) {
				 if(p.color === checkingColor && (p.type === 'rook' || p.type === 'queen')) return true;
				 break; 
			  }
		   }
	    }
 
	    // 4. Sliding (Bishop/Queen)
	    const diag = [[1,1],[1,-1],[-1,1],[-1,-1]];
	    for(let d of diag) {
		   for(let i=1; i<8; i++) {
			  const nr = r + d[0]*i, nc = c + d[1]*i;
			  if(!this.isInBounds(nr,nc)) break;
			  const p = this.board[nr][nc];
			  if(p) {
				 if(p.color === checkingColor && (p.type === 'bishop' || p.type === 'queen')) return true;
				 break;
			  }
		   }
	    }
 
	    // 5. King (Neighbor)
	    const kDir = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
	    for(let d of kDir) {
		   const nr = r + d[0], nc = c + d[1];
		   if(this.isInBounds(nr,nc)) {
			  const p = this.board[nr][nc];
			  if(p && p.color === checkingColor && p.type === 'king') return true;
		   }
	    }
 
	    return false;
	}
 
	isCheck() {
	    const kingPos = this.findKing(this.currentPlayer);
	    if(!kingPos) return false;
	    const opponent = this.currentPlayer === 'white' ? 'black' : 'white';
	    return this.isSquareAttacked(kingPos.row, kingPos.col, opponent);
	 }
 
	calculateValidMoves(r, c) {
	    const p = this.board[r][c];
	    if(!p) return [];
	    
	    let moves = [];
	    
	    // Basic Movement Logic
	    if (p.type === 'pawn') {
		   const d = p.color === 'white' ? -1 : 1;
		   const startRow = p.color === 'white' ? 6 : 1;
		   // Move forward 1
		   if (this.isInBounds(r+d, c) && !this.board[r+d][c]) {
			  moves.push({row: r+d, col: c});
			  // Move forward 2
			  if (r === startRow && this.isInBounds(r+d*2, c) && !this.board[r+d*2][c]) {
				 moves.push({row: r+d*2, col: c});
			  }
		   }
		   // Captures
		   [[r+d, c-1], [r+d, c+1]].forEach(([nr, nc]) => {
			  if (this.isInBounds(nr, nc)) {
				 const t = this.board[nr][nc];
				 if (t && t.color !== p.color) moves.push({row: nr, col: nc});
				 // En Passant
				 if (this.enPassantTarget && this.enPassantTarget.row === nr && this.enPassantTarget.col === nc) {
					moves.push({row: nr, col: nc, isEnPassant: true});
				 }
			  }
		   });
	    } else {
		   const dirs = {
			  rook: [[1,0],[-1,0],[0,1],[0,-1]],
			  bishop: [[1,1],[1,-1],[-1,1],[-1,-1]],
			  knight: [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]],
			  king: [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]
		   };
		   const types = p.type === 'queen' ? [...dirs.rook, ...dirs.bishop] : dirs[p.type];
		   const isSlide = ['rook','bishop','queen'].includes(p.type);
 
		   types.forEach(([dr, dc]) => {
			  for(let i=1; i<8; i++) {
				 const nr = r + dr*i, nc = c + dc*i;
				 if(!this.isInBounds(nr, nc)) break;
				 const t = this.board[nr][nc];
				 if(!t) {
					moves.push({row: nr, col: nc});
					if(!isSlide) break;
				 } else {
					if(t.color !== p.color) moves.push({row: nr, col: nc});
					break;
				 }
			  }
		   });
	    }
 
	    // Castling Logic
	    if (p.type === 'king' && !this.isCheck()) {
		   const backRank = p.color === 'white' ? 7 : 0;
		   const opponent = p.color === 'white' ? 'black' : 'white';
		   
		   // Kingside
		   if (this.castlingRights[p.color].kingside) {
			  if (!this.board[backRank][5] && !this.board[backRank][6] &&
				 !this.isSquareAttacked(backRank, 5, opponent) && 
				 !this.isSquareAttacked(backRank, 6, opponent)) {
				 moves.push({row: backRank, col: 6, isCastle: true, side: 'kingside'});
			  }
		   }
		   // Queenside
		   if (this.castlingRights[p.color].queenside) {
			  if (!this.board[backRank][1] && !this.board[backRank][2] && !this.board[backRank][3] &&
				 !this.isSquareAttacked(backRank, 3, opponent) && // King crosses D-file
				 !this.isSquareAttacked(backRank, 2, opponent)) { // King lands C-file
				 moves.push({row: backRank, col: 2, isCastle: true, side: 'queenside'});
			  }
		   }
	    }
 
	    // Filter Illegal Moves (Checks)
	    return moves.filter(m => !this.wouldLeaveKingInCheck(r, c, m.row, m.col, p.color));
	}
 
	wouldLeaveKingInCheck(fr, fc, tr, tc, color) {
	    // Temporarily make move
	    const originalP = this.board[fr][fc];
	    const targetP = this.board[tr][tc];
	    
	    this.board[tr][tc] = originalP;
	    this.board[fr][fc] = null;
	    
	    const kingPos = this.findKing(color); // Might have moved the king itself
	    const opponent = color === 'white' ? 'black' : 'white';
	    const isCheck = kingPos ? this.isSquareAttacked(kingPos.row, kingPos.col, opponent) : false;
 
	    // Undo
	    this.board[fr][fc] = originalP;
	    this.board[tr][tc] = targetP;
	    
	    return isCheck;
	}
 
	makeMove(fr, fc, tr, tc, move) {
		const p = this.board[fr][fc];
		this.redoStack = [];
		
		// CLEAR THE CURRENT ANNOTATION WHEN MAKING A NEW MOVE
		this.currentMoveAnnotation = null;
		this.currentMoveSquare = null;
		
		if(move.isCastle) { this.performCastle(move); return; }
		if(move.isEnPassant) { this.performEnPassant(fr, fc, tr, tc); return; }
		if(p.type==='pawn' && (tr===0 || tr===7)) { this.showPromotionModal(fr, fc, tr, tc); return; }
	 
		const cap = this.board[tr][tc];
		this.recordMove(p, fr, fc, tr, tc, cap);
		this.board[tr][tc] = p; this.board[fr][fc] = null;
		this.updateCastlingRights(p, fr, fc);
		this.enPassantTarget = (p.type==='pawn' && Math.abs(fr-tr)===2) ? {row:(fr+tr)/2, col:tc} : null;
		this.finalizeMove(cap, false);
	 }
 
	recordMove(p, fr, fc, tr, tc, cap, isEP=false, promo=null) {
	    const file = String.fromCharCode(97+fc);
	    const rank = 8-fr;
	    const dFile = String.fromCharCode(97+tc);
	    const dRank = 8-tr;
	    let not = '';
	    if(p.type==='king' && Math.abs(fc-tc)===2) not = tc>fc?'O-O':'O-O-O';
	    else {
		   if(p.type!=='pawn') not += p.type==='knight'?'N':p.type.charAt(0).toUpperCase();
		   else if(cap || isEP) not += file;
		   if(cap || isEP) not += 'x';
		   not += dFile + dRank;
		   if(promo) not += '='+promo.charAt(0).toUpperCase();
	    }
	    
	    // Add disambiguation for pieces (except pawns)
	    if(p.type !== 'pawn' && p.type !== 'king') {
		   const ambiguities = this.findAmbiguousPieces(p.type, p.color, tr, tc, fr, fc);
		   if(ambiguities.length > 0) {
			  // Check if file disambiguates
			  const sameFileAmbiguities = ambiguities.filter(pos => pos.col === fc);
			  if(sameFileAmbiguities.length === 0) {
				 // File disambiguates
				 not = not.slice(0, 1) + file + not.slice(1);
			  } else {
				 // Check if rank disambiguates
				 const sameRankAmbiguities = ambiguities.filter(pos => pos.row === fr);
				 if(sameRankAmbiguities.length === 0) {
					// Rank disambiguates
					not = not.slice(0, 1) + rank + not.slice(1);
				 } else {
					// Need both file and rank
					not = not.slice(0, 1) + file + rank + not.slice(1);
				 }
			  }
		   }
	    }
	    
	    this.moveHistory.push({
		   notation: not, player: p.color,
		   from: {row:fr, col:fc}, to: {row:tr, col:tc},
		   destSquare: dFile + dRank, 
		   piece: p.type, captured: cap?.type, isEnPassant: isEP, promotion: promo,
		   prevCastling: JSON.parse(JSON.stringify(this.castlingRights)),
		   prevEP: this.enPassantTarget,
		   annotation: null, nag: ''
	    });
	}
 
	finalizeMove(cap, isCastle) {
	    this.switchPlayer();
	    
	    // Clear selection after move
	    this.clearSelection();
	    
	    // Update display BEFORE checking for check/mate
	    this.updateDisplay();
	    
	    const chk = this.isCheck();
	    const mate = this.checkGameOver();
	    const last = this.moveHistory[this.moveHistory.length-1];
	    
	    let s = 'move';
	    if(isCastle) s = 'castle';
	    else if(cap) s = 'capture';
	    
	    if(chk) {
		   s = 'check';
		   if(last) last.notation += '+';
	    }
	    if(mate) {
		   if(last) last.notation = last.notation.replace('+','') + '#';
		   setTimeout(()=>this.playSound('game-over'), 0);
	    } else {
		   const movedColor = this.currentPlayer==='white'?'black':'white';
		   this.playSound(`${movedColor}-${s}`);
	    }
	    this.updateMoveHistory();
	 }
 
	// ========== LOGIC HELPERS ==========
	switchPlayer() { this.currentPlayer = this.currentPlayer==='white'?'black':'white'; }
	
	performCastle(m) {
		// Clear annotation for new move
		this.currentMoveAnnotation = null;
		this.currentMoveSquare = null;
		
		const c=this.currentPlayer, r=c==='white'?7:0;
		this.board[r][m.col]=this.board[r][4]; this.board[r][4]=null;
		const rF=m.side==='kingside'?7:0, rT=m.side==='kingside'?5:3;
		this.board[r][rT]=this.board[r][rF]; this.board[r][rF]=null;
		this.recordMove({type:'king',color:c}, r, 4, r, m.col, null); 
		this.moveHistory[this.moveHistory.length-1].notation = m.side==='kingside'?'O-O':'O-O-O';
		this.castlingRights[c]={kingside:false, queenside:false};
		this.finalizeMove(null, true);
	 }
	 
	 performEnPassant(fr,fc,tr,tc) {
		// Clear annotation for new move
		this.currentMoveAnnotation = null;
		this.currentMoveSquare = null;
		
		const p=this.board[fr][fc];
		this.recordMove(p, fr, fc, tr, tc, this.board[fr][tc], true);
		this.board[tr][tc]=p; this.board[fr][fc]=null; this.board[fr][tc]=null;
		this.finalizeMove(true, false);
	 }
 
	isInBounds(r,c){ return r>=0 && r<8 && c>=0 && c<8; }
	
	findAmbiguousPieces(pieceType, color, destRow, destCol, excludeRow, excludeCol) {
	    const ambiguous = [];
	    for(let r = 0; r < 8; r++) {
		   for(let c = 0; c < 8; c++) {
			  if(r === excludeRow && c === excludeCol) continue; // Skip the piece that's actually moving
			  const p = this.board[r][c];
			  if(p && p.type === pieceType && p.color === color) {
				 const moves = this.calculateValidMoves(r, c);
				 if(moves.some(move => move.row === destRow && move.col === destCol)) {
					ambiguous.push({row: r, col: c});
				 }
			  }
		   }
	    }
	    return ambiguous;
	}
	
	findKing(c) { 
	    for(let r=0;r<8;r++) {
		   for(let k=0;k<8;k++) {
			  const p = this.board[r][k];
			  if(p && p.type==='king' && p.color===c) return {row:r,col:k};
		   }
	    }
	    return null; 
	}
	
	checkGameOver() { 
	    // Check if current player has valid moves
	    for(let r=0;r<8;r++){
		   for(let c=0;c<8;c++){
			  const p = this.board[r][c];
			  if(p && p.color === this.currentPlayer) {
				 const moves = this.calculateValidMoves(r,c);
				 if(moves.length > 0) return false;
			  }
		   }
	    }
	    
	    this.gameOver = true;
	    
	    // Set the game result in PGN headers
	    const kingPos = this.findKing(this.currentPlayer);
	    const inCheck = kingPos && this.isSquareAttacked(kingPos.row, kingPos.col, 
		   this.currentPlayer === 'white' ? 'black' : 'white');
	    
	    if (inCheck) {
		   // Checkmate
		   this.pgnHeaders.Result = this.currentPlayer === 'white' ? '0-1' : '1-0';
		   this.pgnHeaders.Termination = "Checkmate";
	    } else {
		   // Stalemate
		   this.pgnHeaders.Result = '1/2-1/2';
		   this.pgnHeaders.Termination = "Stalemate";
	    }
	    
	    return true;
	 }
	
	updateCastlingRights(p,r,c) {
	    if(p.type==='king') this.castlingRights[p.color]={kingside:false,queenside:false};
	    if(p.type==='rook') {
		   const side = c===0 ? 'queenside' : (c===7 ? 'kingside' : null);
		   if(side) this.castlingRights[p.color][side]=false;
	    }
	}
 
	showPromotionModal(fr, fc, tr, tc) {
	    this.pendingPromotion = { fromRow:fr, fromCol:fc, toRow:tr, toCol:tc };
	    
	    const promotingColor = this.board[fr][fc].color;
	    const pieceMap = {
		   white: { queen: 'wq', rook: 'wr', bishop: 'wb', knight: 'wn' },
		   black: { queen: 'bq', rook: 'br', bishop: 'bb', knight: 'bn' }
	    };
	    
	    const pieces = pieceMap[promotingColor];
	    
	    document.querySelectorAll('.promotion-piece').forEach(pieceEl => {
		   const pieceType = pieceEl.dataset.piece;
		   pieceEl.innerHTML = ''; // Clear any existing content
		   
		   const img = document.createElement('img');
		   img.src = `chess pieces/${pieces[pieceType]}.png`;
		   img.alt = pieceType.charAt(0).toUpperCase() + pieceType.slice(1);
		   pieceEl.appendChild(img);
	    });
	    
	    document.getElementById('promotion-modal').style.display = 'flex';
	 }
 
	 selectPromotion(type) {
		document.getElementById('promotion-modal').style.display = 'none';
		if(!this.pendingPromotion) return;
		const {fromRow, fromCol, toRow, toCol} = this.pendingPromotion;
		const p = this.board[fromRow][fromCol];
		const cap = this.board[toRow][toCol];
		
		// Clear annotation for new move
		this.currentMoveAnnotation = null;
		this.currentMoveSquare = null;
		
		this.recordMove(p, fromRow, fromCol, toRow, toCol, cap, false, type);
		this.board[toRow][toCol] = {type, color: p.color};
		this.board[fromRow][fromCol] = null;
		this.updateCastlingRights(p, fromRow, fromCol);
		this.finalizeMove(null, false);
		this.pendingPromotion = null;
		this.playSound('promote');
	 }
 
	// ========== GENERATE MASTER PGN ==========
	generatePGN() {
	    let pgn = '';
	    for (const [k, v] of Object.entries(this.pgnHeaders)) {
		   if(v) pgn += `[${k} "${v}"]\n`;
	    }
	    pgn += '\n';
	    
	    let moves = [];
	    for (let i = 0; i < this.moveHistory.length; i += 2) {
		   const n = Math.floor(i/2) + 1;
		   let w = this.moveHistory[i];
		   let b = this.moveHistory[i+1];
	 
		   const buildMoveString = (m) => {
			  let txt = m.notation;
			  if(m.nag) txt += ` ${m.nag}`;
			  if(m.annotation && m.destSquare) {
				 txt += ` {[%c_effect ${m.destSquare};square;${m.destSquare};type;${m.annotation};persistent;true]}`;
			  }
			  return txt;
		   };
	 
		   let s = `${n}. ${buildMoveString(w)}`;
		   if (b) s += ` ${buildMoveString(b)}`;
		   moves.push(s);
	    }
	    pgn += moves.join(' ') + ' ' + (this.pgnHeaders.Result || '*');
	    return pgn;
	 }
	 
	 // Add this new method to generate the filename
	 // Replace the generatePGNFilename method with this improved version:
	generatePGNFilename() {
	const whiteName = this.pgnHeaders.White || 'White';
	const blackName = this.pgnHeaders.Black || 'Black';
	const date = this.pgnHeaders.Date || 'unknown_date';
	
	// Clean names for filename (remove special characters, keep spaces as underscores)
	const cleanWhite = whiteName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
	const cleanBlack = blackName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
	const cleanDate = date.replace(/[^0-9.]/g, '_');
	
	// Default filename if using default names
	if ((cleanWhite === 'White' && cleanBlack === 'Black') || 
	    cleanWhite === '_' || cleanBlack === '_') {
	    return 'chess_game.pgn';
	}
	
	return `${cleanWhite}_vs_${cleanBlack}_${cleanDate}.pgn`;
	}
 
	showPgnModal() {
	    document.getElementById('pgn-text').value = this.generatePGN();
	    document.getElementById('pgn-modal').style.display = 'flex';
	}
 
	attachEventListeners() {
	    document.getElementById('flip-board').addEventListener('click', () => {
		   this.isFlipped = !this.isFlipped;
		   this.updateDisplay();
		   this.updateCoordinates();
	    });
	    
	    document.getElementById('new-game').addEventListener('click', () => this.setupGame());
	    document.getElementById('generate-pgn').addEventListener('click', () => this.showPgnModal());
	    document.getElementById('close-pgn').addEventListener('click', () => document.getElementById('pgn-modal').style.display='none');
	    
	    // Add undo/redo button listeners
	    document.getElementById('undo-move').addEventListener('click', () => this.undoMove());
	    document.getElementById('redo-move').addEventListener('click', () => this.redoMove());
	    
	    document.querySelectorAll('.anno-btn').forEach(btn => {
		   btn.addEventListener('click', () => this.annotateLastMove(btn.dataset.type));
	    });
	    
	    document.getElementById('copy-pgn').addEventListener('click', () => {
		   const t = document.getElementById('pgn-text'); t.select(); navigator.clipboard.writeText(t.value);
	    });
	    
	    document.getElementById('download-pgn').addEventListener('click', () => {
		   const pgnContent = this.generatePGN();
		   const filename = this.generatePGNFilename();
		   const blob = new Blob([pgnContent], { type: 'text/plain' });
		   const url = window.URL.createObjectURL(blob);
		   const a = document.createElement('a');
		   a.href = url; 
		   a.download = filename; 
		   a.click();
		   window.URL.revokeObjectURL(url);
		});
	    
	    document.querySelectorAll('.promotion-piece').forEach(btn => btn.addEventListener('click', () => this.selectPromotion(btn.dataset.piece)));
	    
	    document.addEventListener('keydown', (e) => {
		   if(e.key==='ArrowLeft') { this.undoMove(); }
		   if(e.key==='ArrowRight') { this.redoMove(); }
	    });
	 }
 
	 // ========== UNDO/REDO ==========
	 undoMove() { 
		if(this.moveHistory.length === 0) return;
		const m = this.moveHistory.pop();
		this.redoStack.push(m);
		
		// Clear current annotation when undoing
		this.currentMoveAnnotation = null;
		this.currentMoveSquare = null;
		
		// Check if there's a previous move that should have an annotation
		if (this.moveHistory.length > 0) {
		    const previousMove = this.moveHistory[this.moveHistory.length - 1];
		    if (previousMove.annotation && previousMove.annotation !== 'None') {
			   this.currentMoveAnnotation = previousMove.annotation;
			   this.currentMoveSquare = { 
				  row: previousMove.to.row, 
				  col: previousMove.to.col 
			   };
		    }
		}
		
		// Play appropriate sound based on move type
		this.playMoveSound(m, true);
		
		// 1. Revert the piece to the starting square
		this.board[m.from.row][m.from.col] = {type: m.piece, color: m.player};
		
		// 2. Handle Captures & En Passant
		if(m.captured) {
		    if(m.isEnPassant) {
			   this.board[m.to.row][m.to.col] = null; // The destination is empty
			   // Restore the captured pawn 'behind' the move
			   this.board[m.from.row][m.to.col] = {type: 'pawn', color: m.player==='white'?'black':'white'};
		    } else {
			   // Normal capture restoration
			   this.board[m.to.row][m.to.col] = {type: m.captured, color: m.player==='white'?'black':'white'};
		    }
		} else {
		    this.board[m.to.row][m.to.col] = null;
		}
		
		// 3. Revert Castling (Move the Rook back)
		if (m.piece === 'king' && Math.abs(m.from.col - m.to.col) > 1) {
		    const row = m.from.row;
		    const isKingside = m.to.col > m.from.col;
		    const rookFrom = isKingside ? 7 : 0;
		    const rookTo = isKingside ? 5 : 3;
		    
		    // Move rook from 'To' back to 'From'
		    this.board[row][rookFrom] = this.board[row][rookTo];
		    this.board[row][rookTo] = null;
		}
		
		// 4. Restore State
		this.castlingRights = m.prevCastling;
		this.enPassantTarget = m.prevEP;
		this.currentPlayer = m.player;
		this.gameOver = false;
		
		this.updateDisplay(); 
		this.updateMoveHistory();
	 }
	  
	  redoMove() { 
	    if(this.redoStack.length === 0) return;
	    const m = this.redoStack.pop();
	    this.moveHistory.push(m);
	  
	    // Restore annotation if the redone move had one
	    if (m.annotation && m.annotation !== 'None') {
		   this.currentMoveAnnotation = m.annotation;
		   this.currentMoveSquare = { row: m.to.row, col: m.to.col };
	    } else {
		   this.currentMoveAnnotation = null;
		   this.currentMoveSquare = null;
	    }
	  
	    // Play appropriate sound based on move type
	    this.playMoveSound(m, false);
	  
	    // 1. Move the piece
	    this.board[m.to.row][m.to.col] = {type: m.piece, color: m.player};
	    this.board[m.from.row][m.from.col] = null;
	  
	    // 2. Handle Castling Redo (Move Rook)
	    if (m.piece === 'king' && Math.abs(m.from.col - m.to.col) > 1) {
		   const row = m.from.row;
		   const isKingside = m.to.col > m.from.col;
		   const rookFrom = isKingside ? 7 : 0;
		   const rookTo = isKingside ? 5 : 3;
		   
		   this.board[row][rookTo] = this.board[row][rookFrom];
		   this.board[row][rookFrom] = null;
	    }
	  
	    // 3. Handle En Passant Redo (Remove the captured pawn)
	    if (m.isEnPassant) {
		   this.board[m.from.row][m.to.col] = null;
	    }
	  
	    // 4. Update State
	    const p = this.board[m.to.row][m.to.col];
	    this.updateCastlingRights(p, m.from.row, m.from.col);
	    
	    // Recalculate EP target
	    if (p.type === 'pawn' && Math.abs(m.from.row - m.to.row) === 2) {
		   this.enPassantTarget = { row: (m.from.row + m.to.row) / 2, col: m.to.col };
	    } else {
		   this.enPassantTarget = null;
	    }
	  
	    this.currentPlayer = m.player === 'white' ? 'black' : 'white';
	    this.updateDisplay(); 
	    this.updateMoveHistory();
	  }
	  // Add this method to check if a move resulted in check
	  wasMoveCheck(move) {
		// Temporarily restore the board state to check if this move resulted in check
		const originalBoard = JSON.parse(JSON.stringify(this.board));
		const originalCurrentPlayer = this.currentPlayer;
		
		// Apply the move temporarily
		this.board[move.to.row][move.to.col] = {type: move.piece, color: move.player};
		this.board[move.from.row][move.from.col] = null;
		
		// Handle captures for en passant
		if (move.isEnPassant) {
		   this.board[move.from.row][move.to.col] = null;
		}
		
		// Handle castling - move the rook
		if (move.piece === 'king' && Math.abs(move.from.col - move.to.col) > 1) {
		   const row = move.from.row;
		   const isKingside = move.to.col > move.from.col;
		   const rookFrom = isKingside ? 7 : 0;
		   const rookTo = isKingside ? 5 : 3;
		   
		   this.board[row][rookTo] = this.board[row][rookFrom];
		   this.board[row][rookFrom] = null;
		}
		
		// Check if this move put the opponent in check
		const opponent = move.player === 'white' ? 'black' : 'white';
		const kingPos = this.findKing(opponent);
		const wasCheck = kingPos ? this.isSquareAttacked(kingPos.row, kingPos.col, move.player) : false;
		
		// Restore original state
		this.board = originalBoard;
		this.currentPlayer = originalCurrentPlayer;
		
		return wasCheck;
	  }
	 // ========== SOUND HELPER FOR UNDO/REDO ==========
	 playMoveSound(move, isUndo) {
	    const movedColor = move.player;
	    const opponentColor = movedColor === 'white' ? 'black' : 'white';
	    
	    let soundType = 'move'; // default
	    
	    if (move.piece === 'king' && Math.abs(move.from.col - move.to.col) > 1) {
		   // Castling move
		   soundType = 'castle';
	    } else if (move.captured || move.isEnPassant) {
		   // Capture move (including en passant)
		   soundType = 'capture';
	    } else if (move.promotion) {
		   // Promotion move
		   soundType = 'promote';
	    }
	    
	    // Check if this move resulted in check
	    if (this.wasMoveCheck(move)) {
		   soundType = 'check';
	    }
	    
	    // For undo, we play the sound as if the opponent is making the reverse move
	    // For redo, we play the sound as the original player making the move
	    const colorToUse = isUndo ? opponentColor : movedColor;
	    
	    this.playSound(`${colorToUse}-${soundType}`);
	 }
 
	drawArrows() {
	    while (this.svgLayer.lastChild && this.svgLayer.lastChild.tagName !== 'defs') this.svgLayer.removeChild(this.svgLayer.lastChild);
	    const getC = (r, c) => {
		   let fr=r, fc=c; if(this.isFlipped) { fr=7-r; fc=7-c; }
		   return { x: (fc*12.5)+6.25, y: (fr*12.5)+6.25 };
	    };
	    this.arrows.forEach(a => {
		   const s = getC(a.from.row, a.from.col);
		   const e = getC(a.to.row, a.to.col);
		   const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
		   l.setAttribute("x1", s.x); l.setAttribute("y1", s.y); l.setAttribute("x2", e.x); l.setAttribute("y2", e.y);
		   l.setAttribute("stroke", "rgba(255, 170, 0, 0.8)"); l.setAttribute("stroke-width", "1.8");
		   l.setAttribute("marker-end", "url(#arrowhead-g)");
		   this.svgLayer.appendChild(l);
	    });
	}
 }
 
 document.addEventListener('DOMContentLoaded', () => window.chessGame = new ChessGame());