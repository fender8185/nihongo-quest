"""The pages' web server for the e2e tests and the checker scripts: Python's http.server with a deep listen queue.

    python serve.py PORT [--bind 127.0.0.1]      (serves the current folder, as `python -m http.server` does)

`-m http.server` keeps a queue of 5 connections: since the app's code is ~40 files (2026-11-11), a first visit asks for them all
at once while the service worker precaches them, and the connections beyond the queue were reset (ERR_CONNECTION_RESET), so the
page never got going and the test waited it out."""
import http.server, sys

class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

if __name__ == "__main__":
    port = int(sys.argv[1])
    bind = sys.argv[sys.argv.index("--bind") + 1] if "--bind" in sys.argv else "127.0.0.1"
    Server((bind, port), Quiet).serve_forever()
