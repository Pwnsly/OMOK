class NormalOmok {
    constructor() {
        this.boardSize = 15;
        this.board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(0));
        this.currentPlayer = 1; // 1: 흑돌(플레이어), 2: 백돌(AI)
        this.gameOver = false;
        this.playerScore = 0;
        this.aiScore = 0;
        this.gameHistory = []; // 게임 기록 저장
        this.patterns = new Map(); // 승리 패턴 저장
        this.worker = null;
        this.stoneSound = new Audio('DOL.mp3'); // 돌 소리 추가
        this.init();
    }

    init() {
        this.createBoard();
        this.addEventListeners();
        this.updateScore();
        this.initWorker();
    }

    initWorker() {
        const workerCode = `
            self.onmessage = function(e) {
                const { board, depth } = e.data;
                const result = findBestMove(board, depth);
                self.postMessage(result);
            };

            function findBestMove(board, depth) {
                let bestScore = -Infinity;
                let bestMove = null;
                const boardSize = board.length;

                // 1. 승리 가능한 수 찾기
                for (let i = 0; i < boardSize; i++) {
                    for (let j = 0; j < boardSize; j++) {
                        if (board[i][j] === 0) {
                            board[i][j] = 2;
                            if (checkWin(board, i, j)) {
                                board[i][j] = 0;
                                return { row: i, col: j };
                            }
                            board[i][j] = 0;
                        }
                    }
                }

                // 2. 플레이어의 승리 수 방어
                for (let i = 0; i < boardSize; i++) {
                    for (let j = 0; j < boardSize; j++) {
                        if (board[i][j] === 0) {
                            board[i][j] = 1;
                            if (checkWin(board, i, j)) {
                                board[i][j] = 0;
                                return { row: i, col: j };
                            }
                            board[i][j] = 0;
                        }
                    }
                }

                // 3. 미니맥스 알고리즘으로 최적의 수 찾기
                for (let i = 0; i < boardSize; i++) {
                    for (let j = 0; j < boardSize; j++) {
                        if (board[i][j] === 0 && hasNeighbor(board, i, j)) {
                            board[i][j] = 2;
                            const score = minimax(board, depth - 1, false, -Infinity, Infinity);
                            board[i][j] = 0;

                            if (score > bestScore) {
                                bestScore = score;
                                bestMove = { row: i, col: j };
                            }
                        }
                    }
                }

                if (bestMove) {
                    return bestMove;
                }

                // 4. 랜덤한 수 선택
                const emptyCells = [];
                for (let i = 0; i < boardSize; i++) {
                    for (let j = 0; j < boardSize; j++) {
                        if (board[i][j] === 0 && hasNeighbor(board, i, j)) {
                            emptyCells.push({ row: i, col: j });
                        }
                    }
                }

                if (emptyCells.length > 0) {
                    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
                }

                return null;
            }

            function minimax(board, depth, isMaximizing, alpha, beta) {
                if (depth === 0) {
                    return evaluateBoard(board);
                }

                const boardSize = board.length;

                if (isMaximizing) {
                    let maxScore = -Infinity;
                    for (let i = 0; i < boardSize; i++) {
                        for (let j = 0; j < boardSize; j++) {
                            if (board[i][j] === 0 && hasNeighbor(board, i, j)) {
                                board[i][j] = 2;
                                const score = minimax(board, depth - 1, false, alpha, beta);
                                board[i][j] = 0;
                                maxScore = Math.max(maxScore, score);
                                alpha = Math.max(alpha, score);
                                if (beta <= alpha) break;
                            }
                        }
                    }
                    return maxScore;
                } else {
                    let minScore = Infinity;
                    for (let i = 0; i < boardSize; i++) {
                        for (let j = 0; j < boardSize; j++) {
                            if (board[i][j] === 0 && hasNeighbor(board, i, j)) {
                                board[i][j] = 1;
                                const score = minimax(board, depth - 1, true, alpha, beta);
                                board[i][j] = 0;
                                minScore = Math.min(minScore, score);
                                beta = Math.min(beta, score);
                                if (beta <= alpha) break;
                            }
                        }
                    }
                    return minScore;
                }
            }

            function evaluateBoard(board) {
                let score = 0;
                const directions = [
                    [1, 0],   // 가로
                    [0, 1],   // 세로
                    [1, 1],   // 대각선
                    [1, -1]   // 반대 대각선
                ];
                const boardSize = board.length;

                // AI(2)의 돌 평가
                for (let i = 0; i < boardSize; i++) {
                    for (let j = 0; j < boardSize; j++) {
                        if (board[i][j] === 2) {
                            for (const [dx, dy] of directions) {
                                score += evaluateDirection(board, i, j, dx, dy, 2);
                            }
                        }
                    }
                }

                // 플레이어(1)의 돌 평가
                for (let i = 0; i < boardSize; i++) {
                    for (let j = 0; j < boardSize; j++) {
                        if (board[i][j] === 1) {
                            for (const [dx, dy] of directions) {
                                score -= evaluateDirection(board, i, j, dx, dy, 1);
                            }
                        }
                    }
                }

                return score;
            }

            function evaluateDirection(board, row, col, dx, dy, player) {
                let score = 0;
                let count = 0;
                let open = 0;
                const boardSize = board.length;

                // 정방향 확인
                for (let i = 0; i < 5; i++) {
                    const newRow = row + dx * i;
                    const newCol = col + dy * i;
                    
                    if (newRow < 0 || newRow >= boardSize || newCol < 0 || newCol >= boardSize) {
                        break;
                    }

                    if (board[newRow][newCol] === player) {
                        count++;
                    } else if (board[newRow][newCol] === 0) {
                        open++;
                        break;
                    } else {
                        break;
                    }
                }

                // 역방향 확인
                for (let i = 1; i < 5; i++) {
                    const newRow = row - dx * i;
                    const newCol = col - dy * i;
                    
                    if (newRow < 0 || newRow >= boardSize || newCol < 0 || newCol >= boardSize) {
                        break;
                    }

                    if (board[newRow][newCol] === player) {
                        count++;
                    } else if (board[newRow][newCol] === 0) {
                        open++;
                        break;
                    } else {
                        break;
                    }
                }

                // 점수 계산
                if (count >= 5) score += 100000;
                else if (count === 4) {
                    if (open === 2) score += 10000;
                    else if (open === 1) score += 1000;
                }
                else if (count === 3) {
                    if (open === 2) score += 500;
                    else if (open === 1) score += 100;
                }
                else if (count === 2) {
                    if (open === 2) score += 50;
                    else if (open === 1) score += 10;
                }
                else if (count === 1) {
                    if (open === 2) score += 5;
                    else if (open === 1) score += 1;
                }

                return score;
            }

            function hasNeighbor(board, row, col) {
                const boardSize = board.length;
                for (let i = Math.max(0, row - 2); i <= Math.min(boardSize - 1, row + 2); i++) {
                    for (let j = Math.max(0, col - 2); j <= Math.min(boardSize - 1, col + 2); j++) {
                        if (board[i][j] !== 0) {
                            return true;
                        }
                    }
                }
                return false;
            }

            function checkWin(board, row, col) {
                const directions = [
                    [[0, 1], [0, -1]], // 가로
                    [[1, 0], [-1, 0]], // 세로
                    [[1, 1], [-1, -1]], // 대각선
                    [[1, -1], [-1, 1]] // 반대 대각선
                ];
                const boardSize = board.length;
                const player = board[row][col];

                for (const direction of directions) {
                    let count = 1;
                    
                    for (const [dx, dy] of direction) {
                        let x = row + dx;
                        let y = col + dy;
                        
                        while (
                            x >= 0 && x < boardSize &&
                            y >= 0 && y < boardSize &&
                            board[x][y] === player
                        ) {
                            count++;
                            x += dx;
                            y += dy;
                        }
                    }

                    if (count === 5) return true;
                }

                return false;
            }
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));
        
        this.worker.onmessage = (e) => {
            const move = e.data;
            if (move) {
                this.makeMove(move.row, move.col);
            }
        };
    }

    createBoard() {
        const board = document.getElementById('game-board');
        board.innerHTML = '<div id="game-message"></div>';
        
        for (let i = 0; i < this.boardSize; i++) {
            const row = document.createElement('div');
            row.className = 'row';
            
            for (let j = 0; j < this.boardSize; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = i;
                cell.dataset.col = j;
                row.appendChild(cell);
            }
            
            board.appendChild(row);
        }
    }

    addEventListeners() {
        const board = document.getElementById('game-board');
        const restartButton = document.getElementById('restart');
        
        board.addEventListener('click', (e) => {
            if (!e.target.classList.contains('cell') || this.gameOver || this.currentPlayer !== 1) return;
            
            const row = parseInt(e.target.dataset.row);
            const col = parseInt(e.target.dataset.col);
            
            if (this.board[row][col] === 0) {
                this.makeMove(row, col);
            }
        });

        restartButton.addEventListener('click', () => {
            this.resetGame();
        });
    }

    makeMove(row, col) {
        if (this.gameOver || this.board[row][col] !== 0) return;

        // 현재 플레이어의 수
        this.board[row][col] = this.currentPlayer;
        this.updateBoard();
        this.gameHistory.push({row, col, player: this.currentPlayer});

        // 돌 소리 재생
        this.stoneSound.currentTime = 0;
        this.stoneSound.play();

        if (this.checkWin(row, col)) {
            this.handleGameOver(this.currentPlayer);
            return;
        }

        // 다음 플레이어로 전환
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        
        // AI 차례인 경우
        if (this.currentPlayer === 2) {
            this.calculateAIMove();
        }
    }

    updateBoard() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const value = this.board[row][col];
            
            cell.innerHTML = '';
            if (value === 1) {
                const stone = document.createElement('div');
                stone.className = 'stone black';
                cell.appendChild(stone);
            } else if (value === 2) {
                const stone = document.createElement('div');
                stone.className = 'stone white';
                cell.appendChild(stone);
            }
        });

        // 오디오 재생
        const audio = document.getElementById('dol-audio');
        if (audio) {
            audio.currentTime = 0;
            audio.play();
        }

        // 상태 메시지 업데이트
        const status = document.getElementById('status');
        status.textContent = this.currentPlayer === 1 ? '당신의 차례입니다 (흑돌)' : 'AI가 생각중입니다...';
    }

    checkWin(row, col) {
        const directions = [
            [[0, 1], [0, -1]], // 가로
            [[1, 0], [-1, 0]], // 세로
            [[1, 1], [-1, -1]], // 대각선
            [[1, -1], [-1, 1]] // 반대 대각선
        ];

        const player = this.board[row][col];

        for (const direction of directions) {
            let count = 1;
            
            for (const [dx, dy] of direction) {
                let r = row + dx;
                let c = col + dy;
                
                while (
                    r >= 0 && r < this.boardSize &&
                    c >= 0 && c < this.boardSize &&
                    this.board[r][c] === player
                ) {
                    count++;
                    r += dx;
                    c += dy;
                }
            }
            
            if (count >= 5) return true;
        }
        
        return false;
    }

    handleGameOver(winner) {
        this.gameOver = true;
        if (winner === 1) {
            this.playerScore++;
        } else {
            this.aiScore++;
        }
        this.updateScore();
        
        const message = document.getElementById('game-message');
        message.textContent = winner === 1 ? '플레이어 승리!' : 'AI 승리!';
        message.style.display = 'block';
    }

    resetGame() {
        this.board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(0));
        this.currentPlayer = 1;
        this.gameOver = false;
        this.gameHistory = [];
        this.updateBoard();
        
        const message = document.getElementById('game-message');
        message.style.display = 'none';
        
        const status = document.getElementById('status');
        status.textContent = '당신의 차례입니다 (흑돌)';
    }

    updateScore() {
        document.getElementById('player-score').textContent = this.playerScore;
        document.getElementById('ai-score').textContent = this.aiScore;
    }

    calculateAIMove() {
        // 웹 워커에 현재 보드 상태와 탐색 깊이 전달
        this.worker.postMessage({
            board: this.board.map(row => [...row]),
            depth: 2 // 탐색 깊이를 2로 설정
        });
    }
}

// 게임 시작
const game = new NormalOmok(); 
