const fs = require('fs');
const lines = fs.readFileSync('agent.log', 'utf8').split('\n');
console.log('--- Last 50 lines of agent.log ---');
console.log(lines.slice(-50).join('\n'));
