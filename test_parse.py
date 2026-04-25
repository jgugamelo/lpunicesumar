import urllib.request
import re
import json

url = 'https://inscricoes.unicesumar.edu.br/curso/acupuntura-e-tecnicas-complementares'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
res = urllib.request.urlopen(req)
html = res.read().decode('utf-8')

# Let's extract LD+JSON
matches = re.findall(r'<script[^>]+application/ld\+json[^>]*>([\s\S]*?)</script>', html, re.I)
schemas = []
for m in matches:
    try:
        data = json.loads(m)
        if '@graph' in data:
            schemas.extend(data['@graph'])
        else:
            schemas.append(data)
    except:
        pass

for s in schemas:
    print(s.get('@type'), s.get('description') is not None)

# Find meta tags
print("META TAGS:")
for m in re.findall(r'<meta[^>]*name=["\']description["\'][^>]*>', html, re.I):
    print("name desc:", m)
for m in re.findall(r'<meta[^>]*content=["\'][^"\']*["\'][^>]*name=["\']description["\']', html, re.I):
    print("content desc:", m)

