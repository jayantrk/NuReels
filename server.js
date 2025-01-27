// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// const app = express();
// const PORT = 3000;

// // Set up multer storage
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const uploadPath = path.join(__dirname, 'uploads');
//     if (!fs.existsSync(uploadPath)) {
//       fs.mkdirSync(uploadPath);
//     }
//     cb(null, uploadPath);
//   },
//   filename: (req, file, cb) => {
//     const fileName = `${Date.now()}-${file.originalname}`;
//     cb(null, fileName);
//   }
// });

// // Initialize multer
// const upload = multer({ storage });

// const cors = require('cors');
// app.use(cors({
//   origin: '*', // Allow all origins (for development only)
// }));

// // Serve static video files
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// // Upload endpoint to handle video uploads
// app.post('/upload', upload.single('video'), (req, res) => {
//   if (!req.file) {
//     return res.status(400).send('No file uploaded');
//   }

//   const videoMetadata = {
//     filename: req.file.originalname,
//     videoUrl: `/uploads/${req.file.filename}`,
//   };

//   res.status(200).json(videoMetadata); // Send back the URL of the uploaded video
// });

// // Serve the frontend HTML (if needed)
// app.use(express.static(path.join(__dirname, 'public')));

// // Start server
// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

// Setup multer for file uploads
const upload = multer({ dest: 'uploads/' });
const cors = require('cors');

app.use(cors({
  origin: '*', // Allow all origins (for development only)
}));
// Serve static files from the 'uploads' folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Route to fetch video file names
app.get('/api/videos', (req, res) => {
  const videoFolderPath = path.join(__dirname, 'uploads');
  fs.readdir(videoFolderPath, (err, files) => {
      if (err) {
          return res.status(500).json({ error: 'Unable to read video files' });
      }

      // Filter to only get video files (e.g., .mp4, .mov)
      const videoFiles = files.filter(file => {
          return file.endsWith('.mp4') || file.endsWith('.mov'); // Adjust according to your file types
      });

      // Randomly shuffle the files and return the first 10
      const shuffledVideos = videoFiles.sort(() => 0.5 - Math.random()).slice(0, 10);

      res.json({ videos: shuffledVideos });
  });
});
// Endpoint to upload video
app.post('/api/upload', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  console.log("Video uploaded successfully");
  const videoUrl = `/uploads/${req.file.filename}`;
  res.status(200).json({ videoUrl });
});

app.get('/api/hello', (req, res) => {
  // Send a simple "Hello World" response
  res.send('Hello World');
});

app.listen(5000, () => {
  console.log('Server is running on http://localhost:5000');
});


