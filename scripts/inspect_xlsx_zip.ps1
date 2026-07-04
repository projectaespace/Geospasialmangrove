$xlsx = 'E:\ProjectWebKonservasiMangrove\mangrove-carbon-webgis\images\WEBIMG\StoryMaps\Data.xlsx'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($xlsx)
$zip.Entries | Select-Object -ExpandProperty FullName | Sort-Object | ForEach-Object { $_ }
$zip.Dispose()
