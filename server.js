const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const app = express();

const ALLOWED_EXTENSIONS = new Set(['.mp4', '.mov']);
const VIDEO_METADATA_FILE = 'video_metadata.json';

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueId = uuidv4();
    cb(null, `${uniqueId}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true); // Accept file
  } else {
    cb(null, false); //Reject file
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 200000000 } // 200MB file size limit
});
const cors = require('cors');

app.use(cors({
  origin: '*', // Allow all origins (for development only)
}));
// Serve static files from the 'uploads' folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Helper function to load video metadata
const loadVideoMetadata = () => {
  if (!fs.existsSync(VIDEO_METADATA_FILE)) {
    return [];
  }
  const data = fs.readFileSync(VIDEO_METADATA_FILE);
  return JSON.parse(data);
};

// Helper function to save the video metadata
const saveVideoMetadata = (metadata) => {
  fs.writeFileSync(VIDEO_METADATA_FILE, JSON.stringify(metadata, null, 2));
};

// Route to fetch video file names and information.
app.get('/api/videos', (req, res) => {
  console.log("Fetching video files");
  const videoFolderPath = path.join(__dirname, 'uploads');
  fs.readdir(videoFolderPath, (err, files) => {
      if (err) {
          return res.status(500).json({ error: 'Unable to read video files' });
      }

      // Filter to only get video files (e.g., .mp4, .mov)
      const videoFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ALLOWED_EXTENSIONS.has(ext);
      });

      const metadata = loadVideoMetadata();
      // Randomly shuffle the files and return the first 5
      const shuffledVideos = videoFiles.sort(() => 0.5 - Math.random()).slice(0, 5);
      const videos = [];
      shuffledVideos.forEach(file => {
        const videoData = metadata.find(item => item.filename === file); // Find matching metadata
        videos.push({
          filename: file,
          url: `/uploads/${encodeURIComponent(file)}`,
          teamName: videoData ? videoData.teamName : "Unknown Team",
          description: videoData ? videoData.description : "No description available"
        });
      });

      if (videos.length === 0) {
        return res.status(404).json({ message: 'No videos found' });
      }

      res.status(200).json({ videos });

  });
});
// Endpoint to upload video
app.post('/api/upload', (req, res) => {
  upload.single('video')(req, res, (err) => {
    const { teamName, description } = req.body;
    if (err) {
      console.log("Error uploading video", err);
      // Handle Multer errors
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({
        error: `Invalid file type. Allowed types: ${[...ALLOWED_EXTENSIONS].join(', ')}`
      });
    }

    console.log("Video uploaded successfully");
    console.log("Team Name:", teamName);
    console.log("Description:", description);
    const videoUrl = `/uploads/${req.file.filename}`;
    // Load existing metadata
    const videos = loadVideoMetadata();

    // Append new video data
    const newVideo = {
      filename: req.file.filename,
      url: videoUrl,
      teamName: teamName || 'Unknown Team',
      description: description || 'No description provided'
    };

    videos.push(newVideo);
    saveVideoMetadata(videos);
    res.status(200).json({ videoUrl });
  });
});

app.get('/api/hello', (req, res) => {
  // Send a simple "Hello World" response
  res.send('Hello World');
});

app.use(express.static('client')); // Serve files from 'public' directory

app.listen(5000, () => {
  console.log('Server is running on http://localhost:5000');
});


