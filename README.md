<img align="left" width="80" height="80" src="assets/icon.png">

# PakuPaku

A VS Code extension for translating UM:PD using Hachimi's translation framework.

![Extension Builder](https://github.com/HachiFridge/PakuPaku/actions/workflows/builder.yml/badge.svg)


## Features

- Custom editors for story timelines, lyrics, localize dict, and MDB text
- Tree views for navigating stories and translation files
- Hachimi IPC integration for live reloading

## Installation

### Download

Get the latest `.vsix` file from [Releases](https://github.com/HachiFridge/PakuPaku/releases).

### Install in VS Code

**Method 1: Via Extensions Panel**
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Click the ⋯ (three dots) menu at the top-right
4. Select "Install from VSIX..."
5. Browse and select the downloaded `.vsix` file
6. Restart VS Code when prompted

**Method 2: Via Command Line**
```bash
code --install-extension pakupaku-<version>.vsix
```

**Method 3: Drag and Drop**
1. Open VS Code
2. Drag the `.vsix` file into the VS Code window
3. Confirm the installation
4. Restart VS Code when prompted

## Prerequisites

### System Requirements

- **Windows:** Windows 10/11 with Visual C++ Redistributables (2015-2022)
- **Linux:** x64 with SQLite3 installed
- **macOS:** SQLite3 (usually pre-installed at `/usr/bin/sqlite3`)
- **VS Code:** v1.90 or later
- **Python:** 3.12+

### UM:PD Game Files

- DMM or Steam installation (JP version)
- Steam installation (Global version)
- Android client files (may require manual meta decryption)

### SQLite3 Installation (Linux)

```bash
# Debian/Ubuntu
sudo apt install sqlite3

# Fedora/RHEL
sudo dnf install sqlite

# Arch Linux
sudo pacman -S sqlite

# openSUSE
sudo zypper install sqlite3
```

**NixOS:** Add to `/etc/nixos/configuration.nix`:
```nix
environment.systemPackages = with pkgs; [
  sqlite
];
```
Then run: `sudo nixos-rebuild switch`

### SQLite3 on macOS

macOS usually ships with SQLite3. If needed, install via Homebrew:
- Apple Silicon: `/opt/homebrew/bin/sqlite3`
- Intel: `/usr/local/bin/sqlite3`

Configure via Settings → `pakupaku.sqlite3` if not on PATH.

## Usage

### First-Time Setup
Refer to [this guide](https://hachimi.noccu.art/docs/translation-guide/using-zokuzoku).


## Development

```bash
pnpm install
cd webviews && pnpm install
pnpm run watch
```

Press F5 to debug.

## Troubleshooting

**SQLite3 not found (Linux):**  
Make sure you have the package installed using your package manager/configuration through [here](#sqlite3-installation-linux).

Or set `pakupaku.sqlite3` in settings to the full path.

**Performance issues:** Use "PakuPaku: Clear cache" command.

# License
[GNU GPLv3](LICENSE)
