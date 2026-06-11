const fs = require('fs');
const path = require('path');

const GAS_URL = 'https://script.google.com/macros/s/AKfycbyfCl7W4KrAVgY-PKxk8jgvHKECGd3q80l4G48sanWPwu7CXMhwl16qo9LVY1ZDWTSuoQ/exec';
const outputPath = 'C:\\Users\\obob\\.gemini\\antigravity-ide\\brain\\756a75be-99e1-4199-aa9c-0dd1a613d34a\\scratch\\central_report.json';

async function main() {
  try {
    console.log('Logging in...');
    const loginUrl = `${GAS_URL}?action=login&password=87654321`;
    const loginRes = await fetch(loginUrl).then(r => r.json());
    if (loginRes.error) {
      throw new Error(loginRes.error);
    }
    const token = loginRes.token;
    console.log('Logged in successfully.');

    console.log('Fetching Central Report...');
    const reportUrl = `${GAS_URL}?action=getCentralReport&token=${token}`;
    const reportRes = await fetch(reportUrl).then(r => r.json());
    
    fs.writeFileSync(outputPath, JSON.stringify(reportRes, null, 2), 'utf8');
    console.log('Saved central report to:', outputPath);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
