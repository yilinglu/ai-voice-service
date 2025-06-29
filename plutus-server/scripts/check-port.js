// Usage: Set the PORT environment variable to configure the port. Defaults to 3000 if not set.
const net = require('net');
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

console.log(`Checking if port ${port} is available...`);

const server = net.createServer();
server.once('error', function(err) {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n\n❌ ERROR: Port ${port} is already in use. Aborting startup.\n`);
    process.exit(1);
  } else {
    console.error(`\n\n❌ ERROR: Could not bind to port ${port}:`, err, '\n');
    process.exit(1);
  }
});
server.once('listening', function() {
  server.close();
  process.exit(0);
});
server.listen(port); 