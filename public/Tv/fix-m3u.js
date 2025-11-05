const fs = require('fs');

const inputFile = process.argv[2] || 'playlist.m3u';
const outputFile = process.argv[3] || 'playlist.json';

let raw = fs.readFileSync(inputFile, 'utf8');

// Ensure every #EXTINF is on a new line for correct parsing
raw = raw.replace(/#EXTINF/g, '\n#EXTINF').replace(/\n+/g, '\n').trim();
const lines = raw.split('\n').filter(l => l.trim().length);

const result = [];
for (let i = 0; i < lines.length; i++) {
  if (!lines[i].startsWith("#EXTINF")) continue;
  const info = lines[i];

  // Get markdown [text](url) or plain URL from next line
  let url = "";
  let linkMatch = info.match(/\[[^\]]+\]\((https?:\/\/[^\)]+)\)/);
  if (linkMatch) {
    url = linkMatch[1];
  } else if (lines[i + 1] && lines[i + 1].match(/^https?:\/\//)) {
    url = lines[i + 1].trim();
  } else {
    url = ""; // fallback if not found
  }

  // Metadata
  let tvg_id = info.match(/tvg-id="([^"]*)"/);
  let tvg_name = info.match(/tvg-name="([^"]*)"/);
  let tvg_logo = info.match(/tvg-logo="([^"]*)"/);
  let group_title = info.match(/group-title="([^"]*)"/);

  let nameMatch = info.match(/,(.*?)\[|,(.*)/); // match name before [ or at end
  let channel_name = "";
  if (nameMatch) {
    channel_name = nameMatch[1] ? nameMatch[1].trim() : nameMatch[2] ? nameMatch[2].trim() : "";
  }

  result.push({
    tvg_id: tvg_id ? tvg_id[1] : "",
    tvg_name: tvg_name ? tvg_name[1] : "",
    tvg_logo: tvg_logo ? tvg_logo[1] : "",
    group_title: group_title ? group_title[1] : "",
    channel_name,
    url
  });
}

// Write as pretty JSON
fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), 'utf8');
console.log(`Converted m3u to JSON: ${outputFile}`);
