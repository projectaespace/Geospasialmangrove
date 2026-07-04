Add-Type -AssemblyName System.IO.Compression.FileSystem
$path = 'data\Dashboard.xlsx'
if (-not (Test-Path $path)) { Write-Host 'NO_FILE'; exit 1 }
$copyPath = 'data\Dashboard_rows.xlsx'
Copy-Item -Force -Path $path -Destination $copyPath
$zip = [System.IO.Compression.ZipFile]::OpenRead($copyPath)
function Read-XmlEntry([string]$entryPath) {
    $entry = $zip.GetEntry($entryPath)
    if (-not $entry) { return $null }
    $stream = $entry.Open()
    $reader = New-Object System.IO.StreamReader($stream)
    $text = $reader.ReadToEnd()
    $reader.Close()
    $stream.Close()
    return [xml]$text
}
try {
    $workbookXml = Read-XmlEntry('xl/workbook.xml')
    $relsXml = Read-XmlEntry('xl/_rels/workbook.xml.rels')
    $rels = @{}
    foreach ($r in $relsXml.Relationships.Relationship) { $rels[$r.Id] = $r.Target }
    function DumpRows([string]$sheetName, [int[]]$rowsToPrint) {
        $sheet = $workbookXml.workbook.sheets.sheet | Where-Object { $_.name -eq $sheetName }
        if (-not $sheet) { Write-Host "Sheet $sheetName not found"; return }
        $path = 'xl/' + $rels[$sheet.'id'].Replace('../','')
        $sheetXml = Read-XmlEntry($path)
        Write-Host "\n=== $sheetName ($path) ==="
        $sharedStringsXml = Read-XmlEntry('xl/sharedStrings.xml')
    foreach ($row in $sheetXml.worksheet.sheetData.row) {
            if ($rowsToPrint -contains [int]$row.r) {
                Write-Host "ROW $($row.r): $($row.OuterXml)"
                foreach ($cell in $row.c) {
                    $text = ''
                    if ($cell.v) { $text = $cell.v.'#text' }
                    if ($cell.t -eq 's' -and $text -ne '') {
                        $idx = [int]$text
                        $ss = $sharedStringsXml.sst.si[$idx]
                        $ssText = ''
                        if ($ss.t) { $ssText = $ss.t.'#text' }
                        elseif ($ss.r) { $ssText = ($ss.r | ForEach-Object { $_.t.'#text' }) -join '' }
                        $text = "[$text] $ssText"
                    }
                    Write-Host "  CELL $($cell.r) t=$($cell.t) s=$($cell.s) => $text"
                }
            }
        }
    }
    DumpRows 'LajuForestasiKab' @(1,2)
    DumpRows 'LajuForestasiDesa' @(1,2)
    DumpRows 'ZonaKawasan' @(1,2)
    DumpRows 'StokKarbonDesa' @(1,2)
} finally { $zip.Dispose(); Remove-Item -Force $copyPath }
