module.exports = {
  apps : [{
    name: "snapify-api",
    script: "./server/index.js",
    // Use the .env file in the root directory
    env_file: ".env",
    // Environment variables that persist
    env: {
      NODE_ENV: "production",
    },
    // Restart if memory usage exceeds 500MB (prevents leaks crashing server)
    max_memory_restart: "500M",
    // Delay between restarts if it crashes loop
    min_uptime: "5s",
    max_restarts: 10,
    // Logs
    error_file: "./logs/err.log",
    out_file: "./logs/out.log",
    time: true
  }]
}
