const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable gzip compression for faster delivery
app.use(compression());

// Serve static files from /public — NO cache so changes are always fresh
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: 0,
  etag: false
}));

// Serve data files from /data — NO cache
app.use('/data', express.static(path.join(__dirname, 'data'), {
  maxAge: 0,
  etag: false
}));

// Health check endpoint (for Render)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'EstudiA', version: '1.0.0' });
});

// Fallback SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ EstudiA server running on port ${PORT}`);
});
