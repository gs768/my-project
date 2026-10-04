# Test-ApiKeys.ps1 - run in PowerShell. Nothing is saved to disk or to your history.
# 1) Prompts for each key without showing it  2) tests it with a harmless read-only call
# 3) copies each value to the clipboard so you can paste it into the environment's Edit screen.
function Read-Secret([string]$label) {
  $s = Read-Host -Prompt $label -AsSecureString
  $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
}
function Test-Call([string]$name, [scriptblock]$call) {
  try { & $call | Out-Null; Write-Host "OK   $name" -ForegroundColor Green } catch { Write-Host "FAIL $name : $($_.Exception.Message)" -ForegroundColor Red }
}
$vars = [ordered]@{}

# --- Instantly ---
if ((Read-Host "Test Instantly? (y/n)") -eq 'y') {
  $k = Read-Secret "INSTANTLY_API_KEY"
  Test-Call "Instantly" { Invoke-RestMethod "https://api.instantly.ai/api/v2/campaigns?limit=1" -Headers @{Authorization="Bearer $k"} }
  $vars["INSTANTLY_API_KEY"] = $k
}

# --- GoDaddy: classic key + secret, or a personal access token ---
$mode = Read-Host "GoDaddy: (k) classic key+secret, (t) personal access token, (n) skip"
if ($mode -eq 'k') {
  $k = Read-Secret "GODADDY_API_KEY"; $s = Read-Secret "GODADDY_API_SECRET"
  Test-Call "GoDaddy (key+secret)" { Invoke-RestMethod "https://api.godaddy.com/v1/domains?limit=1" -Headers @{Authorization="sso-key ${k}:${s}"} }
  $vars["GODADDY_API_KEY"] = $k; $vars["GODADDY_API_SECRET"] = $s
} elseif ($mode -eq 't') {
  $t = Read-Secret "GODADDY_API_TOKEN"
  Test-Call "GoDaddy (token, Bearer)" { Invoke-RestMethod "https://api.godaddy.com/v1/domains?limit=1" -Headers @{Authorization="Bearer $t"} }
  $vars["GODADDY_API_TOKEN"] = $t
}

# --- Namecheap (only works from an IP you whitelisted in Namecheap) ---
if ((Read-Host "Namecheap? (y/n)") -eq 'y') {
  $u = Read-Host "NAMECHEAP_API_USER"; $n = Read-Host "NAMECHEAP_USERNAME"
  $ip = Read-Host "NAMECHEAP_CLIENT_IP (the IP whitelisted in Namecheap)"; $k = Read-Secret "NAMECHEAP_API_KEY"
  Test-Call "Namecheap" { Invoke-RestMethod "https://api.namecheap.com/xml.response?ApiUser=$u&ApiKey=$k&UserName=$n&ClientIp=$ip&Command=namecheap.domains.getList&PageSize=10" }
  $vars["NAMECHEAP_API_USER"]=$u; $vars["NAMECHEAP_USERNAME"]=$n; $vars["NAMECHEAP_CLIENT_IP"]=$ip; $vars["NAMECHEAP_API_KEY"]=$k
}

# --- Clipboard helper: one value at a time, then clears the clipboard ---
foreach ($name in $vars.Keys) {
  Set-Clipboard -Value $vars[$name]
  Read-Host "Value for $name is on the clipboard. Paste it into the Edit screen, then press Enter"
}
Set-Clipboard -Value " "
Remove-Variable vars, k, s, t -ErrorAction SilentlyContinue
Write-Host "Done. Clipboard cleared." -ForegroundColor Green
