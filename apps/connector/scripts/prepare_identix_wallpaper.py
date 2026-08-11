import os
import sys
import shutil
import psutil
from PIL import Image

PROJECT_ROOT = r"f:\TEST LIVE ATTENDANCE"
SOURCE_IMAGE_PATH = os.path.join(PROJECT_ROOT, "wallpaper", "ChatGPT Image Aug 10, 2026, 05_40_37 PM.png")
USB_READY_DIR = os.path.join(PROJECT_ROOT, "wallpaper", "usb_ready")

def get_fat32_drives():
    drives = []
    for part in psutil.disk_partitions(all=False):
        if 'removable' in part.opts.lower() or part.fstype.lower() in ['fat32', 'vfat', 'fat']:
            drives.append(part.mountpoint)
    return drives

def load_and_process_image(src_path, target_w, target_h):
    if not os.path.exists(src_path):
        raise FileNotFoundError(f"Source wallpaper image not found at: {src_path}")
    
    img = Image.open(src_path).convert("RGB")
    
    if img.size == (target_w, target_h):
        return img
    
    img_ratio = img.width / img.height
    target_ratio = target_w / target_h
    
    if img_ratio > target_ratio:
        new_h = target_h
        new_w = int(img.width * (target_h / img.height))
    else:
        new_w = target_w
        new_h = int(img.height * (target_w / img.width))
        
    img_resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    left = (new_w - target_w) / 2
    top = (new_h - target_h) / 2
    right = (new_w + target_w) / 2
    bottom = (new_h + target_h) / 2
    
    return img_resized.crop((left, top, right, bottom))

def clean_existing_wallpaper_files(base_dir):
    print(f"[CLEANUP] Cleaning old wallpaper resources from: {base_dir}")
    target_dirs = ["picture", "photo", "wallpaper", "theme", "saver", "Saver", "screensaver", "SCREENSAVER", "ad", "advert", "ad_picture", "advertisement"]
    for d in target_dirs:
        dir_path = os.path.join(base_dir, d)
        if os.path.exists(dir_path) and os.path.isdir(dir_path):
            try:
                shutil.rmtree(dir_path)
            except Exception as e:
                print(f"  [!] Notice cleaning {d}: {e}")

    # Remove loose old image/ini files from root
    root_files_to_clean = [
        "1.jpg", "01.jpg", "02.jpg", "wallpaper.jpg", "bg.jpg", "picture.jpg",
        "ad.jpg", "ad_1.jpg", "ad_2.jpg", "ad_picture.jpg", "screensaver.jpg",
        "1.bmp", "01.bmp", "saver.bmp", "ad_1.bmp", "1_v.jpg", "01_v.jpg", "02_v.jpg",
        "saver_v.jpg", "wallpaper_v.jpg", "ad_v.jpg", "2.bmp", "02.bmp",
        "picture.ini", "ad.ini", "saver.ini", "screensaver.ini", "theme.ini", "config.ini",
        "screensaver.res", "saver.res", "resource.res", "screensaver.bin", "saver.bin", "screensaver.dat"
    ]
    for rf in root_files_to_clean:
        fpath = os.path.join(base_dir, rf)
        if os.path.exists(fpath) and os.path.isfile(fpath):
            try:
                os.remove(fpath)
            except Exception:
                pass

def deploy_wallpapers_to_directory(base_dir):
    clean_existing_wallpaper_files(base_dir)
    print(f"[DEPLOYER] Writing fresh new wallpaper package to: {base_dir}")
    
    folders = [
        os.path.join(base_dir, "picture"),
        os.path.join(base_dir, "photo"),
        os.path.join(base_dir, "wallpaper"),
        os.path.join(base_dir, "theme"),
        os.path.join(base_dir, "saver"),
        os.path.join(base_dir, "ad"),
        base_dir
    ]

    for folder in folders:
        os.makedirs(folder, exist_ok=True)

    img_320x240 = load_and_process_image(SOURCE_IMAGE_PATH, 320, 240)
    img_240x320 = load_and_process_image(SOURCE_IMAGE_PATH, 240, 320)

    filenames_320 = [
        "1.jpg", "01.jpg", "wallpaper.jpg", "bg.jpg", "picture.jpg",
        "1.bmp", "01.bmp", "wallpaper.bmp"
    ]
    filenames_240 = [
        "1_v.jpg", "01_v.jpg", "wallpaper_v.jpg"
    ]

    total_written = 0
    for folder in folders:
        for fname in filenames_320:
            dest = os.path.join(folder, fname)
            if fname.endswith(".bmp"):
                img_320x240.save(dest, format="BMP")
            else:
                img_320x240.save(dest, format="JPEG", quality=95, progressive=False)
            total_written += 1

        for fname in filenames_240:
            dest = os.path.join(folder, fname)
            img_240x320.save(dest, format="JPEG", quality=95, progressive=False)
            total_written += 1

    print(f"[SUCCESS] Wrote {total_written} new wallpaper files from new image source.")

if __name__ == "__main__":
    print(f"[NEW SOURCE IMAGE]: {SOURCE_IMAGE_PATH}")
    
    # 1. Update local usb_ready folder
    deploy_wallpapers_to_directory(USB_READY_DIR)
    
    # 2. Check USB drive argument or auto-detected removable drive
    target_drives = []
    if len(sys.argv) > 1:
        target_drives.append(sys.argv[1].rstrip("\\/") + "\\")
    else:
        target_drives = get_fat32_drives()
        
    if target_drives:
        for drive in target_drives:
            print(f"\n[USB TARGET]: Deploying fresh wallpaper to drive {drive}")
            deploy_wallpapers_to_directory(drive)
            print(f"[SUCCESS] Drive {drive} is 100% prepared with the new wallpaper!")
    else:
        print("\n[INFO] No USB drive letter specified.")
        print(f"You can copy all files/folders from:\n   {USB_READY_DIR}\nonto your USB Pen Drive.")
        print("Or run with your USB drive letter, e.g.:")
        print("   python prepare_identix_wallpaper.py G:\\")
