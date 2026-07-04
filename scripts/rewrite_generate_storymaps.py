from pathlib import Path
path = Path(r'e:\ProjectWebKonservasiMangrove\mangrove-carbon-webgis\scripts\generate_storymaps.ps1')
text = path.read_text(encoding='utf-8')
start = text.find('function Convert-DmsToDecimal($text) {')
end = text.find('function Build-FallbackCoords()', start)
if start == -1 or end == -1:
    raise SystemExit('Could not locate function block in file')
old = text[start:end]
new = '''function Convert-DmsToDecimal($text) {
    if (-not $text) { return $null }
    $raw = [string]$text
    $raw = $raw -replace '[“”″]', ' '
    $raw = $raw -replace '[‘’‚‛]', ' '
    $raw = $raw -replace '[^0-9NSEWnsew°'"'"\.\s\-]', ' '
    $raw = $raw -replace '\s+', ' '
    $raw = $raw.Trim()

    if ($raw -match '([0-9]{1,4})\s*°\s*([0-9]{1,2})\s*['"']\s*([0-9]+(?:\.[0-9]+)?)\s*([NSEWnsew])') {
        $deg = [double]$matches[1]
        while ($deg -gt 180 -and $deg.ToString().Length -gt 1) {
            $deg = [double]$deg.ToString().Substring(1)
        }
        $min = [double]$matches[2]
        $sec = [double]$matches[3]
        $hem = $matches[4].ToUpper()
        $dec = $deg + ($min / 60) + ($sec / 3600)
        if ($hem -in @('S','W')) { $dec = -$dec }
        return $dec
    }

    $num = 0.0
    if ([double]::TryParse($raw, [ref]$num)) {
        return $num
    }
    return $null
}
'''
path.write_text(text[:start] + new + text[end:], encoding='utf-8')
print('rewrote function block')
