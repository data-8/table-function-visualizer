#!/usr/bin/env bash
#
# Build Python wheels for Pyodide
#

set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT="$ROOT/apps/web/public/packages"

echo "🔨 Building Python wheels for Pyodide"
echo "======================================"
echo ""

# Create output directory
mkdir -p "$OUT"

# Build table_tracer wheel
echo "📦 Building table_tracer..."
cd "$ROOT/py/table_tracer"

# Check if python build module is available
if ! python3 -m build --version &> /dev/null; then
    echo "Installing build module..."
    python3 -m pip install build
fi

python3 -m build --wheel
cp dist/*.whl "$OUT/"
echo "✅ table_tracer wheel built"
echo ""

# Download datascience wheel
echo "📦 Getting datascience wheel..."
cd "$OUT"

# Try to download the latest datascience wheel from PyPI
python3 -c "
import urllib.request
import json

# Get package info from PyPI
url = 'https://pypi.org/pypi/datascience/json'
with urllib.request.urlopen(url) as response:
    data = json.loads(response.read())
    
# Find the pure Python wheel
for file in data['urls']:
    if file['filename'].endswith('-py3-none-any.whl'):
        wheel_url = file['url']
        wheel_name = file['filename']
        print(f'Downloading {wheel_name}...')
        urllib.request.urlretrieve(wheel_url, wheel_name)
        print(f'✅ Downloaded {wheel_name}')
        break
"

echo ""
echo "✅ All wheels ready in $OUT"
echo ""
ls -lh "$OUT"/*.whl

