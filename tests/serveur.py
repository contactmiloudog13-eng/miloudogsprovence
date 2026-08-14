"""Serveur local multi-thread avec compression gzip.

http.server sert un seul fichier a la fois et sans compression : les mesures
faites dessus sont serialisees et surestiment le poids du texte. Celui-ci
reproduit le comportement de GitHub Pages (threads + gzip), ce qui rend les
mesures de vitesse comparables au site reel.
"""
import http.server, socketserver, gzip, os

TYPES = {
    'html': 'text/html', 'css': 'text/css', 'js': 'application/javascript',
    'webp': 'image/webp', 'png': 'image/png', 'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg', 'woff2': 'font/woff2', 'xml': 'application/xml',
    'json': 'application/json', 'svg': 'image/svg+xml',
    'webmanifest': 'application/manifest+json', 'mp4': 'video/mp4',
    'txt': 'text/plain', 'ico': 'image/x-icon',
}
COMPRESSIBLES = {'html', 'css', 'js', 'xml', 'json', 'svg', 'webmanifest', 'txt'}


class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def do_GET(self):
        chemin = self.translate_path(self.path)
        if os.path.isdir(chemin):
            chemin = os.path.join(chemin, 'index.html')
        if not os.path.isfile(chemin):
            self.send_error(404)
            return
        ext = chemin.rsplit('.', 1)[-1].lower()
        donnees = open(chemin, 'rb').read()
        gz = ext in COMPRESSIBLES and 'gzip' in self.headers.get('Accept-Encoding', '')
        if gz:
            donnees = gzip.compress(donnees, 6)
        self.send_response(200)
        typ = TYPES.get(ext, 'application/octet-stream')
        if ext in ('html', 'css', 'js'):
            typ += '; charset=utf-8'
        self.send_header('Content-Type', typ)
        if gz:
            self.send_header('Content-Encoding', 'gzip')
        self.send_header('Content-Length', str(len(donnees)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(donnees)

    def log_message(self, *a):
        pass


class Serveur(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == '__main__':
    os.chdir('/home/user/miloudogsprovence')
    Serveur(('', 8899), Handler).serve_forever()
