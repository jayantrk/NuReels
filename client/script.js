let currentVideoElement = null;
let videoData = [];
let preloadedVideos = [];
let videoIndex = 0;
let isFetching = false;
let lastScrollTime = 0;
const SCROLL_DELAY = 500;
const videoContainer = document.getElementById('video-container');
const uploadBtn = document.getElementById('upload-btn');
const uploadFormContainer = document.getElementById('upload-form-container');
const uploadForm = document.getElementById('upload-form');
const videoFileInput = document.getElementById('video-file');
const uploadStatus = document.getElementById('upload-status');
const closeBtn = document.getElementById('close-btn');

const fetchVideos = async () => {
    if (isFetching) return;
    isFetching = true;

    try {
        console.log('Fetching videos...');
        const response = await fetch('http://localhost:5000/api/videos');
        const data = await response.json();
        // console.log('Fetched videos:', data);

        if (data.videos?.length) {
            data.videos.forEach((video) => {
                const videoFileName = video.filename;
                const videoUrl = `http://localhost:5000/uploads/${encodeURIComponent(videoFileName)}`;
                if (!videoData.some(url => url === videoUrl)) {
                    // CHANGE TO GET TEAM NAME AND DESCRIPTION WHEN READY
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

const createVideoElement = (videoUrl, team='Team R&D', description='test') => {
    if (currentVideoElement) {
        currentVideoElement.removeEventListener('ended', handleVideoEnd);
        currentVideoElement.removeEventListener('click', handleVideoClick);
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
    currentVideoElement.controls = false;
    currentVideoElement.playsInline = true;
    currentVideoElement.currentTime = 0;
    currentVideoElement.autoplay = true;
    currentVideoElement.muted = true;

    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'video-wrapper';
    videoWrapper.appendChild(currentVideoElement);

    const descriptionOverlay = document.createElement('div');
    descriptionOverlay.className = 'description-overlay';
    descriptionOverlay.textContent = description;
    const teamOverlay = document.createElement('div');
    teamOverlay.className = 'team-overlay';
    teamOverlay.textContent = team;

    videoWrapper.appendChild(descriptionOverlay);
    videoWrapper.appendChild(teamOverlay);
    videoContainer.appendChild(videoWrapper);

    currentVideoElement.addEventListener('click', handleVideoClick);
    currentVideoElement.addEventListener('ended', handleVideoEnd);
    currentVideoElement.play().catch(error => {
        console.log('Autoplay blocked, consider user interaction');
    });
};

const handleVideoClick = () => {
    if (currentVideoElement.paused) {
        currentVideoElement.play();
    } else {
        currentVideoElement.pause();
    }
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
        videoIndex = 0;
        loadVideo();

        // Option 2: Stop playback
        // console.log('All videos played');

        // Option 3: Fetch more videos
        // fetchVideos().then(loadVideo);
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

// Function to show/hide the upload form
uploadBtn.addEventListener('click', () => {
    uploadFormContainer.style.display = 'block';  // Show form
});

// Close the form when the close button (x) is clicked
closeBtn.addEventListener('click', () => {
    uploadFormContainer.style.display = 'none';  // Hide form
});

// Handle form submission
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();  // Prevent the default form submission if any

    const teamName = document.getElementById('team-name').value;
    const description = document.getElementById('description').value;
    const videoFile = videoFileInput.files[0];

    if (!videoFile) {
        showUploadMessage('Please select a video file to upload.', true);
        return;
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/quicktime'];
    const maxSizeMB = 50;
    if (!allowedTypes.includes(videoFile.type)) {
        showUploadMessage('Only MP4 and MOV files are allowed!', true);
        return;
    }
    if (videoFile.size > maxSizeMB * 1024 * 1024) {
        showUploadMessage('File size exceeds 50MB limit!', true);
        return;
    }

    showUploadMessage('Uploading...', false);

    const formData = new FormData();
    formData.append('teamName', teamName);
    formData.append('description', description);
    formData.append('video', videoFile);

    try {
        const response = await fetch('http://localhost:5000/api/upload', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();
        if (data.videoUrl) {
            showUploadMessage('Video uploaded successfully!');
            fetchVideos(); // Fetch new videos to render after upload
            uploadForm.reset();  // Reset the form
            uploadFormContainer.style.display = 'none';  // Hide form after successful submission
        } else if (data.error) {
            showUploadMessage(data.error, true);
        }
    } catch (error) {
        showUploadMessage('Upload failed!', true);
        console.error('Error uploading video:', error);
    }
});

function showUploadMessage(message, isError = false) {
    uploadStatus.textContent = message;
    console.log("HIIIIII")
    // uploadStatus.style.color = isError ? '#ff4444' : '#4CAF50';
    // uploadStatus.style.opacity = '1';

    setTimeout(() => {
        uploadStatus.style.opacity = '0';
        setTimeout(() => {
            uploadStatus.textContent = '';
        }, 2500);

    }, 2000); // Show message for 1s before fading
}
