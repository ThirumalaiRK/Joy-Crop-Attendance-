import os
import sys
import psutil

def inspect_drive(drive_letter):
    print(f"==================================================")
    print(f"  IDENTIX / ZK TERMINAL USB RESOURCE INVENTORY")
    print(f"==================================================")
    print(f"Scanning target drive: {drive_letter}\n")

    if not os.path.exists(drive_letter):
        print(f"[ERROR] Drive {drive_letter} not accessible.")
        return

    found_files = []
    for root, dirs, files in os.walk(drive_letter):
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, drive_letter)
            size = os.path.getsize(full_path)
            found_files.append((rel_path, size))

    if not found_files:
        print("[INFO] Drive is completely empty.")
    else:
        print(f"Found {len(found_files)} files on USB drive:\n")
        print(f"{'FILE PATH':<50} | {'SIZE (BYTES)':<15}")
        print("-" * 68)
        for rpath, sz in found_files:
            print(f"{rpath:<50} | {sz:<15}")

    print("\n==================================================")
    print("  CONCLUSION & HARDWARE SPECIFICATIONS")
    print("==================================================")
    print("Identix K90 Pro / ZLM60 Firmware Architecture:")
    print("1. WALLPAPER MENU: Reads JPEG/BMP images from /picture/")
    print("2. IDLE SCREENSAVER DISPLAY: Configured via [M/OK] -> System -> Display -> Screen Saver -> Mode: Custom Picture / Wallpaper.")
    print("3. REMOTE / LAN SYNC: Attendance events, logs, & users sync via TCP Port 4370.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        inspect_drive(sys.argv[1].rstrip("\\/") + "\\")
    else:
        removable = []
        for part in psutil.disk_partitions(all=False):
            if 'removable' in part.opts.lower() or part.fstype.lower() in ['fat32', 'vfat', 'fat']:
                removable.append(part.mountpoint)
        if removable:
            for d in removable:
                inspect_drive(d)
        else:
            print("No USB drive automatically detected. Pass drive letter e.g. python inspect_usb_export.py G:\\")
