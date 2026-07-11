param()

$ErrorActionPreference = "Stop"

function Write-EmptyContext {
  $empty = [ordered]@{
    additional_context = ""
    additionalContext  = ""
    hookSpecificOutput = [ordered]@{
      hookEventName      = "SessionStart"
      additionalContext  = ""
    }
  }
  $empty | ConvertTo-Json -Compress -Depth 5
}

function Read-ConfigEnv([string]$path) {
  if (-not (Test-Path $path)) { return }
  Get-Content $path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $parts = $line -split "=", 2
    if ($parts.Count -ne 2) { return }
    $name = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"')
    if (-not [string]::IsNullOrWhiteSpace($name) -and -not (Test-Path "Env:$name")) {
      Set-Item -Path "Env:$name" -Value $value
    }
  }
}

try {
  $stdin = [Console]::In.ReadToEnd()
  $hookInput = $null
  if ($stdin) {
    try { $hookInput = $stdin | ConvertFrom-Json } catch { $hookInput = $null }
  }

  $configDir = if ($env:OBSIDIAN_MEMORY_CONFIG_DIR) {
    $env:OBSIDIAN_MEMORY_CONFIG_DIR
  } else {
    Join-Path $HOME ".config\obsidian-ai-memory-store"
  }
  Read-ConfigEnv (Join-Path $configDir "config.env")

  $apiKey = $env:OBSIDIAN_API_KEY
  if (-not $apiKey) {
    [Console]::Error.WriteLine("OBSIDIAN_API_KEY not set; skipping memory session context.")
    Write-EmptyContext
    exit 0
  }

  $baseUrl = if ($env:OBSIDIAN_MCP_URL) { $env:OBSIDIAN_MCP_URL.TrimEnd("/") } else { "https://127.0.0.1:27126" }

  $project = $env:OBSIDIAN_MEMORY_PROJECT
  if (-not $project) {
    $cwd = $null
    if ($hookInput -and $hookInput.cwd) { $cwd = [string]$hookInput.cwd }
    if (-not $cwd) { $cwd = (Get-Location).Path }

    $mapPath = Join-Path $configDir "projects.json"
    if ((Test-Path $mapPath) -and $cwd) {
      $entries = Get-Content $mapPath -Raw | ConvertFrom-Json
      $best = $null
      foreach ($entry in @($entries)) {
        $prefix = [string]$entry.pathPrefix
        if ($prefix -and $cwd.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
          if (-not $best -or $prefix.Length -gt $best.pathPrefix.Length) {
            $best = $entry
          }
        }
      }
      if ($best) { $project = [string]$best.project }
    }
  }

  $uri = "$baseUrl/memory/session-context"
  if ($project) {
    $uri = "$uri?project=$([uri]::EscapeDataString($project))"
  }

  $headers = @{ Authorization = "Bearer $apiKey" }
  $irmParams = @{
    Uri             = $uri
    Headers         = $headers
    Method          = "Get"
  }
  if (Get-Command Invoke-RestMethod | Where-Object { $_.Parameters.ContainsKey("SkipCertificateCheck") }) {
    $irmParams.SkipCertificateCheck = $true
  } else {
    # Windows PowerShell 5.1 — trust all for local hook only
    [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
  }

  $response = Invoke-RestMethod @irmParams
  $markdown = [string]$response.markdown
  if (-not $markdown) { $markdown = "" }

  $payload = [ordered]@{
    additional_context = $markdown
    additionalContext  = $markdown
    hookSpecificOutput = [ordered]@{
      hookEventName     = "SessionStart"
      additionalContext = $markdown
    }
  }
  $payload | ConvertTo-Json -Compress -Depth 5
  exit 0
}
catch {
  [Console]::Error.WriteLine("memory-session-hook failed: $($_.Exception.Message)")
  Write-EmptyContext
  exit 0
}
