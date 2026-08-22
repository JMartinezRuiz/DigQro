$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$RepoOwner = "JMartinezRuiz"
$RepoName = "DigQro"
$Branch = "main"
$ProjectPath = "LibrePOS"
$Headers = @{
  "User-Agent" = "LibrePOS-Repair-Updater"
}

function Write-Step($message) {
  Write-Host "[LibrePOS repair] $message"
}

function Get-RootPath {
  $root = (Get-Location).Path
  if ((Test-Path (Join-Path $root "package.json")) -and (Test-Path (Join-Path $root "sync-store.js"))) {
    return $root
  }

  if ($PSScriptRoot) {
    $scriptRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
    if ((Test-Path (Join-Path $scriptRoot "package.json")) -and (Test-Path (Join-Path $scriptRoot "sync-store.js"))) {
      return $scriptRoot
    }
  }

  throw "Ejecuta este reparador desde la carpeta LibrePOS."
}

function Get-LatestLibrePosRelease {
  $cacheKey = [DateTime]::UtcNow.Ticks
  $packageUrl = "https://raw.githubusercontent.com/$RepoOwner/$RepoName/$Branch/$ProjectPath/package.json?librepos-check=$cacheKey"
  $package = Invoke-RestMethod -Uri $packageUrl -Headers $Headers
  $version = [string]$package.version
  if (-not $version -or $version -notmatch '^\d+(\.\d+)*(-[0-9A-Za-z.-]+)?$') {
    throw "No se pudo leer la version remota en GitHub."
  }
  return [PSCustomObject]@{
    Version = $version
    Ref = "v$version"
  }
}

function Copy-DirectoryContents($source, $destination) {
  New-Item -ItemType Directory -Force -Path $destination | Out-Null
  Get-ChildItem -LiteralPath $source -Force | ForEach-Object {
    $target = Join-Path $destination $_.Name
    if ($_.PSIsContainer) {
      Copy-DirectoryContents -source $_.FullName -destination $target
    } else {
      Copy-Item -LiteralPath $_.FullName -Destination $target -Force
    }
  }
}

function Copy-ProjectFiles($source, $destination) {
  Copy-DirectoryContents -source $source -destination $destination
}

function Remove-BrokenNestedCopies($root) {
  @(
    "assets\assets",
    "docs\docs",
    "scripts\scripts",
    "src\src"
  ) | ForEach-Object {
    $target = Join-Path $root $_
    if (Test-Path $target) {
      Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}

function Write-VersionMarker($root, $commitSha) {
  $dataDir = Join-Path $root ".librepos"
  New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
  $versionFile = Join-Path $dataDir "app-version.json"
  [ordered]@{
    commitSha = $commitSha
    branch = $Branch
    repo = "$RepoOwner/$RepoName"
    projectPath = $ProjectPath
    updatedAt = (Get-Date).ToUniversalTime().ToString("o")
  } | ConvertTo-Json | Set-Content -Path $versionFile -Encoding UTF8
}

function Run-NpmInstall($root) {
  $npm = Get-Command npm -ErrorAction SilentlyContinue
  if (-not $npm) {
    Write-Step "No se encontro npm. Se conservaron los archivos, pero instala Node.js LTS si LibrePOS no abre."
    return
  }

  Write-Step "Ejecutando npm install..."
  $process = Start-Process -FilePath "cmd.exe" -ArgumentList "/d", "/s", "/c", "npm install --no-audit --no-fund" -WorkingDirectory $root -NoNewWindow -PassThru
  if (-not $process.WaitForExit(180000)) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    Write-Step "npm install tardo demasiado. Los archivos ya quedaron actualizados; intenta abrir LibrePOS."
    return
  }
  if ($process.ExitCode -ne 0) {
    Write-Step "npm install termino con error $($process.ExitCode). Los archivos ya quedaron actualizados; intenta abrir LibrePOS."
    return
  }
}

$root = Get-RootPath
Write-Step "Carpeta: $root"
Write-Step "Cierra la ventana negra de LibrePOS antes de continuar si sigue abierta."
Read-Host "Pulsa Enter para reparar la actualizacion"

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("librepos-repair-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

try {
  $release = Get-LatestLibrePosRelease
  Write-Step "Version remota: $($release.Version)"

  $zipPath = Join-Path $tempRoot "repo.zip"
  $zipUrl = "https://codeload.github.com/$RepoOwner/$RepoName/zip/refs/tags/$($release.Ref)"
  Write-Step "Descargando actualizacion..."
  try {
    Invoke-WebRequest -Uri $zipUrl -Headers $Headers -OutFile $zipPath -UseBasicParsing
  } catch {
    Write-Step "No se encontro la etiqueta; intentando la rama principal..."
    $zipUrl = "https://codeload.github.com/$RepoOwner/$RepoName/zip/refs/heads/$Branch"
    Invoke-WebRequest -Uri $zipUrl -Headers $Headers -OutFile $zipPath -UseBasicParsing
  }

  Write-Step "Descomprimiendo..."
  Expand-Archive -Path $zipPath -DestinationPath $tempRoot -Force
  $repoDir = Get-ChildItem -LiteralPath $tempRoot -Directory | Where-Object { Test-Path (Join-Path $_.FullName $ProjectPath) } | Select-Object -First 1
  if (-not $repoDir) {
    throw "El ZIP descargado no contiene LibrePOS."
  }
  $sourceProject = Join-Path $repoDir.FullName $ProjectPath

  Write-Step "Copiando archivos del programa..."
  Copy-ProjectFiles -source $sourceProject -destination $root
  Remove-BrokenNestedCopies -root $root

  $pycache = Join-Path $root "scripts\__pycache__"
  if (Test-Path $pycache) {
    Remove-Item -LiteralPath $pycache -Recurse -Force -ErrorAction SilentlyContinue
  }

  Write-VersionMarker -root $root -commitSha $release.Ref
  Run-NpmInstall -root $root

  $package = Get-Content -Path (Join-Path $root "package.json") -Raw | ConvertFrom-Json
  Write-Step "Actualizacion reparada. Version local: $($package.version)"
  Write-Step "Abre LibrePOS de nuevo con Abrir LibrePOS.bat."
} catch {
  Write-Host ""
  Write-Host "[LibrePOS repair] Error: $($_.Exception.Message)"
  throw
} finally {
  Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
