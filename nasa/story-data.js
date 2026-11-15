/* ============================================================
   story-data.js
   Lời kể màn mở đầu, viết song ngữ.

   >>> KHI THÊM LƯỢT MỚI, BẮT BUỘC ĐIỀN CẢ vi VÀ en <<<
   Thiếu một bên là lỗi. Không để dịch sau.

   Bản 2: kịch bản do người dùng viết lại, bốn cảnh, 20 lượt, ba
   phi hành đoàn mới (Vance, Morales, Sato) thay cho dàn nhân vật
   cũ. Giữ nguyên cấu trúc dữ liệu để story.js không phải sửa.

   Bốn loại lượt:
     type: 'log'        dòng nhật ký kỹ thuật, số liệu, mốc thời gian
     type: 'narration'  lời kể
     type: 'name'       bảng hỏi tên người chơi
     type: 'dialogue'   một nhân vật nói

   Trong text: {name} là tên người chơi, *chữ* là in nghiêng.
   art là KHE ẢNH, trỏ tới key trong art.js.

   GHI CHÚ: kịch bản gốc có vài chỗ dùng dấu gạch dài. Đã đổi hết
   sang dấu phẩy hoặc tách câu, vì dấu gạch dài bị cấm trong dự án.
   Lượt 16 và 17 trong bản gốc trùng ý nhau (đều đếm giá treo đồ),
   nên đã gộp thành một lượt để không lặp hình.
   ============================================================ */

export const CREW = [
  {
    id: 'vance',
    name: 'Vance',
    full: 'Elena Vance',
    role: { vi: 'Chỉ huy', en: 'Commander' },
    color: '#e8a33d',
    short: 'EV',
  },
  {
    id: 'morales',
    name: 'Morales',
    full: 'David Morales',
    role: { vi: 'Phi công', en: 'Pilot' },
    color: '#8fb08a',
    short: 'DM',
  },
  {
    id: 'sato',
    name: 'Sato',
    full: 'Kenji Sato',
    role: { vi: 'Bác sĩ', en: 'Flight surgeon' },
    color: '#7fa3c8',
    short: 'KS',
  },
  /* Vai của người chơi. Đặt trong CREW để story.js tìm được khi lượt
     dialogue có who: 'player'. Tên hiển thị là tên người chơi nhập,
     nên dùng trường name rỗng và để story.js thay bằng playerName. */
  {
    id: 'player',
    name: '',
    full: '',
    role: { vi: 'Kỹ sư hệ thống', en: 'Systems engineer' },
    color: '#4fb8c9',
    short: 'YOU',
  },,
  /* Hai nguoi nha, chi xuat hien trong doan hoi tuong gia dinh, khong
     co mat trong phien ban thoai ngoai doi. */
  {
    id: 'linh',
    name: 'Linh',
    full: 'Linh',
    role: { vi: 'Vợ', en: 'Wife' },
    color: '#c9a0a0',
    short: 'L',
  },
  {
    id: 'mai',
    name: 'Bé Mai',
    full: 'Mai',
    role: { vi: 'Con gái, năm tuổi', en: 'Daughter, age five' },
    color: '#e8c98a',
    short: 'M',
  },
];

export const PLAYER_ROLE = {
  vi: 'Kỹ sư hệ thống',
  en: 'Systems engineer',
};

export const MISSION = {
  vi: 'Horizon-IV · Đồng bằng Acidalia Planitia, Sao Hỏa',
  en: 'Horizon-IV · Acidalia Planitia, Mars',
};

