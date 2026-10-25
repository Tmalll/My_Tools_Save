param([string]$InFile,[string]$OutFile,[string]$JobFile)

$reader = [System.IO.StreamReader]::new($InFile,[System.Text.Encoding]::ASCII)
$fs     = [System.IO.FileStream]::new($OutFile,[System.IO.FileMode]::Create)

while(-not $reader.EndOfStream){
  $chunk = $reader.ReadLine()
  if([string]::IsNullOrWhiteSpace($chunk)){ continue }
  $bytes = [Convert]::FromBase64String($chunk)
  $fs.Write($bytes,0,$bytes.Length)
}

$reader.Close()
$fs.Close()

Remove-Item $JobFile -Force
Write-Host "½âÂëÍê³É: $InFile"
