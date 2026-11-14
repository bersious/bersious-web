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

   Quy tắc viết, học từ skill game-narrative-design:
   - Mỗi đoạn phải có ít nhất một hình ảnh cụ thể nhìn thấy được.
   - Không giải thích cảm xúc sau khi đã tả hành động.
   - Không liệt kê ba ý đối xứng.
   - Không kết đoạn bằng câu kêu gọi hay châm ngôn.
   - Nhân vật nói lệch câu hỏi, ngắt câu, không nói tròn trịa.
   - Nhật ký là chỗ xả, giọng hài nhẹ dù chuyện nặng.
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
  /* ═══════════ MỞ ĐẦU: TRÊN TRÁI ĐẤT ═══════════ */

  {
    type: 'narration',
    art: 'earth-home',
    caption: { vi: 'Houston · ba tuần trước khi phóng', en: 'Houston · three weeks before launch' },
    text: {
      vi:
        'Trong bếp nhà Watney có một bức ảnh chụp cả nhóm Ares 3 đứng trước tên lửa. ' +
        'Anh dán nó lên cánh cửa tủ lạnh bằng băng dính điện, vì nam châm đã rơi mất từ đợt chuyển nhà.',
      en:
        'A photo of the Ares 3 crew in front of the rocket hung in Watney\'s kitchen. ' +
        'He\'d taped it to the fridge door with electrical tape after losing the magnet in the move.',
    },
  },
  {
    type: 'narration',
    art: 'earth-home',
    text: {
      vi:
        'Đồ đạc trong nhà đã đóng thùng gần hết. Còn lại cái bàn với hai cái ghế. ' +
        'Trên tường, tờ lịch đã gạch kín tới ngày phóng.',
      en:
        'Most of the apartment was already in boxes. Just the table and two chairs left out. ' +
        'The wall calendar was crossed off all the way to launch day.',
    },
  },
  {
    type: 'dialogue',
    who: 'linh',
    text: {
      vi: 'Cái này bỏ đâu?',
      en: 'Where does this go?',
    },
  },
  {
    type: 'dialogue',
    who: 'watney',
    text: {
      vi: 'Thùng nào cơ?',
      en: 'Which box?',
    },
  },
  {
    type: 'dialogue',
    who: 'linh',
    text: {
      vi: 'Thùng ghi cấm mở. Mở rồi.',
      en: 'The one marked do not open. Opened it.',
    },
  },
  {
    type: 'narration',
    art: 'farewell',
    caption: { vi: 'Đêm cuối ở nhà', en: 'The last night at home' },
    text: {
      vi:
        'Trong thùng là một hộp cà phê hòa tan và bốn quyển truyện cũ. ' +
        'Watney ngồi xuống sàn, đặt hộp cà phê sang một bên.',
      en:
        'Inside was a tin of instant coffee and four worn paperbacks. ' +
        'Watney sat on the floor and pushed the coffee aside.',
    },
  },
  {
    type: 'dialogue',
    who: 'linh',
    text: {
      vi:
        'Anh nói cứ như đi công tác tỉnh. Nhắn tin qua lại bình thường.',
      en:
        'You talk like it\'s a conference in Dallas. Like you\'ll just text.',
    },
  },
  {
    type: 'dialogue',
    who: 'watney',
    text: {
      vi: 'Độ trễ đường truyền có hai mươi phút một chiều thôi. Vẫn ăn đứt bưu điện quận mình.',
      en: 'Twenty-minute one-way ping. Still beats our local post office.',
    },
  },
  {
    type: 'dialogue',
    who: 'linh',
    text: {
      vi: 'Khỏi hứa là sẽ về.',
      en: 'Don\'t promise me you\'ll come back.',
    },
  },
  {
    type: 'dialogue',
    who: 'watney',
    text: {
      vi: 'Thế hứa khoản nào?',
      en: 'What\'s on the contract then?',
    },
  },
  {
    type: 'dialogue',
    who: 'linh',
    text: {
      vi: 'Đừng có làm trò ngu. Cái đó trong tay anh.',
      en: 'Nothing stupid. That part\'s on you.',
    },
  },
  {
    type: 'narration',
    art: 'farewell',
    text: {
      vi:
        'Anh gật đầu. Hai người ngồi tựa lưng vào tủ bếp, nghe lốc tủ lạnh đóng ngắt, ' +
        'cho tới khi đồng hồ nhảy sang ba giờ sáng.',
      en:
        'He nodded. They sat with their backs against the cabinets, listening to the fridge compressor cycle on and off ' +
        'until the clock hit three.',
    },
  },

  /* ═══════════ BỆ PHÓNG ═══════════ */

  {
    type: 'log',
    text: {
      vi: 'T−6 GIỜ · BỆ PHÓNG 39A · NHIÊN LIỆU ĐÃ NẠP · GIÓ 4 m/s',
      en: 'T−6 HOURS · PAD 39A · PROPELLANT LOADED · WIND 4 m/s',
    },
  },
  {
    type: 'narration',
    art: 'launchpad',
    text: {
      vi:
        'Sáu giờ trước giờ G, cả nhóm sáu người đứng ngay dưới chân tầng đẩy. ' +
        'Đứng cách nửa triệu lít nhiên liệu lạnh có ba chục mét.',
      en:
        'Six hours to launch, all six of them stood right under the first stage. ' +
        'Thirty meters from half a million liters of cryo propellant.',
    },
  },
  {
    type: 'dialogue',
    who: 'martinez',
    text: {
      vi: 'Chuyến trước đứng ngay vạch sơn này bấm một kiểu. Nay bỏ quên máy ở trạm gác... bốn trăm tấn thuốc phóng trên đầu mà không có tấm hình làm vốn.',
      en: 'Last flight I got a shot right on this paint line. Left the camera at the gatehouse today... four hundred tons of propellant overhead and nothing to show for it.',
    },
  },
  {
    type: 'dialogue',
    who: 'johanssen',
    text: {
      vi: 'Em bấm một tấm rồi. Anh chớp mắt đúng lúc màn trập đóng, với lại dây giày bên trái tuột kìa.',
      en: 'I took one. You blinked right on the shutter, and your left bootlace is untied.',
    },
  },

  /* ═══════════ HỒI I: ĐỒNG BẰNG ACIDALIA ═══════════ */

  {
    type: 'log',
    text: {
      vi: 'SAO HỎA · SOL 6 · ACIDALIA PLANITIA · 03:40',
      en: 'MARS · SOL 6 · ACIDALIA PLANITIA · 03:40',
    },
  },
  {
    type: 'narration',
    art: 'mars-surface',
    caption: { vi: 'Acidalia Planitia · Sol 6', en: 'Acidalia Planitia · Sol 6' },
    text: {
      vi:
        'Hôm đó Watney cắm một cái cọc đo độ ẩm xuống chỗ trũng, sâu tới đầu gối. ' +
        'Đáy lộ ra lớp sét đỏ, lạnh như sờ vào kim loại.',
      en:
        'That day Watney drove a moisture probe knee-deep into a hollow. ' +
        'It brought up a plug of red clay, cold as bare metal.',
    },
  },
  {
    type: 'narration',
    art: 'mars-surface',
    text: {
      vi:
        'Bụi sao Hỏa bám vào gioăng cổ mũ, hăng mùi gỉ sắt. Mỗi lần tháo mũ ở khoang khí là xộc lên mũi. ' +
        'Trong tai nghe, Johanssen nhắc về ăn trước khi súp nguội.',
      en:
        'Martian dust clung to the neck ring, sharp with rust. It hit his nose every time he popped the seal in the airlock. ' +
        'Over comms, Johanssen told him to come eat before the soup got cold.',
    },
  },

  /* ═══════════ HỒI II: CƠN BÃO ═══════════ */

  {
    type: 'log',
    text: {
      vi: '19:22 · CẢNH BÁO BÃO CÁT · GIÓ 137 km/h · VƯỢT NGƯỠNG MAV',
      en: '19:22 · DUST STORM WARNING · WIND 137 km/h · ABOVE MAV LIMIT',
    },
  },
  {
    type: 'narration',
    art: 'storm-coming',
    caption: { vi: 'Bức tường bụi phía tây', en: 'The dust wall to the west' },
    text: {
      vi:
        'Bức tường bụi dựng đứng, kịch trần màn hình radar. Bốn phút sau trời tối đặc.',
      en:
        'A wall of dust topped out the radar screen. Four minutes later the sky went pitch black.',
    },
  },
  {
    type: 'dialogue',
    who: 'lewis',
    text: {
      vi: 'Khóa mũ. Rút về MAV. Khoảng cách một mét.',
      en: 'Visors down. Move to the MAV. One-meter spacing.',
    },
  },
  {
    type: 'dialogue',
    who: 'watney',
    text: {
      vi: 'Chỉ huy, còn cái cọc đo cắm dưới hố, mất hai mươi giây rút nguồn thôi...',
      en: 'Commander, the probe\'s still in the trench, twenty seconds to pull the battery...',
    },
  },
  {
    type: 'dialogue',
    who: 'lewis',
    text: {
      vi: 'Bỏ. Lên tàu.',
      en: 'Leave it. Move.',
    },
  },

  /* ═══════════ HỒI III: TAI NẠN ═══════════ */

  {
    type: 'name',
    prompt: { vi: 'Bạn là ai trong nhóm này?', en: 'Who are you in this crew?' },
    hint: {
      vi: 'Nhật ký sứ mệnh cần một cái tên. Gõ vào rồi bấm Enter.',
      en: 'The mission log needs a name. Type it and press Enter.',
    },
    placeholder: { vi: 'Tên của bạn', en: 'Your name' },
  },
  {
    type: 'narration',
    art: 'storm-impact',
    caption: { vi: 'Mảnh ăng-ten', en: 'The antenna panel' },
    text: {
      vi:
        'Mảnh ăng-ten bật ra khỏi giá đỡ, quay hai vòng trong gió, rồi đập vào lưng {name}. ' +
        'Tiếng nghe như ai đó gõ mạnh vào ống thép.',
      en:
        'The antenna dish sheared off its mount, spun twice in the wind, and slammed into {name}\'s back. ' +
        'It rang like a crowbar hitting a steel pipe.',
    },
  },
  {
    type: 'narration',
    art: 'storm-impact',
    text: {
      vi:
        'Bộ đo sinh hiệu đứt. Hơi lạnh tràn vào cổ áo qua chỗ rách. ' +
        'Trên màn hình trong tàu, áp suất tụt từ một trăm xuống bốn mươi kPa.',
      en:
        'Biometrics flatlined. Freezing air poured in through the torn collar. ' +
        'On the MAV console, suit pressure dropped from 100 to 40 kPa.',
    },
  },
  {
    type: 'dialogue',
    who: 'beck',
    text: {
      vi: 'Kênh sinh hiệu số 4 mất sóng. Nhịp tim không đọc được, áp suất bộ đồ xuống dưới 40 kPa.',
      en: 'Telemetry on channel 4 is gone. No heart rate trace, suit pressure under 40 kPa.',
    },
  },
  {
    type: 'dialogue',
    who: 'martinez',
    text: {
      vi: 'Nghiêng 11,4 độ rồi. Lên 13 độ là lật... Chỉ huy, chân chống số hai đang lún.',
      en: 'Pitch is at 11.4 degrees. We tip at 13... Commander, strut two is sinking.',
    },
  },

  /* ═══════════ HỒI IV: QUYẾT ĐỊNH ═══════════ */

  {
    type: 'dialogue',
    who: 'beck',
    text: {
      vi: 'Ở áp suất đó còn khoảng chín mươi giây trước khi ngạt. Cho tôi ra dây cáp mười lăm mét.',
      en: 'At that pressure there\'s maybe ninety seconds before hypoxia. Give me fifteen meters of tether.',
    },
  },
  {
    type: 'dialogue',
    who: 'martinez',
    text: {
      vi: 'Mười lăm mét gì, tầm nhìn bằng không, gió giật tám mươi nút... Mở nắp hầm bây giờ là bay luôn cả khoang.',
      en: 'Fifteen meters of what, visibility is zero and gusts are hitting eighty knots... Crack that hatch now and we lose the whole rig.',
    },
  },
  {
    type: 'narration',
    art: 'departure',
    text: {
      vi:
        'Lewis lật nắp bảo vệ công tắc đốt tầng một. Ngón cái bà đặt lên mặt nhựa đỏ, ' +
        'đốt ngón tay trắng bệch dưới ánh đèn bảng điều khiển.',
      en:
        'Lewis flipped the guard on the first-stage ignition switch. She rested her thumb on the red plastic, ' +
        'knuckle white under the console lights.',
    },
  },
  {
    type: 'dialogue',
    who: 'lewis',
    text: {
      vi: 'Đốt tầng một.',
      en: 'Light it.',
    },
  },

  /* ═══════════ HỒI V: NĂM NGƯỜI RỜI ĐI ═══════════ */

  {
    type: 'narration',
    art: 'departure',
    caption: { vi: 'Sol 6 · 14:58', en: 'Sol 6 · 14:58' },
    text: {
      vi:
        'Cát đỏ rung theo dưới sàn khoang. Martinez dán mặt vào cửa sổ cho tới khi ngoài kia chỉ còn màu cam đặc, ' +
        'rồi vẫn giữ nguyên thêm hai phút nữa.',
      en:
        'Red sand rattled against the deck plates. Martinez pressed his helmet to the viewport until the outside turned solid orange, ' +
        'then stayed there another two minutes.',
    },
  },
  {
    type: 'narration',
    art: 'departure',
    text: {
      vi:
        'Không ai nói chuyện trong suốt quãng bay lên. Vogel tháo tai nghe ra rồi đeo lại, ' +
        'hai lần liền.',
      en:
        'Nobody spoke on the ascent. Vogel pulled his headset off and put it back on, twice in a row.',
    },
  },

  /* ═══════════ HỒI VI: SOL 19 ═══════════ */

  {
    type: 'log',
    text: {
      vi: 'SOL 19 · 04:11 · ÁP SUẤT KHOANG 101,3 kPa · KHÔNG CÓ TÍN HIỆU TỪ TRẠM',
      en: 'SOL 19 · 04:11 · HAB PRESSURE 101.3 kPa · NO SIGNAL FROM EARTH',
    },
  },
  {
    type: 'narration',
    art: 'awake',
    caption: { vi: 'Sol 19 · 04:11', en: 'Sol 19 · 04:11' },
    text: {
      vi:
        'Bão tan sau mười một tiếng. Trong Hab chỉ còn tiếng quạt lọc gió rì rì. ' +
        'Watney mở mắt, khớp vai trái cứng đờ; lớp keo tự vá của bộ đồ đã đông lại thành một cục nhựa đen sần sùi ngang cổ.',
      en:
        'The storm blew itself out after eleven hours. Only the air-scrubber fan was humming in the Hab. ' +
        'Watney opened his eyes with his left shoulder locked up; the suit\'s sealant had cured into a rough black lump across his collar.',
    },
  },
  {
    type: 'narration',
    art: 'awake',
    text: {
      vi:
        'Anh đi một vòng khoang trú ẩn. Sáu cái giá treo đồ. Năm cái trống, một cái còn bộ đồ của anh.',
      en:
        'He did one lap of the Hab. Six suit racks. Five empty, his own hanging on the sixth.',
    },
  },
  {
    type: 'narration',
    art: 'awake',
    text: {
      vi:
        'Anh bật đài thu phát suốt hai mươi phút. Loa chỉ xè xè tiếng nhiễu tĩnh điện, đều như nước rò sau vách tôn.',
      en:
        'He left the transceiver open for twenty minutes. Nothing came off the speaker but static, steady as water leaking behind sheet metal.',
    },
  },
  {
    type: 'narration',
    art: 'awake',
    text: {
      vi:
        'Watney mở tủ đựng thức ăn, đếm số gói, rồi đếm lại. ' +
        'Anh lấy một tờ giấy trong sổ tay ra, ghi con số lên đó, và gạch dưới nó hai lần.',
      en:
        'Watney opened the food locker, counted the ration packs, then counted them again. ' +
        'He tore a sheet from his notebook, wrote the number down, and underlined it twice.',
    },
  },
];
