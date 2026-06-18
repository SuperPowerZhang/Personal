# TypeScript

---

## 1. 泛型

### 概念讲解

泛型 = 类型的参数化。让函数/类/接口能够适配多种类型，同时保持类型安全。

### 面试问题

**Q: 泛型约束怎么做？什么时候需要用泛型？**

### 参考答案

**使用泛型的时机：**
- 函数输入/输出类型有关联（输入什么类型 → 输出什么类型）
- 需要在多处保持类型一致
- 容器/工具类型需要适配任意内容

### 代码示例

```typescript
// 基础泛型
function identity<T>(value: T): T {
  return value;
}
const num = identity(42);      // T 推导为 number
const str = identity('hello'); // T 推导为 string

// 泛型约束 — extends
interface HasId {
  id: string | number;
}

function findById<T extends HasId>(items: T[], id: T['id']): T | undefined {
  return items.find(item => item.id === id);
}

// 使用
const users = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
const user = findById(users, 1); // 类型为 { id: number; name: string } | undefined

// 多泛型参数
function merge<T, U>(a: T, b: U): T & U {
  return { ...a, ...b };
}
const result = merge({ name: 'Alice' }, { age: 30 });
// 类型为 { name: string } & { age: number }

// keyof 约束
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const name = getProperty({ name: 'Alice', age: 30 }, 'name'); // string
```

---

## 2. 工具类型实现

### 面试问题

**Q: 手写 Partial、Required、Pick、Omit、Record 的实现？**

### 参考答案

```typescript
// Partial<T> — 所有属性变可选
type MyPartial<T> = {
  [K in keyof T]?: T[K];
};

// Required<T> — 所有属性变必选
type MyRequired<T> = {
  [K in keyof T]-?: T[K]; // -? 移除可选标记
};

// Readonly<T> — 所有属性变只读
type MyReadonly<T> = {
  readonly [K in keyof T]: T[K];
};

// Pick<T, K> — 选取部分属性
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Omit<T, K> — 排除部分属性
type MyOmit<T, K extends keyof any> = {
  [P in keyof T as P extends K ? never : P]: T[P];
};
// 或
type MyOmit2<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

// Record<K, V> — 构造键值对类型
type MyRecord<K extends keyof any, V> = {
  [P in K]: V;
};

// Exclude<T, U> — 从联合类型中排除
type MyExclude<T, U> = T extends U ? never : T;

// Extract<T, U> — 从联合类型中提取
type MyExtract<T, U> = T extends U ? T : never;

// ReturnType<T> — 获取函数返回类型
type MyReturnType<T extends (...args: any[]) => any> = T extends (...args: any[]) => infer R ? R : never;

// Parameters<T> — 获取函数参数类型
type MyParameters<T extends (...args: any[]) => any> = T extends (...args: infer P) => any ? P : never;
```

---

## 3. 条件类型与 infer

### 概念讲解

条件类型 = 类型层面的三元表达式：`T extends U ? X : Y`

`infer` = 在条件类型中声明一个待推导的类型变量。

### 面试问题

**Q: infer 关键字怎么用？给几个实际例子？**

### 代码示例

```typescript
// 基础条件类型
type IsString<T> = T extends string ? true : false;
type A = IsString<'hello'>; // true
type B = IsString<42>;      // false

// infer — 提取数组元素类型
type ElementOf<T> = T extends (infer E)[] ? E : never;
type C = ElementOf<string[]>;  // string
type D = ElementOf<[1, 'a']>;  // 1 | 'a'

// infer — 提取 Promise 内部类型（递归展开）
type UnwrapPromise<T> = T extends Promise<infer U> ? UnwrapPromise<U> : T;
type E = UnwrapPromise<Promise<Promise<number>>>; // number

// infer — 提取函数第一个参数类型
type FirstArg<T> = T extends (first: infer F, ...rest: any[]) => any ? F : never;
type F = FirstArg<(name: string, age: number) => void>; // string

// 实际应用：提取 React 组件 Props 类型
type PropsOf<T> = T extends React.ComponentType<infer P> ? P : never;

// 提取对象所有值的类型
type ValueOf<T> = T[keyof T];
type G = ValueOf<{ a: string; b: number }>; // string | number

// 条件类型分发（Distributive Conditional Types）
type ToArray<T> = T extends any ? T[] : never;
type H = ToArray<string | number>; // string[] | number[] （分发了！不是 (string|number)[]）

// 阻止分发
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;
type I = ToArrayNonDist<string | number>; // (string | number)[]
```

---

## 4. 模板字面量类型

### 面试问题

**Q: TypeScript 模板字面量类型有什么实际用途？**

### 代码示例

```typescript
// 基础用法
type EventName = `on${Capitalize<'click' | 'focus' | 'blur'>}`;
// "onClick" | "onFocus" | "onBlur"

// CSS 单位
type CSSValue = `${number}${'px' | 'rem' | 'em' | '%'}`;
const width: CSSValue = '100px'; // ✅
const bad: CSSValue = '100vw';   // ❌

// 路由参数提取
type ExtractParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParams<Rest>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

type Params = ExtractParams<'/user/:id/posts/:postId'>;
// "id" | "postId"

// 实际应用：类型安全的事件系统
type EventMap = {
  click: { x: number; y: number };
  focus: { target: HTMLElement };
  'user:login': { userId: string };
};

function on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void) {
  // ...
}

on('click', (data) => {
  console.log(data.x, data.y); // 自动推导类型
});
```

