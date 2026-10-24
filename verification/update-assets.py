"""Refresh the size/hash manifest without transcoding or building dependencies."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
output = root / 'verification/assets.json'
manifest = json.loads(output.read_text())
files = []
for folder in ['external', 'targets', 'media']:
    for file in sorted((root / folder).rglob('*')):
        if file.is_file():
            files.append({'path': str(file.relative_to(root)), 'bytes': file.stat().st_size,
                          'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})
manifest['externalBytes'] = sum(row['bytes'] for row in files if row['path'].startswith('external/'))
manifest['files'] = files
output.write_text(json.dumps(manifest, indent=2) + '\n')
print('externalBytes:', manifest['externalBytes'])
