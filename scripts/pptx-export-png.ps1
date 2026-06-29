param(
    [Parameter(Mandatory = $true)][string]$PptxPath,
    [Parameter(Mandatory = $true)][string]$OutDir
)

$ErrorActionPreference = "Stop"
$pptxPath = (Resolve-Path $PptxPath).Path
$slidesDir = Join-Path $OutDir "assets\slides"

if (Test-Path $slidesDir) {
    Remove-Item $slidesDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $slidesDir | Out-Null

$ppt = $null
$pres = $null
try {
    $ppt = New-Object -ComObject PowerPoint.Application
    $ppt.Visible = -1
    $ppt.DisplayAlerts = 1
    $pres = $ppt.Presentations.Open($pptxPath, $true, $false, $false)

    $count = $pres.Slides.Count
    for ($i = 1; $i -le $count; $i++) {
        $dest = Join-Path $slidesDir ("slide-{0:D2}.png" -f $i)
        $pres.Slides.Item($i).Export($dest, "PNG", 1920, 1080)
        if (-not (Test-Path $dest)) {
            throw "Failed to export slide $i to $dest"
        }
    }

    Write-Output ("OK: exported {0} slides to {1}" -f $count, $slidesDir)
    $pres.Close()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($pres) | Out-Null
    $pres = $null
    $ppt.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
    $ppt = $null
}
finally {
    if ($pres) {
        try { $pres.Close() } catch {}
    }
    if ($ppt) {
        try { $ppt.Quit() } catch {}
    }
}
