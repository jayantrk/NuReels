let currentVideoElement = null;
let videoData = [];
let preloadedVideos = [];
let videoIndex = 0;
let isFetching = false;
let lastScrollTime = 0;
const SCROLL_DELAY = 500;
const videoContainer = document.getElementById('video-container');
const uploadBtn = document.getElementById('upload-btn');
const fileInput = document.getElementById('file-input');
const uploadStatus = document.getElementById('upload-status');

const fetchVideos = async () => {
    if (isFetching) return;
    isFetching = true;

    try {
        // console.log('Fetching videos...');
        const response = await fetch('http://localhost:5000/api/videos');
        const data = await response.json();

        if (data.videos?.length) {
            data.videos.forEach((videoFileName) => {
                const videoUrl = `http://localhost:5000/uploads/${encodeURIComponent(videoFileName)}`;
                if (!videoData.some(url => url === videoUrl)) {
                    videoData.push(videoUrl);
                }
            });
        }

    } catch (error) {
        console.error('Error fetching videos:', error);
    } finally {
        isFetching = false;
        if (videoIndex >= videoData.length - 1) {
            preloadNextVideos();
        }
    }
};

const createVideoElement = (videoUrl) => {
    if (currentVideoElement) {
        currentVideoElement.removeEventListener('ended', handleVideoEnd);
        currentVideoElement.remove();
    }
    const existingPreload = preloadedVideos.find(v => v.src === videoUrl);
    if (existingPreload) {
        currentVideoElement = existingPreload;
        currentVideoElement.style.display = 'block';
        // Remove from preload list
        preloadedVideos = preloadedVideos.filter(v => v !== existingPreload);
    } else {
        currentVideoElement = document.createElement('video');
        currentVideoElement.src = videoUrl;
    }
    currentVideoElement.controls = true;
    currentVideoElement.playsInline = true;
    currentVideoElement.currentTime = 0;
    currentVideoElement.autoplay = true;
    currentVideoElement.muted = true;

    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'video-wrapper';
    videoWrapper.appendChild(currentVideoElement);
    videoContainer.appendChild(videoWrapper);

    currentVideoElement.addEventListener('ended', handleVideoEnd);
    currentVideoElement.play().catch(error => {
        console.log('Autoplay blocked, consider user interaction');
    });
};

const preloadNextVideos = () => {
    // Define preload window (current index +- 2)
    const preloadWindow = [-2, -1, 1, 2];
    const targetIndices = preloadWindow.map(offset => videoIndex + offset);
    const targetUrls = new Set(
        targetIndices
            .filter(idx => idx >= 0 && idx < videoData.length)
            .map(idx => videoData[idx])
    );

    // Cleanup: Remove videos outside the preload window
    preloadedVideos.forEach((video, index) => {
        if (!targetUrls.has(video.src)) {
            console.log('Removing video:', video.src);
            video.src = "";
            video.remove();
            preloadedVideos[index] = null;
        }
    });
    // Remove null entries from array
    preloadedVideos = preloadedVideos.filter(Boolean);

    // Preload new videos in the window
    targetIndices.forEach((targetIndex) => {
        if (targetIndex < 0 || targetIndex >= videoData.length) return;

        const videoUrl = videoData[targetIndex];
        const isAlreadyPreloaded = preloadedVideos.some(v => v.src === videoUrl);
        if (!isAlreadyPreloaded) {
            const preloadVideo = document.createElement("video");
            preloadVideo.preload = "auto";
            preloadVideo.muted = true;
            preloadVideo.src = videoUrl;
            preloadVideo.style.display = "none";
            document.body.appendChild(preloadVideo);
            preloadedVideos.push(preloadVideo);
        }
    });

    console.log('Preloaded videos:', preloadedVideos.map(v => v.src));
};

const loadVideo = () => {
    videoContainer.innerHTML = '';
    if (videoData.length > videoIndex) {
        console.log(videoIndex, videoData.length - 1);
        createVideoElement(videoData[videoIndex]);
        preloadNextVideos();
    } else {
        console.log('No videos found');
        videoContainer.innerHTML = '<p>Server unable to load videos</p>';
    }
};

const handleVideoEnd = () => {
    console.log('videoIndex:', videoIndex);
    videoIndex++;

    // Fetch more videos
    if (videoIndex >= videoData.length - 3) {
        fetchVideos();
      }

    if (videoIndex < videoData.length) {
        loadVideo();
    } else {
        // Option 1: Loop playback
        // videoIndex = 0;
        // loadVideo();

        // Option 2: Stop playback
        // console.log('All videos played');

        // Option 3: Fetch more videos
        fetchVideos().then(loadVideo);
    }
};


const handleScroll = (e) => {
    // Ignore horizontal scroll
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();

    // Throttle scroll events
    const now = Date.now();
    if (now - lastScrollTime < SCROLL_DELAY) return;
    lastScrollTime = now;

    // Determine scroll direction
    const isScrollDown = e.deltaY > 0;

    let newIndex = videoIndex;

    if (isScrollDown) {
        newIndex = Math.min(videoIndex + 1, videoData.length - 1);
    } else {
        newIndex = Math.max(videoIndex - 1, 0);
    }

    // Only update if index changed
    if (newIndex !== videoIndex) {
        videoIndex = newIndex;
        loadVideo();
    }

    // Fetch more videos when approaching end
    if (videoIndex >= videoData.length - 3) {
        fetchVideos();
    }
};

const handleKeyDown = (e) => {
    // Ignore if it's not an arrow key
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();

    // Throttle key events
    const now = Date.now();
    if (now - lastScrollTime < SCROLL_DELAY) return;
    lastScrollTime = now;

    let newIndex = videoIndex;

    if (e.key === 'ArrowDown') {
        newIndex = Math.min(videoIndex + 1, videoData.length - 1);
    } else if (e.key === 'ArrowUp') {
        newIndex = Math.max(videoIndex - 1, 0);
    }

    if (newIndex !== videoIndex) {
        videoIndex = newIndex;
        loadVideo();
    }

    if (videoIndex >= videoData.length - 3) {
        fetchVideos();
    }
};

// Fetch initial batch of videos
fetchVideos().then(loadVideo);

// Attach scroll/arrow event listener
videoContainer.addEventListener('wheel', handleScroll, { passive: false });
document.addEventListener('keydown', handleKeyDown);

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

    }, 2000); // Show message for 2s before fading
}

// Trigger file input click on button click
uploadBtn.addEventListener('click', () => {
    fileInput.click();
});