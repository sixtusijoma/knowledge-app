type StyleNode = {
  textContent: string;
  remove: () => void;
};

type WebDocument = {
  head: { appendChild: (node: StyleNode) => void };
  createElement: (tag: string) => StyleNode;
  documentElement: {
    style: { backgroundColor: string; colorScheme: string; height: string };
  };
  body: {
    style: { backgroundColor: string; margin: string; height: string; overflow: string };
  };
};

export function applyWebChrome(canvas: string, colorScheme: 'dark' | 'light'): () => void {
  const scope = globalThis as { document?: WebDocument };
  const doc = scope.document;
  if (!doc) {
    return () => undefined;
  }
  doc.documentElement.style.backgroundColor = canvas;
  doc.documentElement.style.colorScheme = colorScheme;
  doc.documentElement.style.height = '100%';
  doc.body.style.backgroundColor = canvas;
  doc.body.style.margin = '0';
  doc.body.style.height = '100%';
  doc.body.style.overflow = 'hidden';
  const style = doc.createElement('style');
  // Text fields show focus with their own accent border, so the browser ring is dropped.
  style.textContent =
    'html, body, #root { height: 100%; background-color: transparent; } input:focus { outline: none; }';
  doc.head.appendChild(style);
  return () => {
    style.remove();
  };
}