---

## 5. 递归类型

### 面试问题

**Q: 如何实现深层 Partial（DeepPartial）？**

### 代码示例

```typescript
// DeepPartial — 递归将所有属性变可选
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

interface Config {
  server: {
    host: string;
    port: number;
    ssl: {
      enabled: boolean;
      cert: string;
    };
  };
  database: {
    url: string;
  };
}

// 所有层级都是可选的
const partialConfig: DeepPartial<Config> = {
  server: { ssl: { enabled: true } }, // 不需要写 host/port/cert
};

// DeepReadonly — 递归只读
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

// 路径类型（获取嵌套对象的所有路径）
type Path<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T & string]: K | `${K}.${Path<T[K]>}`;
    }[keyof T & string]
  : never;

type ConfigPath = Path<Config>;
// "server" | "server.host" | "server.port" | "server.ssl" | "server.ssl.enabled" | ...
```

---

## 6. 组件 Props 类型设计

### 面试问题

**Q: 如何设计一个类型安全的组件 Props？**

### 代码示例

```typescript
// 1. 基础 Props 设计 — 区分必选和可选
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger'; // 联合类型限制
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

// 2. 互斥 Props — 使用联合类型（discriminated union）
type ModalProps = {
  title: string;
  onClose: () => void;
} & (
  | { type: 'confirm'; onConfirm: () => void; onCancel: () => void }
  | { type: 'alert'; onOk: () => void }
  | { type: 'custom'; footer: React.ReactNode }
);

// 使用时 TypeScript 会检查
const modal: ModalProps = {
  title: 'Delete?',
  onClose: () => {},
  type: 'confirm',
  onConfirm: () => {},
  onCancel: () => {},
  // onOk: () => {}, // ❌ type: 'confirm' 时不存在 onOk
};

// 3. 泛型组件 — Table
interface Column<T> {
  key: keyof T;
  title: string;
  render?: (value: T[keyof T], record: T) => React.ReactNode;
}

interface TableProps<T extends Record<string, any>> {
  data: T[];
  columns: Column<T>[];
  rowKey: keyof T;
  onRowClick?: (record: T) => void;
}

function Table<T extends Record<string, any>>({ data, columns, rowKey, onRowClick }: TableProps<T>) {
  return (
    <table>
      <thead>
        <tr>{columns.map(col => <th key={String(col.key)}>{col.title}</th>)}</tr>
      </thead>
      <tbody>
        {data.map(record => (
          <tr key={String(record[rowKey])} onClick={() => onRowClick?.(record)}>
            {columns.map(col => (
              <td key={String(col.key)}>
                {col.render ? col.render(record[col.key], record) : String(record[col.key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// 使用 — 完全类型安全
interface User {
  id: number;
  name: string;
  age: number;
}

<Table<User>
  data={users}
  rowKey="id"
  columns={[
    { key: 'name', title: '姓名' },
    { key: 'age', title: '年龄', render: (val) => `${val}岁` },
    // { key: 'email', title: '邮箱' }, // ❌ User 没有 email 字段
  ]}
/>;

// 4. 多态组件 — as prop
type PolymorphicProps<E extends React.ElementType, P = {}> = P & {
  as?: E;
} & Omit<React.ComponentPropsWithoutRef<E>, keyof P | 'as'>;

function Box<E extends React.ElementType = 'div'>({
  as,
  ...props
}: PolymorphicProps<E, { padding?: number }>) {
  const Component = as || 'div';
  return <Component {...props} />;
}

// 用法
<Box as="a" href="/home" padding={8} />  // ✅ 有 href（因为 as="a"）
<Box as="button" onClick={() => {}} />   // ✅ 有 onClick（因为 as="button"）
```

---

## 7. API 响应类型安全

### 面试问题

**Q: 如何确保前后端 API 类型一致？**

### 代码示例

```typescript
// 1. 统一 API 响应结构
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// 2. 定义各接口响应类型
interface UserDTO {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 3. 类型安全的请求函数
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const json: ApiResponse<T> = await response.json();
  if (json.code !== 0) {
    throw new Error(json.message);
  }
  return json.data;
}

// 使用 — 返回类型自动推导
const user = await request<UserDTO>('/api/user/1');
// user 类型为 UserDTO

const users = await request<PaginatedResponse<UserDTO>>('/api/users?page=1');
// users.list 类型为 UserDTO[]

// 4. API 路由类型映射（高级）
interface ApiRoutes {
  'GET /api/user/:id': { params: { id: string }; response: UserDTO };
  'GET /api/users': { params: { page: number; pageSize: number }; response: PaginatedResponse<UserDTO> };
  'POST /api/user': { body: Omit<UserDTO, 'id' | 'createdAt'>; response: UserDTO };
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

function typedRequest<R extends keyof ApiRoutes>(
  route: R,
  ...args: 'body' extends keyof ApiRoutes[R]
    ? [body: ApiRoutes[R]['body']]
    : 'params' extends keyof ApiRoutes[R]
      ? [params: ApiRoutes[R]['params']]
      : []
): Promise<ApiRoutes[R]['response']> {
  // 实现省略
  return {} as any;
}

// 使用 — 路由、参数、返回值全类型安全
const user2 = await typedRequest('GET /api/user/:id', { id: '1' });
const newUser = await typedRequest('POST /api/user', { name: 'Alice', email: 'a@b.com' });
```
