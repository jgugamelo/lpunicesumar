import urllib.request
import json
import sys

with open('.token', 'r') as f:
    tok = f.read().strip()

req = urllib.request.Request('https://gateway.unicesumar.edu.br/central-captacao-standalone-api/curso?idPais=90', headers={'Authorization': 'Bearer ' + tok})
try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode())
        print(f"Total courses: {len(data)}")
        
        epos = [c for c in data if c.get('idCurso', '').startswith('EPOS_')]
        etec = [c for c in data if c.get('idCurso', '').startswith('ETEC_')]
        eprof = [c for c in data if c.get('idCurso', '').startswith('EPRO_') or c.get('idCurso', '').startswith('EPRF_')]
        
        print(f"EPOS: {len(epos)}")
        print(f"ETEC: {len(etec)}")
        print(f"EPROF: {len(eprof)}")
        
        for p in epos[:3]: print("EPOS:", p.get('idCurso'), p.get('nmCurso'))
        for p in etec[:3]: print("ETEC:", p.get('idCurso'), p.get('nmCurso'))
        
        if epos:
            c = epos[0]
            print("Fetching details for:", c.get('idCurso'))
            req2 = urllib.request.Request(f"https://gateway.unicesumar.edu.br/central-captacao-standalone-api/curso/{c.get('idCurso')}", headers={'Authorization': 'Bearer ' + tok})
            try:
                with urllib.request.urlopen(req2) as res2:
                    d2 = json.loads(res2.read().decode())
                    print("EPOS_ details status:", res2.status)
                    print(json.dumps(d2, indent=2)[:500])
            except urllib.error.HTTPError as e:
                print("EPOS_ fetch error:", e.code)
except Exception as e:
    print("Error:", e)
