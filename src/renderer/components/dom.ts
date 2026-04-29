export type ChildNodeArg = Node | string | null | undefined | false;

export interface ElementOptions {
  class?: string;
  attrs?: Record<string, string>;
  data?: Record<string, string>;
  title?: string;
}

export function el<TKey extends keyof HTMLElementTagNameMap>(
  tag: TKey,
  options?: ElementOptions,
  children: ChildNodeArg[] = []
): HTMLElementTagNameMap[TKey] {
  const node = document.createElement(tag);
  if (options?.class) node.className = options.class;
  if (options?.title) node.title = options.title;
  if (options?.attrs) {
    for (const [name, value] of Object.entries(options.attrs)) node.setAttribute(name, value);
  }
  if (options?.data) {
    for (const [name, value] of Object.entries(options.data)) node.dataset[name] = value;
  }
  appendChildren(node, children);
  return node;
}

export function txt(value: string): Text {
  return document.createTextNode(value);
}

export function appendChildren(parent: Node, children: ChildNodeArg[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(child instanceof Node ? child : document.createTextNode(child));
  }
}

export function clear(node: Node): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter((value): value is string => Boolean(value)).join(' ');
}
