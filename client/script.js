let currentVideoElement = null;
let videoData = [];
let videoIndex = 0;
let isFetching = false;
const videoContainer = document.getElementById('video-container');
const uploadBtn = document.getElementById('upload-btn');
const fileInput = document.getElementById('file-input');
const uploadStatus = document.getElementById('upload-status');

const fetchVideos = async () => {
    if (isFetching) return;
    isFetching = true;

    try {
        console.log('Fetching videos...');
        const response = await fetch('http://localhost:5000/api/videos');
        const data = await response.json();

        if (data.videos && Array.isArray(data.videos)) {
            data.videos.forEach((videoFileName) => {
                const videoUrl = `http://localhost:5000/uploads/${encodeURIComponent(videoFileName)}`;
                if (!videoData.includes(videoUrl)) {
                    videoData.push(videoUrl);
                }
            });
        }

    } catch (error) {
        console.error('Error fetching videos:', error);
    } finally {
        console.log('Videos fetched:', videoData);
        isFetching = false;
    }
};

// Function to render videos on the UI
const createVideoElement = (videoUrl) => {
    if (currentVideoElement) {
        currentVideoElement.removeEventListener('ended', handleVideoEnd);
        currentVideoElement.remove();
    }
    currentVideoElement = document.createElement('video');
    currentVideoElement.controls = true;
    currentVideoElement.autoplay = true;
    currentVideoElement.muted = true;
    currentVideoElement.playsInline = true;
    currentVideoElement.src = videoUrl;

    currentVideoElement.addEventListener('ended', handleVideoEnd);
    videoContainer.appendChild(currentVideoElement);
};

const loadVideo = () => {
    // Clear previous content
    videoContainer.innerHTML = '';

    if (videoData.length > videoIndex) {
        createVideoElement(videoData[videoIndex]);
    } else {
        console.log('No videos found');
        videoContainer.innerHTML = '<p>Server unable to load videos</p>';
    }
};

const handleVideoEnd = () => {
    console.log('videoIndex:', videoIndex);
    console.log('Video ended');
    videoIndex++;

    // Fetch more videos if the last video is being played
    if (videoIndex === videoData.length - 1) {
        fetchVideos();
    }

    if (videoIndex < videoData.length) {
        createVideoElement(videoData[videoIndex]);

    } else {
        // Option 1: Loop playback
        // videoIndex = 0;
        // createVideoElement(videoData[videoIndex]);

        // Option 2: Stop playback
        // console.log('All videos played');

        // Option 3: Fetch more videos
        fetchVideos().then(loadVideo);
    }
};


// TODO: THIS ISN'T CURRENTLY WORKING //
// Function to handle scroll event for infinite scrolling
const handleScroll = () => {
    console.log('Scrolling...');
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 200) {
        // If the user is near the bottom, load more videos
        if (videoIndex === videoData.length) {
            // If all videos are loaded, fetch new videos
            fetchVideos();
        }
    }
};

// Fetch initial batch of videos
fetchVideos().then(loadVideo);

// Attach scroll event listener
videoContainer.addEventListener('scroll', handleScroll);

// Handle file selection
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const allowedTypes = ['video/mp4', 'video/quicktime'];
    const maxSizeMB = 50;
    if (!allowedTypes.includes(file.type)) {
        uploadStatus.textContent = 'Only MP4 and MOV files are allowed!';
        e.target.value = '';
        return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
        uploadStatus.textContent = 'File size exceeds 100MB limit!';
        e.target.value = '';
        return;
    }

    if (file) {
        showUploadMessage('Uploading...');
        const formData = new FormData();
        formData.append('video', file);

        try {
            const response = await fetch('http://localhost:5000/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (data.videoUrl) {
                showUploadMessage('Video uploaded successfully!');
                fetchVideos(); // Fetch new videos to render after upload
            } else if (data.error) {
                showUploadMessage(data.error, true);
            }

        } catch (error) {
            showUploadMessage('Upload failed!', true);
            console.error('Error uploading video:', error);
        }
    } else {
        uploadStatus.textContent = 'Please upload only .mp4 or .mov files.';
    }
});

function showUploadMessage(message, isError = false) {
    uploadStatus.textContent = message;
    uploadStatus.style.color = isError ? 'red' : 'green';
    uploadStatus.style.opacity = '1';

    setTimeout(() => {
        uploadStatus.style.opacity = '0';
        setTimeout(() => {
            uploadStatus.textContent = '';
        }, 2500);

    }, 2000); // Show message for 1s before fading
}

// Trigger file input click on button click
uploadBtn.addEventListener('click', () => {
    fileInput.click();
});