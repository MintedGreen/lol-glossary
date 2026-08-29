$port = 8080
$webDir = Join-Path $PSScriptRoot "docs"

$listeners = netstat -ano | Select-String ":$port\s.*LISTENING"
if ($listeners) {
  $pids = $listeners | ForEach-Object {
    ($_ -split "\s+")[-1]
  } | Sort-Object -Unique

  foreach ($procId in $pids) {
    if ($procId -match "^\d+$" -and $procId -ne "0") {
      Write-Host "Stopping process $procId on port $port..."
      taskkill /PID $procId /F | Out-Null
    }
  }
}

Write-Host "Serving LoL glossary at http://localhost:$port"
Write-Host "Press Ctrl+C to stop."
Set-Location $webDir
python -m http.server $port
