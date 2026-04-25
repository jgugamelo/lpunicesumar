import urllib.request
import re

slug = 'acupuntura-e-tecnicas-complementares'
bases = [
    'https://inscricoes.unicesumar.edu.br/curso/',
    'https://www.unicesumar.edu.br/graduacao/',
    'https://www.unicesumar.edu.br/pos-graduacao/',
    'https://www.unicesumar.edu.br/pos-graduacao/curso/'
]
slugs = [slug, slug + '-ead', slug + '-semipresencial', slug.replace('-ead', '')]

found = False
for s in slugs:
    if found: break
    for b in bases:
        url = b + s
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            res = urllib.request.urlopen(req, timeout=5)
            html = res.read().decode('utf-8')
            print(f"SUCCESS: {url} (code {res.status})")
            
            d_match = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']{20,})["\']', html, re.I)
            if d_match: print("Desc:", d_match.group(1))
            else: print("No meta description")
            
            found = True
            break
        except Exception as e:
            pass

if not found:
    print("Could not find the page.")
