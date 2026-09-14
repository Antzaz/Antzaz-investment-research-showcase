$ErrorActionPreference = 'Stop'

$expectedBranch = 'pre-release-showcase'
$branch = (git rev-parse --abbrev-ref HEAD).Trim()

if ($branch -ne $expectedBranch) {
    throw "Local preview must be run from '$expectedBranch'. Current branch: '$branch'"
}

$python = $null
if (Get-Command py -ErrorAction SilentlyContinue) {
    $python = 'py'
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $python = 'python'
} else {
    throw 'Python was not found. Install Python or add it to PATH.'
}

$port = 8000
$url = "http://127.0.0.1:$port"

Write-Host ''
Write-Host 'PRIVATE PRE-RELEASE SHOWCASE' -ForegroundColor Cyan
Write-Host "Branch: $branch"
Write-Host "URL:    $url"
Write-Host 'Bound to localhost only. Nothing is deployed publicly.' -ForegroundColor Green
Write-Host 'Press Ctrl+C to stop the preview server.'
Write-Host ''

Start-Process $url

if ($python -eq 'py') {
    py -m http.server $port --bind 127.0.0.1
} else {
    python -m http.server $port --bind 127.0.0.1
}
