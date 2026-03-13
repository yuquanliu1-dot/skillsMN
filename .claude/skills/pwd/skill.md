---
name: pwd
description: Print the current working directory
version: 1.0.0
author: Claude
tags: [utility, filesystem, navigation]
---

# pwd - Print Working Directory

Print the absolute path of the current working directory.

## Usage

```
/pwd
```

## Description

This skill displays the full absolute path of the current working directory. It is equivalent to the Unix/Linux `pwd` command or the Windows `cd` command (without arguments).

## Examples

### Basic Usage

```
/pwd
```

Output example:
```
Current working directory: /home/user/projects/myapp
```

### Use Cases

- Verify your current location in the filesystem
- Copy the current path for use in other commands
- Debug path-related issues in scripts or commands
- Confirm directory changes after `cd` operations

## How It Works

When you run `/pwd`, Claude will:

1. Execute a command to retrieve the current working directory
2. Display the absolute path to you

## Notes

- On Windows, the path will use backslashes (e.g., `C:\Users\username\project`)
- On Unix/Linux/macOS, the path will use forward slashes (e.g., `/home/username/project`)
- The path returned is always an absolute path, not a relative one

## Related Commands

- `cd` - Change directory
- `ls` - List directory contents
