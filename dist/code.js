"use strict";
var __plugin = (() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // src/code.ts
  var require_code = __commonJS({
    "src/code.ts"(exports) {
      figma.showUI(__html__, { width: 340, height: 490, title: "Placement Text" });
      sendSelection();
      figma.on("selectionchange", sendSelection);
      function getTextNodes() {
        return figma.currentPage.selection.filter((n) => n.type === "TEXT");
      }
      function sendSelection() {
        const nodes = getTextNodes();
        figma.ui.postMessage({
          type: "selection-changed",
          textCount: nodes.length,
          nodeIds: nodes.map((n) => n.id)
        });
      }
      figma.ui.onmessage = (msg) => __async(exports, null, function* () {
        switch (msg.type) {
          case "insert-text":
            yield handleInsert(msg.text);
            break;
          case "replace-text":
            yield handleReplace(msg.replacements);
            break;
          case "resize":
            figma.ui.resize(340, msg.height);
            break;
        }
      });
      function loadFontForNode(node) {
        return __async(this, null, function* () {
          if (node.fontName !== figma.mixed) {
            yield figma.loadFontAsync(node.fontName);
            return;
          }
          const fonts = /* @__PURE__ */ new Map();
          for (let i = 0; i < node.characters.length; i++) {
            const fn = node.getRangeFontName(i, i + 1);
            const key = `${fn.family}:${fn.style}`;
            if (!fonts.has(key))
              fonts.set(key, fn);
          }
          yield Promise.all([...fonts.values()].map((fn) => figma.loadFontAsync(fn)));
        });
      }
      function handleReplace(replacements) {
        return __async(this, null, function* () {
          let replaced = 0;
          for (const { nodeId, text } of replacements) {
            const node = figma.getNodeById(nodeId);
            if (!node || node.type !== "TEXT")
              continue;
            try {
              yield loadFontForNode(node);
              node.characters = text;
              replaced++;
            } catch (e) {
              console.error("Could not replace text in node", nodeId, e);
            }
          }
          figma.ui.postMessage({ type: "replaced", count: replaced });
        });
      }
      function handleInsert(text) {
        return __async(this, null, function* () {
          const families = ["Inter", "Roboto", "SF Pro Text", "Helvetica Neue"];
          let loaded = false;
          for (const family of families) {
            try {
              yield figma.loadFontAsync({ family, style: "Regular" });
              loaded = true;
              break;
            } catch (_) {
            }
          }
          if (!loaded) {
            figma.ui.postMessage({ type: "error", message: "Could not load a font." });
            return;
          }
          const textNode = figma.createText();
          textNode.characters = text;
          textNode.fontSize = 14;
          const { x: cx, y: cy } = figma.viewport.center;
          textNode.x = cx - textNode.width / 2;
          textNode.y = cy - textNode.height / 2;
          figma.currentPage.selection = [textNode];
          figma.viewport.scrollAndZoomIntoView([textNode]);
          figma.ui.postMessage({ type: "inserted" });
        });
      }
    }
  });
  return require_code();
})();
