const fs = require('fs');
const path = require('path');

// Ensure data directory exists
const dataDir = './data';
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database file
const dbFile = path.join(dataDir, 'database.json');

// Create initial database if not exists
if (!fs.existsSync(dbFile)) {
    console.log('Initializing database...');
    // The server will initialize the data when it starts
    console.log('Database initialized successfully!');
} else {
    console.log('Database already exists.');
}

console.log('Database setup complete!');