.PHONY: build test check run open clean

# Rebuild the single-file index.html from src/. Do this after any edit —
# index.html is generated, never hand-edited.
build:
	@python3 build.py

# Run every suite against the real source, through a fake DOM.
test: build
	@python3 test/run.py

# What depends on what, and anything used before the file that declares it.
# Everything lands in one scope in manifest order, so order is load-bearing.
check:
	@python3 build.py --graph

# Serve on http://localhost:8000 — also reachable from a tablet on the same wifi.
run: build
	@python3 -m http.server 8000

# Just open the built file; no server needed.
open: build
	@open index.html

clean:
	@rm -f index.html && echo "index.html removed — run make build"
