// ─── Preview HTML Generator ─────────────────────────────────
// Extracted to its own file to keep playground/page.tsx clean.

function extractImportNames(code: string, ...moduleNames: string[]): string[] {
  const names: string[] = [];
  for (let mi = 0; mi < moduleNames.length; mi++) {
    const mod = moduleNames[mi];
    const escaped = mod.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      "import\\s+\\{([\\s\\S]*?)\\}\\s+from\\s+[\"']" + escaped + "[\"']",
      "g"
    );
    let match;
    while ((match = regex.exec(code)) !== null) {
      const parts = match[1].split(",");
      for (let pi = 0; pi < parts.length; pi++) {
        const trimmed = parts[pi].trim().replace(/\s+as\s+\w+/, "");
        if (trimmed && !trimmed.startsWith("type ")) {
          names.push(trimmed);
        }
      }
    }
  }
  return Array.from(new Set(names));
}

export function generatePreviewHtml(code: string): string {
  const lucideIcons = extractImportNames(code, "lucide-react");
  const motionExports = extractImportNames(code, "motion/react", "framer-motion");

  let processed = code;

  // Strip "use client" / "use server" directives
  processed = processed.replace(/^\s*["']use (?:client|server)["'];?\s*\n?/gm, "");

  // Find default export component name
  let componentName = "Component";

  const funcMatch = processed.match(/export\s+default\s+function\s+(\w+)/);
  if (funcMatch) {
    componentName = funcMatch[1];
    processed = processed.replace(/export\s+default\s+function/, "function");
  } else {
    const namedMatch = processed.match(/export\s+default\s+(\w+)\s*;?\s*$/m);
    if (namedMatch) {
      componentName = namedMatch[1];
      processed = processed.replace(/export\s+default\s+\w+\s*;?\s*$/m, "");
    }
  }

  // Strip all import statements
  processed = processed.replace(/^import\s+[\s\S]*?from\s+["'].*?["'];?\s*$/gm, "");
  processed = processed.replace(/^import\s+["'].*?["'];?\s*$/gm, "");

  // Remove remaining export keywords
  processed = processed.replace(/^export\s+/gm, "");

  // Append error boundary + render call
  processed += [
    "",
    "class __EB extends React.Component {",
    "  constructor(p){super(p);this.state={e:null}}",
    "  static getDerivedStateFromError(e){return{e}}",
    "  render(){",
    "    if(this.state.e)return React.createElement('div',{className:'preview-error'},String(this.state.e.message||this.state.e));",
    "    return this.props.children;",
    "  }",
    "}",
    "const __root = createRoot(document.getElementById(\"root\"));",
    "__root.render(React.createElement(__EB, null, React.createElement(" + componentName + ")));",
  ].join("\n");

  const escapedCode = JSON.stringify(processed);

  // Build targeted CDN import lists
  let motionNames = [
    "motion", "AnimatePresence", "useMotionValue", "useSpring",
    "useTransform", "useAnimation", "useInView", "useScroll",
    "LayoutGroup", "m",
  ].concat(motionExports);
  motionNames = Array.from(new Set(motionNames));

  let motionAssignments = "";
  for (let i = 0; i < motionNames.length; i++) {
    motionAssignments += "if(M[\"" + motionNames[i] + "\"])window[\"" + motionNames[i] + "\"]=M[\"" + motionNames[i] + "\"];";
  }

  let iconAssignments = "";
  if (lucideIcons.length > 0) {
    for (let j = 0; j < lucideIcons.length; j++) {
      iconAssignments += "if(LR[\"" + lucideIcons[j] + "\"])window[\"" + lucideIcons[j] + "\"]=LR[\"" + lucideIcons[j] + "\"];";
    }
  }

  const lucideBlock = iconAssignments
    ? "try{\n    const LR=await import(\"https://esm.sh/lucide-react@0.469.0?deps=react@19\");\n    " + iconAssignments + "\n  }catch(e){console.warn('lucide-react skipped:',e)}"
    : "";

  const lines = [
    "<!DOCTYPE html>",
    "<html class=\"dark\">",
    "<head>",
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">",
    "<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">",
    "<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin=\"anonymous\">",
    "<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap\">",
    "<script src=\"https://cdn.tailwindcss.com/3.4.17\"><\/script>",
    "<script>tailwind.config={darkMode:'class',theme:{extend:{colors:{background:'hsl(var(--background))',foreground:'hsl(var(--foreground))',primary:{DEFAULT:'hsl(var(--primary))',foreground:'hsl(var(--primary-foreground))'},secondary:{DEFAULT:'hsl(var(--secondary))',foreground:'hsl(var(--secondary-foreground))'},muted:{DEFAULT:'hsl(var(--muted))',foreground:'hsl(var(--muted-foreground))'},accent:{DEFAULT:'hsl(var(--accent))',foreground:'hsl(var(--accent-foreground))'},destructive:{DEFAULT:'hsl(var(--destructive))',foreground:'hsl(var(--destructive-foreground))'},border:'hsl(var(--border))',input:'hsl(var(--input))',ring:'hsl(var(--ring))',card:{DEFAULT:'hsl(var(--card))',foreground:'hsl(var(--card-foreground))'},popover:{DEFAULT:'hsl(var(--popover))',foreground:'hsl(var(--popover-foreground))'}},borderRadius:{lg:'var(--radius)',md:'calc(var(--radius) - 2px)',sm:'calc(var(--radius) - 4px)'}}}}<\/script>",
    "<style>",
    "*{margin:0;padding:0;box-sizing:border-box}",
    ":root{--background:0 0% 100%;--foreground:0 0% 3.9%;--card:0 0% 100%;--card-foreground:0 0% 3.9%;--popover:0 0% 100%;--popover-foreground:0 0% 3.9%;--primary:0 0% 9%;--primary-foreground:0 0% 98%;--secondary:0 0% 96.1%;--secondary-foreground:0 0% 9%;--muted:0 0% 96.1%;--muted-foreground:0 0% 45.1%;--accent:0 0% 96.1%;--accent-foreground:0 0% 9%;--destructive:0 84.2% 60.2%;--destructive-foreground:0 0% 98%;--border:0 0% 89.8%;--input:0 0% 89.8%;--ring:0 0% 3.9%;--radius:0.5rem}",
    ".dark{--background:0 0% 3.9%;--foreground:0 0% 98%;--card:0 0% 3.9%;--card-foreground:0 0% 98%;--popover:0 0% 3.9%;--popover-foreground:0 0% 98%;--primary:0 0% 98%;--primary-foreground:0 0% 9%;--secondary:0 0% 14.9%;--secondary-foreground:0 0% 98%;--muted:0 0% 14.9%;--muted-foreground:0 0% 63.9%;--accent:0 0% 14.9%;--accent-foreground:0 0% 98%;--destructive:0 62.8% 30.6%;--destructive-foreground:0 0% 98%;--border:0 0% 14.9%;--input:0 0% 14.9%;--ring:0 0% 83.1%}",
    "body{background:hsl(var(--background));color:hsl(var(--foreground));font-family:Inter,system-ui,-apple-system,sans-serif;min-height:100vh}",
    "#root{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}",
    ".preview-loading{display:flex;flex-direction:column;align-items:center;gap:10px;color:hsl(0 0% 40%);font-size:13px}",
    ".preview-dot{width:5px;height:5px;background:currentColor;border-radius:50%;animation:pulse 1.4s ease-in-out infinite}",
    "@keyframes pulse{0%,100%{opacity:.2}50%{opacity:1}}",
    ".preview-error{padding:16px;border-radius:12px;background:hsl(0 40% 8%);border:1px solid hsl(0 40% 18%);color:hsl(0 60% 65%);font-size:12px;max-width:480px;font-family:ui-monospace,monospace;white-space:pre-wrap;line-height:1.6}",
    "</style>",
    "</head>",
    "<body>",
    "<div id=\"root\"><div class=\"preview-loading\"><div class=\"preview-dot\"></div><span>Loading preview\\u2026</span></div></div>",
    "",
    "<script>",
    "window.onerror=function(m,s,l,c,e){",
    "  var el=document.getElementById('root');",
    "  if(el)el.innerHTML='<div class=\"preview-error\">'+String(e&&e.message||m).replace(/</g,'&lt;')+'</div>';",
    "  return true;",
    "};",
    "<\/script>",
    "",
    "<script type=\"module\">",
    "try{",
    "  const R=await import(\"https://esm.sh/react@19\");",
    "  const React=R.default||R;",
    "  window.React=React;",
    "  window.useState=React.useState;",
    "  window.useEffect=React.useEffect;",
    "  window.useRef=React.useRef;",
    "  window.useMemo=React.useMemo;",
    "  window.useCallback=React.useCallback;",
    "  window.useContext=React.useContext;",
    "  window.useReducer=React.useReducer;",
    "  window.useLayoutEffect=React.useLayoutEffect;",
    "  window.useId=React.useId;",
    "  window.useTransition=React.useTransition;",
    "  window.useDeferredValue=React.useDeferredValue;",
    "  window.createContext=React.createContext;",
    "  window.forwardRef=React.forwardRef;",
    "  window.memo=React.memo;",
    "  window.lazy=React.lazy;",
    "  window.Suspense=React.Suspense;",
    "  window.Fragment=React.Fragment;",
    "  window.createElement=React.createElement;",
    "  window.cloneElement=React.cloneElement;",
    "  window.Children=React.Children;",
    "  window.startTransition=React.startTransition;",
    "  const RDC=await import(\"https://esm.sh/react-dom@19/client?deps=react@19\");",
    "  window.createRoot=RDC.createRoot;",
    "  try{",
    "    const M=await import(\"https://esm.sh/motion@12/react?deps=react@19,react-dom@19\")",
    "      .catch(()=>import(\"https://esm.sh/framer-motion@11?deps=react@19,react-dom@19\"));",
    "    " + motionAssignments,
    "  }catch(e){console.warn('motion skipped:',e)}",
    "  " + lucideBlock,
    "  window.cn=function(){",
    "    var r=[];",
    "    for(var i=0;i<arguments.length;i++){",
    "      var a=arguments[i];",
    "      if(!a)continue;",
    "      if(typeof a==='string')r.push(a);",
    "      else if(Array.isArray(a)){for(var j=0;j<a.length;j++){if(typeof a[j]==='string')r.push(a[j]);else if(a[j]&&typeof a[j]==='object'){for(var k in a[j])if(a[j][k])r.push(k);}}}",
    "      else if(typeof a==='object'){for(var k in a)if(a[k])r.push(k);}",
    "    }",
    "    return r.join(' ');",
    "  };",
    "  window.twMerge=window.cn;",
    "  window.clsx=window.cn;",
    "  window.cva=function(base,config){",
    "    return function(props){",
    "      var result=base||'';",
    "      if(config&&config.variants&&props){",
    "        for(var key in config.variants){",
    "          var val=props[key]||(config.defaultVariants&&config.defaultVariants[key]);",
    "          if(val&&config.variants[key]&&config.variants[key][val])result+=' '+config.variants[key][val];",
    "        }",
    "      }",
    "      return result;",
    "    };",
    "  };",
    "  window.__DEPS_READY__=true;",
    "  window.dispatchEvent(new Event('deps-ready'));",
    "}catch(e){",
    "  document.getElementById('root').innerHTML='<div class=\"preview-error\">Failed to load dependencies:\\n'+e.message+'</div>';",
    "}",
    "<\/script>",
    "",
    "<script src=\"https://unpkg.com/@babel/standalone@7.26.9/babel.min.js\"><\/script>",
    "<script>",
    "function __run(){",
    "  try{",
    "    var code=" + escapedCode + ";",
    "    var transformed=Babel.transform(code,{",
    "      presets:[['react',{runtime:'classic'}],['typescript',{isTSX:true,allExtensions:true}]],",
    "      filename:'component.tsx',",
    "    }).code;",
    "    var s=document.createElement('script');",
    "    s.textContent=transformed;",
    "    document.body.appendChild(s);",
    "  }catch(e){",
    "    document.getElementById('root').innerHTML='<div class=\"preview-error\">'+String(e.message).replace(/</g,'&lt;')+'</div>';",
    "  }",
    "}",
    "if(window.__DEPS_READY__){__run();}",
    "else{window.addEventListener('deps-ready',__run);}",
    "<\/script>",
    "</body>",
    "</html>",
  ];

  return lines.join("\n");
}

export function extractCodeProgressively(rawText: string): string {
  const fence = "\x60\x60\x60";
  const fencePattern = new RegExp(fence + "(?:typescript|tsx|ts|jsx)?\\s*\\n");
  const fenceMatch = rawText.match(fencePattern);
  if (!fenceMatch || fenceMatch.index === undefined) return "";
  const codeStart = fenceMatch.index + fenceMatch[0].length;
  const afterFence = rawText.slice(codeStart);
  const closingIndex = afterFence.indexOf("\n" + fence);
  if (closingIndex !== -1) return afterFence.slice(0, closingIndex);
  return afterFence;
}
