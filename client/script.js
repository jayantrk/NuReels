<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Video Reels</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            flex-direction: column;
            background-color: #f0f0f0;
        }
        #video-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            overflow-y: auto;
            max-height: 80vh;
            width: 90%;
            margin: 20px auto;
        }
        video {
            width: 100%;
            max-width: 600px;
            margin: 10px 0;
        }
        #upload-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 20px;
            background-color: #007BFF;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }
        #upload-btn:hover {
            background-color: #0056b3;
        }
        #file-input {
            display: none;
        }
        #upload-status {
            margin-top: 10px;
            font-size: 14px;
        }
    </style>
</head>
<body>

    <h1>Video Reels</h1>
    <div id="video-container"></div>

    <!-- Upload Button -->
    <button id="upload-btn">Upload Video</button>
    <input type="file" id="file-input" accept="video/mp4">

    <div id="upload-status"></div>

    <script>
        const videoContainer = document.getElementById('video-container');
        const uploadBtn = document.getElementById('upload-btn');
        const fileInput = document.getElementById('file-input');
        const uploadStatus = document.getElementById('upload-status');
        let videoData = [];
        let videoIndex = 0;
        let isFetching = false;

        // Fetch initial batch of videos (10 videos)
        const fetchVideos = async () => {
            if (isFetching) return;
            isFetching = true;

            try {
                const response = await fetch('http://localhost:5000/api/videos');
                const data = await response.json();

                // Store video URLs in videoData
                data.videos.forEach((videoFileName) => {
                    const videoUrl = `http://localhost:5000/uploads/${videoFileName}`;
                    videoData.push(videoUrl);
                });

                loadVideos(); // Load the first batch
            } catch (error) {
                console.error('Error fetching videos:', error);
            } finally {
                isFetching = false;
            }
        };

        // Function to render videos on the UI
        const createVideoElement = (videoUrl) => {
            const videoElement = document.createElement('video');
            videoElement.setAttribute('controls', true);
            videoElement.setAttribute('src', videoUrl);
            videoContainer.appendChild(videoElement);
        };

        // Function to load and display the videos
        const loadVideos = () => {
            if (videoIndex < videoData.length) {
                const videoUrl = videoData[videoIndex];
                createVideoElement(videoUrl);
                videoIndex++;
            }
        };

        // Function to handle scroll event for infinite scrolling
        const handleScroll = () => {
            if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 200) {
                // If the user is near the bottom, load more videos
                loadVideos();
                if (videoIndex === videoData.length) {
                    // If all videos are loaded, fetch new videos
                    fetchVideos();
                }
            }
        };

        // Fetch initial batch of videos
        fetchVideos();

        // Attach scroll event listener
        window.addEventListener('scroll', handleScroll);

        // Handle file selection
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file && file.type === 'video/mp4') {
                uploadStatus.textContent = 'Uploading...';
                const formData = new FormData();
                formData.append('video', file);

                try {
                    const response = await fetch('http://localhost:5000/api/upload', {
                        method: 'POST',
                        body: formData,
                    });

                    const data = await response.json();
                    if (data.message) {
                        uploadStatus.textContent = 'Video uploaded successfully!';
                        fetchVideos(); // Fetch new videos to render after upload
                    }
                } catch (error) {
                    uploadStatus.textContent = 'Error uploading video.';
                    console.error('Error uploading video:', error);
                }
            } else {
                uploadStatus.textContent = 'Please upload only .mp4 files.';
            }
        });

        // Trigger file input click on button click
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });
    </script>
</body>
</html>
