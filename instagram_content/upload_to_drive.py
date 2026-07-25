"""
upload_to_drive.py  —  Upload all Compound reels + graphics to Google Drive
First run: opens browser to authorise your Google account (one time only).
After that: just run the script and it uploads everything automatically.

Usage:
    python upload_to_drive.py              # upload all new/changed files
    python upload_to_drive.py --force      # re-upload everything
"""

import os, sys, json, mimetypes
from pathlib import Path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

# ── Config ────────────────────────────────────────────────────────
SCOPES           = ["https://www.googleapis.com/auth/drive.file"]
CREDS_FILE       = r"C:\Users\klszo\focus-app\instagram_content\credentials.json"
TOKEN_FILE       = r"C:\Users\klszo\focus-app\instagram_content\token.json"
DRIVE_FOLDER     = "Compound Instagram Content"   # folder name in your Drive

# Folders to upload from
UPLOAD_DIRS = {
    "Reels (MP4)":    r"C:\Users\klszo\focus-app\instagram_content\compound_reels",
    "Graphics (PNG)": r"C:\Users\klszo\focus-app\instagram_content\compound_story",
}

FORCE = "--force" in sys.argv


# ── Auth ──────────────────────────────────────────────────────────

def get_service():
    creds = None

    if not os.path.exists(CREDS_FILE):
        print("\nERROR: credentials.json not found.")
        print("Follow these steps once to get it:")
        print("  1. Go to https://console.cloud.google.com/")
        print("  2. Create a project (or select one)")
        print("  3. Enable the Google Drive API")
        print("  4. Go to APIs & Services > Credentials")
        print("  5. Create credentials > OAuth client ID > Desktop app")
        print(f"  6. Download the JSON and save it as:\n     {CREDS_FILE}")
        sys.exit(1)

    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CREDS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "w") as fh:
            fh.write(creds.to_json())

    return build("drive", "v3", credentials=creds)


# ── Drive helpers ─────────────────────────────────────────────────

def get_or_create_folder(service, name, parent_id=None):
    """Return folder ID, creating if it doesn't exist."""
    q = f"name='{name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    if parent_id:
        q += f" and '{parent_id}' in parents"
    results = service.files().list(q=q, fields="files(id,name)").execute()
    files = results.get("files", [])
    if files:
        return files[0]["id"]
    meta = {"name": name, "mimeType": "application/vnd.google-apps.folder"}
    if parent_id:
        meta["parents"] = [parent_id]
    folder = service.files().create(body=meta, fields="id").execute()
    return folder["id"]


def file_exists(service, name, parent_id):
    """Check if a file already exists in the folder."""
    q = f"name='{name}' and '{parent_id}' in parents and trashed=false"
    results = service.files().list(q=q, fields="files(id,name)").execute()
    files = results.get("files", [])
    return files[0]["id"] if files else None


def upload_file(service, local_path, parent_id, force=False):
    name = os.path.basename(local_path)
    mime = mimetypes.guess_type(local_path)[0] or "application/octet-stream"

    existing_id = file_exists(service, name, parent_id)
    if existing_id and not force:
        print(f"  skip  {name}  (already on Drive)")
        return

    media = MediaFileUpload(local_path, mimetype=mime, resumable=True)

    if existing_id and force:
        service.files().update(fileId=existing_id, media_body=media).execute()
        print(f"  updated  {name}")
    else:
        meta = {"name": name, "parents": [parent_id]}
        service.files().create(body=meta, media_body=media, fields="id").execute()
        print(f"  uploaded  {name}")


# ── Main ──────────────────────────────────────────────────────────

print("Connecting to Google Drive...")
service = get_service()

# Create root folder
root_id = get_or_create_folder(service, DRIVE_FOLDER)
print(f"Drive folder: '{DRIVE_FOLDER}'\n")

total = 0
for subfolder_name, local_dir in UPLOAD_DIRS.items():
    if not os.path.isdir(local_dir):
        print(f"  skipping {subfolder_name} — folder not found")
        continue

    files = [f for f in os.listdir(local_dir)
             if f.endswith((".mp4", ".png")) and not f.startswith(".")]
    if not files:
        continue

    sub_id = get_or_create_folder(service, subfolder_name, root_id)
    print(f"{subfolder_name} ({len(files)} files)")
    for fname in sorted(files):
        upload_file(service, os.path.join(local_dir, fname), sub_id, FORCE)
        total += 1
    print()

print(f"Done. {total} file(s) processed.")
print(f"View in Drive: https://drive.google.com/drive/folders/ (search '{DRIVE_FOLDER}')")
