#!/usr/bin/env python3
"""Run the test suites against the real source, through a fake DOM.

Each suite gets: the id list from the built page, the DOM stub, the whole app
un-wrapped (so its top-level names are reachable), then the suite itself.
Needs only JavaScriptCore, which ships with macOS -- no node, no npm.
"""
import json, pathlib, re, subprocess, sys, tempfile
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))
import build

ROOT = pathlib.Path(__file__).parent.parent
JSC = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"

def app_source():
    """The bundle without its IIFE wrapper, so tests can reach inside it."""
    js = build.bundle_js()
    head = build.chomp((build.SRC / "iife-head.js").read_text())
    assert js.startswith(head), "the bundle no longer starts with the IIFE opener"
    js = js[len(head):]
    js = re.sub(r"\}\)\(\);\s*$", "", js)
    return js

def main():
    page = (ROOT / "index.html").read_text()
    ids = sorted(set(re.findall(r'id="([^"]+)"', page)))
    suites = sorted(p for p in (ROOT / "test").glob("*.test.js"))
    if len(sys.argv) > 1:
        suites = [p for p in suites if any(a in p.name for a in sys.argv[1:])]
    stub = (ROOT / "test" / "dom-stub.js").read_text()
    app = app_source()
    helpers = (ROOT / "test" / "_helpers.js").read_text()
    failed = []
    for suite in suites:
        src = (f"globalThis.__IDS = {json.dumps(ids)};\n" + stub + "\n" + app + "\n"
               + helpers + "\n" + suite.read_text())
        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as fh:
            fh.write(src); path = fh.name
        print(f"\n\033[1m{suite.name}\033[0m")
        out = subprocess.run([JSC, path], capture_output=True, text=True)
        print(out.stdout.rstrip() or out.stderr.rstrip())
        if out.returncode != 0 or "FAIL" in out.stdout or "THROWS" in out.stdout:
            failed.append(suite.name)
    print()
    if failed:
        print(f"\033[31m{len(failed)} suite(s) failed: {', '.join(failed)}\033[0m")
        return 1
    print(f"\033[32mall {len(suites)} suites passed\033[0m")
    return 0

if __name__ == "__main__":
    sys.exit(main())
