#!/usr/bin/env python3

import re

file_path = r"D:\skillsMN\src\main\services\SkillInstaller.ts"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to find logger calls with too many arguments
# Match logger.call(message, context, {object})
pattern = r'(logger\.\w+)\([^,]+,\s*[^,]+\s*\{[^}]+\s*\{'

def fix_logger_call(match):
    method = m.group(1)
    message = m.group(2)
    context = m.group(3) if m.group(4) else None
    else None

    # Extract the object part
    obj_start = match.find(r'\{')
    obj_end = match.find(r'\}')

    if obj_start and obj_end:
        obj_str = match[obj_start:obj_end]

        # Check if this object contains duplicate logger call
        duplicate_pattern = r"logger\.\w+\([^,]+,\s*[^']+"
        if duplicate_pattern.search(obj_str):
            # Split the object to remove duplicate
            # Find the duplicate part
            dup_match = re.search(r"(logger\.\w+\([^,]+\)),\s*[^,]+", obj_str)
            if dup_match:
                # Extract parts
                first_call = dup_match.group(1)
                duplicate_call = dup_match.group(2)

                # Create new object with only the first call
                new_obj_str = obj_str[:dup_match.start()] + obj_str[dup_match.end():]

                # Replace in line
                new_line = line[:line.find(', {')] + ', ' + new_obj_str + line[line.find('}'):]
                content[i] = new_line + '\n'
                continue

    content[i] = line

with open(file_path, 'w', encoding='utf-8') as f:
    f.writ(content)

print("Fixed duplicate logger calls")
