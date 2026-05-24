# Orbit Menu - Animal Company

In-game menu for Animal Company built on Frida and IL2CPP.

## Quick Start

1. Download the `Launcher` folder from this repository.
2. Start Animal Company and load fully into the game.
3. Run `Launcher/run.bat`.

The launcher installs `frida-tools` if needed, downloads the latest menu files, and starts Frida against `AnimalCompany.exe`.

## Repository Files

- `OrbitMenu.js` - menu code loaded by Frida.
- `Frida-Map.js` - resolver for Animal Company's obfuscated IL2CPP exports.
- `frida-il2cpp-bridge.js` - IL2CPP bridge dependency.
- `Launcher/run.py` - updater and Frida launcher.
- `Launcher/run.bat` - Windows double-click entry point.
- `Launcher/HOW TO USE.txt` - setup and troubleshooting notes.

## Troubleshooting

- `process not found`: Animal Company is not running, or it is still at the main menu.
- `python not found`: install Python 3 and enable "Add Python to PATH".
- `frida not found`: run the launcher again after it installs `frida-tools`.
- Fetch errors: check your connection, VPN, proxy, or antivirus. Existing cached files are used when possible.
