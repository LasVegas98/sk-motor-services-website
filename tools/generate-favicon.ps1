$root = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $root 'favicon_io (1)'
if (-not (Test-Path $sourceDir)) {
  throw "Source favicon pack not found: $sourceDir"
}

$files = @(
  'favicon-16x16.png',
  'favicon-32x32.png',
  'favicon.ico',
  'apple-touch-icon.png',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png'
)

foreach ($file in $files) {
  $sourcePath = Join-Path $sourceDir $file
  if (-not (Test-Path $sourcePath)) {
    throw "Required favicon file not found: $sourcePath"
  }

  Copy-Item $sourcePath (Join-Path $root $file) -Force
}
