# Import Claude Code's skills, MCP servers, and plugin-provided skills into DSH.
#
#   skills : %USERPROFILE%\.claude\skills   ->  %USERPROFILE%\.dsh\skills   (DSH user root, rank 400)
#   mcp    : ~/.claude.json mcpServers rows ->  %USERPROFILE%\.dsh\profiles\web\cordis.patch.yml
#
# Idempotent: re-running re-copies skills and rewrites the patch file from scratch.
$ErrorActionPreference = 'Stop'

# Windows PowerShell 5.1 writes a BOM for -Encoding UTF8, which DSH's strict
# frontmatter parser does not expect; always write UTF-8 without BOM.
function Write-Utf8NoBom([string]$Path, [string]$Text) {
    $enc = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Text, $enc)
}

$homeDir   = $env:USERPROFILE
$src       = Join-Path $homeDir '.claude\skills'
$dst       = Join-Path $homeDir '.dsh\skills'
$patchFile = Join-Path $homeDir '.dsh\profiles\web\cordis.patch.yml'

if (-not (Test-Path $src))       { throw "missing source: $src" }
if (-not (Test-Path $patchFile)) { throw "missing profile patch file: $patchFile" }

Write-Output "SRC       = $src"
Write-Output "DST       = $dst"
Write-Output "PATCH     = $patchFile"
Write-Output ""

# --- 1. skills -----------------------------------------------------------------
if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Path $dst | Out-Null }

# Claude bundle directory -> DSH bundle directory, for entries whose name cannot
# be used as-is (dots are legal on disk but keep the catalog readable).
$renames = @{ 'frontend-code-line-by-line-explain.skill' = 'frontend-precise-code-explain' }

$skipped = @()
$copied  = @()
foreach ($entry in (Get-ChildItem $src -Force | Sort-Object Name)) {
    if (-not $entry.PSIsContainer) { continue }
    if (-not (Test-Path (Join-Path $entry.FullName 'SKILL.md'))) {
        $skipped += "$($entry.Name)  (no SKILL.md - not a skill bundle)"
        continue
    }
    $targetName = if ($renames.ContainsKey($entry.Name)) { $renames[$entry.Name] } else { $entry.Name }
    $target     = Join-Path $dst $targetName
    if (Test-Path $target) { Remove-Item -LiteralPath $target -Recurse -Force }
    Copy-Item -LiteralPath $entry.FullName -Destination $target -Recurse -Force
    $copied += $targetName
}

# --- 2. path normalization inside copied bundles -------------------------------
# ${CLAUDE_PLUGIN_ROOT} is a Claude Code variable that DSH never sets; rewrite it
# to the real import root. Absolute ~/.claude/... references keep working because
# the Claude install is left untouched.
$rootFwd  = $dst -replace '\\', '/'
$pathPatched = @()
foreach ($name in $copied) {
    $file = Join-Path (Join-Path $dst $name) 'SKILL.md'
    $text = Get-Content -LiteralPath $file -Raw -Encoding UTF8
    $orig = $text
    $text = $text.Replace('${CLAUDE_PLUGIN_ROOT}/.claude/skills/', "$rootFwd/")
    $text = $text.Replace('${CLAUDE_PLUGIN_ROOT}', $rootFwd)
    if ($text -ne $orig) {
        Write-Utf8NoBom $file $text
        $pathPatched += $name
    }
}

# --- 3. frontmatter repair -----------------------------------------------------
# This bundle carried a non-kebab-case (`name: 前端代码精准解析（Vue3专属）`) so DSH
# dropped it silently; reuse its kebab-case `id` field as the catalog name.
$repair = @{ 'frontend-precise-code-explain' = 'frontend-precise-code-explain' }
$repaired = @()
foreach ($name in $repair.Keys) {
    $file = Join-Path (Join-Path $dst $name) 'SKILL.md'
    if (-not (Test-Path $file)) { continue }
    $text = Get-Content -LiteralPath $file -Raw -Encoding UTF8
    $new  = [regex]::Replace($text, '(?m)^name:.*$', "name: $($repair[$name])")
    if ($new -ne $text) {
        Write-Utf8NoBom $file $new
        $repaired += $name
    }
}

