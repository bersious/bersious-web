const fs = require('fs');

let p2 = fs.readFileSync('C:/Users/nguye/bersious-web/rmit/2/index.html', 'utf8');

// Hiển thị coverArt trên album-art nếu có
const oldArt = `const artBg = artGradient(t.artSeed||0);
    const artIcon = isVideo ? '' : '';

    card.innerHTML = \`
      <div class="card-top">
        <div class="album-art" style="background:\${artBg}">\${artIcon}</div>`;

const newArt = `const artBg = artGradient(t.artSeed||0);
    const hasCover = t.coverArt && t.coverArt.startsWith('http');
    const artCoverStyle = hasCover 
      ? \`background-image: url('\${t.coverArt}'); background-size: cover; background-position: center;\`
      : \`background: \${artBg};\`;
    const artIcon = hasCover ? '' : (isVideo ? '🎬' : '🎵');

    card.innerHTML = \`
      <div class="card-top">
        <div class="album-art" style="\${artCoverStyle}">\${artIcon}</div>`;

p2 = p2.replace(oldArt, newArt);

fs.writeFileSync('C:/Users/nguye/bersious-web/rmit/2/index.html', p2, 'utf8');
console.log('Cover Art rendering updated in rmit/2/index.html!');
