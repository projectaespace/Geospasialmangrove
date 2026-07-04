$xlsx = 'E:\ProjectWebKonservasiMangrove\mangrove-carbon-webgis\images\WEBIMG\StoryMaps\Data.xlsx'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($xlsx)
function ReadEntryXml($name) {
    $entry = $zip.Entries | Where-Object { $_.FullName -eq $name }
    if (-not $entry) { return $null }
    $stream = $entry.Open()
    $reader = New-Object System.IO.StreamReader($stream)
    $text = $reader.ReadToEnd()
    $reader.Close()
    $stream.Close()
    return [xml]$text
}
$shared = ReadEntryXml 'xl/sharedStrings.xml'
$sheet = ReadEntryXml 'xl/worksheets/sheet1.xml'
if (-not $sheet) { Write-Error 'No sheet1 found'; exit 1 }
$rows = $sheet.worksheet.sheetData.row
$rows | ForEach-Object {
    $cells = @{}
    foreach ($c in $_.c) {
        $ref = $c.r
        $v = ''
        if ($c.t -eq 's') {
            $idx = [int]$c.v
            $v = $shared.sst.si[$idx].t
        } elseif ($c.v -ne $null) {
            $v = $c.v.'#text'
        }
        $cells[$ref] = $v
    }
    $items = $cells.GetEnumerator() | Sort-Object Name | ForEach-Object { "{0}={1}" -f $_.Name, ($_.Value -replace '\r|\n',' ') }
    $line = [string]::Format('Row {0}: {1}', $_.r, ($items -join '; '))
    Write-Output $line
}
$zip.Dispose()
