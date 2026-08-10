# Generate Mosquitto password file + ACL for bridge + devices (local/staging lab)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Out = Join-Path $Root "infra\mosquitto"
New-Item -ItemType Directory -Force -Path $Out | Out-Null

$BridgeUser = if ($env:MQTT_BRIDGE_USER) { $env:MQTT_BRIDGE_USER } else { "bridge" }
$BridgePass = if ($env:MQTT_BRIDGE_PASSWORD) { $env:MQTT_BRIDGE_PASSWORD } else { "mpcisbridge" }
$Codes = if ($env:DEVICE_CODES) { $env:DEVICE_CODES } else { "COM-XA1-01,COM-XA1-02,COM-XA1-03,COM-XA2-01" }
$Prefix = if ($env:MQTT_TOPIC_PREFIX) { $env:MQTT_TOPIC_PREFIX } else { "mpcis" }
$list = $Codes.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }

$passwdHost = Join-Path $Out "passwd"
$aclHost = Join-Path $Out "acl"

# Remove stale dir/file mounts
if (Test-Path $aclHost) { Remove-Item -Recurse -Force $aclHost }
if (Test-Path $passwdHost) { Remove-Item -Force $passwdHost }

$aclLines = New-Object System.Collections.Generic.List[string]
$aclLines.Add("user $BridgeUser")
$aclLines.Add("topic readwrite $Prefix/devices/#")
$aclLines.Add("")
foreach ($c in $list) {
  $aclLines.Add("user $c")
  $aclLines.Add("topic readwrite $Prefix/devices/$c/#")
  $aclLines.Add("")
}
[System.IO.File]::WriteAllText($aclHost, ($aclLines -join "`n") + "`n")

docker run --rm -v "${Out}:/out" eclipse-mosquitto:2 sh -c "mosquitto_passwd -b -c /out/passwd $BridgeUser $BridgePass"
foreach ($c in $list) {
  $pass = "dev-$c"
  docker run --rm -v "${Out}:/out" eclipse-mosquitto:2 sh -c "mosquitto_passwd -b /out/passwd $c $pass"
}
# Docker Desktop / Windows: mosquitto user cần đọc được file
docker run --rm -v "${Out}:/out" eclipse-mosquitto:2 chmod 644 /out/passwd /out/acl 2>$null

Write-Host "Wrote $passwdHost and $aclHost"
Write-Host "Bridge: $BridgeUser / $BridgePass"
foreach ($c in $list) { Write-Host "Device $c / dev-$c" }
