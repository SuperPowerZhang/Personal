# React 基础

---

## 1. Hooks 原理

### 概念讲解

React Hooks 基于 Fiber 架构中的**链表**结构。每个组件对应一个 Fiber 节点，节点上挂载 `memoizedState` 链表，每个 hook 是链表中的一个节点。

**为什么 Hooks 不能在条件语句中使用：**
- Hooks 按调用顺序对应链表中的位置
- 条件语句会导致顺序不一致 → 链表错位 → 状态混乱

### 面试问题

**Q: useState 和 useEffect 的底层实现原理？**

### 参考答案

**useState 简化实现：**

```javascript
// React 内部简化版
let currentFiber = null;
let hookIndex = 0;

function useState(initialValue) {
  const fiber = currentFiber;
  const oldHook = fiber.alternate?.memoizedState?.[hookIndex];

  const hook = {
    state: oldHook ? oldHook.state : initialValue,
    queue: [], // 待处理的更新
  };

  // 应用上次渲染后积累的更新
  oldHook?.queue.forEach(action => {
    hook.state = typeof action === 'function' ? action(hook.state) : action;
  });

  const setState = (action) => {
    hook.queue.push(action);
    // 触发重新渲染
    scheduleWork(fiber);
  };

  fiber.memoizedState[hookIndex] = hook;
  hookIndex++;

  return [hook.state, setState];
}
```

**useEffect 简化原理：**

```javascript
function useEffect(callback, deps) {
  const fiber = currentFiber;
  const oldHook = fiber.alternate?.memoizedState?.[hookIndex];

  const hasChanged = oldHook
    ? !deps?.every((dep, i) => Object.is(dep, oldHook.deps[i]))
    : true;

  const hook = {
    deps,
    cleanup: oldHook?.cleanup,
    effect: hasChanged ? callback : null,
  };

  if (hasChanged) {
    // 安排在 commit 阶段后异步执行
    scheduleEffect(() => {
      // 先执行上一次的 cleanup
      if (hook.cleanup) hook.cleanup();
      // 执行 effect，保存返回的 cleanup
      hook.cleanup = callback();
    });
  }

  fiber.memoizedState[hookIndex] = hook;
  hookIndex++;
}
```

---

## 2. 闭包陷阱

### 面试问题

**Q: React Hooks 的闭包陷阱是什么？怎么解决？**

### 参考答案

**问题：** Hook 回调函数捕获的是创建时的 state 快照，不是最新值。

### 代码示例

```javascript
// ❌ 闭包陷阱
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      console.log(count); // 永远是 0！因为闭包捕获了初始值
      setCount(count + 1); // 永远设为 1
    }, 1000);
    return () => clearInterval(timer);
  }, []); // 空依赖 → effect 只在 mount 时创建

  return <div>{count}</div>;
}

// ✅ 方案1: 用函数式更新
useEffect(() => {
  const timer = setInterval(() => {
    setCount(c => c + 1); // 函数式更新，不依赖外部 count
  }, 1000);
  return () => clearInterval(timer);
}, []);

// ✅ 方案2: 用 useRef 存最新值
function Counter() {
  const [count, setCount] = useState(0);
  const countRef = useRef(count);
  countRef.current = count; // 每次渲染更新 ref

  useEffect(() => {
    const timer = setInterval(() => {
      console.log(countRef.current); // 始终是最新值
      setCount(c => c + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);
}
```

---

## 3. 性能优化

### 面试问题

**Q: React 性能优化有哪些手段？memo/useMemo/useCallback 分别什么时候用？**

### 参考答案

**优化手段层级：**

| 层级 | 手段 |
|------|------|
| 避免不必要渲染 | React.memo、shouldComponentUpdate |
| 缓存计算结果 | useMemo |
| 缓存回调引用 | useCallback |
| 延迟渲染 | React.lazy、Suspense |
| 减少渲染量 | 虚拟列表、分页 |
| 降低优先级 | useTransition、useDeferredValue |

**何时使用：**

```tsx
// React.memo — 子组件 props 没变就不重渲染
const ExpensiveChild = React.memo(({ data, onClick }) => {
  // 复杂渲染逻辑
  return <div>...</div>;
});

// useCallback — 保持函数引用稳定（配合 memo 使用才有意义）
function Parent() {
  const [count, setCount] = useState(0);

  // ❌ 每次渲染创建新函数 → ExpensiveChild 每次都重渲染
  // const handleClick = () => { ... };

  // ✅ 引用稳定
  const handleClick = useCallback(() => {
    doSomething();
  }, []);

  return <ExpensiveChild onClick={handleClick} />;
}

// useMemo — 缓存昂贵计算（不是所有计算都需要）
function SearchResults({ list, query }) {
  // ✅ list 很大时避免每次渲染都过滤
  const filtered = useMemo(
    () => list.filter(item => item.name.includes(query)),
    [list, query]
  );

  return filtered.map(item => <Item key={item.id} item={item} />);
}
```

**不要过度优化：**
- 简单组件不需要 memo（memo 本身有对比开销）
- 基本类型 props 变化少的不需要 useCallback
- 计算很快的不需要 useMemo

---

## 4. 虚拟列表

### 面试问题

**Q: 虚拟列表原理是什么？**

### 参考答案

只渲染可视区域内的元素 + 上下缓冲区，滚动时动态替换渲染内容。

### 代码示例

