#!/bin/bash

# Maximum target size in bytes (1MB = 1 * 1024 * 1024)
MAX_SIZE=1048576

# Loop through all .mp4 files in the current directory
for video in *.mp4; do
    echo "Processing $video..."

    # Generate an output filename
    output="output_${video}"

    # Compress the video without changing the resolution
    ffmpeg -i "$video" -b:v 500k -c:v libx264 -preset fast -crf 28 -an "$output"

    # Check if the output video file size is greater than 1MB
    while [ $(stat -c %s "$output") -gt $MAX_SIZE ]; do
        echo "$output is too large. Reducing quality further..."

        # Decrease bitrate and compression (you can adjust the parameters)
        ffmpeg -i "$video" -b:v 300k -c:v libx264 -preset fast -crf 30 -an "$output"
    done

    echo "$output is under the 1MB limit."
done
