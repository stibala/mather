#!/usr/bin/env python3
"""Build src/ into the single-file index.html that ships and gets published.

The app is deliberately one file at runtime: it opens by double-click, works
offline, needs no server and no npm. The source is split up so it can be read
and tested; this glues it back together.

Modules use real `import`/`export` so editors and tests understand them. Both are
stripped here, because everything lands in one shared scope in manifest order --
which means ORDER MATTERS. `make check` reports what depends on what.
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"

def chomp(text):
    """Drop exactly the one trailing newline each source file ends with — not the
    blank lines that separate sections, which are part of the content."""
    return text[:-1] if text.endswith("\n") else text

def strip_module_syntax(text):
    lines = text.split("\n")
    out, seen_code = [], False
    for line in lines:
        if not seen_code and line.startswith("import ") and line.rstrip().endswith(";"):
            continue                                  # import lines vanish
        if not seen_code and line.strip() == "" and not out:
            continue                                  # and the blank line after them
        seen_code = True
        out.append(re.sub(r"^export ", "", line))
    return "\n".join(out)

def bundle_js(names=None):
    man = json.loads((SRC / "manifest.json").read_text())
    names = names or man["js"]
    parts = [chomp((SRC / "iife-head.js").read_text())]
    for name in names:
        parts.append(chomp(strip_module_syntax((SRC / name).read_text())))
    return "\n".join(parts)

def bundle_css():
    man = json.loads((SRC / "manifest.json").read_text())
    parts = [chomp((SRC / "style" / n).read_text()) for n in man["css"]]
    return "\n".join(parts)

def build():
    page = (SRC / "page.html").read_text()
    page = page.replace("/*__CSS__*/", bundle_css())
    page = page.replace("//__JS__", bundle_js())
    (ROOT / "index.html").write_text(page)
    return page

def graph():
    """Who uses what, and which references point at a file that comes later.

    Concatenation means a name must exist by the time it is *used*, not merely
    be declared somewhere. Function declarations hoist so a forward reference to
    one is fine; a forward reference to a const or let is only safe if it is read
    inside a function body that runs later. Those are listed separately because
    reordering the manifest around one would break the app silently.
    """
    man = json.loads((SRC / "manifest.json").read_text())
    order = man["js"]
    pos = {n: i for i, n in enumerate(order)}
    owner, kinds, imports = {}, {}, {}
    for name in order:
        text = (SRC / name).read_text()
        imports[name] = re.findall(r'^import \{ (.+?) \} from "(.+?)";', text, re.M)
        for m in re.finditer(r"^export (const|let|var|function) ([A-Za-z_$][\w$]*)", text, re.M):
            owner[m.group(2)] = name
            kinds[m.group(2)] = m.group(1)
    forward = []
    for name in order:
        for names, path in imports[name]:
            for nm in [x.strip() for x in names.split(",")]:
                src_file = owner.get(nm)
                if src_file and pos[src_file] > pos[name]:
                    forward.append((name, nm, src_file, kinds[nm]))
    print(f"{len(order)} modules, {len(owner)} shared names\n")
    for name in order:
        deps = sorted({p for _, p in imports[name]})
        print(f"  {name:<20} <- {', '.join(d.split('/')[-1] for d in deps) if deps else '(nothing)'}")
    risky = [f for f in forward if f[3] != "function"]
    print(f"\n{len(forward)} forward references; {len(risky)} are not hoisted functions:")
    for n, nm, sf, k in risky:
        print(f"  {n} uses {nm} ({k} in {sf}) — only safe because it is read at call time")

if __name__ == "__main__":
    if "--graph" in sys.argv:
        graph(); sys.exit(0)
    page = build()
    if "--check" in sys.argv:
        prev = pathlib.Path(sys.argv[sys.argv.index("--check") + 1]).read_text()
        print("identical to the previous build" if prev == page else "DIFFERS from the previous build")
        sys.exit(0 if prev == page else 1)
    print(f"index.html  {len(page.splitlines())} lines  ({len(page)/1024:.0f} KB)")
