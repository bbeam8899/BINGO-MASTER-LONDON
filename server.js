const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Import our Netlify API handler
const { handler } = require('./netlify/functions/api.js');

const PORT = 8888;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // ===================================================
  // 1. ROUTE API REQUESTS TO NETLIFY FUNCTION MOCK
  // ===================================================
  if (pathname.startsWith('/api/') || pathname.startsWith('/.netlify/functions/api/')) {
    try {
      // Mock event and context objects for Netlify handler
      const event = {
        path: pathname,
        httpMethod: req.method,
        headers: req.headers,
        queryStringParameters: parsedUrl.query,
        body: ""
      };

      // If it's a request with a body (POST/PUT), read it (optional, our APIs are GET-based)
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        const buffers = [];
        for await (const chunk of req) {
          buffers.push(chunk);
        }
        event.body = Buffer.concat(buffers).toString();
      }

      // Execute Netlify function handler
      const response = await handler(event, {});

      // Send response
      res.writeHead(response.statusCode || 200, response.headers || {});
      res.end(response.body || "");
      return;
    } catch (err) {
      console.error("Local Server API Error: ", err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: "Internal Server Error", message: err.message }));
      return;
    }
  }

  // ===================================================
  // 2. ROUTE STATIC FILE REQUESTS
  // ===================================================
  // Normalize directories
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  } else if (pathname === '/admin' || pathname === '/admin/') {
    pathname = '/admin/index.html';
  }

  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(__dirname, 'public', safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // File not found or is a directory
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 Not Found</h1><p>ขออภัย ไม่พบไฟล์ที่คุณต้องการเรียกใช้งานในระบบบิงโก</p>');
      return;
    }

    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Serve static file
    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🎯 BINGO JJAZ x VCT MASTER LONDON 2026 - LOCAL RUNNER`);
  console.log(`======================================================`);
  console.log(`🚀 Server is running at: http://localhost:${PORT}`);
  console.log(`🔒 Admin panel is at   : http://localhost:${PORT}/admin`);
  console.log(`🎮 Spectator page is at : http://localhost:${PORT}`);
  console.log(`\n(ไม่ต้องลง netlify-cli, รันด้วย Node.js ตรงๆ ได้ทันที!)\n`);
});
