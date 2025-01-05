const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files statically

// MongoDB Connection
// MongoDB Connection

mongoose.connect('mongodb://localhost:27017/omerdb', {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB connected successfully to omerdb'))
    .catch((error) => console.error('Error connecting to MongoDB:', error));


// Schemas and Models
const playerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    points: { type: Number, required: true, default: 0 },
});

const imageSchema = new mongoose.Schema({
    username: { type: String, required: true },
    filePath: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
});

const Player = mongoose.model('Player', playerSchema);
const Image = mongoose.model('Image', imageSchema);

// Multer Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
        cb(null, uniqueSuffix);
    },
});
const upload = multer({ storage });

// Username Validation
const isValidUsername = (username) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).+$/.test(username);

// Routes

// Upload Image
app.post('/upload', upload.single('image'), async (req, res) => {
    const { name } = req.body;

    if (!isValidUsername(name)) {
        return res.status(400).json({
            error: 'Invalid username. Must contain at least one lowercase, one uppercase, and one special character.',
        });
    }

    try {
        const newImage = new Image({
            username: name,
            filePath: req.file.path,
        });
        await newImage.save();

        res.status(201).json({
            message: 'Image uploaded successfully',
            filePath: req.file.path,
        });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

// Fetch Leaderboard
app.get('/leaderboard', async (req, res) => {
    try {
        const players = await Player.find().sort({ points: -1 });
        res.json(players);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Update/Add Leaderboard Entry
app.post('/leaderboard', async (req, res) => {
    const { name, points } = req.body;

    try {
        const player = await Player.findOneAndUpdate(
            { name },
            { $inc: { points } },
            { new: true, upsert: true }
        );
        res.json(player);
    } catch (error) {
        console.error('Error updating leaderboard:', error);
        res.status(500).json({ error: 'Failed to update leaderboard' });
    }
});

// Fetch Uploaded Images
app.get('/images', async (req, res) => {
    try {
        const images = await Image.find().sort({ uploadedAt: -1 });
        res.json(images);
    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).json({ error: 'Failed to fetch images' });
    }
});

// Start the Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
