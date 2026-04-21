## HW 问题收集

列举在 HW1、HW1.1 过程里，我遇到的 2~3 个通过自己学习已经解决的问题，和 2~3 个尚未解决的问题与挑战。

### 已解决

1. 为什么我都已经改了对象内部状态了，Svelte 界面还是不刷新？
   1. **上下文**：一开始我以为只要 `Game` 或 `Sudoku` 里面的数据变了，页面就会自动跟着变，结果实际上并不会。尤其是在我把领域对象接到 `con-oo` 的时候，这个问题特别明显。
   2. **解决手段**：先问 CA，再对照 src/node_modules/@sudoku/stores/grid.js、Keyboard.svelte、Actions.svelte 看数据流。最后理解Svelte 更容易感知的是 store 的 set(...) 和外层引用变化，而不是普通 JS 对象内部字段变化。所以我最后用了一个 store adapter，在 adapter 里调用 game.guess(...)  game.undo() 之后，再手动 set(...) 一份新 grid 给 UI。

2. 为什么不能直接在组件里拿 Game/ Sudoku 对象乱调方法，而要多绕一层 adapter/store？
   1. **上下文**： HW1.1 要求领域对象真的接入 Svelte，我第一反应是直接在组件里 import createGame(...) 之类的方法，然后在按钮点击里直接调。
   2. **解决手段**：问 CA并结合作业要求里关于 view 层消费方式的说明去理解。后来发现如果组件直接持有领域对象，那 UI 层会同时负责渲染、业务操作和状态同步，耦合会很重；而 adapter 层可以专门做“对象逻辑 <-> Svelte 响应式状态”的转换，这样职责更清楚。

3. GitHub Actions 为什么本地能过，远程却不过？
   1. **上下文**：我本地 npm install --legacy-peer-deps后测试是能跑的，但是 GitHub autograding 在 Install dependencies 这一步直接挂了。
   2. **解决手段**：看 Actions 日志，发现是 npm ci 下的依赖冲突问题，主要是 svelte-preprocess 和 postcss-load-config 版本不兼容。后面通过修改 package.json / package-lock.json 并用接近 CI 的方式重新验证。

4. `{cellY}` 这种写法到底是什么意思？

   1. **上下文**：一开始我在看 `Cell.svelte` 的时候，看到这种写法完全无法理解：

      ```javascript
      class="cell row-start-{cellY} col-start-{cellX}"
      ```

   2. **解决手段**：问 CA，然后结合项目代码去理解。后来我才明白，这其实就是模板插值，也就是把脚本里的变量值塞进页面结构里。类似于成 Python 的 f-string：`f"row-start-{cellY}"`，或 C++ 里字符串拼接：`"row-start-" + std::to_string(cellY)`

### 未解决

1. 这个 `sameArea` 到底在这个项目里承担了多大程度的 UI 语义？

   1. **上下文**：`src/components/Board/index.svelte`

      ```javascript
      sameArea={$settings.highlightCells && !isSelected($cursor, x, y) && isSameArea($cursor, x, y)}
      ```

   2. **尝试解决手段**：我已经知道它大概是在做“高亮和当前选中格同一行 / 同一列 / 同一宫”的效果，但是我对它在整个组件树中的传递意义、它和 `sameNumber` / `conflictingNumber` 的边界区分还没有特别透。问过 CA，也读过 `Board/index.svelte`，但目前还是停留在“知道效果，不算完全吃透”的状态。

2. 现在这个项目的构建链为什么会在 `npm run build` 上炸掉？

   1. **上下文**：`rollup.config.js`、`svelte-preprocess`、`postcss` 这一整套老依赖链。
   2. **尝试解决手段**：我已经确认这不是我改的 domain / adapter 逻辑直接导致的，而更像 starter repo 原本的构建环境兼容问题。但我现在还不能完全独立讲清楚：为什么这里会报 `node.getIterator is not a function`，以及这个错误在 Svelte 预处理链里到底是怎么传出来的。

3. `invalidCells` 这种状态到底应该留在 store 层，还是应该继续往 domain 层里收？

   1. **上下文**：`src/node_modules/@sudoku/stores/grid.js`
   2. **尝试解决手段**：我知道 `invalidCells` 是从当前 `$userGrid` 推导出来的派生状态，也知道它现在放在 store 层是为了方便给 UI 直接消费。但我还没有完全想清楚：从更纯粹的 OO 设计角度看，这种“冲突格信息”到底算不算领域知识，是否应该由 `Sudoku` 直接提供，而不是留在 adapter/store 这边计算。
