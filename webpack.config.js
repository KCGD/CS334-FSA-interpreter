const path = require('path');

module.exports = {
    target: 'node', // Important: This specifies the target environment
    mode: "production",
    entry: './src/.tsOut/main.js', // Replace with the path to your main file
    output: {
        path: path.resolve(__dirname, 'src/.tsOut'), // Output directory
        filename: 'bundle.js', // Output file
    },
    resolve: {
        extensions: ['.js'], // File extensions to handle
    },
};