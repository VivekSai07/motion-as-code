#!/usr/bin/env bash
# Double-click in Finder: one-time setup (installs everything). Log: setup.log
cd "$(dirname "$0")" && ./setup.sh
echo; read -r -p "Press Enter to close this window..."
