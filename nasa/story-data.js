/* ============================================================
   story-data.js
   Lời kể màn mở đầu, viết song ngữ.

   >>> KHI THÊM LƯỢT MỚI, BẮT BUỘC ĐIỀN CẢ vi VÀ en <<<
   Thiếu một bên là lỗi. Không để dịch sau.

   Nhịp kể: tám khung cảnh điện ảnh, mở màn bằng tai nạn. Phần hồi
   tưởng gia đình KHÔNG nằm ở đây nữa, đã chuyển vào gameplay, xem
   data/memories.json và memories.js, mở từ túi đồ.

   Bốn loại lượt:
     type: 'log'        dòng nhật ký kỹ thuật, số liệu, mốc thời gian
     type: 'narration'  lời kể
     type: 'name'       bảng hỏi tên người chơi
     type: 'dialogue'   một nhân vật nói

   Trong text: {name} là tên người chơi, *chữ* là in nghiêng.
   art là KHE ẢNH, trỏ tới key trong art.js.

   Trường tuỳ chọn:
     caption  nhãn bối cảnh ở góc trái khung hình
     pause    mili giây khoá nút Tiếp ngay sau khi vẽ lượt này
     lock     khoá nút ngắn đúng nhịp cú va đập
     fx       hiệu ứng điện ảnh riêng của lượt, xem story-fx.js
   ============================================================ */

export const CREW = [
  {
    id: 'lewis',
    name: 'Lewis',
    full: 'Melissa Lewis',
    role: { vi: 'Chỉ huy', en: 'Commander' },
    color: '#e8a33d',
    short: 'ML',
  },
  {
    id: 'martinez',
    name: 'Martinez',
    full: 'Rick Martinez',
    role: { vi: 'Phi công', en: 'Pilot' },
    color: '#8fb08a',
    short: 'RM',
  },
  {
    id: 'beck',
    name: 'Beck',
    full: 'Chris Beck',
    role: { vi: 'Bác sĩ', en: 'Flight surgeon' },
    color: '#7fa3c8',
    short: 'CB',
  },
  {
    id: 'vogel',
    name: 'Vogel',
    full: 'Alex Vogel',
    role: { vi: 'Hóa học', en: 'Chemist' },
    color: '#b08ac8',
    short: 'AV',
  },
  {
    id: 'johanssen',
    name: 'Johanssen',
    full: 'Beth Johanssen',
    role: { vi: 'Hệ thống', en: 'Systems' },
    color: '#c98f6b',
    short: 'BJ',
  },
  {
    id: 'watney',
    name: 'Watney',
    full: 'Mark Watney',
    role: { vi: 'Thực vật học', en: 'Botanist' },
    color: '#e8a33d',
    short: 'MW',
  },
  {
    id: 'linh',
    name: 'Linh',
    full: 'Nguyễn Linh',
    role: { vi: 'Vợ', en: 'His wife' },
    color: '#c98f9e',
    short: 'NL',
  },
];

export const PLAYER_ROLE = {
  vi: 'Nhà thực vật học · Kỹ sư cơ khí',
  en: 'Botanist · Mechanical engineer',
};

