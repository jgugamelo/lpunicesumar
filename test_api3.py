import urllib.request
import json

with open('.token', 'r') as f:
    tok = f.read().strip()

def get(url):
    req = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + tok})
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            return res.status, json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, {}

# The API for EPOS has no description. Let's see what endpoints exist
print("1. Test estado with EPOS:")
s, d = get("https://gateway.unicesumar.edu.br/central-captacao-standalone-api/estado?idPais=90&idCurso=EPOS_ACUP_COMP")
print(f"  Status {s}, count: {len(d) if isinstance(d, list) else d}")

print("\n2. Test polo with EPOS:")
s, d = get("https://gateway.unicesumar.edu.br/central-captacao-standalone-api/polo?idPais=90&idCurso=EPOS_ACUP_COMP&idEstado=18")
print(f"  Status {s}, count: {len(d) if isinstance(d, list) else d}")
if isinstance(d, list) and d: print(f"  First polo: {d[0]}")

print("\n3. Test matriz-curricular with EPOS:")
s, d = get("https://gateway.unicesumar.edu.br/central-captacao-standalone-api/matriz-curricular?idCurso=EPOS_ACUP_COMP")
print(f"  Status {s}, count: {len(d) if isinstance(d, list) else d}")

print("\n4. Test preco with EPOS (need a polo ID first):")
# Get a polo first
s, estados = get("https://gateway.unicesumar.edu.br/central-captacao-standalone-api/estado?idPais=90&idCurso=EPOS_ACUP_COMP")
if isinstance(estados, list) and estados:
    idEstado = estados[0]['idEstado']
    s, polos = get(f"https://gateway.unicesumar.edu.br/central-captacao-standalone-api/polo?idPais=90&idCurso=EPOS_ACUP_COMP&idEstado={idEstado}")
    if isinstance(polos, list) and polos:
        idPolo = polos[0]['idPolo']
        print(f"  Using polo {idPolo}")
        s, preco = get(f"https://gateway.unicesumar.edu.br/central-captacao-standalone-api/curso?idCurso=EPOS_ACUP_COMP&idPolo={idPolo}")
        print(f"  Status {s}, preco: {json.dumps(preco)[:200]}")

