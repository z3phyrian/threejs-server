// Import required modules
const express = require('express');
const path = require('path');

// Create an Express app
const app = express();
const port = 3002;

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});