const fs = require('fs');

let p1 = fs.readFileSync('C:/Users/nguye/bersious-web/rmit/1/index.html', 'utf8');

// 1. Thêm khung upload ảnh bìa (cover art) và quản lý người dùng bị block vào rmit/1/index.html
const oldUpload = `<div class="upload-zone" onclick="document.getElementById('file-input').click()">
        <div style="font-size:20px;font-weight:700;color:var(--accent);margin-bottom:6px" class="mono">UPLOAD</div>
        <div style="font-size:16px;font-weight:700">Tải Lên Bản Thu Âm Nhạc hoặc Video Mới</div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px">Hỗ trợ MP3, WAV, FLAC, MP4, WEBM</div>
        <input type="file" id="file-input" style="display:none" accept="audio/*,video/*" onchange="handleFileUpload(event)">
      </div>
      <div id="upload-status" style="margin-top:12px;font-size:12px;color:var(--accent);display:none" class="mono"></div>`;

const newUpload = `<div class="upload-zone" onclick="document.getElementById('file-input').click()">
        <div style="font-size:20px;font-weight:700;color:var(--accent);margin-bottom:6px" class="mono">UPLOAD</div>
        <div style="font-size:16px;font-weight:700">Tải Lên Bản Thu Âm Nhạc hoặc Video Mới</div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px">Hỗ trợ MP3, WAV, FLAC, MP4, WEBM</div>
        <input type="file" id="file-input" style="display:none" accept="audio/*,video/*" onchange="handleFileUpload(event)">
      </div>
      
      <!-- Tùy chọn ảnh nền / Cover Art cho bài hát -->
      <div style="display:flex;align-items:center;gap:12px;margin-top:14px;background:rgba(0,0,0,0.3);padding:10px 14px;border-radius:10px;border:1px dashed var(--line);flex-wrap:wrap">
        <span style="font-size:12px;color:var(--muted);font-weight:600">🖼️ Ảnh bìa bài hát (Cover Art URL):</span>
        <input type="text" id="track-cover-input" class="form-input" style="flex:1;min-width:200px;padding:6px 10px;font-size:12px" placeholder="Dán link ảnh bìa (https://...) hoặc chọn file bên cạnh">
        <label class="btn btn-ghost btn-sm" style="cursor:pointer">
          <span>Chọn File Ảnh</span>
          <input type="file" id="cover-file-input" style="display:none" accept="image/*" onchange="handleCoverUpload(event)">
        </label>
      </div>
      <div id="upload-status" style="margin-top:12px;font-size:12px;color:var(--accent);display:none" class="mono"></div>`;

p1 = p1.replace(oldUpload, newUpload);

// 2. Thêm logic upload ảnh bìa và block người nghe vào script của rmit/1/index.html
const oldScriptHook = 'function handleFileUpload(event){';
const newScriptHook = `async function handleCoverUpload(e){
  const file = e.target.files[0];
  if(!file) return;
  const status = document.getElementById('upload-status');
  status.style.display = 'block';
  status.textContent = 'Đang tải ảnh bìa lên Vercel Blob...';
  try {
    const res = await fetch('/api/upload-media?filename=' + encodeURIComponent('cover_' + Date.now() + '_' + file.name), {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'image/jpeg' },
      body: file
    });
    const json = await res.json();
    if(json.ok && json.url){
      document.getElementById('track-cover-input').value = json.url;
      status.textContent = '✓ Đã tải ảnh bìa thành công!';
      showToast('Đã tải ảnh bìa', 'Link ảnh bìa đã được tự động điền.', 'ok');
    }
  } catch(err){
    status.textContent = 'Tải ảnh bìa thất bại, dùng ảnh mặc định.';
  }
}

function toggleBlockUser(targetReviewerUser){
  const logged = localStorage.getItem('tide_logged_artist') || '';
  if(!logged){ alert('Vui lòng đăng nhập trước!'); return; }
  
  const artists = getStoredArtists();
  const me = artists.find(a => a.username.toLowerCase() === logged.toLowerCase());
  if(!me) return;
  me.blockedUsers = Array.isArray(me.blockedUsers) ? me.blockedUsers : [];
  
  const isBlocked = me.blockedUsers.includes(targetReviewerUser);
  if(isBlocked){
    me.blockedUsers = me.blockedUsers.filter(u => u !== targetReviewerUser);
  } else {
    if(!confirm('Bạn có chắc muốn CHẶN người nghe @' + targetReviewerUser + '? Người này sẽ không thể xin quyền hoặc nghe bất kỳ bài hát nào của bạn.')) return;
    me.blockedUsers.push(targetReviewerUser);
  }
  
  localStorage.setItem('tide_artists', JSON.stringify(artists));
  pushCloudUpdate('TOGGLE_BLOCK', { fromRole: 'artist', fromUsername: logged, targetUsername: targetReviewerUser });
  renderRequests();
  renderTracks();
  showToast(isBlocked ? 'Đã bỏ chặn' : 'Đã chặn người nghe', '@' + targetReviewerUser, isBlocked ? 'ok' : 'danger');
}

function handleFileUpload(event){`;

p1 = p1.replace(oldScriptHook, newScriptHook);

// Gán coverArt khi tạo track mới
p1 = p1.replace(
  "artistUsername: activeArtistUser\n          };",
  "artistUsername: activeArtistUser,\n            coverArt: (document.getElementById('track-cover-input')?.value || '').trim()\n          };"
);

fs.writeFileSync('C:/Users/nguye/bersious-web/rmit/1/index.html', p1, 'utf8');
console.log('rmit/1/index.html updated successfully with Cover Art and Artist Block features!');
