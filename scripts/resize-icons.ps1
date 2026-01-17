Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Split-Path -Parent $scriptDir
$inputFile = Join-Path $projectRoot "public\bsky-edit.png"
$outputDir = Join-Path $projectRoot "public"

if (!(Test-Path $inputFile)) {
    Write-Error "Input file not found: $inputFile"
    exit 1
}

$sizes = @(16, 48, 128)
$img = [System.Drawing.Image]::FromFile($inputFile)

foreach ($size in $sizes) {
    Write-Host "Creating ${size}x${size} icon..."
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($img, 0, 0, $size, $size)
    
    $outputFile = Join-Path $outputDir "icon$size.png"
    $bmp.Save($outputFile, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $g.Dispose()
    $bmp.Dispose()
}

$img.Dispose()
Write-Host "Successfully resized icons."
