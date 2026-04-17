# con-oo-JimmyAc-2 - Review

## Review 结论

代码已经把 `Game/Sudoku` 实际接入了 Svelte 主流程，输入、渲染和 Undo/Redo 不再直接改旧二维数组，这一点是成立的；但当前接入层和领域边界仍有关键缺口：Undo/Redo 可用性没有被正确建模为响应式状态，题目 givens 的不可修改约束也没有进入领域模型，导致业务规则部分停留在 UI/store 层，整体设计只能算部分完成。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | fair |
| JS Convention | good |
| Sudoku Business | poor |
| OOD | fair |

## 缺点

### 1. Undo/Redo 可用性没有被正确接成 Svelte 响应式状态

- 严重程度：core
- 位置：src/components/Controls/ActionBar/Actions.svelte:11-13, src/node_modules/@sudoku/stores/grid.js:88-95
- 原因：`userGrid` 对外暴露的是 `canUndo()` / `canRedo()` 方法，而不是 store 值；`$:` 语句只依赖导入的 `userGrid` 常量，本身不会因 `game` 内部闭包状态变化而重新执行。静态看，这会让 `undoAvailable` / `redoAvailable` 停留在初始值，破坏“领域对象变化后界面自动刷新”的要求，也说明 adapter 没有把 UI 真正需要的状态建模完整。

### 2. 题目 givens 的不可修改约束没有进入领域模型

- 严重程度：core
- 位置：src/domain/index.js:166-189, src/node_modules/@sudoku/stores/grid.js:55-75, src/node_modules/@sudoku/stores/keyboard.js:6-10
- 原因：`Sudoku` / `Game` 只保存当前盘面，没有保存初始题盘或 fixed cells 信息，因此 `guess()` 只能校验行列宫冲突，不能阻止对题目给定数字的修改。当前“不可编辑 givens”完全依赖 `keyboardDisabled` 这种 UI 层判断，这使核心业务不变量落在 view/store 层而不是领域层，不符合好的 OOD，也不符合数独游戏的业务建模。

### 3. 校验与胜利判定被拆散到领域外，形成重复规则源

- 严重程度：major
- 位置：src/domain/index.js:83-105, src/node_modules/@sudoku/stores/grid.js:110-154, src/node_modules/@sudoku/stores/game.js:7-20
- 原因：`Sudoku` 已经拥有冲突判定能力，但 `invalidCells` 和 `gameWon` 又在 store 层重新扫描整盘并自行定义“何为有效/何为胜利”。这让数独规则同时存在于 `src/domain` 和 Svelte store 两处，后续只要一侧调整，另一侧就可能漂移，领域对象也没有真正成为业务语义的唯一来源。

### 4. 冲突输入的业务语义与现有 UI 设计不一致

- 严重程度：major
- 位置：src/domain/index.js:166-189, src/node_modules/@sudoku/stores/grid.js:69-75, src/components/Board/index.svelte:51
- 原因：`Sudoku.guess()` 直接拒绝产生冲突的输入，而 UI 又保留了 `invalidCells`/`conflictingNumber` 这一套“允许输入后高亮冲突”的显示路径。静态阅读下，这意味着冲突高亮对正常用户输入基本不可达，现有领域规则与前端交互模型并不一致，既削弱了已有界面功能，也暴露出业务规则没有统一收敛。

### 5. adapter 用裸 `catch` 吞掉了领域层异常

- 严重程度：minor
- 位置：src/node_modules/@sudoku/stores/grid.js:64-75
- 原因：`guess()` 把所有异常都压成 `false`，既吞掉非法输入，也吞掉程序错误。这样会让领域对象的失败原因无法向上表达，调试和诊断都变差，也不符合 JS 里对异常边界应尽量明确的惯例。

### 6. `Game` 的 duck typing 契约与实际调用不一致

- 严重程度：minor
- 位置：src/domain/index.js:113-120, src/domain/index.js:337-339
- 原因：`assertSudokuLike()` 只要求 `clone/guess/toJSON`，但 `Game.guess()` 实际还依赖 `currentSudoku.canGuess()`。这说明对象协作契约没有被完整表达，接口约束与实现脱节，属于小但真实的 OOD 质量问题。

## 优点

### 1. `Sudoku` 对盘面状态做了清晰封装和防御性复制

- 位置：src/domain/index.js:147-255
- 原因：构造、读取、序列化和 `clone()` 都统一通过深拷贝处理二维数组，避免外部共享引用污染内部状态，这一点对数独盘面和撤销历史都很关键。

### 2. `Game` 把会话历史与盘面职责区分开了

- 位置：src/domain/index.js:298-409
- 原因：`Game` 负责当前 `Sudoku`、undo/redo 栈和 redo 清空规则，`Sudoku` 只负责盘面与校验，职责边界比把历史逻辑散落在组件里要清楚得多。

### 3. 主要用户输入已经通过 store adapter 进入领域对象

- 位置：src/node_modules/@sudoku/stores/grid.js:45-105, src/components/Controls/Keyboard.svelte:10-25
- 原因：键盘输入、提示、Undo/Redo 都通过 `userGrid` 调用 `game.guess()/undo()/redo()`，而不是组件直接改二维数组，说明这次接入不是只在测试里存在的“假接入”。

### 4. 棋盘渲染已经消费领域对象导出的响应式视图状态

- 位置：src/components/Board/index.svelte:40-51
- 原因：界面展示使用的是 `$userGrid` 这份由 `Game -> Sudoku -> syncGrid()` 导出的快照，而不是旧逻辑直接持有的可变数组，接入方向是正确的。

## 补充说明

- 本次结论仅基于静态审查；按要求未运行测试，也未实际点按界面验证。
- 关于“Undo/Redo 按钮状态不会随操作刷新”“冲突高亮对正常输入基本不可达”等结论，来自对 Svelte 响应式依赖和代码路径的静态推断，不是运行后观测结果。
- 评审范围已限制在 `src/domain/*` 及其接入链路，主要包含 `src/node_modules/@sudoku/stores/grid.js`、`src/node_modules/@sudoku/stores/game.js`、`src/components/Board/*`、`src/components/Controls/*`、`src/App.svelte` 等直接消费领域对象的代码。
