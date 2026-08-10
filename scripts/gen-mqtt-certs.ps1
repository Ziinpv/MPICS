# Generate self-signed MQTT TLS certs for lab/staging
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Dir = Join-Path $Root "infra\mosquitto\certs"
New-Item -ItemType Directory -Force -Path $Dir | Out-Null

$openssl = Get-Command openssl -ErrorAction SilentlyContinue
if (-not $openssl) {
  Write-Host "openssl not found - using Docker alpine/openssl"
  docker run --rm -v "${Dir}:/certs" alpine/openssl req -x509 -newkey rsa:2048 -keyout /certs/server.key -out /certs/server.crt -days 825 -nodes -subj "/CN=mpcis-mqtt"
} else {
  $key = Join-Path $Dir "server.key"
  $crt = Join-Path $Dir "server.crt"
  & openssl req -x509 -newkey rsa:2048 -keyout $key -out $crt -days 825 -nodes -subj "/CN=mpcis-mqtt"
}

Write-Host "Certs ready in infra/mosquitto/certs"
