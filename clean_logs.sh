#!/usr/bin/env zsh

# Enable necessary Zsh options
setopt extended_glob nullglob

# Find .txt/.log files while excluding protected directories
files_to_delete=(${(f)"$(find . \
  -type d \( \
    -name node_modules -o \
    -name .git -o \
    -name .DS_Store -o \
    -name '.cursor*' -o \
    -name dist -o \
    -name build -o \
    -name cdk.out \
  \) -prune -o \
  -type f \( -iname '*.txt' -o -iname '*.log' \) -print \
)"})

if (( ${#files_to_delete} == 0 )); then
  print -P "%F{green}No .txt or .log files found to delete.%f"
  exit 0
fi

# Display files to be deleted
print -P "%F{red}The following %F{blue}${#files_to_delete}%F{red} files will be deleted:%f"
print -l $files_to_delete
print -P "%F{yellow}----------------------------------%f"

# Confirmation prompt
read -q "reply?Proceed with deletion? [y/N] "
print
case $reply in
  (y|Y)
    print -P "%F{red}Deleting files...%f"
    rm -v $files_to_delete
    print -P "%F{green}Done.%f"
    ;;
  (*)
    print -P "%F{yellow}Aborted. No files were deleted.%f"
    ;;
esac