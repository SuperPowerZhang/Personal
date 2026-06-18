# 跨端开发（Taro）

---

## 1. Taro 架构与编译原理

### 概念讲解

Taro 是京东开源的多端统一开发框架，用 React 写一套代码编译到微信/支付宝/百度/头条小程序 + H5。

**Taro 3.x 架构（运行时方案）：**

```
React/Vue 代码
    ↓
Taro Runtime（模拟 DOM/BOM API）
    ↓
各平台渲染（小程序 setData / H5 DOM / RN）
```

**vs Taro 1.x/2.x（编译时方案）：**

| 版本 | 方案 | 原理 | 优缺点 |
|------|------|------|---------|
| 1.x/2.x | 编译时 | AST 转换 React → 小程序模板 | 限制多（不能用所有 React 特性） |
| 3.x | 运行时 | 实现一套小程序上的 DOM API | 无语法限制；包体积略大 |

### 面试问题

**Q: Taro 3.x 运行时方案的原理是什么？**

### 参考答案

Taro 3.x 的核心思路：**在小程序环境模拟一套精简版 DOM/BOM API**。

1. **TaroNode / TaroElement**：模拟 `document.createElement`、`appendChild` 等 DOM 操作
2. **渲染流程**：React 操作虚拟 DOM → Taro Runtime 转为 Taro DOM 树 → 序列化为 data → 小程序 `setData` 渲染
3. **模板递归**：小程序端用一套通用 WXML 模板递归渲染 Taro DOM 树

**关键组件：**
- `@tarojs/runtime`：DOM/BOM 模拟层
- `@tarojs/taro`：API 抹平层（`Taro.request` → 各平台原生请求）
- `@tarojs/plugin-platform-*`：各平台适配插件

### 代码示例

```typescript
// Taro 3.x 运行时渲染简化原理

// 1. React 组件正常写
function MyComponent() {
  const [count, setCount] = useState(0);
  return (
    <View className="container">
      <Text>{count}</Text>
      <Button onClick={() => setCount(c => c + 1)}>+1</Button>
    </View>
  );
}

// 2. Taro Runtime 内部（简化）
class TaroElement {
  tagName: string;
  children: TaroElement[] = [];
  props: Record<string, any> = {};

  appendChild(child: TaroElement) {
    this.children.push(child);
    // 触发小程序 setData 更新
    this.enqueueUpdate();
  }

  enqueueUpdate() {
    // 批量收集变更，合并 setData 调用
    updateQueue.push(this);
    if (!pending) {
      pending = true;
      Promise.resolve().then(flushUpdates);
    }
  }
}

// 3. 最终产出的小程序模板（递归渲染）
// base.wxml
// <template name="taro_tmpl">
//   <block wx:for="{{root.cn}}" wx:key="uid">
//     <template is="tmpl_0_view" wx:if="{{item.nn === 'view'}}" data="{{i:item}}" />
//     <template is="tmpl_0_text" wx:if="{{item.nn === 'text'}}" data="{{i:item}}" />
//   </block>
// </template>
```

---

## 2. 多端差异与兼容处理

### 面试问题

**Q: 多端差异最大的坑有哪些？你怎么解决的？**

### 参考答案

**常见差异分类：**

| 类别 | 示例 |
|------|------|
| API 差异 | 微信有 `wx.getSystemInfo`，支付宝用 `my.getSystemInfo`，参数/返回值不同 |
| CSS 差异 | 小程序不支持 `position: fixed` 在 scroll-view 内；flex gap 支持度不同 |
| 事件差异 | 微信用 `bindtap`，支付宝用 `onTap`；事件对象结构不同 |
| 组件差异 | 微信 `<swiper>` 和支付宝 `<swiper>` 属性不完全一致 |
| 存储差异 | 微信同步 `wx.getStorageSync` vs 支付宝只有异步 |

**解决方案：**

