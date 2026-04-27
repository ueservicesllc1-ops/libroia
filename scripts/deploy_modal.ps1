$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..
# Evita fallo local "'charmap' codec can't encode" al imprimir Unicode de Modal.
$env:PYTHONIOENCODING = "utf-8"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
chcp 65001 | Out-Null
python -m modal deploy modal_vllm_app.py
