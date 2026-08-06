# Backup Postgres từ container mpcis-postgres (Windows PowerShell)
# Usage: .\scripts\backup-db.ps1 [output-dir]
param(
  [string]$OutDir = ".\backups"
)

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$file = Join-Path $OutDir "mpcis_$stamp.sql"

docker exec mpcis-postgres pg_dump -U mpcis -d mpcis | Out-File -FilePath $file -Encoding utf8
Write-Host "Backup OK: $file"
