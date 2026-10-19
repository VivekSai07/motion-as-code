@echo off
rem Usage: make voice ^| align ^| preview ^| draft ^| render ^| ...  (run "make" for the list)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0make.ps1" %*
