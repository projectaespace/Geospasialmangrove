$path = "E:\ProjectWebKonservasiMangrove\mangrove-carbon-webgis\images\WEBIMG\StoryMaps\Data.xlsx"
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$workbook = $excel.Workbooks.Open($path)
$sheet = $workbook.Worksheets.Item('Lokasi')
$used = $sheet.UsedRange
$rows = $used.Rows.Count
$cols = $used.Columns.Count
"Rows=$rows, Cols=$cols"
$headers = @()
for ($c = 1; $c -le $cols; $c++) {
    $headers += $sheet.Cells.Item(1, $c).Text
}
"Headers: $($headers -join '|')"
for ($r = 2; $r -le [Math]::Min(5, $rows); $r++) {
    $values = @()
    for ($c = 1; $c -le $cols; $c++) {
        $values += $sheet.Cells.Item($r, $c).Text
    }
    Write-Output ('{0}: {1}' -f $r, ($values -join '|'))
}
$workbook.Close($false)
$excel.Quit()