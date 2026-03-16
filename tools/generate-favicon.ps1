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
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#0b0b0b'))
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
$bgColor = [System.Drawing.ColorTranslator]::FromHtml('#0b0b0b')
$metalColor = [System.Drawing.ColorTranslator]::FromHtml('#d9d9d9')
$base = Join-Path $root 'favicon-base-512.png'

$bitmap = New-Object System.Drawing.Bitmap 512, 512
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
Set-GraphicsQuality $graphics
$graphics.Clear($bgColor)

$state = $graphics.Save()
$graphics.TranslateTransform(256, 256)
$graphics.RotateTransform(-45)
$graphics.TranslateTransform(-256, -256)

$metalBrush = New-Object System.Drawing.SolidBrush $metalColor
$bgBrush = New-Object System.Drawing.SolidBrush $bgColor

$handlePath = New-RoundedRectPath 84 210 286 94 46
$graphics.FillPath($metalBrush, $handlePath)
$graphics.FillEllipse($metalBrush, 286, 150, 178, 178)
$graphics.FillRectangle($metalBrush, 314, 210, 68, 94)

# Tail hole
$graphics.FillEllipse($bgBrush, 120, 232, 44, 44)

# Open-end head cutout
$graphics.FillEllipse($bgBrush, 346, 210, 58, 58)
$jawCut = New-Object System.Drawing.Drawing2D.GraphicsPath
$jawCut.AddPolygon(@(
  [System.Drawing.PointF]::new(370, 138),
  [System.Drawing.PointF]::new(512, 188),
  [System.Drawing.PointF]::new(512, 324),
  [System.Drawing.PointF]::new(370, 374),
  [System.Drawing.PointF]::new(346, 330),
  [System.Drawing.PointF]::new(438, 286),
  [System.Drawing.PointF]::new(438, 226),
  [System.Drawing.PointF]::new(346, 182)
))
$graphics.FillPath($bgBrush, $jawCut)

$graphics.Restore($state)
$bitmap.Save($base, [System.Drawing.Imaging.ImageFormat]::Png)

$jawCut.Dispose()
$handlePath.Dispose()
$metalBrush.Dispose()
$bgBrush.Dispose()
$graphics.Dispose()
$bitmap.Dispose()

Save-ResizedPng $base 16 (Join-Path $root 'favicon-16x16.png')
Save-ResizedPng $base 32 (Join-Path $root 'favicon-32x32.png')
Save-ResizedPng $base 48 (Join-Path $root 'favicon-48x48.png')
Save-ResizedPng $base 180 (Join-Path $root 'apple-touch-icon.png')
Save-ResizedPng $base 192 (Join-Path $root 'android-chrome-192x192.png')
Save-ResizedPng $base 512 (Join-Path $root 'android-chrome-512x512.png')

Write-Ico (Join-Path $root 'favicon.ico') @(
  (Join-Path $root 'favicon-16x16.png'),
  (Join-Path $root 'favicon-32x32.png'),
  (Join-Path $root 'favicon-48x48.png')
)

Copy-Item (Join-Path $root 'favicon.svg') (Join-Path $root 'wrench-favicon.svg') -Force
Copy-Item (Join-Path $root 'favicon-16x16.png') (Join-Path $root 'wrench-favicon-16x16.png') -Force
Copy-Item (Join-Path $root 'favicon-32x32.png') (Join-Path $root 'wrench-favicon-32x32.png') -Force
Copy-Item (Join-Path $root 'favicon.ico') (Join-Path $root 'wrench-favicon.ico') -Force
Copy-Item (Join-Path $root 'apple-touch-icon.png') (Join-Path $root 'wrench-apple-touch-icon.png') -Force
Copy-Item (Join-Path $root 'android-chrome-192x192.png') (Join-Path $root 'wrench-android-chrome-192x192.png') -Force
Copy-Item (Join-Path $root 'android-chrome-512x512.png') (Join-Path $root 'wrench-android-chrome-512x512.png') -Force

Remove-Item (Join-Path $root 'favicon-48x48.png'), $base
