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

function New-FaviconBase([string]$outPath) {
  $size = 512
  $bitmap = New-Object System.Drawing.Bitmap $size, $size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  Set-GraphicsQuality $graphics
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $tile = New-RoundedRectPath 28 28 456 456 78
  $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush `
    ([System.Drawing.PointF]::new(40, 40)), `
    ([System.Drawing.PointF]::new(472, 472)), `
    ([System.Drawing.ColorTranslator]::FromHtml('#1b2029')), `
    ([System.Drawing.ColorTranslator]::FromHtml('#080a0f'))
  $graphics.FillPath($bgBrush, $tile)

  $outlinePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(36, 255, 255, 255)), 2
  $graphics.DrawPath($outlinePen, $tile)

  $glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $glowPath.AddEllipse(54, 250, 280, 210)
  $glowBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush $glowPath
  $glowBrush.CenterColor = [System.Drawing.Color]::FromArgb(200, 255, 74, 36)
  $glowBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 255, 74, 36))
  $graphics.FillEllipse($glowBrush, 54, 250, 280, 210)

  $softBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(28, 255, 255, 255))
  $graphics.FillEllipse($softBrush, 88, 78, 150, 72)

  $wrench = New-Object System.Drawing.Bitmap $size, $size
  $wg = [System.Drawing.Graphics]::FromImage($wrench)
  Set-GraphicsQuality $wg
  $wg.Clear([System.Drawing.Color]::Transparent)

  $shadowBody = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(95, 0, 0, 0)), 86
  $shadowBody.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $shadowBody.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $shadowBody.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  $shadowHead = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(95, 0, 0, 0)), 72
  $shadowHead.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $shadowHead.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $shadowHead.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  $wg.DrawLine($shadowBody, 168, 354, 283, 233)
  $wg.DrawEllipse($shadowHead, 258, 84, 156, 156)

  $metalBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush `
    ([System.Drawing.PointF]::new(126, 360)), `
    ([System.Drawing.PointF]::new(394, 112)), `
    ([System.Drawing.ColorTranslator]::FromHtml('#f7fbff')), `
    ([System.Drawing.ColorTranslator]::FromHtml('#a6afbe'))

  $bodyPen = New-Object System.Drawing.Pen $metalBrush, 72
  $bodyPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $bodyPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $bodyPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  $headPen = New-Object System.Drawing.Pen $metalBrush, 58
  $headPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $headPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $headPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  $wg.DrawLine($bodyPen, 160, 346, 276, 224)
  $wg.DrawEllipse($headPen, 250, 76, 160, 160)

  $wg.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $clearBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::Transparent)
  $mouth = New-Object System.Drawing.Drawing2D.GraphicsPath
  $mouth.AddPolygon(@(
    [System.Drawing.PointF]::new(340, 86),
    [System.Drawing.PointF]::new(470, 122),
    [System.Drawing.PointF]::new(470, 208),
    [System.Drawing.PointF]::new(338, 186)
  ))
  $wg.FillPath($clearBrush, $mouth)
  $wg.FillEllipse($clearBrush, 108, 290, 52, 52)
  $wg.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver

  $shinePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(125, 255, 255, 255)), 15
  $shinePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $shinePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $shinePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $wg.DrawLine($shinePen, 184, 310, 252, 240)
  $wg.DrawArc($shinePen, 265, 92, 112, 112, 145, 116)

  $graphics.DrawImage($wrench, 0, 0)

  $bitmap.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $shinePen.Dispose()
  $clearBrush.Dispose()
  $metalBrush.Dispose()
  $bodyPen.Dispose()
  $headPen.Dispose()
  $shadowBody.Dispose()
  $shadowHead.Dispose()
  $wg.Dispose()
  $wrench.Dispose()
  $softBrush.Dispose()
  $glowBrush.Dispose()
  $glowPath.Dispose()
  $outlinePen.Dispose()
  $bgBrush.Dispose()
  $tile.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

function Save-ResizedPng([string]$sourcePath, [int]$size, [string]$outPath) {
  $source = [System.Drawing.Image]::FromFile($sourcePath)
  $dest = New-Object System.Drawing.Bitmap $size, $size
  $graphics = [System.Drawing.Graphics]::FromImage($dest)
  Set-GraphicsQuality $graphics
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
$base = Join-Path $root 'favicon-base-512.png'

New-FaviconBase $base
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
