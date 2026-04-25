import urllib.request
import re

url = 'https://inscricoes.unicesumar.edu.br/curso/acupuntura-e-tecnicas-complementares'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
res = urllib.request.urlopen(req)
html = res.read().decode('utf-8')

# Site é provavelmente SPA - checar scripts
scripts = re.findall(r'<script[^>]*src=["\']([^"\']+)["\']', html)
print("Scripts:", scripts[:10])

# Ver todos os data attributes
data_attrs = re.findall(r'data-[a-z-]+=["\'][^"\']+["\']', html)
print("Data attrs sample:", data_attrs[:10])

# Se SPA, provavelmente tem um window.__INITIAL_STATE__ ou similar com JSON embutido
if 'window.__' in html:
    m = re.search(r'window\.__[A-Z_]+\s*=\s*(\{[\s\S]{0,3000}?\});', html)
    if m:
        print("Found window state:", m.group(0)[:300])

# Ver se há API calls hardcoded na page
if 'api' in html.lower():
    api_matches = re.findall(r'https?://["\']?[\w./]+api[\w./]+["\']?', html, re.I)
    print("API refs:", api_matches[:10])

