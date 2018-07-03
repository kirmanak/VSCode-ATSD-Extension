#!/bin/zsh
grep -P -o '[-a-zA-Z0-9]+' dictionary.txt | sort | uniq > dictionary && mv dictionary dictionary.txt
