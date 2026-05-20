/// <reference types="@figma/plugin-typings" />

figma.showUI(__html__, { width: 340, height: 490, title: "FigmaFill" });

// Send selection immediately on open, then on every change.
sendSelection();
figma.on("selectionchange", sendSelection);

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

function getTextNodes(): TextNode[] {
  return figma.currentPage.selection.filter(n => n.type === "TEXT") as TextNode[];
}

function sendSelection(): void {
  const nodes = getTextNodes();
  figma.ui.postMessage({
    type: "selection-changed",
    textCount: nodes.length,
    nodeIds: nodes.map(n => n.id),
  });
}

// ---------------------------------------------------------------------------
// Message dispatch
// ---------------------------------------------------------------------------

figma.ui.onmessage = async (msg: any) => {
  switch (msg.type) {
    case "insert-text":  await handleInsert(msg.text);         break;
    case "replace-text": await handleReplace(msg.replacements); break;
    case "resize":       figma.ui.resize(340, msg.height);     break;
  }
};

// ---------------------------------------------------------------------------
// Replace selected text nodes
// ---------------------------------------------------------------------------

async function loadFontForNode(node: TextNode): Promise<void> {
  if (node.fontName !== figma.mixed) {
    await figma.loadFontAsync(node.fontName as FontName);
    return;
  }
  // Mixed fonts — collect and load every unique font used in the text.
  const fonts = new Map<string, FontName>();
  for (let i = 0; i < node.characters.length; i++) {
    const fn = node.getRangeFontName(i, i + 1) as FontName;
    const key = `${fn.family}:${fn.style}`;
    if (!fonts.has(key)) fonts.set(key, fn);
  }
  await Promise.all([...fonts.values()].map(fn => figma.loadFontAsync(fn)));
}

async function handleReplace(
  replacements: Array<{ nodeId: string; text: string }>
): Promise<void> {
  let replaced = 0;
  for (const { nodeId, text } of replacements) {
    const node = figma.getNodeById(nodeId);
    if (!node || node.type !== "TEXT") continue;
    try {
      await loadFontForNode(node as TextNode);
      (node as TextNode).characters = text;
      replaced++;
    } catch (e) {
      console.error("Could not replace text in node", nodeId, e);
    }
  }
  figma.ui.postMessage({ type: "replaced", count: replaced });
}

// ---------------------------------------------------------------------------
// Insert a new text node at viewport centre
// ---------------------------------------------------------------------------

async function handleInsert(text: string): Promise<void> {
  const families = ["Inter", "Roboto", "SF Pro Text", "Helvetica Neue"];
  let loaded = false;
  for (const family of families) {
    try {
      await figma.loadFontAsync({ family, style: "Regular" });
      loaded = true;
      break;
    } catch (_) {}
  }
  if (!loaded) {
    figma.ui.postMessage({ type: "error", message: "Could not load a font." });
    return;
  }

  const textNode = figma.createText();
  textNode.characters = text;
  textNode.fontSize   = 14;

  const { x: cx, y: cy } = figma.viewport.center;
  textNode.x = cx - textNode.width  / 2;
  textNode.y = cy - textNode.height / 2;

  figma.currentPage.selection = [textNode];
  figma.viewport.scrollAndZoomIntoView([textNode]);
  figma.ui.postMessage({ type: "inserted" });
}