1. **条件编译**（编译时区分平台）
2. **运行时判断**（`process.env.TARO_ENV`）
3. **统一 API 封装**
4. **CSS hack**（平台特定样式）

### 代码示例

```typescript
// 方案1: 条件编译（文件维度）
// src/utils/storage.h5.ts     — H5 实现
// src/utils/storage.weapp.ts  — 微信小程序实现
// src/utils/storage.alipay.ts — 支付宝实现

// 方案2: 条件编译（代码块维度）
function getSystemInfo() {
  /** @ifdef weapp */
  return wx.getSystemInfoSync();
  /** @endif */

  /** @ifdef alipay */
  return my.getSystemInfoSync();
  /** @endif */
}

// 方案3: 运行时判断
export function navigateTo(url: string) {
  if (process.env.TARO_ENV === 'h5') {
    window.location.href = url;
  } else {
    Taro.navigateTo({ url });
  }
}

// 方案4: CSS 条件编译
/* postcss 插件或文件后缀区分 */
/* index.weapp.css */
.container {
  padding-top: env(safe-area-inset-top); /* 微信刘海屏适配 */
}

/* index.h5.css */
.container {
  padding-top: 0;
}
```

```typescript
// 实际遇到的兼容坑：scroll-view + fixed 定位
// 微信小程序中 scroll-view 内的 fixed 元素会相对 scroll-view 定位（而非 viewport）
// 解决：将 fixed 元素提到 scroll-view 外层

// ❌ 有问题
<ScrollView>
  <View className="content">...</View>
  <View className="fixed-bottom">底部按钮</View>
</ScrollView>

// ✅ 修复
<View className="page">
  <ScrollView className="scroll-area">
    <View className="content">...</View>
  </ScrollView>
  <View className="fixed-bottom">底部按钮</View>
</View>
```

---

## 3. 小程序性能优化

### 概念讲解

小程序性能瓶颈主要在：
- **setData 开销**：数据从逻辑层（JS）传到渲染层（WebView）需要序列化
- **首屏白屏**：包体积大、请求阻塞
- **列表渲染**：大量节点导致内存和渲染卡顿

### 面试问题

**Q: 小程序性能优化手段？setData 优化怎么做？**

### 参考答案

**setData 优化：**
1. **减少频率**：合并多次 setData 为一次（批量更新）
2. **减少数据量**：只传变化的字段路径（`this.setData({ 'list[2].name': 'new' })`）
3. **避免传冗余数据**：不要把整个页面 state 都 setData
4. **离屏组件不更新**：不可见的组件跳过渲染

**首屏优化：**
1. **分包加载**：非首屏页面放子包，首包体积 < 2MB
2. **预请求**：`onLoad` 阶段并行请求数据（不等 `onReady`）
3. **骨架屏**：先渲染骨架，数据回来后替换
4. **数据预拉取**：微信 `prefetch` 能力，在跳转前就发请求

**列表优化：**
1. **虚拟列表**：只渲染可视区域 + 上下缓冲区
2. **IntersectionObserver**：判断元素可见性
3. **分页加载**：滚动到底触发下一页

### 代码示例

```typescript
// 1. setData 路径更新（减少数据传输量）
// ❌ 传整个列表
this.setData({ list: newList }); // 整个数组序列化

// ✅ 只更新变化项
this.setData({ [`list[${index}].checked`]: true }); // 仅传一个字段

// 2. 批量合并 setData
class BatchUpdater {
  private pending = false;
  private updates: Record<string, any> = {};

  set(key: string, value: any) {
    this.updates[key] = value;
    if (!this.pending) {
      this.pending = true;
      // 下一个微任务批量提交
      Promise.resolve().then(() => {
        this.component.setData(this.updates);
        this.updates = {};
        this.pending = false;
      });
    }
  }
}

// 3. 预请求方案
// 在 app.js 中配置
App({
  onLaunch() {
    // 首屏数据预请求
    this.prefetchData = Taro.request({
      url: '/api/home/data',
    });
  },
});

// 首页 onLoad 中直接拿结果
export default function Home() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const app = Taro.getApp();
    app.prefetchData.then(res => setData(res.data));
  }, []);
}
```

