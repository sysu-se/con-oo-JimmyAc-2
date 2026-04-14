const GRID_SIZE = 9;
const BOX_SIZE = 3;

/**
 * Validate one sudoku cell value.
 *
 * @param {unknown} value
 */
function assertCellValue(value) {
	if (!Number.isInteger(value) || value < 0 || value > 9) {
		throw new Error('Sudoku cell value must be an integer between 0 and 9');
	}
}

/**
 * Create a deep copy of a 9x9 grid.
 *
 * @param {number[][]} grid
 * @returns {number[][]}
 */
function cloneGrid(grid) {
	return grid.map((row) => [...row]);
}

/**
 * Validate a 9x9 sudoku grid.
 *
 * @param {unknown} grid
 */
function assertGrid(grid) {
	if (!Array.isArray(grid) || grid.length !== GRID_SIZE) {
		throw new Error('Sudoku grid must contain 9 rows');
	}

	for (const row of grid) {
		if (!Array.isArray(row) || row.length !== GRID_SIZE) {
			throw new Error('Each sudoku row must contain 9 cells');
		}

		for (const value of row) {
			assertCellValue(value);
		}
	}
}

/**
 * Validate one move object and normalize null into 0.
 *
 * @param {{ row: unknown, col: unknown, value: unknown }} move
 * @returns {{ row: number, col: number, value: number }}
 */
function normalizeMove(move) {
	if (!move || typeof move !== 'object') {
		throw new Error('Move must be an object with row, col and value');
	}

	const row = move.row;
	const col = move.col;
	const value = move.value === null ? 0 : move.value;

	if (!Number.isInteger(row) || row < 0 || row >= GRID_SIZE) {
		throw new Error('Move row must be an integer between 0 and 8');
	}

	if (!Number.isInteger(col) || col < 0 || col >= GRID_SIZE) {
		throw new Error('Move col must be an integer between 0 and 8');
	}

	assertCellValue(value);

	return { row, col, value };
}

/**
 * Check whether placing one value would break sudoku constraints.
 *
 * @param {number[][]} grid
 * @param {number} row
 * @param {number} col
 * @param {number} value
 * @returns {boolean}
 */
