@echo off

:delete_view
cls
gh gist view

echo.
echo.
echo 按任意键继续查看, 这会清屏.
pause

goto delete_view