export const STORY = [

  /* ═══ khung 1: toàn cảnh bão cát, khung rộng ═══ */

  {
    type: 'log',
    art: 'bg-storm-wide',
    caption: { vi: 'Acidalia Planitia · Sol 6', en: 'Acidalia Planitia · Sol 6' },
    text: {
      vi: 'SOL 6 · 19:04 · GIÓ 137 km/h · TẦM NHÌN 40 m',
      en: 'SOL 6 · 19:04 · WIND 137 km/h · VISIBILITY 40 m',
    },
  },
  {
    type: 'narration',
    art: 'bg-storm-wide',
    text: {
      vi: 'Bức tường bụi cao bốn mươi mét, rộng sáu mươi cây số, tiến vào với tốc độ chín mươi cây số một giờ. Radar giữ được tín hiệu tới 19:26 thì trắng xoá.',
      en: 'A wall of dust forty meters high and sixty kilometers wide, closing at ninety kilometers an hour. Radar held it until 19:26, then washed out.',
    },
  },
  {
    type: 'narration',
    art: 'bg-storm-wide',
    text: {
      vi: 'Áp suất khí quyển 610 pascal. Không đủ để nghe thấy tiếng gió, vừa đủ để đẩy một bộ đồ nặng 140 cân lệch sang một bên.',
      en: 'Atmospheric pressure 610 pascals. Not enough to hear the wind, enough to shove a 140 kilogram suit sideways.',
    },
  },

  /* ═══ khung 2: nhóm phi hành gia chạy trong bão ═══ */

  {
    type: 'dialogue',
    who: 'lewis',
    art: 'bg-crew-running',
    caption: { vi: 'Chặng chạy về MAV · 800 mét', en: 'Run to the MAV · 800 meters' },
    text: {
      vi: 'Hạ kính mũ. Cự ly một mét. Chạy về MAV, không dừng lại.',
      en: 'Visors down. One meter spacing. Run for the MAV, no stopping.',
    },
  },
  {
    type: 'narration',
    art: 'bg-crew-running',
    text: {
      vi: 'Sáu người, tám trăm mét, tầm nhìn mười hai mét. Beck đếm từng người trên kênh chung, ghép tên vào từng con số.',
      en: 'Six people, eight hundred meters, twelve meters of visibility. Beck counted each of them on the common channel, a name against every number.',
    },
  },
  {
    type: 'dialogue',
    who: 'martinez',
    art: 'bg-crew-running',
    text: {
      vi: 'Chân chống số hai lún thêm chín phân. Tôi bơm lại thuỷ lực, cho tôi bốn mươi giây.',
      en: 'Strut two has sunk another nine centimeters. I am recharging the hydraulics, give me forty seconds.',
    },
  },

  /* ═══ khung 3: góc nhìn thứ nhất, thở dốc ═══ */

  {
    type: 'narration',
    art: 'bg-running-pov',
    caption: { vi: 'Góc nhìn {name} · nhịp thở 38/phút', en: '{name} point of view · 38 breaths per minute' },
    fx: { stage: ['fx-breath'], overlay: ['fx-dust-red-dense'] },
    text: {
      vi: 'Góc nhìn của {name}. Đồng hồ trong mũ nhảy 19:07. Nhịp thở ba mươi tám lần một phút, và mỗi lần thở khung hình nhích lên rồi hạ xuống.',
      en: '{name} point of view. The helmet clock ticks to 19:07. Breathing thirty eight times a minute, and the frame lifts and drops with every breath.',
    },
  },
  {
    type: 'narration',
    art: 'bg-running-pov',
    fx: { stage: ['fx-breath'], overlay: ['fx-dust-red-dense'] },
    text: {
      vi: 'Lewis đã lên tới cửa khoang. Martinez đứng bậc thứ ba, một tay bám lan can, một tay chìa xuống.',
      en: 'Lewis was already at the hatch. Martinez stood on the third rung, one hand on the rail, one arm reaching down.',
    },
  },
  {
    type: 'dialogue',
    who: 'lewis',
    art: 'bg-running-pov',
    fx: { stage: ['fx-breath'], overlay: ['fx-dust-red'] },
    text: {
      vi: 'Còn bốn mươi mét. Đừng quay đầu lại.',
      en: 'Forty meters out. Do not look back.',
    },
  },
  {
    type: 'narration',
    art: 'bg-running-pov',
    fx: { stage: ['fx-breath'], overlay: ['fx-dust-red'] },
    text: {
      vi: 'Cọc cảm biến độ ẩm vẫn cắm ở hố sau lưng, còn nguyên lõi pin. Nó đáng hai mươi giây. Hai mươi giây là quá nhiều.',
      en: 'The moisture probe was still in the trench behind him, battery core and all. It was worth twenty seconds. Twenty seconds was far too much.',
    },
  },

  /* ═══ khung 4: cận mặt trong mũ, tia quét ═══ */

  {
    type: 'narration',
    art: 'bg-face-closeup',
    caption: { vi: 'Kính mũ · 11 vệt xước', en: 'Visor · 11 scratches' },
    fx: { overlay: ['fx-scan'] },
    text: {
      vi: 'Kính mũ đã xước mười một vệt. Một dải sáng chạy ngang tầm mắt, chậm và đều, từ trái sang phải, như có ai kéo thước qua mặt kính.',
      en: 'Eleven scratches across the visor. A band of pale light swept across eye level, slow and even, left to right, like a ruler drawn over the glass.',
    },
  },
  {
    type: 'log',
    art: 'bg-face-closeup',
    fx: { overlay: ['fx-scan'], special: 'typewriter' },
    text: {
      vi: '19:09 · HUD QUÉT · VẬT THỂ CÁCH 1,4 m · HƯỚNG 2 GIỜ · TỐC ĐỘ 74 km/h',
      en: '19:09 · HUD SCAN · OBJECT AT 1.4 m · BEARING 2 O CLOCK · SPEED 74 km/h',
    },
  },
  {
    type: 'dialogue',
    who: 'beck',
    art: 'bg-face-closeup',
    text: {
      vi: 'Kênh bốn mất tín hiệu. Không có nhịp tim, không có áp suất, không có gì cả.',
      en: 'Channel four is gone. No heart rate, no suit pressure, nothing at all.',
    },
  },
  {
    type: 'narration',
    art: 'bg-face-closeup',
    lock: true,
    fx: { stage: ['fx-shake-hard'], overlay: ['fx-flash-impact', 'fx-flash-red'] },
    text: {
      vi: 'Một chảo ăng-ten đứt khỏi giá, xoáy hai vòng trong gió, rồi đập ngang lưng {name}. Khí quyển loãng không truyền nổi âm thanh đó, chỉ có bộ đồ truyền thẳng vào xương.',
      en: 'A dish antenna tore off its mount, spun twice in the gale, and struck {name} across the back. The thin air carried no sound of it. Only the suit carried the blow into bone.',
    },
  },

  /* ═══ khung 5a: ngã xuống, cát phủ dần ═══ */

  {
    type: 'narration',
    art: 'bg-fall-buried',
    caption: { vi: '19:12 · Áp suất bộ đồ 61 kPa', en: '19:12 · Suit pressure 61 kPa' },
    fx: { art: ['fx-zoom-far'], overlay: ['fx-sand-in'] },
    text: {
      vi: '{name} chạm đất bằng đầu gối trước. Cát phủ tới thắt lưng trong bốn mươi giây, và nó không có ý định dừng ở đó.',
      en: '{name} hit the ground knees first. Sand reached the waist within forty seconds, and had no intention of stopping there.',
    },
  },
  {
    type: 'log',
    art: 'bg-fall-buried',
    fx: { overlay: ['fx-sand-in'] },
    text: {
      vi: '19:14 · ÁP SUẤT BỘ ĐỒ 61 kPa · ĐANG TỤT · BỘ VÁ TỰ ĐỘNG ĐÃ KÍCH HOẠT',
      en: '19:14 · SUIT PRESSURE 61 kPa · FALLING · AUTO SEALANT DEPLOYED',
    },
  },
  {
    type: 'narration',
    art: 'bg-fall-buried',
    fx: { art: ['fx-zoom-far'] },
    text: {
      vi: 'Lùi máy ra xa: một người nằm trong vòng xoáy bụi đường kính hai nghìn cây số. Ở cự ly đó, không có gì để cứu và cũng không có gì để thấy.',
      en: 'Pull back: one person inside a dust gyre two thousand kilometers across. At that distance there is nothing to rescue and nothing to see.',
    },
  },

  /* ═══ khung 5b: toàn cảnh Sao Hỏa, tàu bay xa ═══ */

  {
    type: 'narration',
    art: 'bg-mars-orbit',
    caption: { vi: 'Quỹ đạo thấp · 400 km', en: 'Low orbit · 400 km' },
    fx: { art: ['fx-zoom-far'] },
    text: {
      vi: 'MAV rời mặt đất 19:21, lên quỹ đạo sau sáu phút bốn mươi giây. Từ bốn trăm cây số, lớp bụi dày tới mức không còn thấy bệ phóng.',
      en: 'The MAV lifted at 19:21 and reached orbit in six minutes forty. From four hundred kilometers the dust was thick enough to hide the launch site completely.',
    },
  },
  {
    type: 'log',
    art: 'bg-mars-orbit',
    text: {
      vi: 'SOL 7 · 02:40 · KHÔNG CÒN TÍN HIỆU TỪ BỀ MẶT · HỒ SƠ CHUYỂN SANG MẤT TÍCH',
      en: 'SOL 7 · 02:40 · NO SIGNAL FROM THE SURFACE · STATUS CHANGED TO MISSING',
    },
  },

  /* ═══ khung 6: màn hình tối đen ═══ */

  {
    type: 'narration',
    art: 'bg-mars-orbit',
    pause: 1500,
    fx: { root: ['fx-blackout'] },
    text: {
      vi: 'Bão phủ kín ăng-ten. Không còn kênh nào để gọi, không còn ai ở đầu bên kia.',
      en: 'The storm swallowed the antenna. No channel left to call, nobody left on the other end.',
    },
  },
  {
    type: 'log',
    art: 'bg-mars-orbit',
    pause: 1500,
    fx: { root: ['fx-blackout'] },
    text: {
      vi: 'ĐÓNG KÊNH · 11 GIỜ 40 PHÚT · 0 TÍN HIỆU',
      en: 'CHANNEL CLOSED · 11 HOURS 40 MINUTES · 0 SIGNALS',
    },
  },

  /* ═══ khung 7: mở mắt sau hôn mê ═══ */

  {
    type: 'log',
    art: 'bg-waking-eyes',
    caption: { vi: 'Khoang Hab · Sol 7', en: 'Hab module · Sol 7' },
    fx: { overlay: ['fx-eyelids'], art: ['fx-unblur'] },
    text: {
      vi: 'SOL 7 · 05:02 · ÁP SUẤT KHOANG 101,3 kPa · NHIỆT ĐỘ 18 °C',
      en: 'SOL 7 · 05:02 · CABIN PRESSURE 101.3 kPa · TEMPERATURE 18 °C',
    },
  },
  {
    type: 'narration',
    art: 'bg-waking-eyes',
    fx: { overlay: ['fx-eyelids'], art: ['fx-unblur'] },
    text: {
      vi: 'Mí mắt mở ra theo hai hướng, rất chậm. Trần khoang hiện lên trước, rồi tới đường cáp, rồi tới cánh quạt đang quay.',
      en: 'The eyelids opened in two directions, slowly. The ceiling came first, then the cable runs, then the fan turning.',
    },
  },
  {
    type: 'narration',
    art: 'bg-waking-eyes',
    text: {
      vi: 'Quạt lọc khí chạy hai mươi hai vòng một phút. Ngoài tiếng quạt, khoang này không còn âm thanh nào khác.',
      en: 'The scrubber fan turned twenty two revolutions a minute. Beyond that hum, the module held no other sound.',
    },
  },
  {
    type: 'narration',
    art: 'bg-waking-eyes',
    fx: { art: ['fx-panx'] },
    text: {
      vi: 'Sáu giá treo đồ. Năm giá trống, móc vẫn còn đung đưa. Bộ đồ của {name} ở giá thứ sáu, vai trái cháy sém một mảng cỡ bàn tay.',
      en: 'Six suit racks. Five stood empty with their hooks still swinging. {name} suit hung on the sixth, a palm sized scorch across the left shoulder.',
    },
  },

  /* ═══ khung 8: đi vào căn cứ, thở dốc ═══ */

  {
    type: 'narration',
    art: 'bg-entering-hab',
    caption: { vi: 'Cửa trong · khoang trú ẩn', en: 'Inner hatch · hab module' },
    fx: { stage: ['fx-breath-hard'], overlay: ['fx-dust-warm'] },
    text: {
      vi: 'Cửa trong mở. {name} bước qua, mỗi bước sáu mươi phân, khung hình vẫn nhấp nhô theo nhịp thở vì phổi chưa chịu hạ xuống.',
      en: 'The inner hatch opened. {name} stepped through at sixty centimeters a pace, the frame still rising and falling because the lungs had not agreed to slow down.',
    },
  },
  {
    type: 'dialogue',
    who: 'lewis',
    art: 'bg-entering-hab',
    fx: { stage: ['fx-breath-hard'] },
    text: {
      vi: 'Ares 3, đây là Lewis. Nếu cậu nghe được đoạn này thì cậu còn sống. Khoang vẫn còn khí. Dùng nó.',
      en: 'Ares 3, this is Lewis. If you are hearing this, you are alive. The module still holds air. Use it.',
    },
  },
  {
    type: 'log',
    art: 'bg-entering-hab',
    text: {
      vi: 'SOL 7 · 05:40 · CỬA NGOÀI ĐÓNG KÍN · RÒ RỈ 0,0 kPa/giờ',
      en: 'SOL 7 · 05:40 · OUTER HATCH SEALED · LEAK 0.0 kPa/hr',
    },
  },

  /* ═══ nhập tên: đã vào được căn cứ, đã biết mình còn sống ═══ */

  {
    type: 'name',
    art: 'bg-entering-hab',
    fx: { art: ['fx-blur-bg'] },
    prompt: {
      vi: 'Bảng điều khiển hỏi tên người chịu trách nhiệm khoang này. Điền vào.',
      en: 'The console asks who is accountable for this module. Fill it in.',
    },
    hint: {
      vi: 'Nhập tên của bạn (hoặc giữ nguyên Watney) rồi nhấn Enter.',
      en: 'Type your name (or keep Watney) and press Enter.',
    },
    placeholder: { vi: 'Tên của bạn', en: 'Your name' },
  },

  /* ═══ những lượt ngắn sau khi tỉnh dậy, chuẩn bị vào màn căn cứ ═══ */

  {
    type: 'log',
    art: 'bg-waking-eyes',
    text: {
      vi: 'DANH SÁCH ARES 3 · 6 NGƯỜI · 5 NGƯỜI RỜI QUỸ ĐẠO · 1 NGƯỜI CÒN TRÊN MẶT ĐẤT',
      en: 'ARES 3 ROSTER · 6 CREW · 5 DEPARTED ORBIT · 1 REMAINS ON SURFACE',
    },
  },
  {
    type: 'narration',
    art: 'bg-waking-eyes',
    text: {
      vi: 'Tủ thực phẩm: mười hai gói khẩu phần một ngày, đủ ba trăm ngày nếu cắt xuống 1.500 calo. Bồn nước chính: 210 lít.',
      en: 'Food locker: twelve ration packs a day, three hundred days if trimmed to 1,500 calories. Main water tank: 210 liters.',
    },
  },
  {
    type: 'narration',
    art: 'bg-waking-eyes',
    text: {
      vi: 'Bộ đồ du hành treo ở giá thứ sáu vẫn còn mặc được, nhưng cổ áo đã vá bằng keo tự động: 61 kPa là mức nó chịu được, không hơn.',
      en: 'The suit on the sixth rack was still wearable, its collar patched with auto sealant: 61 kPa was what it held, no more.',
    },
  },
  {
    type: 'narration',
    art: 'bg-waking-eyes',
    text: {
      vi: '{name} bật đài thu phát, để nguyên hai mươi phút. Thứ duy nhất phát ra là nhiễu tĩnh điện, đều đặn, không một lần ngắt quãng.',
      en: '{name} left the transceiver open for twenty minutes. The only thing out of it was static, steady, never once breaking.',
    },
  },
  {
    type: 'log',
    art: 'bg-waking-eyes',
    text: {
      vi: 'NHIÊN LIỆU MAV 0% · PHƯƠNG TIỆN VỀ TRÁI ĐẤT: KHÔNG · TIẾP TẾ GẦN NHẤT: ARES 4, SOL 1.398',
      en: 'MAV PROPELLANT 0% · EARTH RETURN VEHICLE: NONE · NEXT RESUPPLY: ARES 4, SOL 1,398',
    },
  },
  {
    type: 'narration',
    art: 'bg-waking-eyes',
    text: {
      vi: 'Hai việc phải xong trước khi nghĩ tới bốn năm: nước, rồi thức ăn. Đổi thứ tự là chết trong tuần đầu.',
      en: 'Two jobs must be done before thinking about four years: water, then food. Swap the order and the first week kills you.',
    },
  },
  {
    type: 'narration',
    art: 'bg-waking-eyes',
    text: {
      vi: '{name} xé một trang sổ tay, ghi *Sol 7* lên đầu trang, rồi gạch hai đường thật đậm dưới con số 1.398.',
      en: '{name} tore a page from the notebook, wrote *Sol 7* at the top, and underlined the number 1,398 twice.',
    },
  },
  {
    type: 'narration',
    art: 'bg-waking-eyes',
    text: {
      vi: 'Trong túi đồ có một tấm ảnh giấy, dán bằng băng keo điện. Nó không giúp gì cho việc sống sót, nhưng nó vẫn ở đó, và {name} biết chính xác nó nằm ở ngăn nào.',
      en: 'In the pack there was one paper photograph, held together with electrical tape. It did nothing for survival, and it was still there, and {name} knew exactly which pocket.',
    },
  },
  {
    type: 'narration',
    art: 'bg-waking-eyes',
    text: {
      vi: 'Khoang Hab rộng 22 mét vuông. Một người, một tủ hạt giống, và 1.398 sol trước mặt.',
      en: 'The Hab floor was 22 square meters. One person, one seed locker, and 1,398 sols ahead.',
    },
  },
  {
    type: 'log',
    art: 'bg-waking-eyes',
    text: {
      vi: 'BẮT ĐẦU ĐẾM · SOL 7 · CÒN LẠI 1.398 SOL · MỞ KHOANG LÀM VIỆC',
      en: 'COUNT BEGINS · SOL 7 · 1,398 SOLS REMAIN · OPENING WORK MODULE',
    },
  },
];
