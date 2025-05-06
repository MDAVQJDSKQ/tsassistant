import os
import uuid
import json
import shutil
from pathlib import Path

def migrate_conversation_files(convos_dir="backend/convos"):
    """
    Migrates existing non-UUID conversation files to use UUID format.
    Returns a dictionary mapping original filenames to new UUIDs.
    """
    # Create directory if it doesn't exist
    os.makedirs(convos_dir, exist_ok=True)
    
    # Get all JSON files
    json_files = [f for f in os.listdir(convos_dir) if f.endswith('.json')]
    migration_map = {}
    
    # Process each file
    for filename in json_files:
        base_name = filename.replace('.json', '')
        
        # Check if filename is already a UUID
        try:
            uuid.UUID(base_name)
            print(f"File '{filename}' is already in UUID format. Skipping.")
            continue
        except ValueError:
            # Not a UUID, need to migrate
            new_uuid = str(uuid.uuid4())
            old_path = os.path.join(convos_dir, filename)
            new_path = os.path.join(convos_dir, f"{new_uuid}.json")
            
            # Copy the file with the new name (using copy2 to preserve metadata)
            shutil.copy2(old_path, new_path)
            print(f"Migrated: {filename} -> {new_uuid}.json")
            
            migration_map[filename] = f"{new_uuid}.json"
    
    # Write a migration record if any files were migrated
    if migration_map:
        map_path = os.path.join(convos_dir, "_migration_map.json")
        with open(map_path, 'w') as f:
            json.dump(migration_map, f, indent=2)
        print(f"Migration map saved to {map_path}")
    
    return migration_map

if __name__ == "__main__":
    print("Starting conversation file migration...")
    migration_map = migrate_conversation_files()
    
    if not migration_map:
        print("No files needed migration.")
    else:
        print(f"Migration complete. Migrated {len(migration_map)} files.")
        print("Original files were preserved. You can delete them manually if desired.")