Write-Output "skills copied            : $($copied.Count)"
Write-Output "skills skipped           : $($skipped.Count)"
foreach ($s in $skipped) { Write-Output "    skip  $s" }
Write-Output "bundles with rewritten \${CLAUDE_PLUGIN_ROOT}: $($pathPatched.Count) $(if ($pathPatched) { '(' + ($pathPatched -join ', ') + ')' })"
Write-Output "frontmatter repaired     : $($repaired.Count) $(if ($repaired) { '(' + ($repaired -join ', ') + ')' })"
Write-Output ""

# --- 4. MCP servers ------------------------------------------------------------
$stamp    = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup   = "$patchFile.bak-$stamp"
Copy-Item -LiteralPath $patchFile -Destination $backup -Force
Write-Output "backup of previous patch : $backup"

$mcpYaml = @'
- insert:
    # --- imported from Claude Code ~/.claude.json (mcpServers) ---
    - id: mcp-memory
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: memory
        transport: stdio
        command: cmd
        args: ['/c', 'npx', '-y', '@modelcontextprotocol/server-memory']

    - id: mcp-mysql
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: mysql
        transport: stdio
        command: cmd
        args: ['/c', 'npx', '-y', '@benborla29/mcp-server-mysql']
        env:
          MYSQL_HOST: localhost
          MYSQL_PORT: '3306'
          MYSQL_USER: root
          MYSQL_PASSWORD: '20070107GTX..'
          MYSQL_DATABASE: ''

    - id: mcp-github
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: github
        transport: stdio
        command: cmd
        args: ['/c', 'npx', '-y', '@modelcontextprotocol/server-github']

    - id: mcp-agentmemory
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: agentmemory
        transport: stdio
        command: cmd
        args: ['/c', 'npx', '-y', '@agentmemory/mcp']
        env:
          AGENTMEMORY_URL: http://localhost:3111
          AGENTMEMORY_SECRET: ''
          AGENTMEMORY_TOOLS: all

    - id: mcp-playwright
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: playwright
        transport: stdio
        command: cmd
        args: ['/c', 'npx', '-y', '@playwright/mcp@latest', '--browser', 'msedge']

    - id: mcp-sequential-thinking
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: sequential-thinking
        transport: stdio
        command: cmd
        args: ['/c', 'npx', '-y', '@modelcontextprotocol/server-sequential-thinking']

    - id: mcp-chrome-devtools
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: chrome-devtools
        transport: stdio
        command: cmd
        args: ['/c', 'npx', '-y', 'chrome-devtools-mcp']

    - id: mcp-filesystem
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: filesystem
        transport: stdio
        command: cmd
        args: ['/c', 'npx', '-y', '@modelcontextprotocol/server-filesystem', 'E:/']

    - id: mcp-context7
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: context7
        transport: stdio
        command: cmd
        args: ['/c', 'npx', '-y', '@upstash/context7-mcp']

    # Claude scoped this one to the C:\Users\17818 project entry; kept here as a
    # global row. Requires the already-installed word_document_server package.
    - id: mcp-office-word
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: office-word-mcp-server
        transport: stdio
        command: python
        args: ['-m', 'word_document_server.main']
'@

$header = @"
# Your patch layer for this dsh profile, applied after every bundle layer:
# a top-level YAML array of loader patch entries (id-targeted config
# overrides, disables, and insert lists; ``!!js`` expressions allowed).
#
# Claude Code import ($stamp): MCP server rows came from ~/.claude.json.
# To drop one, delete its row (or add ``disabled: true``); list is order-free.
"@

Write-Utf8NoBom $patchFile ($header + "`n" + $mcpYaml + "`n")

$rowCount = ([regex]::Matches($mcpYaml, '(?m)^    - id: ')).Count
Write-Output "MCP rows written         : $rowCount"
Write-Output ""

# --- 5. validate ---------------------------------------------------------------
$node = (Get-Command node -ErrorAction Stop).Source
Write-Output "--- skill validation (real YAML parse, DSH discovery rules) ---"
& $node (Join-Path $PSScriptRoot 'validate-skills.mjs') $dst
exit $LASTEXITCODE
