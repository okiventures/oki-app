import os
import re

directories = [
    r"c:\Personal Files\Programming\Projects\oki-app\src\mocks",
    r"c:\Personal Files\Programming\Projects\oki-app\app"
]

replacements = {
    'Mike Torres': 'Ceferino Jumaoas',
    'Sarah Jenkins': 'Ishah Bautista',
    'Alice W.': 'Princess Jaena',
    'Robert B.': 'Kyle Lee',
    'Alex Chen': 'James Ty',
    'Emily R.': 'Princess Jaena',
    'David S.': 'James Ty',
    'John Doe': 'Kyle Lee',
    'Tom K.': 'Kyle Lee',
    'Jake S.': 'James Ty',
    'Maria L.': 'Princess Jaena',
    'Downtown Metro': 'Cebu City',
    'Westside Area': 'Cebu City',
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content
    for old, new in replacements.items():
        new_content = new_content.replace(old, new)

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {filepath}")

for directory in directories:
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                process_file(os.path.join(root, file))

print("Done.")
