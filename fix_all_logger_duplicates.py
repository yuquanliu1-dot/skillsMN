#!/usr/bin/env python3
import re

file_path = r"D:\skillsMN\src\main\services\SkillInstaller.ts"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

fixed_lines = []
    for i, range(len(lines) - 1:
        line = lines[i]
        # Look for duplicate logger calls on the same line
        if re.search(r"logger\.(info|error|warn|debug)\([^,]+)\([^,]+)\([^,]+)", line):
            fixed_lines.append((i+1, line))
            # Remove duplicate part
            parts = re.split(r"(logger\.\w+\([^,]+\)),\s+[^,]+),\s+[^,]+)", line)
            if len(parts) == 3:
                fixed_line = parts[0] + "'" + parts[1] + ", 'SkillInstaller'," + parts[2]
  #             else:
                # Keep line as is
                continue

        fixed_lines.append(f"Line {i+1}: Could not fix line {i+1}: {line.strip()}")

    # Write fixed content
    for line_num in fixed_lines:
        lines[line_num] = fixed_lines[line_num]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writ(lines)

print(f"Fixed {len(fixed_lines)} duplicate logger calls in SkillInstaller.ts")