```typescript
// 4. LazyCreate 二屏组件（你简历中提到的方案）
function LazyCreate({ children, threshold = 0 }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    // 使用 IntersectionObserver 判断是否进入视口
    const observer = Taro.createIntersectionObserver();
    observer.relativeToViewport({ bottom: threshold }).observe(
      '.lazy-placeholder',
      (res) => {
        if (res.intersectionRatio > 0) {
          setVisible(true);
          observer.disconnect();
        }
      }
    );
    return () => observer.disconnect();
  }, []);

  if (!visible) {
    return <View className="lazy-placeholder" style={{ height: '100vh' }} />;
  }

  return <>{children}</>;
}

// 使用：首屏只渲染第一屏，第二屏懒创建
function ListPage() {
  return (
    <View>
      <FirstScreen /> {/* 立即渲染 */}
      <LazyCreate threshold={200}>
        <SecondScreen /> {/* 接近视口时才创建 */}
      </LazyCreate>
    </View>
  );
}
```

---

## 4. Taro 分包策略

### 面试问题

**Q: 小程序分包怎么配置？有什么限制？**

### 参考答案

**微信小程序限制：**
- 主包 ≤ 2MB
- 单个分包 ≤ 2MB
- 总计 ≤ 20MB（或 30MB，看平台）

**分包策略：**
- 首页和 TabBar 页面放主包
- 业务模块按功能分包
- 公共组件/工具放主包（分包不能引用其他分包的资源）
- 独立分包：可独立运行，不依赖主包

### 代码示例

```javascript
// config/index.js — Taro 分包配置
export default {
  pages: [
    'pages/index/index',  // 首页（主包）
    'pages/mine/index',   // 我的（主包）
  ],
  subPackages: [
    {
      root: 'packageBooking',
      pages: [
        'pages/list/index',
        'pages/detail/index',
        'pages/order/index',
      ],
    },
    {
      root: 'packageActivity',
      independent: true, // 独立分包
      pages: [
        'pages/blindbox/index',
        'pages/share/index',
      ],
    },
  ],
  preloadRule: {
    // 进入首页时预加载订票分包
    'pages/index/index': {
      network: 'all',
      packages: ['packageBooking'],
    },
  },
};
```

---

## 5. 无障碍（ARIA）

### 面试问题

**Q: 你在携程实现的 ARIA 无障碍是怎么做的？**

### 参考答案

小程序的无障碍主要通过 `aria-*` 属性实现，让屏幕阅读器（VoiceOver/TalkBack）能正确朗读内容。

**核心属性：**
- `aria-role`：元素角色（button、heading、list）
- `aria-label`：可读描述
- `aria-hidden`：对读屏器隐藏装饰性元素
- `aria-live`：动态内容变化时通知

### 代码示例

```tsx
// 机票搜索结果列表 — 无障碍实现
function FlightCard({ flight }) {
  return (
    <View
      role="listitem"
      aria-label={`${flight.airline} ${flight.flightNo}，
        ${flight.departTime}出发，${flight.arriveTime}到达，
        票价${flight.price}元`}
    >
      <View aria-hidden="true"> {/* 装饰性图标不朗读 */}
        <Image src={flight.airlineLogo} />
      </View>
      <Text>{flight.departTime} - {flight.arriveTime}</Text>
      <Text aria-label={`票价${flight.price}元`}>¥{flight.price}</Text>
    </View>
  );
}

// 动态加载提示
function LoadingMore({ loading }) {
  return (
    <View aria-live="polite" aria-busy={loading}>
      {loading ? '正在加载更多航班...' : '加载完成'}
    </View>
  );
}
```
