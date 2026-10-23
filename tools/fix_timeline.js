const fs = require('fs');

let p2 = fs.readFileSync('C:/Users/nguye/bersious-web/rmit/2/index.html', 'utf8');

// 1. Cập nhật CSS để thanh timeline có thể bấm tua (clickable progress bar)
p2 = p2.replace(
  '.track-line{height:5px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}',
  '.track-line{height:8px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden;cursor:pointer;position:relative;transition:height .15s}.track-line:hover{height:10px}'
);

// 2. Thêm hàm tua nhạc (seek) khi click vào thanh thời gian
p2 = p2.replace(
  '<div class="track-line"><div class="fill" id="fill"></div></div>',
  '<div class="track-line" id="track-line-bar" onclick="seekAudio(event)" title="Nhấp để tua thời gian"><div class="fill" id="fill"></div></div>'
);

// 3. Cập nhật sự kiện nạp thời lượng thật ngay khi chọn bài (onloadedmetadata)
const oldAudioSetup = `      const na = document.getElementById('native-audio');
      if(track.streamUrl){
        na.src = track.streamUrl;
      } else {
        const blob = await getMediaBlob(track.id);
        if(blob){
          na.src = URL.createObjectURL(blob);
        } else {
          na.removeAttribute('src');
        }
      }`;

const newAudioSetup = `      const na = document.getElementById('native-audio');
      na.onloadedmetadata = function(){
        const dur = Math.floor(na.duration) || 0;
        if(dur > 0){
          const m = Math.floor(dur / 60);
          const s = String(dur % 60).padStart(2, '0');
          document.getElementById('dur').textContent = m + ':' + s;
        }
      };
      if(track.streamUrl){
        na.src = track.streamUrl;
      } else {
        const blob = await getMediaBlob(track.id);
        if(blob){
          na.src = URL.createObjectURL(blob);
        } else {
          na.removeAttribute('src');
        }
      }`;

p2 = p2.replace(oldAudioSetup, newAudioSetup);

// 4. Sửa hàm ontimeupdate để dùng thời lượng thật của file MP3, không dùng 222s ảo
const oldOnTimeUpdate = `      na.ontimeupdate=()=>{\n        const cur=Math.floor(na.currentTime), dur=Math.floor(na.duration)||222;\n        document.getElementById('cur').textContent=Math.floor(cur/60)+':'+String(cur%60).padStart(2,'0');\n        document.getElementById('dur').textContent=Math.floor(dur/60)+':'+String(dur%60).padStart(2,'0');\n        document.getElementById('fill').style.width=((cur/dur)*100)+'%';`;

const newOnTimeUpdate = `      na.ontimeupdate=()=>{\n        const cur=Math.floor(na.currentTime);\n        const dur=Math.floor(na.duration) || 0;\n        document.getElementById('cur').textContent=Math.floor(cur/60)+':'+String(cur%60).padStart(2,'0');\n        if(dur > 0){\n          document.getElementById('dur').textContent=Math.floor(dur/60)+':'+String(dur%60).padStart(2,'0');\n          document.getElementById('fill').style.width=Math.min((cur/dur)*100, 100)+'%';\n        }\n`;

p2 = p2.replace(oldOnTimeUpdate, newOnTimeUpdate);

// 5. Thêm hàm seekAudio vào script
const scriptEndHook = 'function togglePlay(){';
const seekFunction = `function seekAudio(e){\n  const na = document.getElementById('native-audio');\n  const bar = document.getElementById('track-line-bar');\n  if(!na || !bar || !na.duration || isNaN(na.duration)) return;\n  const rect = bar.getBoundingClientRect();\n  const clickX = e.clientX - rect.left;\n  const pct = Math.max(0, Math.min(1, clickX / rect.width));\n  na.currentTime = pct * na.duration;\n  document.getElementById('fill').style.width = (pct * 100) + '%';\n}\n\nfunction togglePlay(){`;

p2 = p2.replace(scriptEndHook, seekFunction);

// 6. Reset về 0:00 và --:-- khi đổi bài hát
p2 = p2.replace(
  "document.getElementById('disc');\n  if(disc){",
  "document.getElementById('disc');\n  document.getElementById('cur').textContent = '0:00';\n  document.getElementById('dur').textContent = '--:--';\n  document.getElementById('fill').style.width = '0%';\n  if(disc){"
);

fs.writeFileSync('C:/Users/nguye/bersious-web/rmit/2/index.html', p2, 'utf8');
console.log('Fixed realistic audio timeline and seek functionality in rmit/2/index.html!');
