const os = require('os');
const serverInfo = {
  hostname: os.hostname(),
  podName: process.env.POD_NAME || 'unknown',
  nodeName: process.env.NODE_NAME || 'unknown'
};

// Add this after the health route
app.get('/server-info', (req, res) => {
  res.json(serverInfo);
});

// Insert this line before app.listen
app.use((req, res, next) => {
  res.setHeader('X-Served-By', serverInfo.podName);
  next();
});