export const STORY = [
  /* ═══ CẢNH 1: CƠN BÃO ═══ */

  {
    type: 'narration',
    art: 'storm-coming',
    caption: { vi: 'Acidalia Planitia · chạng vạng', en: 'Acidalia Planitia · dusk' },
    text: {
      vi: 'Đường chân trời biến mất chỉ sau hai nhịp thở. Bụi đỏ cuộn lên đặc quánh, nuốt chửng ánh mặt trời yếu ớt của buổi chiều Sao Hỏa.',
      en: 'The horizon vanished in two breaths. Thick red dust rolled in, swallowing the pale Martian afternoon.',
    },
  },
  {
    type: 'dialogue',
    who: 'vance',
    art: 'storm-coming',
    text: {
      vi: 'Hủy nhiệm vụ! Tất cả rút về tàu ngay! Bám sát dây dẫn, không được tách đội!',
      en: 'Abort EVA! Everyone back to the MAV, now! Stay on the tether, do not separate!',
    },
  },
  {
    type: 'dialogue',
    who: 'player',
    art: 'storm-coming',
    text: {
      vi: 'Khoan đã, chân đế trạm đo bị kẹt rồi, cho tôi năm giây rút ổ cứng dữ liệu!',
      en: 'Hold on, the sensor rig is jammed. Give me five seconds to pull the drive!',
    },
  },
  {
    type: 'dialogue',
    who: 'vance',
    art: 'storm-coming',
    fx: 'fx-shake-hard',
    text: {
      vi: 'Bỏ đi! Gió giật vượt ngưỡng rồi, quay lại ngay!',
      en: 'Leave it! Gusts are past threshold, move!',
    },
  },

  /* ═══ CẢNH 2: VA CHẠM ═══ */

  {
    type: 'narration',
    art: 'storm-impact',
    caption: { vi: 'Trong bão · tầm nhìn bằng không', en: 'Inside the storm · zero visibility' },
    text: {
      vi: 'Một tiếng rít chói tai xé ngang tai nghe. Chảo ăng-ten liên lạc chính bật khỏi giá đỡ, xoay tít trong gió rồi quật thẳng vào mạn sườn {name}.',
      en: 'A metallic shriek tore through the headset. The main comms dish ripped off its mount, spinning straight into {name} ribs.',
    },
    lock: 260,
  },
  {
    type: 'narration',
    art: 'storm-impact',
    fx: 'fx-flash-white',
    text: {
      vi: 'Cú va đập hất văng {name} xuống rãnh đá. Tiếng xì khí lạnh buốt rít lên bên sườn trước khi màn hình mũ bảo hộ tối sầm.',
      en: 'The blow hurled {name} into a rocky gully. A freezing hiss screamed from the suit flank before the visor went black.',
    },
  },
  {
    type: 'dialogue',
    who: 'sato',
    art: 'storm-impact',
    text: {
      vi: 'Mất tín hiệu {name} rồi! Không còn nhịp tim, áp suất bộ đồ tụt về không!',
      en: 'I lost {name} telemetry! No pulse, suit pressure just dropped to zero!',
    },
  },
  {
    type: 'dialogue',
    who: 'morales',
    art: 'storm-impact',
    fx: 'fx-vignette-red',
    text: {
      vi: 'Tàu nghiêng mười hai độ rồi! Thêm một độ nữa là lật! Elena, không kịp nữa đâu!',
      en: 'We are tilting at twelve degrees! One more and we tip! Elena, we are out of time!',
    },
  },
  {
    type: 'dialogue',
    who: 'vance',
    art: 'storm-impact',
    text: {
      vi: '{name}! Nghe rõ không, trả lời đi! {name}!',
      en: '{name}! Do you read me, respond! {name}!',
    },
  },
  {
    type: 'dialogue',
    who: 'sato',
    art: 'storm-impact',
    text: {
      vi: 'Không ai sống nổi dưới áp suất đó đâu Elena! Phóng ngay đi, không là chết cả lũ!',
      en: 'Nobody survives at that pressure, Elena! Launch now or none of us make it!',
    },
  },

  /* ═══ CẢNH 3: RỜI ĐI ═══ */

  {
    type: 'narration',
    art: 'departure',
    caption: { vi: 'MAV Horizon-IV · đánh lửa', en: 'MAV Horizon-IV · ignition' },
    text: {
      vi: 'Ngón tay Elena siết chặt lấy cần gạt đánh lửa, đốt ngón tay trắng bệch dưới ánh đèn báo động đỏ rực.',
      en: 'Elena fingers locked onto the ignition switch, knuckles white under the flashing red alarms.',
    },
  },
  {
    type: 'dialogue',
    who: 'vance',
    art: 'departure',
    pause: 900,
    text: {
      vi: '...Đốt tầng một.',
      en: '...Ignite stage one.',
    },
  },
  {
    type: 'narration',
    art: 'departure',
    fx: 'fx-fire',
    text: {
      vi: 'Mặt đất rung chuyển dữ dội. Ánh lửa động cơ mờ dần rồi biến mất sau tầng mây bụi đỏ, trả lại sự tĩnh lặng tuyệt đối cho đồng bằng Acidalia.',
      en: 'The ground shook violently. The thruster flare faded into the red clouds, leaving Acidalia Planitia in dead silence.',
    },
  },

  /* ═══ CẢNH 4: TỈNH DẬY ═══ */

  {
    type: 'narration',
    art: 'awake',
    caption: { vi: 'Khoang Hab · sau bão', en: 'Hab module · after the storm' },
    fx: 'fx-eyelids',
    text: {
      vi: 'Tiếng bíp báo áp suất thấp kéo {name} tỉnh dậy. Bão đã tan. Lớp keo tự vá của bộ đồ đông cứng thành một mảng đen sần sùi ngay chỗ rách bên sườn, vừa đủ để giữ lại chút dưỡng khí cuối cùng.',
      en: 'A low-pressure chime pulled {name} awake. The storm had passed. The suit sealant had hardened into a rough black crust over the tear, just enough to hold the last of the air.',
    },
  },
  {
    type: 'narration',
    art: 'awake',
    text: {
      vi: 'Bạn tháo mũ, bước một vòng quanh khoang chính. Bốn giá treo đồ bay. Ba cái trống trơn.',
      en: 'You pulled off your helmet and walked a lap around the Hab. Four suit racks. Three empty.',
    },
  },
  {
    type: 'dialogue',
    who: 'player',
    art: 'awake',
    text: {
      vi: 'Alo? Trạm Hab gọi tàu MAV... Vance? Có ai ở đó không?',
      en: 'Hello? Hab to MAV... Vance? Anyone copy?',
    },
  },
  {
    type: 'narration',
    art: 'awake',
    fx: 'fx-vignette-red',
    text: {
      vi: 'Chỉ có tiếng rè rè đều đều vọng lại từ loa. Ngoài cửa sổ, chảo ăng-ten liên lạc chính đã gãy gục, nằm vùi một nửa dưới cát.',
      en: 'Only steady static hissed back from the speaker. Outside the viewport, the main high-gain dish lay snapped in half, half-buried in sand.',
    },
  },
  {
    type: 'dialogue',
    who: 'player',
    art: 'awake',
    text: {
      vi: '...Khốn thật. Họ bỏ đi rồi.',
      en: '...Damn it. They left.',
    },
  },

  /* ═══ NHẬP TÊN ═══
     Đặt ở đây vì người chơi vừa nhận ra mình ở một mình, và bảng điều
     khiển hỏi định danh là câu hỏi đầu tiên của khoang Hab sau bão. */

  {
    type: 'name',
    art: 'awake',
    prompt: {
      vi: 'Nhập định danh phi hành gia của bạn:',
      en: 'Enter your astronaut callsign:',
    },
    hint: {
      vi: 'Gõ tên của bạn rồi bấm Enter.',
      en: 'Type your name and press Enter.',
    },
    placeholder: { vi: 'Tên của bạn', en: 'Your name' },
  },

  /* ═══ CẢNH CUỐI: CÒN MỘT HY VỌNG ═══ */

  {
    type: 'narration',
    art: 'awake',
    caption: { vi: 'Bảng điều khiển chính', en: 'Main console' },
    text: {
      vi: 'Giữa bảng điều khiển tối om, duy nhất một đèn báo màu hổ phách vẫn nhấp nháy đều đặn: Bộ phát sóng tầm ngắn UHF, chờ kết nối vệ tinh quỹ đạo.',
      en: 'Across the dark console, a single amber indicator kept blinking steadily: Short-Range UHF Transceiver, standby for orbital relay.',
    },
  },
];
