param([string]$InFile,[string]$OutFile,[string]$JobFile,
      [int]$DecodeMode=4,   # 工作模式 1=全读, 2=读多行, 3=流式, 4=异步读多行
      [int]$BatchSize=5,        # 一次读取多少行, 只在模式2和4生效.
      [int]$fsBufSizeMB=4,      # FileStream缓冲区大小 推荐范围 1~4MB
      [int]$bufferSizeMB=32)     # 每次读写缓冲区大小 推荐范围 1MB ~ 8MB

$FSBuf=[int64]$fsBufSizeMB*1024*1024
$Buf=[int64]$bufferSizeMB*1024*1024
Write-Host "解码模式: $DecodeMode"

switch($DecodeMode){
1{$fs=[IO.FileStream]::new($OutFile,[IO.FileMode]::Create);$lines=[IO.File]::ReadAllLines($InFile,[Text.Encoding]::ASCII);foreach($l in $lines){if([string]::IsNullOrWhiteSpace($l)){continue};$b=[Convert]::FromBase64String($l);$fs.Write($b,0,$b.Length)};$fs.Close()}
2{$r=[IO.StreamReader]::new($InFile,[Text.Encoding]::ASCII,$Buf);$fs=[IO.FileStream]::new($OutFile,[IO.FileMode]::Create,[IO.FileAccess]::Write,[IO.FileShare]::None,$FSBuf);while(-not $r.EndOfStream){$ls=@();for($i=0;$i -lt $BatchSize -and -not $r.EndOfStream;$i++){ $l=$r.ReadLine();if([string]::IsNullOrWhiteSpace($l)){continue};$ls+=$l};if($ls.Count -gt 0){$c=[string]::Join('', $ls);$b=[Convert]::FromBase64String($c);$fs.Write($b,0,$b.Length)}};$r.Close();$fs.Close()}
3{$in=[IO.FileStream]::new($InFile,[IO.FileMode]::Open,[IO.FileAccess]::Read);$out=[IO.FileStream]::new($OutFile,[IO.FileMode]::Create);$t=[Security.Cryptography.FromBase64Transform]::new([Security.Cryptography.FromBase64TransformMode]::IgnoreWhiteSpaces);$cs=[Security.Cryptography.CryptoStream]::new($in,$t,[Security.Cryptography.CryptoStreamMode]::Read);$cs.CopyTo($out);$cs.Close();$in.Close();$out.Close()}
4{$r=[IO.StreamReader]::new($InFile,[Text.Encoding]::ASCII,$Buf);$fs=[IO.FileStream]::new($OutFile,[IO.FileMode]::Create,[IO.FileAccess]::Write,[IO.FileShare]::None,$FSBuf,[IO.FileOptions]::Asynchronous);while(-not $r.EndOfStream){$ls=@();for($i=0;$i -lt $BatchSize -and -not $r.EndOfStream;$i++){ $lt=$r.ReadLineAsync();$lt.Wait();$l=$lt.Result;if([string]::IsNullOrWhiteSpace($l)){continue};$ls+=$l};if($ls.Count -gt 0){$c=[string]::Join('', $ls);$b=[Convert]::FromBase64String($c);$wt=$fs.WriteAsync($b,0,$b.Length);$wt.Wait()}};$r.Close();$fs.Close()}
default{Write-Host "错误: 未知的解码模式 $DecodeMode";exit 1}}
Remove-Item $JobFile -Force
Write-Host "解码完成: $InFile";Write-Host "解码脚本结束...."
