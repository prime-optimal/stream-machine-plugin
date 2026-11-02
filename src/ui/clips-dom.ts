export type OpenLink = (url: string) => void;

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = "", className = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function button(label: string, run: () => void, className = "live-button"): HTMLButtonElement {
  const node = el("button", label, className);
  node.type = "button";
  node.addEventListener("click", run);
  return node;
}

export function externalLink(label: string, href: string, openLink: OpenLink, className = ""): HTMLAnchorElement {
  const node = el("a", label, className);
  node.href = href;
  node.target = "_blank";
  node.rel = "noopener noreferrer";
  node.addEventListener("click", event => { event.preventDefault(); openLink(href); });
  return node;
}
