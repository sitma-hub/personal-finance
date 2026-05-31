# Install and configure Ollama on Windows for NVIDIA GPU (Task Manager "GPU 1").
# Run in PowerShell:  .\scripts\setup-ollama-windows.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== Ollama setup for NVIDIA GPU (GPU 1 in Task Manager) ===" -ForegroundColor Cyan

# Install Ollama if missing
$ollama = Get-Command ollama -ErrorAction SilentlyContinue
if (-not $ollama) {
    Write-Host "Installing Ollama via winget..."
    winget install --id Ollama.Ollama -e --accept-source-agreements --accept-package-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path", "User")
} else {
    Write-Host "Ollama already installed at $($ollama.Source)"
}

# GPU tuning (user-level env vars — restart Ollama after changing)
[Environment]::SetEnvironmentVariable("OLLAMA_FLASH_ATTENTION", "1", "User")
[Environment]::SetEnvironmentVariable("OLLAMA_KV_CACHE_TYPE", "q8_0", "User")
[Environment]::SetEnvironmentVariable("OLLAMA_GPU_OVERHEAD", "0", "User")
[Environment]::SetEnvironmentVariable("OLLAMA_MAX_LOADED_MODELS", "1", "User")
[Environment]::SetEnvironmentVariable("OLLAMA_NUM_PARALLEL", "1", "User")
[Environment]::SetEnvironmentVariable("OLLAMA_KEEP_ALIVE", "30m", "User")

Write-Host ""
Write-Host "Pulling qwen3:8b (~5 GB)..." -ForegroundColor Yellow
ollama pull qwen3:8b

Write-Host ""
Write-Host "Setting Windows to always use NVIDIA GPU for Ollama..." -ForegroundColor Yellow
$regPath = "HKCU:\Software\Microsoft\DirectX\UserGpuPreferences"
$ollamaDir = Join-Path $env:LOCALAPPDATA "Programs\Ollama"
foreach ($exe in Get-ChildItem $ollamaDir -Filter "*.exe" -ErrorAction SilentlyContinue) {
    if ($exe.Name -eq "unins000.exe") { continue }
    $key = $exe.FullName + " "
    New-ItemProperty -Path $regPath -Name $key -Value "GpuPreference=2;" -PropertyType String -Force | Out-Null
    Write-Host "  High-performance GPU: $($exe.Name)"
}

Write-Host ""
Write-Host "=== Manual step (if not already set) ===" -ForegroundColor Cyan
Write-Host @"
1. Open Settings -> System -> Display -> Graphics
2. Confirm Ollama is listed with 'High performance' (NVIDIA RTX A1000)
3. Stop Docker Ollama if running (frees port 11434):
     docker compose --profile llm stop ollama
4. Restart backend: docker compose up -d backend
5. Generate an analysis — during the ~10-30s run, GPU 1 CUDA/Compute should spike.
   Task Manager shows 0% when idle; Intel GPU 0 (browser) activity is normal.
"@ -ForegroundColor White

Write-Host "Done." -ForegroundColor Green
