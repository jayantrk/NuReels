let currentVideoElement = null;
let currentVideoWrapper = null;
let globalMuteState = true;
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
const progressBar = document.getElementById("upload-progress");
const SERVER = "http://10.111.59.235:5000"

const fetchVideos = async () => {
    if (isFetching) return;
    isFetching = true;

    try {
        const response = await fetch(`${SERVER}/api/videos`);
        const data = await response.json();

        if (data.videos?.length) {
            data.videos.forEach((video) => {
                const url = video.url;
                const videoTeamName = video.teamName;
                const videoDescription = video.description;
                const videoUrl = `${SERVER}${url}`;
                if (!videoData.some(url => url === videoUrl)) {
                    videoData.push({
                        url: videoUrl,
                        teamName: videoTeamName,
                        description: videoDescription
                    });
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

const createVideoElement = (videoObject) => {
    videoUrl = videoObject.url;
    team = videoObject.teamName;
    description = videoObject.description;
    if (currentVideoWrapper) {
        const prevVideo = currentVideoWrapper.querySelector('video');
        prevVideo.removeEventListener('ended', handleVideoEnd);
        prevVideo.removeEventListener('click', handleVideoClick);

        currentVideoWrapper.remove();
        currentVideoWrapper = null;
    }

    const template = document.getElementById('video-template');
    const videoWrapper = template.content.cloneNode(true).children[0];
    let currentVideoElement = videoWrapper.querySelector('video');
    const statusElement = videoWrapper.querySelector('.upload-status');
    const descriptionOverlay = videoWrapper.querySelector('.description-overlay');
    const teamOverlay = videoWrapper.querySelector('.team-overlay');
    const muteButton = videoWrapper.querySelector('.mute-button');
    const existingPreload = preloadedVideos.find(v => v.src === videoUrl);

    if (existingPreload) {
        currentVideoElement.replaceWith(existingPreload);
        currentVideoElement = existingPreload;
        currentVideoElement.style.display = 'block';
        // Remove from preload list
        preloadedVideos = preloadedVideos.filter(v => v !== existingPreload);
    } else {
        currentVideoElement.src = videoUrl;
    }
    currentVideoElement.controls = false;
    currentVideoElement.playsInline = true;
    currentVideoElement.currentTime = 0;
    currentVideoElement.autoplay = true;
    currentVideoElement.muted = globalMuteState;

    descriptionOverlay.textContent = description;
    teamOverlay.textContent = team;
    updateMuteIcon(currentVideoElement, muteButton);

    videoContainer.appendChild(videoWrapper);
    videoWrapper.uploadStatus = statusElement;
    currentVideoWrapper = videoWrapper

    currentVideoElement.addEventListener('click', handleVideoClick);
    currentVideoElement.addEventListener('ended', handleVideoEnd);

    currentVideoElement.play().catch(error => {
        console.log('Autoplay blocked:', error);
        handleVideoEnd();
    });
};

const handleVideoClick = (event) => {
    const video = event.currentTarget;
    // Only handle play/pause if click wasn't on mute button
    if (!event.target.classList.contains('mute-button')) {
        video[video.paused ? 'play' : 'pause']();
    }
};

const toggleMute = (videoElement, muteButton) => {
    videoElement.muted = !videoElement.muted;
    globalMuteState = videoElement.muted;
    updateMuteIcon(videoElement, muteButton);
};

const updateMuteIcon = (videoElement, muteButton) => {
    muteButton.textContent = videoElement.muted ? '🔇' : '🔊';
};

document.addEventListener('click', (e) => {
    if (e.target.closest('.mute-button')) {
        const wrapper = e.target.closest('.video-wrapper');
        const video = wrapper?.querySelector('video');
        const muteButton = wrapper?.querySelector('.mute-button');

        if (video && muteButton) {
            e.stopPropagation();
            toggleMute(video, muteButton);
        }
    }
});

const preloadNextVideos = () => {
    // Define preload window (current index +- 2)
    const preloadWindow = [-2, -1, 1, 2];
    const targetIndices = preloadWindow.map(offset => videoIndex + offset);
    const targetUrls = new Set(
        targetIndices
            .filter(idx => idx >= 0 && idx < videoData.length)
            .map(idx => videoData[idx].url)
    );

    // Cleanup: Remove videos outside the preload window
    preloadedVideos.forEach((video, index) => {
        if (video && !targetUrls.has(video.src)) {
            // console.log('Removing video:', video.src);
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

        const videoUrl = videoData[targetIndex].url;
        const isAlreadyPreloaded = preloadedVideos.some(v => v.src === videoUrl);
        if (!isAlreadyPreloaded) {
            const preloadVideo = document.createElement('video');
            preloadVideo.src = videoUrl;
            preloadVideo.preload = "auto";
            preloadVideo.muted = true;
            preloadVideo.style.display = "none";

            const preloadContainer = document.getElementById('preload-container') ||
            preloadContainer.appendChild(preloadVideo);
            preloadedVideos.push(preloadVideo);
        }
    });

    // console.log('Preloaded videos:', preloadedVideos.map(v => v.src));
};

const loadVideo = () => {
    videoContainer.innerHTML = '';
    if (videoData.length > videoIndex) {
        createVideoElement(videoData[videoIndex]);
        preloadNextVideos();
    } else {
        console.log('No videos found');
        videoContainer.innerHTML = '<p>Server unable to load videos</p>';
    }
};

const handleVideoEnd = () => {
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
    const maxSizeMB = 100;
    if (!allowedTypes.includes(videoFile.type)) {
        showUploadMessage('Only MP4 and MOV files are allowed!', true);
        return;
    }
    if (videoFile.size > maxSizeMB * 1024 * 1024) {
        showUploadMessage('File size exceeds 100MB limit!', true);
        return;
    }

    // showUploadMessage('Uploading...', false);

    const formData = new FormData();
    formData.append('teamName', teamName);
    formData.append('description', description);
    formData.append('video', videoFile);

    // Show progress bar
    progressBar.style.display = 'block';
    progressBar.value = 0;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${SERVER}/api/upload`, true);


    xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
            const percent = (event.loaded / event.total) * 100;
            progressBar.value = percent;
        }
    };

    xhr.onload = async () => {
        progressBar.style.display = 'none'; 

        if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            if (data.videoUrl) {
                showUploadMessage('Video uploaded successfully!');
                fetchVideos();
                uploadForm.reset();
                uploadFormContainer.style.display = 'none';
            } else if (data.error) {
                showUploadMessage(data.error, true);
            }
        } else {
            showUploadMessage('Upload failed!', true);
        }
    };

    xhr.onerror = () => {
        showUploadMessage('Upload failed! Please try again.', true);
        progressBar.style.display = 'none';
    };

    xhr.send(formData);
});

function showUploadMessage(message, isError = false) {
    // Get the CURRENT video wrapper's status element
    const currentStatus = document.querySelector('.video-wrapper:last-child .upload-status');

    if (!currentStatus) {
        console.error('No video wrapper found for status message');
        return;
    }

    currentStatus.textContent = message;
    currentStatus.style.color = isError ? '#FF5252' : '#76FF03';
    currentStatus.style.opacity = '1';

    setTimeout(() => {
        currentStatus.style.opacity = '0';
        setTimeout(() => {
            currentStatus.textContent = '';
        }, 1000);
    }, 2000);
}