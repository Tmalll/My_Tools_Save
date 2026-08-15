@echo off

:: 歌曲文件名称 (这个每次都要调)
set audioName=梁静茹 - 01.勇气.flac

:: 背景图片文件名称
set picName=176846146.jpg



:: 自动获取时常脚本
ffmpeg -i "%audioName%" 2> output.tmp
rem search "  Duration: HH:MM:SS.mm, start: NNNN.NNNN, bitrate: xxxx kb/s"
for /F "tokens=1,2,3,4,5,6 delims=:., " %%i in (output.tmp) do (
    if "%%i"=="Duration" call :calcLength %%j %%k %%l %%m
)
goto :EOF

:calcLength
set /A s=%3
set /A s=s+%2*60
set /A s=s+%1*60*60
set /A VIDEO_LENGTH_S = s+1  ::这里增加了一秒
set /A VIDEO_LENGTH_MS = s*1000 + %4
echo Video duration %1:%2:%3.%4 = %VIDEO_LENGTH_MS%ms = %VIDEO_LENGTH_S%s
:: 自动获取时常脚本



:: 运行的命令
ffmpeg  -r 15  -f image2  -loop 1  -i "%picName%"  -i "%audioName%"  -vf scale=-2:1080  -pix_fmt yuvj420p  -t %VIDEO_LENGTH_S%s  -c:v libx264  -c:a copy    "%audioName%.mp4"



pause
exit


https://ffmpeg.org/ffmpeg-all.html#toc-Video-Options

-filter:v scale=-1:1080
-s 1080x1080 | -s[:stream_specifier] size (input/output,per-stream)
-autoscale | 自动大小,  根据输入图片大小

-b:v 2048k  -bufsize 2048k

-vf filtergraph (output) Create the filtergraph specified by filtergraph and use it to filter the stream.This is an alias for -filter:v, see the -filter option.