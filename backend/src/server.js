// ============================================================
// server.js — Local development server
// Used for local testing; Lambda uses handler.js instead
// Note: Default port is 5001 to avoid macOS AirPlay Receiver on 5000
// ============================================================
const app = require('./app');

const PORT = parseInt(process.env.PORT, 10) || 5001;

const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📄 Health Check: http://localhost:${PORT}/api/health`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        const altPort = PORT + 1;
        console.warn(`⚠️ Port ${PORT} is in use (often macOS AirPlay Receiver). Trying port ${altPort}...`);
        app.listen(altPort, () => {
            console.log(`🚀 Server started on fallback port http://localhost:${altPort}`);
        });
    } else {
        console.error('Server error:', err);
    }
});
