#!/bin/sh
# Copies the content, map and art from the Java version (../../coding-rpg) into this demo. The data goes into .js files (not .json)
# so the game runs straight from index.html: browsers block fetch() on file:// pages but allow <script src>.
set -e
cd "$(dirname "$0")"
res=../../coding-rpg/src/main/resources
wrap() {
    printf '// Generated from coding-rpg/src/main/resources/%s. Edit that file, then rerun build-data.sh.\nwindow.%s = ' "$1" "$2"
    cat "$res/$1"
    printf ';\n'
}
wrap content/area1.json CONTENT > content.js
wrap maps/area1.json MAP > map.js
rm -rf assets
cp -r "$res/assets" assets