function hasConflict(grid, row, col, value) {
	for (let index = 0; index < GRID_SIZE; index += 1) {
		if (index !== col && grid[row][index] === value) {
			return true;
		}

		if (index !== row && grid[index][col] === value) {
			return true;
		}
	}

	const startRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
	const startCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;

	for (let boxRow = startRow; boxRow < startRow + BOX_SIZE; boxRow += 1) {
		for (let boxCol = startCol; boxCol < startCol + BOX_SIZE; boxCol += 1) {
			if ((boxRow !== row || boxCol !== col) && grid[boxRow][boxCol] === value) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Check whether an object behaves like one Sudoku instance.
 *
 * @param {unknown} sudoku
 */
function assertSudokuLike(sudoku) {
	if (!sudoku || typeof sudoku !== 'object') {
		throw new Error('Game requires a Sudoku-like object');
	}

	if (typeof sudoku.clone !== 'function' || typeof sudoku.guess !== 'function' || typeof sudoku.toJSON !== 'function') {
		throw new Error('Game requires a Sudoku-like object');
	}
}

/**
 * Clone every sudoku snapshot inside one history stack.
 *
 * @param {Array<{ clone(): any }>} stack
 * @returns {Array<any>}
 */
function cloneSnapshotStack(stack) {
	return stack.map((snapshot) => snapshot.clone());
}

/**
 * Build one Sudoku domain object around a validated grid.
 *
 * @param {number[][]} input
 * @returns {{
 *   readonly grid: number[][],
 *   getGrid(): number[][],
 *   canGuess(move: { row: number, col: number, value: number | null }): boolean,
 *   guess(move: { row: number, col: number, value: number | null }): void,
 *   clone(): any,
 *   toJSON(): { grid: number[][] },
 *   toString(): string,
 * }}
 */
export function createSudoku(input) {
	assertGrid(input);
	const grid = cloneGrid(input);

	/**
	 * Return a safe snapshot of the current grid.
	 *
	 * @returns {number[][]}
	 */
	function getGrid() {
		return cloneGrid(grid);
	}

	/**
	 * Check whether one move is legal for the current board.
	 *
	 * @param {{ row: number, col: number, value: number | null }} move
	 * @returns {boolean}
	 */
	function canGuess(move) {
		const { row, col, value } = normalizeMove(move);

		if (value === 0) {
			return true;
		}

		return !hasConflict(grid, row, col, value);
	}

	/**
	 * Apply one validated move to the current board.
	 *
	 * @param {{ row: number, col: number, value: number | null }} move
	 */
	function guess(move) {
		const normalizedMove = normalizeMove(move);

		if (!canGuess(normalizedMove)) {
			throw new Error('Illegal sudoku move');
		}

		grid[normalizedMove.row][normalizedMove.col] = normalizedMove.value;
	}

	/**
	 * Create an independent sudoku copy.
	 *
	 * @returns {ReturnType<typeof createSudoku>}
	 */
	function clone() {
		return createSudoku(getGrid());
	}

	/**
	 * Export the board into plain serializable data.
	 *
	 * @returns {{ grid: number[][] }}
	 */
	function toJSON() {
		return {
			grid: getGrid(),
		};
	}

	/**
	 * Produce a readable string for debugging.
	 *
	 * @returns {string}
	 */
	function toString() {
		let out = '╔═══════╤═══════╤═══════╗\n';

		for (let row = 0; row < GRID_SIZE; row += 1) {
			if (row !== 0 && row % BOX_SIZE === 0) {
				out += '╟───────┼───────┼───────╢\n';
			}

			for (let col = 0; col < GRID_SIZE; col += 1) {
				if (col === 0) {
					out += '║ ';
				} else if (col % BOX_SIZE === 0) {
					out += '│ ';
				}

				out += (grid[row][col] === 0 ? '·' : grid[row][col]) + ' ';

				if (col === GRID_SIZE - 1) {
					out += '║';
				}
			}

			out += '\n';
		}

		out += '╚═══════╧═══════╧═══════╝';
		return out;
	}

	return {
		get grid() {
			return getGrid();
		},
		getGrid,
		canGuess,
		guess,
		clone,
		toJSON,
		toString,
	};
}

/**
 * Restore one Sudoku object from serialized data.
 *
 * @param {{ grid: number[][] } | number[][]} json
 * @returns {ReturnType<typeof createSudoku>}
 */
export function createSudokuFromJSON(json) {
	if (Array.isArray(json)) {
		return createSudoku(json);
	}

	if (!json || typeof json !== 'object' || !Array.isArray(json.grid)) {
		throw new Error('Sudoku JSON must contain a grid');
	}

	return createSudoku(json.grid);
}

/**
 * Internal helper used by both createGame and createGameFromJSON.
 *
 * @param {{
 *   sudoku: ReturnType<typeof createSudoku>,
 *   undoStack?: ReturnType<typeof createSudoku>[],
 *   redoStack?: ReturnType<typeof createSudoku>[]
 * }} options
 * @returns {{
 *   readonly sudoku: ReturnType<typeof createSudoku>,
 *   readonly history: { undo: ReturnType<typeof createSudoku>[], redo: ReturnType<typeof createSudoku>[] },
 *   readonly undoAvailable: boolean,
 *   readonly redoAvailable: boolean,
 *   getSudoku(): ReturnType<typeof createSudoku>,
 *   canUndo(): boolean,
 *   canRedo(): boolean,
 *   guess(move: { row: number, col: number, value: number | null }): void,
 *   undo(): void,
 *   redo(): void,
 *   toJSON(): { sudoku: { grid: number[][] }, history: { undo: { grid: number[][] }[], redo: { grid: number[][] }[] } },
 * }}
 */
function createGameInstance({ sudoku, undoStack = [], redoStack = [] }) {
	assertSudokuLike(sudoku);

	let currentSudoku = sudoku.clone();
	const historyUndo = cloneSnapshotStack(undoStack);
	const historyRedo = cloneSnapshotStack(redoStack);

	/**
	 * Return a safe copy of the current sudoku.
	 *
	 * @returns {ReturnType<typeof createSudoku>}
	 */
	function getSudoku() {
		return currentSudoku.clone();
	}

	/**
	 * Whether there is at least one undo step.
	 *
	 * @returns {boolean}
	 */
	function canUndo() {
		return historyUndo.length > 0;
	}

	/**
	 * Whether there is at least one redo step.
	 *
	 * @returns {boolean}
	 */
	function canRedo() {
		return historyRedo.length > 0;
	}

	/**
	 * Apply one move through the game aggregate.
	 *
	 * @param {{ row: number, col: number, value: number | null }} move
	 */
	function guess(move) {
		if (!currentSudoku.canGuess(move)) {
			throw new Error('Illegal game move');
		}

		historyUndo.push(currentSudoku.clone());
		currentSudoku.guess(move);
		historyRedo.length = 0;
	}

	/**
	 * Restore the most recent undo snapshot.
	 */
	function undo() {
		if (!canUndo()) {
			return;
		}

		historyRedo.push(currentSudoku.clone());
		currentSudoku = historyUndo.pop();
	}

	/**
	 * Restore the most recent redo snapshot.
	 */
	function redo() {
		if (!canRedo()) {
			return;
		}

		historyUndo.push(currentSudoku.clone());
		currentSudoku = historyRedo.pop();
	}

	/**
	 * Serialize the current board together with both history stacks.
	 *
	 * @returns {{ sudoku: { grid: number[][] }, history: { undo: { grid: number[][] }[], redo: { grid: number[][] }[] } }}
	 */
	function toJSON() {
		return {
			sudoku: currentSudoku.toJSON(),
			history: {
				undo: historyUndo.map((snapshot) => snapshot.toJSON()),
				redo: historyRedo.map((snapshot) => snapshot.toJSON()),
			},
		};
	}

	return {
		get sudoku() {
			return getSudoku();
		},
		get history() {
			return {
				undo: cloneSnapshotStack(historyUndo),
				redo: cloneSnapshotStack(historyRedo),
			};
		},
		get undoAvailable() {
			return canUndo();
		},
		get redoAvailable() {
			return canRedo();
		},
		getSudoku,
		canUndo,
		canRedo,
		guess,
		undo,
		redo,
		toJSON,
	};
}

/**
 * Create one game aggregate from a sudoku object.
 *
 * @param {{ sudoku: ReturnType<typeof createSudoku> }} options
 * @returns {ReturnType<typeof createGameInstance>}
 */
export function createGame({ sudoku }) {
	return createGameInstance({ sudoku });
}

/**
 * Restore one game aggregate from serialized data.
 *
 * @param {{ sudoku: { grid: number[][] }, history?: { undo?: ({ grid: number[][] } | number[][])[], redo?: ({ grid: number[][] } | number[][])[] } } | { grid: number[][] } | number[][]} json
 * @returns {ReturnType<typeof createGameInstance>}
 */
export function createGameFromJSON(json) {
	if (Array.isArray(json) || (json && typeof json === 'object' && Array.isArray(json.grid))) {
		return createGame({ sudoku: createSudokuFromJSON(json) });
	}

	if (!json || typeof json !== 'object' || !json.sudoku) {
		throw new Error('Game JSON must contain a sudoku field');
	}

	const sudoku = createSudokuFromJSON(json.sudoku);
	const undoStack = (json.history?.undo ?? []).map((snapshot) => createSudokuFromJSON(snapshot));
	const redoStack = (json.history?.redo ?? []).map((snapshot) => createSudokuFromJSON(snapshot));

	return createGameInstance({ sudoku, undoStack, redoStack });
}
