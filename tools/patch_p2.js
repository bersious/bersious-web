const fs = require('fs');

// Đọc rmit/2/index.html
let p2 = fs.readFileSync('C:/Users/nguye/bersious-web/rmit/2/index.html', 'utf8');

// Code mới cho renderArtistChips
const startStr = 'function renderArtistChips(){';
const endStr = 'function switchArtist(artistName){';

const startIdx = p2.indexOf(startStr);
const endIdx = p2.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
  const newCode = `function renderArtistChips(){
  let artists = getStoredArtists();
  const tracks = getStoredTracks();
  const container = document.getElementById('artist-chips-container');
  const select = document.getElementById('quick-artist-select');
  if(!container) return;

  const logged = localStorage.getItem('tide_logged_reviewer') || '';
  const users = getStoredUsers();
  const me = users.find(u => u.username.toLowerCase() === logged.toLowerCase());
  const myBlocked = me && Array.isArray(me.blockedArtists) ? me.blockedArtists : [];

  // Tìm kiếm
  const kw = (document.getElementById('artist-search-input')?.value || '').trim().toLowerCase().replace(/^@/, '');
  if(kw){
    artists = artists.filter(a => (a.username||'').toLowerCase().includes(kw) || (a.name||'').toLowerCase().includes(kw));
  }

  // Sắp xếp
  const sortType = document.getElementById('artist-sort-select')?.value || 'tracks_desc';
  if(sortType === 'tracks_desc'){
    artists.sort((a,b) => {
      const ca = tracks.filter(t => (t.artistUsername||'').toLowerCase() === a.username.toLowerCase()).length;
      const cb = tracks.filter(t => (t.artistUsername||'').toLowerCase() === b.username.toLowerCase()).length;
      return cb - ca;
    });
  } else if(sortType === 'newest'){
    artists.sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0));
  } else if(sortType === 'name_asc'){
    artists.sort((a,b) => (a.name||'').localeCompare(b.name||''));
  }

  container.innerHTML = '';

  // Chip Tất cả
  const allChip = document.createElement('div');
  const isAll = selectedArtist === 'ALL';
  allChip.className = 'artist-chip ' + (isAll ? 'active' : '');
  allChip.onclick = () => switchArtist('ALL');
  allChip.innerHTML = '<div class="chip-avatar" style="background:var(--fg);color:#0a0b0e">✦</div>' +
    '<div class="chip-meta">' +
      '<div class="chip-name">Tất cả tác phẩm</div>' +
      '<div class="chip-genre mono">' + tracks.length + ' bài đã tải lên</div>' +
    '</div>';
  container.appendChild(allChip);

  artists.forEach(a => {
    const songCount = tracks.filter(t => (t.artistUsername||'').toLowerCase() === a.username.toLowerCase()).length;
    const isCur = a.username.toLowerCase() === selectedArtist.toLowerCase();
    const isBlocked = myBlocked.includes(a.username);

    const chip = document.createElement('div');
    chip.className = 'artist-chip ' + (isCur ? 'active' : '') + (isBlocked ? ' blocked' : '');
    chip.style.position = 'relative';
    chip.onclick = () => switchArtist(a.username);

    const avatarHtml = a.avatar 
      ? '<img src="' + a.avatar + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover">'
      : '<div class="chip-avatar">' + ((a.name||'A').charAt(0).toUpperCase()) + '</div>';

    chip.innerHTML = avatarHtml +
      '<div class="chip-meta" style="flex:1;min-width:0">' +
        '<div class="chip-name" style="display:flex;align-items:center;gap:6px">' +
          '<span>' + a.name + '</span>' +
          (isBlocked ? '<span style="color:var(--danger);font-size:10px" class="mono">[ĐÃ CHẶN]</span>' : '') +
        '</div>' +
        '<div class="chip-genre mono">@' + a.username + ' · ' + songCount + ' bài</div>' +
      '</div>' +
      '<button class="btn-sm" style="background:transparent;border:1px solid rgba(255,255,255,0.1);color:' + (isBlocked ? 'var(--ok)' : 'var(--danger)') + ';border-radius:6px;font-size:10px;padding:3px 6px;margin-left:6px" onclick="toggleBlockArtist(\\'' + a.username + '\\', event)" title="Chặn / Bỏ chặn nghệ sĩ">' +
        (isBlocked ? 'Bỏ chặn' : 'Chặn') +
      '</button>';
    container.appendChild(chip);
  });
}\n\n`;

  p2 = p2.slice(0, startIdx) + newCode + p2.slice(endIdx);
  fs.writeFileSync('C:/Users/nguye/bersious-web/rmit/2/index.html', p2, 'utf8');
  console.log('rmit/2/index.html updated successfully!');
} else {
  console.error('Could not find markers in rmit/2/index.html');
}
