import urllib.request
import json

with open('.token', 'r') as f:
    tok = f.read().strip()

# Test fields returned for an EPOS_ course
url = 'https://gateway.unicesumar.edu.br/central-captacao-standalone-api/curso/EPOS_ACUP_COMP'
req = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + tok})
with urllib.request.urlopen(req) as res:
    data = json.loads(res.read().decode())
    print("All fields from EPOS_ACUP_COMP:")
    print(json.dumps(data, indent=2))

