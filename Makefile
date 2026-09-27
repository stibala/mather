.PHONY: run open

# Serve the app on http://localhost:8000 — also reachable from a tablet
# on the same wifi at http://<this-machine-ip>:8000
run:
	python3 -m http.server 8000

# Just open the file directly; no server needed
open:
	open index.html
