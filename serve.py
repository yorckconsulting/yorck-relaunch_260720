#!/usr/bin/env python3
"""Local dev server that disables HTML caching (python -m http.server doesn't send Cache-Control at all, which lets browsers cache HTML heuristically and serve stale pages after edits)."""
import functools
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
DIRECTORY = sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(os.path.abspath(__file__))


class NoCacheHTMLHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        if self.path == "/" or self.path.endswith(".html"):
            self.send_header("Cache-Control", "no-cache, must-revalidate")
        super().end_headers()


if __name__ == "__main__":
    Handler = functools.partial(NoCacheHTMLHandler, directory=DIRECTORY)
    http.server.test(HandlerClass=Handler, port=PORT)
