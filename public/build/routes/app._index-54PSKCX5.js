import {
  Banner,
  BlockStack,
  Button,
  Card,
  Page,
  Select,
  Text,
  TextField
} from "/build/_shared/chunk-QLONWZBD.js";
import {
  createHotContext
} from "/build/_shared/chunk-NW5YQ4GS.js";
import {
  require_jsx_dev_runtime
} from "/build/_shared/chunk-XGOTYLZ5.js";
import "/build/_shared/chunk-U4FRFQSK.js";
import {
  require_react
} from "/build/_shared/chunk-7M6SC7J5.js";
import "/build/_shared/chunk-UWV35TSL.js";
import {
  __toESM
} from "/build/_shared/chunk-PNG5AS42.js";

// app/routes/app._index.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/app._index.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/app._index.tsx"
  );
  import.meta.hot.lastModified = "1769816843859.1992";
}
function AppIndex() {
  _s();
  const [productId, setProductId] = (0, import_react.useState)("");
  const [specsText, setSpecsText] = (0, import_react.useState)("");
  const [loading, setLoading] = (0, import_react.useState)(false);
  const [result, setResult] = (0, import_react.useState)(null);
  const handleSubmit = async () => {
    if (!specsText.trim())
      return;
    setLoading(true);
    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: specsText
        })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Extraction failed:", error);
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Page, { title: "Product Bridge", subtitle: "AI-powered product content automation", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(BlockStack, { gap: "400", children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(BlockStack, { gap: "400", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { as: "h2", variant: "headingMd", children: "Step 1: Select Product" }, void 0, false, {
        fileName: "app/routes/app._index.tsx",
        lineNumber: 55,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, { label: "Product", options: [{
        label: "Choose a product...",
        value: ""
      }, {
        label: "Canon EOS R5 Mark II",
        value: "canon-r5-ii"
      }, {
        label: "Sony A7 IV",
        value: "sony-a7iv"
      }], value: productId, onChange: setProductId }, void 0, false, {
        fileName: "app/routes/app._index.tsx",
        lineNumber: 56,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app._index.tsx",
      lineNumber: 54,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "app/routes/app._index.tsx",
      lineNumber: 53,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(BlockStack, { gap: "400", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { as: "h2", variant: "headingMd", children: "Step 2: Paste Manufacturer Specs" }, void 0, false, {
        fileName: "app/routes/app._index.tsx",
        lineNumber: 71,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextField, { label: "Raw specs from manufacturer", multiline: 8, value: specsText, onChange: setSpecsText, placeholder: "Paste the full specification sheet from the manufacturer website...", autoComplete: "off" }, void 0, false, {
        fileName: "app/routes/app._index.tsx",
        lineNumber: 72,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { variant: "primary", onClick: handleSubmit, loading, children: "Extract Content with AI" }, void 0, false, {
        fileName: "app/routes/app._index.tsx",
        lineNumber: 73,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app._index.tsx",
      lineNumber: 70,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "app/routes/app._index.tsx",
      lineNumber: 69,
      columnNumber: 9
    }, this),
    result && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(BlockStack, { gap: "400", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { as: "h2", variant: "headingMd", children: "Step 3: Review & Save" }, void 0, false, {
        fileName: "app/routes/app._index.tsx",
        lineNumber: 81,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Banner, { status: "success", children: "Content extracted! Review below and save to product." }, void 0, false, {
        fileName: "app/routes/app._index.tsx",
        lineNumber: 82,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("pre", { style: {
        fontSize: "12px",
        overflow: "auto",
        maxHeight: "400px"
      }, children: JSON.stringify(result, null, 2) }, void 0, false, {
        fileName: "app/routes/app._index.tsx",
        lineNumber: 85,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { variant: "primary", disabled: !productId, children: "Save to Product Metafields" }, void 0, false, {
        fileName: "app/routes/app._index.tsx",
        lineNumber: 92,
        columnNumber: 15
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app._index.tsx",
      lineNumber: 80,
      columnNumber: 13
    }, this) }, void 0, false, {
      fileName: "app/routes/app._index.tsx",
      lineNumber: 79,
      columnNumber: 20
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/app._index.tsx",
    lineNumber: 52,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "app/routes/app._index.tsx",
    lineNumber: 51,
    columnNumber: 10
  }, this);
}
_s(AppIndex, "pjLKZvKcYxSDNh/v8dt5oWDVZCk=");
_c = AppIndex;
var _c;
$RefreshReg$(_c, "AppIndex");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  AppIndex as default
};
//# sourceMappingURL=/build/routes/app._index-54PSKCX5.js.map
