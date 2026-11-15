/* ============================================================
   story-data.js
   Toàn bộ lời kể của màn mở đầu, viết song ngữ.

   >>> KHI THÊM LƯỢT MỚI, BẮT BUỘC ĐIỀN CẢ vi VÀ en <<<
   Thiếu một bên là lỗi. Không để dịch sau.

   Bốn loại lượt:
     type: 'log'        dòng nhật ký kỹ thuật, số liệu, mốc thời gian
     type: 'narration'  lời kể
     type: 'name'       bảng hỏi tên người chơi
     type: 'dialogue'   một nhân vật nói

   Trong text: {name} là tên người chơi, *chữ* là in nghiêng.
   art là KHE ẢNH, trỏ tới key trong art.js.

   File này được sinh tự động từ file kịch bản TXT trên Desktop.
   Muốn sửa lời thoại thì sửa file TXT, đừng sửa file này.
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

  /* ═══ cảnh: earth-home ═══ */

  {
    type: 'narration',
    art: 'earth-home',
    text: {
      vi: 'Trên cánh cửa tủ lạnh là tấm ảnh cả đội Ares 3 đứng cười toe toét trước bệ phóng. Watney dán tạm nó bằng băng keo điện, vì cục nam châm đã thất lạc đâu đó từ đợt dọn nhà.',
      en: 'Taped to the fridge door was a photo of the Ares 3 crew grinning in front of the launchpad. Watney had used black electrical tape after losing the magnet during the move.',
    },
  },
  {
    type: 'narration',
    art: 'earth-home',
    text: {
      vi: 'Căn hộ trống huơ trống hoác, đồ đạc đã vào thùng gần hết, chỉ trơ lại chiếc bàn ăn và hai cái ghế. Trên tường, tờ lịch được gạch chéo kín mít cho tới tận ngày phóng.',
      en: 'The apartment stood nearly bare, everything packed into boxes save for the kitchen table and two chairs. On the wall, the calendar was crossed off right up to launch day.',
    },
  },
  {
    type: 'dialogue',
    who: 'linh',
    text: {
      vi: 'Cái thùng này xếp vào đâu anh?',
      en: 'Where does this box go?',
    },
  },
  {
    type: 'dialogue',
    who: 'watney',
    text: {
      vi: 'Thùng nào cơ?',
      en: 'Which one?',
    },
  },
  {
    type: 'dialogue',
    who: 'linh',
    text: {
      vi: 'Thùng ghi chữ "Cấm mở". Mà em lỡ mở rồi.',
      en: 'The one labeled "Do Not Open." Too late, I already did.',
    },
  },

  /* ═══ cảnh: farewell ═══ */

  {
    type: 'narration',
    art: 'farewell',
    text: {
      vi: 'Bên trong chỉ có một hộp cà phê hòa tan và bốn cuốn tiểu thuyết cũ sờn gáy. Watney bật cười, ngồi bệt xuống sàn và đẩy hộp cà phê sang một bên.',
      en: 'Inside was a tin of instant coffee and four dog-eared paperbacks. Watney chuckled, sank onto the floor, and slid the coffee tin aside.',
    },
  },
  {
    type: 'dialogue',
    who: 'linh',
    text: {
      vi: 'Anh làm như mình sắp đi công tác vài hôm, tối lại nhắn tin về cho em không bằng.',
      en: 'You act like you\'re just flying to Dallas for the weekend, like you\'ll text me tonight.',
    },
  },
  {
    type: 'dialogue',
    who: 'watney',
    text: {
      vi: 'Tín hiệu từ Sao Hỏa về Trái Đất trễ có hai mươi phút thôi mà. Vẫn nhanh chán so với bưu điện quận mình.',
      en: 'Twenty-minute signal delay from Mars. Still faster than our local post office.',
    },
  },
  {
    type: 'dialogue',
    who: 'linh',
    text: {
      vi: 'Đừng hứa là anh sẽ về.',
      en: 'Don\'t promise me you\'ll come back.',
    },
  },
  {
    type: 'dialogue',
    who: 'watney',
    text: {
      vi: 'Thế em muốn anh hứa điều gì?',
      en: 'What do you want me to promise, then?',
    },
  },
  {
    type: 'dialogue',
    who: 'linh',
    text: {
      vi: 'Đừng làm trò gì ngu ngốc. Chuyện đó nằm trong tay anh.',
      en: 'Don\'t do anything stupid. That part is entirely up to you.',
    },
  },
  {
    type: 'narration',
    art: 'farewell',
    text: {
      vi: 'Anh gật đầu. Cả hai ngồi tựa lưng vào tủ bếp trong im lặng, lắng nghe tiếng tủ lạnh rì rì chạy cho đến khi kim đồng hồ chạm mốc ba giờ sáng.',
      en: 'He nodded. They sat back-to-back against the cabinets in quiet company, listening to the low hum of the fridge until the clock struck three.',
    },
  },
  {
    type: 'log',
    text: {
      vi: 'T−6 GIỜ · BỆ PHÓNG 39A · NHIÊN LIỆU ĐÃ NẠP · GIÓ 4 m/s',
      en: 'T−6 HOURS · PAD 39A · PROPELLANT LOADED · WIND 4 m/s',
    },
  },

  /* ═══ cảnh: launchpad ═══ */

  {
    type: 'narration',
    art: 'launchpad',
    text: {
      vi: 'Sáu tiếng trước giờ G, cả phi hành đoàn sáu người đứng ngay dưới chân tầng đẩy chính, cách nửa triệu lít nhiên liệu siêu lạnh chỉ vỏn vẹn ba chục mét.',
      en: 'Six hours before liftoff, all six crew members stood directly beneath the booster stage, barely thirty meters away from half a million liters of cryogenic fuel.',
    },
  },
  {
    type: 'dialogue',
    who: 'martinez',
    text: {
      vi: 'Chuyến trước tôi đứng ngay vạch sơn này làm một tấm để đời. Nay lại bỏ quên máy ảnh ở trạm gác... Ngồi trên đầu bốn trăm tấn thuốc phóng mà chẳng có nổi bức hình làm vốn.',
      en: 'Last mission I got a killer shot right on this paint line. Left my camera at the gatehouse today... Sitting atop four hundred tons of rocket fuel with nothing to show for it.',
    },
  },
  {
    type: 'dialogue',
    who: 'johanssen',
    text: {
      vi: 'Em chụp cho anh một tấm rồi. Mỗi tội anh nhắm tịt mắt đúng lúc bấm máy, với lại dây giày bên trái tuột rồi kìa.',
      en: 'I snapped one for you. Bad news is you blinked right at the flash, and your left bootlace is untied.',
    },
  },
  {
    type: 'log',
    text: {
      vi: 'SAO HỎA · SOL 6 · ACIDALIA PLANITIA · 16:40',
      en: 'MARS · SOL 6 · ACIDALIA PLANITIA · 16:40',
    },
  },

  /* ═══ cảnh: mars-surface ═══ */

  {
    type: 'narration',
    art: 'mars-surface',
    text: {
      vi: 'Chiều Sol 6, Watney đóng một chiếc cọc đo độ ẩm sâu tới đầu gối xuống lòng hố trũng. Mũi khoan lôi lên một lớp đất sét đỏ quạch, lạnh buốt như chạm vào thép.',
      en: 'On the afternoon of Sol 6, Watney drove a moisture probe knee-deep into a shallow basin. The core pulled up a plug of red clay, cold as bare steel.',
    },
  },
  {
    type: 'narration',
    art: 'mars-surface',
    text: {
      vi: 'Bụi Sao Hỏa bám đầy gioăng cổ mũ, hăng nồng mùi gỉ sắt mỗi lần xì áp trong khoang khí. Qua bộ đàm, Johanssen gọi í ới nhắc về trạm ăn tối trước khi súp nguội ngắt.',
      en: 'Martian dust caked the neck ring, sharp with the smell of rust every time he depressurized the airlock. Over comms, Johanssen called him back before the soup went cold.',
    },
  },
  {
    type: 'log',
    text: {
      vi: '19:22 · CẢNH BÁO BÃO CÁT · GIÓ 137 km/h · VƯỢT NGƯỠNG AN TOÀN MAV',
      en: '19:22 · DUST STORM WARNING · WIND 137 km/h · EXCEEDS MAV LIMIT',
    },
  },

  /* ═══ cảnh: storm-coming ═══ */

  {
    type: 'narration',
    art: 'storm-coming',
    text: {
      vi: 'Một bức tường cát khổng lồ dựng đứng, nuốt chửng màn hình radar. Chỉ bốn phút sau, bầu trời tối sầm như mực.',
      en: 'A towering wall of dust maxed out the radar screen. Four minutes later, the sky plunged into pitch darkness.',
    },
  },
  {
    type: 'dialogue',
    who: 'lewis',
    text: {
      vi: 'Hạ kính mũ! Toàn đội rút khẩn cấp về tàu MAV! Giữ cự ly một mét!',
      en: 'Visors down! Fall back to the MAV immediately! Keep one-meter spacing!',
    },
  },
  {
    type: 'dialogue',
    who: 'watney',
    text: {
      vi: 'Chỉ huy, bộ cảm biến vẫn cắm dưới hố, cho tôi hai mươi giây rút lõi pin...',
      en: 'Commander, the sensor array is still in the trench, give me twenty seconds to pull the battery...',
    },
  },
  {
    type: 'dialogue',
    who: 'lewis',
    text: {
      vi: 'Bỏ lại hết! Lên tàu ngay!',
      en: 'Leave it! Get to the ship, now!',
    },
  },
  {
    type: 'name',
    prompt: { vi: 'Tên định danh của bạn trong hồ sơ sứ mệnh là gì?', en: 'What is your callsign on the mission roster?' },
    hint: { vi: 'Nhập tên của bạn (hoặc giữ nguyên Watney) rồi nhấn Enter.', en: 'Type your name (or keep Watney) and press Enter.' },
    placeholder: { vi: 'Tên của bạn', en: 'Your name' },
  },

  /* ═══ cảnh: storm-impact ═══ */

  {
    type: 'narration',
    art: 'storm-impact',
    text: {
      vi: 'Một chảo ăng-ten bị gió giật đứt khỏi giá đỡ, xoáy tít trong bão rồi phang thẳng vào lưng {name}. Cú va chạm vang lên chát chúa như tiếng xà beng nện vào ống thép.',
      en: 'A communications dish sheared off its mount, spun violently in the gale, and slammed straight into {name}\'s back. It rang out like a crowbar striking a steel pipe.',
    },
  },
  {
    type: 'narration',
    art: 'storm-impact',
    text: {
      vi: 'Mảnh kim loại xuyên thủng bộ đồ du hành, cắt đứt cáp sinh hiệu. Khí lạnh tràn ùa vào cổ áo; trên bảng điều khiển tàu MAV, áp suất tụt thẳng từ 100 xuống mức báo động.',
      en: 'Shrapnel punctured the suit and severed the telemetry line. Freezing air rushed through the torn collar; on the MAV console, suit pressure plummeted from 100 kPa into the red.',
    },
  },
  {
    type: 'dialogue',
    who: 'beck',
    text: {
      vi: 'Mất tín hiệu sinh tồn kênh số 4! Không đo được nhịp tim, áp suất bộ đồ đang rò rỉ nghiêm trọng!',
      en: 'Channel 4 telemetry is dead! No heart rate trace, and suit pressure is dropping fast!',
    },
  },
  {
    type: 'dialogue',
    who: 'martinez',
    text: {
      vi: 'Tàu nghiêng 11,4 độ rồi! Chạm 13 độ là lật úp... Chỉ huy, chân chống số hai đang lún sâu xuống cát!',
      en: 'Tilt is at 11.4 degrees! We tip at 13... Commander, strut two is sinking into the sand!',
    },
  },
  {
    type: 'dialogue',
    who: 'beck',
    text: {
      vi: 'Với mức áp suất đó cậu ấy chỉ cầm cự được chín mươi giây trước khi ngạt! Cho tôi mười lăm mét dây cáp, tôi sẽ ra tìm!',
      en: 'At that pressure, there\'s ninety seconds before hypoxia sets in! Give me fifteen meters of tether. I\'m going out!',
    },
  },
  {
    type: 'dialogue',
    who: 'martinez',
    text: {
      vi: 'Mười lăm mét gì tầm này, tầm nhìn bằng không, gió giật tám mươi hải lý! Mở cửa khoang lúc này là cả con tàu bay xác!',
      en: 'Fifteen meters into what?! Visibility is zero and gusts are hitting eighty knots! Crack that hatch now and we lose the whole ship!',
    },
  },

  /* ═══ cảnh: departure ═══ */

  {
    type: 'narration',
    art: 'departure',
    text: {
      vi: 'Lewis gạt nắp bảo vệ công tắc đánh lửa. Ngón cái bà đặt lên nút bấm màu đỏ, các đốt ngón tay trắng bệch dưới ánh đèn bảng điều khiển.',
      en: 'Lewis flipped open the safety guard on the ignition switch. Her thumb hovered over the red button, knuckles white under the console glow.',
    },
  },
  {
    type: 'dialogue',
    who: 'lewis',
    text: {
      vi: 'Đốt tầng một. Hủy sứ mệnh.',
      en: 'Light stage one. Abort mission.',
    },
  },
  {
    type: 'narration',
    art: 'departure',
    text: {
      vi: 'Sàn khoang rung lên bần bật khi động cơ gầm rú. Martinez áp chặt mặt kính mũ vào ô cửa sổ cho đến khi bên ngoài chỉ còn một màu cam đặc quánh, và vẫn đứng chôn chân như thế suốt hai phút sau.',
      en: 'The deck plates rattled violently as the engines roared to life. Martinez pressed his visor against the viewport until the outside turned solid orange, and stayed frozen there for two full minutes.',
    },
  },
  {
    type: 'narration',
    art: 'departure',
    text: {
      vi: 'Không một ai thốt nên lời suốt chặng bay lên quỹ đạo. Vogel tháo tai nghe ra rồi lại đeo vào, lặp đi lặp lại hai lần trong vô thức.',
      en: 'Not a single word was spoken on the ascent. Vogel pulled his headset off and put it back on, twice, as if unsure what to do with his hands.',
    },
  },
  {
    type: 'log',
    text: {
      vi: 'SOL 7 · 04:11 · ÁP SUẤT KHOANG HAB 101,3 kPa · MẤT LIÊN LẠC VỚI TRÁI ĐẤT',
      en: 'SOL 7 · 04:11 · HAB PRESSURE 101.3 kPa · NO SIGNAL FROM EARTH',
    },
  },

  /* ═══ cảnh: awake ═══ */

  {
    type: 'narration',
    art: 'awake',
    text: {
      vi: 'Cơn bão tan sau mười một tiếng quần thảo. Trong khoang Hab chỉ còn tiếng quạt lọc khí rì rì. {name} mở mắt, khớp vai trái cứng đờ; lớp keo tự vá của bộ đồ đã đông cứng lại thành một cục nhựa đen sần sùi ngay cổ áo.',
      en: 'The storm blew itself out after eleven hours. Inside the Hab, only the air-scrubber fans hummed. {name} opened their eyes with a locked left shoulder; the suit\'s emergency sealant had cured into a rough black lump across the collar.',
    },
  },
  {
    type: 'narration',
    art: 'awake',
    text: {
      vi: '{name} lết một vòng quanh khoang trú ẩn. Sáu giá treo đồ phi hành gia. Năm cái trống trơn, duy nhất bộ đồ của {name} đang treo ở giá cuối cùng.',
      en: '{name} made a slow lap around the Hab. Six suit racks. Five stood completely empty; only {name}\'s own suit hung on the sixth.',
    },
  },
  {
    type: 'narration',
    art: 'awake',
    text: {
      vi: 'Bật thử hệ thống liên lạc suốt hai mươi phút, thứ duy nhất phát ra từ loa chỉ là tiếng nhiễu tĩnh điện xè xè đều đặn. Chẳng còn ai trên hành tinh này ngoài {name}.',
      en: 'Leaving the transceiver open for twenty minutes yielded nothing but a steady hiss of static. Nobody else was left on the planet.',
    },
  },
  {
    type: 'narration',
    art: 'awake',
    text: {
      vi: '{name} mở tủ thực phẩm, đếm kỹ từng gói khẩu phần, rồi lẩm bẩm đếm lại lần nữa. Cuối cùng, {name} xé một trang giấy từ sổ tay, ghi con số đó lên, và gạch dưới hai đường thật đậm.',
      en: '{name} opened the food locker, counted the ration packs, then counted them a second time. Tearing a sheet from a notebook, {name} wrote the number down and underlined it twice.',
    },
  },
];