```tsx
// 固定行高虚拟列表简化实现
function VirtualList({ items, itemHeight, containerHeight }) {
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      {/* 撑开滚动高度 */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* 可见区域偏移 */}
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => (
            <div key={startIndex + i} style={{ height: itemHeight }}>
              {item.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 生产环境推荐使用 react-window 或 @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualListPro({ items }) {
  const parentRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // 预估行高
  });

  return (
    <div ref={parentRef} style={{ height: 400, overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: virtualRow.start,
              height: virtualRow.size,
            }}
          >
            {items[virtualRow.index].content}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 5. 状态管理

### 面试问题

**Q: Context 的缺陷是什么？Redux vs Zustand vs Jotai 怎么选？**

### 参考答案

**Context 缺陷：**
- Provider value 变化时，所有消费者都重渲染（无法选择性订阅）
- 没有中间件机制（无 devtools、无 persist）
- 适合低频变化的全局状态（theme、locale），不适合高频更新

**对比：**

| 维度 | Redux | Zustand | Jotai |
|------|-------|---------|-------|
| 理念 | 单一 store + reducer | 单一 store + hook | 原子化 |
| 样板代码 | 多（action/reducer/type） | 少 | 极少 |
| 选择性订阅 | selector | selector | 天然原子级 |
| 包大小 | ~7KB | ~1KB | ~2KB |
| DevTools | ✅ | ✅ | ✅ |
| 异步 | middleware(thunk/saga) | 内置 | 内置 |
| 适合场景 | 大型项目、复杂状态流 | 中型项目、替代 Redux | 细粒度响应式 |

### 代码示例

```typescript
// Zustand — 最简洁的状态管理
import { create } from 'zustand';

interface UserStore {
  user: { name: string; role: string } | null;
  setUser: (user: UserStore['user']) => void;
  logout: () => void;
}

const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));

// 组件中使用 — 选择性订阅
function UserName() {
  const name = useUserStore(state => state.user?.name); // 只在 name 变时重渲染
  return <span>{name}</span>;
}

// Jotai — 原子化状态
import { atom, useAtom } from 'jotai';

const countAtom = atom(0);
const doubleAtom = atom((get) => get(countAtom) * 2); // 派生 atom

function Counter() {
  const [count, setCount] = useAtom(countAtom);
  const [double] = useAtom(doubleAtom);
  return (
    <div>
      <span>{count} × 2 = {double}</span>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
    </div>
  );
}
```

---

## 6. React 并发模式

### 概念讲解

React 18 引入并发特性，核心思想：**渲染可中断、可恢复**。

- **useTransition**：标记低优先级更新（如搜索过滤），不阻塞用户输入
- **useDeferredValue**：延迟更新一个值的渲染
- **Suspense**：声明式加载状态

### 面试问题

**Q: useTransition 的使用场景和原理？**

### 参考答案

**场景：** 用户输入触发昂贵的列表过滤/渲染，不希望输入卡顿。

**原理：** `startTransition` 内的更新被标记为 "transition" 优先级，React 可以中断其渲染让出主线程给更高优先级的更新（如用户输入）。

### 代码示例

```tsx
// useTransition — 搜索不卡顿
function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value); // 高优先级：立即更新输入框

    startTransition(() => {
      // 低优先级：可中断的列表过滤
      setResults(filterHugeList(value));
    });
  }

  return (
    <div>
      <input value={query} onChange={handleChange} />
      {isPending && <Spinner />}
      <ResultList results={results} />
    </div>
  );
}

// useDeferredValue — 延迟渲染
function SearchResults({ query }) {
  const deferredQuery = useDeferredValue(query);
  // deferredQuery 在高优先级更新期间保持旧值
  // 高优先级完成后才更新为新值
  const results = useMemo(() => filterHugeList(deferredQuery), [deferredQuery]);

  return (
    <div style={{ opacity: query !== deferredQuery ? 0.5 : 1 }}>
      {results.map(item => <Item key={item.id} item={item} />)}
    </div>
  );
}

// Suspense + React.lazy
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<Skeleton />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

---

## 7. Antd 5 变化

### 面试问题

**Q: Antd 5 相比 Antd 4 的主要变化？迁移注意什么？**

### 参考答案

| 变化 | Antd 4 | Antd 5 |
|------|--------|--------|
| 样式方案 | Less | CSS-in-JS (Ant Design Token + cssinjs) |
| 主题定制 | Less 变量覆盖 | Design Token API |
| 按需加载 | 需要 babel-plugin-import | 原生支持 tree-shaking |
| 日期库 | Moment.js | Day.js（默认） |
| IE 支持 | IE11 | 放弃（Chrome/Firefox/Safari/Edge） |
| 组件 API | 部分弃用 | 更规范，统一 `open` 替代 `visible` |

**迁移注意：**
- Less 变量 → Design Token 映射
- `visible` → `open`
- Moment → Day.js
- 自定义主题用 `ConfigProvider` 的 `theme` prop

### 代码示例

```tsx
// Antd 5 主题定制
import { ConfigProvider, theme } from 'antd';

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
          fontSize: 14,
        },
        algorithm: theme.darkAlgorithm, // 暗色主题
        components: {
          Button: {
            colorPrimary: '#00b96b',
          },
        },
      }}
    >
      <MyApp />
    </ConfigProvider>
  );
}

// 动态切换主题
function ThemeSwitcher() {
  const [isDark, setIsDark] = useState(false);

  return (
    <ConfigProvider
      theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm }}
    >
      <Button onClick={() => setIsDark(!isDark)}>Toggle Theme</Button>
    </ConfigProvider>
  );
}
```
