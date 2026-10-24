"""Read-only HTTP HEAD acceptance check; no local server."""
import concurrent.futures
import datetime
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = 'https://aiadelcom.github.io/webar-spike/'
files = ['index.html', 'print.html', 'app.js', 'style.css', 'LICENSE-THIRD-PARTY.md']
files += [f['path'] for f in json.loads((ROOT / 'verification/assets.json').read_text())['files']]

def check(name):
    result = subprocess.run(['curl', '-sI', '--max-time', '30', BASE + name], capture_output=True, text=True, check=True)
    headers = result.stdout.strip().splitlines()
    status = int(headers[0].split()[1])
    fields = dict(line.split(':', 1) for line in headers[1:] if ':' in line)
    return {'path': name, 'status': status, 'localBytes': (ROOT / name).stat().st_size,
            'contentLength': fields.get('content-length', '').strip(), 'contentType': fields.get('content-type', '').strip()}

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    results = list(pool.map(check, files))
output = {'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'base': BASE, 'files': results}
(ROOT / 'verification/http-published.json').write_text(json.dumps(output, indent=2) + '\n')
print(json.dumps({'files': len(results), 'all200': all(r['status'] == 200 for r in results), 'failures': [r for r in results if r['status'] != 200]}, indent=2))
if any(r['status'] != 200 for r in results):
    raise SystemExit(1)
