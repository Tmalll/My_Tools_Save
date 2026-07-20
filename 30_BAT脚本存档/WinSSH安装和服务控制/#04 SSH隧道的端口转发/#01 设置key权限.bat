@echo off

icacls .\key\* /inheritance:r
icacls .\key\* /grant:r "%username%":"(R)"


pause