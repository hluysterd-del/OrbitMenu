#!/usr/bin/env python3
"""
Orbit Menu - Frida launcher.
Auto-installs frida-tools, fetches the latest build from GitHub, then runs frida.

Repo: github.com/hluysterd-del/OrbitMenu
"""
import os
import shutil
import subprocess
import sys
import sysconfig
import time
import urllib.request

# jsDelivr is the primary source because raw.githubusercontent.com's CDN can
# serve stale content briefly after a push. The raw GitHub URL is the fallback.
REPO_BASE = "https://cdn.jsdelivr.net/gh/hluysterd-del/OrbitMenu@main"
REPO_BASE_FALLBACK = "https://raw.githubusercontent.com/hluysterd-del/OrbitMenu/refs/heads/main"
FILES = ["frida-il2cpp-bridge.js", "Frida-Map.js", "OrbitMenu.js"]
REMOTES = {f: (f"{REPO_BASE}/{f}", f"{REPO_BASE_FALLBACK}/{f}") for f in FILES}
LOAD_ORDER = ["frida-il2cpp-bridge.js", "Frida-Map.js", "OrbitMenu.js"]

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, ".cache")
TARGET = "AnimalCompany.exe"
MIN_FILE_SIZE = 100


def banner():
    print("=" * 56)
    print(" Orbit Menu - Frida launcher")
    print(" Repo: github.com/hluysterd-del/OrbitMenu")
    print("=" * 56)


def find_frida():
    frida = shutil.which("frida")
    if frida:
        return frida

    scripts_dir = sysconfig.get_path("scripts")
    if scripts_dir:
        for name in ("frida.exe", "frida.cmd", "frida"):
            candidate = os.path.join(scripts_dir, name)
            if os.path.exists(candidate):
                return candidate
    return None


def ensure_frida():
    frida = find_frida()
    if frida:
        return frida

    print("[*] frida not found, installing frida-tools via pip...")
    r = subprocess.run([sys.executable, "-m", "pip", "install", "--upgrade", "frida-tools"])
    if r.returncode != 0:
        sys.exit("[!] pip install frida-tools failed.")

    frida = find_frida()
    if not frida:
        sys.exit("[!] frida installed, but the launcher could not find it. Check Python Scripts dir is in PATH.")
    return frida


def fetch(url, dest):
    cache_bust_url = url + ("&" if "?" in url else "?") + "cb=" + str(int(time.time()))
    opener = urllib.request.build_opener()
    opener.addheaders = [
        ("User-Agent", "OrbitMenu-Launcher/1.0"),
        ("Cache-Control", "no-cache"),
        ("Pragma", "no-cache"),
    ]
    with opener.open(cache_bust_url, timeout=20) as r:
        data = r.read()

    if len(data) < MIN_FILE_SIZE:
        raise RuntimeError(f"download was too small ({len(data)} bytes)")

    part = dest + ".part"
    with open(part, "wb") as f:
        f.write(data)
    os.replace(part, dest)
    return len(data)


def cache_is_complete():
    return all(
        os.path.exists(os.path.join(CACHE, name))
        and os.path.getsize(os.path.join(CACHE, name)) >= MIN_FILE_SIZE
        for name in FILES
    )


def cached_paths():
    return {name: os.path.join(CACHE, name) for name in FILES}


def fetch_one(name, dest):
    errors = []
    for url in REMOTES[name]:
        try:
            n = fetch(url, dest)
            print(f"    {name}  ({n} bytes)")
            return dest
        except Exception as e:
            errors.append(f"{url}: {e}")

    joined = "\n        ".join(errors)
    raise RuntimeError(f"failed to fetch {name}:\n        {joined}")


def fetch_latest_build():
    temp_dir = os.path.join(CACHE, ".download")
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir, exist_ok=True)

    try:
        staged = {}
        for name in FILES:
            staged[name] = fetch_one(name, os.path.join(temp_dir, name))

        for name, temp_path in staged.items():
            os.replace(temp_path, os.path.join(CACHE, name))
        return cached_paths()
    except Exception as e:
        shutil.rmtree(temp_dir, ignore_errors=True)
        if cache_is_complete():
            print(f"    update failed ({e})")
            print("    using existing cached build")
            return cached_paths()
        sys.exit(f"[!] {e}")


def launch_frida(cmd):
    injected = False
    with subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    ) as proc:
        for line in proc.stdout:
            print(line, end="")
            if not injected and "[Orbit]" in line and ("READY" in line or "hook installed" in line):
                injected = True
                print("[+] Successfully injected Orbit Menu.")
        proc.wait()

    if not injected:
        print("[!] Frida exited before Orbit Menu reported a successful injection.")


def main():
    banner()
    frida = ensure_frida()
    os.makedirs(CACHE, exist_ok=True)

    print("[*] fetching latest build...")
    paths = fetch_latest_build()

    cmd = [frida]
    for name in LOAD_ORDER:
        cmd += ["-l", paths[name]]
    cmd.append(TARGET)

    print("[*] launching Orbit Menu...")
    try:
        launch_frida(cmd)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
