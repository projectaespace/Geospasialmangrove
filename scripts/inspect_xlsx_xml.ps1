$xlsx = 'E:\ProjectWebKonservasiMangrove\mangrove-carbon-webgis\images\WEBIMG\StoryMaps\Data.xlsx'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($xlsx)
function ReadEntryXml($name) {
    $entry = $zip.Entries | Where-Object { $_.FullName -eq $name }
    if (-not $entry) { return $null }
    $stream = $entry.Open()
    $reader = New-Object System.IO.StreamReader($stream)
    $text = $reader.ReadToEnd()
    $reader.Close(); $stream.Close()
    return [xml]$text
}
$wb = ReadEntryXml 'xl/workbook.xml'
Write-Output "Workbook sheets:"
$wb.workbook.sheets.sheet | ForEach-Object { Write-Output ("{0}: {1}" -f $_.sheetId, $_.name) }
$shared = ReadEntryXml 'xl/sharedStrings.xml'
if ($shared) { Write-Output "Shared strings count: $($shared.sst.si.Count)" }
$sheet = ReadEntryXml 'xl/worksheets/sheet1.xml'
if ($sheet) {
    Write-Output "Sheet1 rows: $($sheet.worksheet.sheetData.row.Count)"
    $sheet.worksheet.sheetData.row | Select-Object -First 5 | ForEach-Object {
        $cells = @()
        foreach ($c in $_.c) {
            $v = ''
            if ($c.t -eq 's') { $idx = [int]$c.v; $v = $shared.sst.si[$idx].t } else { $v = $c.v.'#text' }
            $cells += $v
        }
        Write-Output ($cells -join '|')
    }
}
$zip.Dispose()
