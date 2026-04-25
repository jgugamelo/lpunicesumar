import urllib.request
import re

url = 'https://inscricoes.unicesumar.edu.br/curso/acupuntura-e-tecnicas-complementares'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
res = urllib.request.urlopen(req)
html = res.read().decode('utf-8')

# Find a paragraph or something that might be the description
# Usually, on Unicesumar site, description is inside an element with class "descricao" or "sobre" or something.
# Let's search for "sobre o curso" text
idx = html.find('obre o curso')
if idx != -1:
    print("Found 'obre o curso' at", idx)
    print("Context:", html[max(0, idx-100):idx+500])
else:
    print("Could not find 'obre o curso'.")
    idx = html.find('O curso')
    if idx != -1:
        print("Found 'O curso' at", idx)
        print("Context:", html[max(0, idx-100):idx+500])
    
