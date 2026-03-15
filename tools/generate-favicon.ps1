Add-Type -AssemblyName System.Drawing

function New-RoundedRectPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function Set-GraphicsQuality([System.Drawing.Graphics]$graphics) {
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
}

function Save-ResizedPng([string]$sourcePath, [int]$size, [string]$outPath) {
  $source = [System.Drawing.Image]::FromFile($sourcePath)
  $dest = New-Object System.Drawing.Bitmap $size, $size
  $graphics = [System.Drawing.Graphics]::FromImage($dest)
  Set-GraphicsQuality $graphics
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.DrawImage($source, 0, 0, $size, $size)
  $dest.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $dest.Dispose()
  $source.Dispose()
}

function Write-Ico([string]$outPath, [string[]]$pngPaths) {
  $entries = @()
  foreach ($pngPath in $pngPaths) {
    $img = [System.Drawing.Image]::FromFile($pngPath)
    $size = $img.Width
    $img.Dispose()
    $bytes = [System.IO.File]::ReadAllBytes($pngPath)
    $entries += , @($size, $bytes)
  }

  $stream = [System.IO.File]::Open($outPath, [System.IO.FileMode]::Create)
  $writer = New-Object System.IO.BinaryWriter($stream)
  $writer.Write([UInt16]0)
  $writer.Write([UInt16]1)
  $writer.Write([UInt16]$entries.Count)

  $offset = 6 + (16 * $entries.Count)
  foreach ($entry in $entries) {
    $size = $entry[0]
    $bytes = $entry[1]
    $writer.Write([byte]($(if ($size -ge 256) { 0 } else { $size })))
    $writer.Write([byte]($(if ($size -ge 256) { 0 } else { $size })))
    $writer.Write([byte]0)
    $writer.Write([byte]0)
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]32)
    $writer.Write([UInt32]$bytes.Length)
    $writer.Write([UInt32]$offset)
    $offset += $bytes.Length
  }

  foreach ($entry in $entries) {
    $writer.Write($entry[1])
  }

  $writer.Dispose()
  $stream.Dispose()
}

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'favicon_io (1)\apple-touch-icon.png'
if (-not (Test-Path $source)) {
  throw "Source favicon artwork not found: $source"
}

$cropX = 20
$cropY = 18
$cropSize = 130
$base = Join-Path $root 'favicon-base-512.png'

$src = [System.Drawing.Bitmap]::FromFile($source)
$dest = New-Object System.Drawing.Bitmap 512, 512
$graphics = [System.Drawing.Graphics]::FromImage($dest)
Set-GraphicsQuality $graphics
$graphics.Clear([System.Drawing.Color]::Transparent)

$tile = New-RoundedRectPath 18 18 476 476 96
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush `
  ([System.Drawing.PointF]::new(40, 40)), `
  ([System.Drawing.PointF]::new(472, 472)), `
  ([System.Drawing.ColorTranslator]::FromHtml('#0f1116')), `
  ([System.Drawing.ColorTranslator]::FromHtml('#151922'))
$graphics.FillPath($bgBrush, $tile)

$outlinePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(30, 255, 255, 255)), 2
$graphics.DrawPath($outlinePen, $tile)

$glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$glowPath.AddEllipse(60, 250, 280, 190)
$glowBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush $glowPath
$glowBrush.CenterColor = [System.Drawing.Color]::FromArgb(130, 255, 42, 0)
$glowBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 255, 42, 0))
$graphics.FillEllipse($glowBrush, 60, 250, 280, 190)

$pad = 16
$destRect = [System.Drawing.Rectangle]::new($pad, $pad, 512 - ($pad * 2), 512 - ($pad * 2))
$srcRect = [System.Drawing.Rectangle]::new($cropX, $cropY, $cropSize, $cropSize)
$graphics.DrawImage($src, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$dest.Save($base, [System.Drawing.Imaging.ImageFormat]::Png)
$glowBrush.Dispose()
$glowPath.Dispose()
$outlinePen.Dispose()
$bgBrush.Dispose()
$tile.Dispose()
$graphics.Dispose()
$dest.Dispose()
$src.Dispose()

Save-ResizedPng $base 16 (Join-Path $root 'favicon-16x16.png')
Save-ResizedPng $base 32 (Join-Path $root 'favicon-32x32.png')
Save-ResizedPng $base 48 (Join-Path $root 'favicon-48x48.png')
Save-ResizedPng $base 64 (Join-Path $root 'favicon-64x64.png')
Save-ResizedPng $base 180 (Join-Path $root 'apple-touch-icon.png')
Save-ResizedPng $base 192 (Join-Path $root 'android-chrome-192x192.png')
Save-ResizedPng $base 512 (Join-Path $root 'android-chrome-512x512.png')

Write-Ico (Join-Path $root 'favicon.ico') @(
  (Join-Path $root 'favicon-16x16.png'),
  (Join-Path $root 'favicon-32x32.png'),
  (Join-Path $root 'favicon-48x48.png'),
  (Join-Path $root 'favicon-64x64.png')
)

Remove-Item (Join-Path $root 'favicon-48x48.png'), (Join-Path $root 'favicon-64x64.png'), $base
