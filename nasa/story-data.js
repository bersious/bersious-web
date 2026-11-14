/* ============================================================
   story-data.js. Toàn bộ lời kể của màn mở đầu.
   Sửa chữ ở đây. Không cần đụng JS/CSS.

   Lượt (beat) có bốn loại:
     type: 'log'        → một dòng nhật ký kỹ thuật (số liệu, mốc thời gian)
     type: 'narration'  → lời kể
     type: 'name'       → bảng hỏi tên người chơi
     type: 'dialogue'   → một nhân vật nói

   Trong text: {name} = tên người chơi. *chữ* = in nghiêng.
   'art' là KHE ẢNH, đổi sang art khác trong art.js là xong.
   'caption' là dòng chữ nhỏ góc trên trái của tranh.
   ============================================================ */

export const CREW = [
  {
    id: 'commander',
    name: 'Khoa',
    full: 'Trần Minh Khoa',
    role: 'Chỉ huy sứ mệnh · Địa chất',
    color: '#e0784a',
    short: 'CK',
  },
  {
    id: 'pilot',
    name: 'Hoàng',
    full: 'Lê Hoàng',
    role: 'Phi công · Kỹ sư hệ thống',
    color: '#8fb08a',
    short: 'LH',
  },
  {
    id: 'medic',
    name: 'Hà',
    full: 'Nguyễn Thu Hà',
    role: 'Bác sĩ · Sinh học',
    color: '#7fa3c8',
    short: 'TH',
  },
];

export const PLAYER_ROLE = 'Nhà thực vật học · Kỹ sư cơ khí';

export const STORY = [
  /* --- 1. bối cảnh --- */
  {
    type: 'log',
    text: 'SOL 018/031 · ACIDALIA PLANITIA · 46,7°N 22,3°W',
  },
  {
    type: 'narration',
    art: 'mars-surface',
    caption: 'Acidalia Planitia · Sol 18',
    text:
      'Ngày thứ mười tám của chuyến khảo sát ba mươi mốt ngày. Bốn người, một khoang trú ẩn, ' +
      'và một cái hố đang mở dần xuống lớp đất sét đỏ.',
  },
  {
    type: 'narration',
    art: 'mars-surface',
    text:
      'Đến cuối tuần này cả đội phải về tàu, cất cánh, và bay vòng lên quỹ đạo để bắt chuyến về nhà. ' +
      'Mọi thứ vẫn đúng lịch. Đó là điều cuối cùng còn đúng.',
  },

  /* --- 2. tên người chơi --- */
  {
    type: 'name',
    prompt: 'Nhật ký sứ mệnh cần một chữ ký.',
    hint: 'Gõ tên của bạn rồi bấm Enter, hoặc bấm nút Tiếp.',
    placeholder: 'Tên của bạn',
  },
  {
    type: 'narration',
    art: 'mars-surface',
    text:
      '{name} ghi tên mình vào nhật ký như mỗi tối. Hôm nay là mục thứ mười tám, ' +
      'và là mục cuối cùng được ghi bằng nét chữ bình thường.',
  },

  /* --- 3. bão tới --- */
  {
    type: 'log',
    text: '14:22 · CẢNH BÁO BÃO BỤI · HƯỚNG TÂY · TỐC ĐỘ VƯỢT NGƯỠNG AN TOÀN',
  },
  {
    type: 'narration',
    art: 'storm-coming',
    caption: 'Một cảnh báo, rồi một quyết định',
    text:
      'Mười bốn giờ hai mươi hai. Đài quan trắc gửi một dòng cảnh báo: một bức tường bụi cao vài ' +
      'nghìn mét đang cuộn tới từ phía tây, mạnh hơn dự báo ba tiếng và không có dấu hiệu yếu đi.',
  },
  {
    type: 'dialogue',
    who: 'commander',
    text:
      'Kết thúc sớm. Ba mươi phút. Chỉ mang mẫu đá và đĩa dữ liệu. Bỏ hết máy móc nặng lại. ' +
      'Không ai quay về lấy đồ.',
  },
  {
    type: 'dialogue',
    who: 'pilot',
    text:
      'Chỉ huy, tàu chỉ chịu được gió tới một mức nhất định. Nếu nó nghiêng quá thì chúng ta ' +
      'không cất cánh được nữa, mà ở lại thì hết.',
  },

  /* --- 4. tai nạn --- */
  {
    type: 'narration',
    art: 'storm-impact',
    caption: 'Phút thứ 27',
    text:
      'Phút thứ hai mươi bảy. Một tấm ốp ăng-ten bị gió bốc khỏi giá đỡ, xoay hai vòng trong ' +
      'không khí rồi đập vào lưng {name}.',
  },
  {
    type: 'narration',
    art: 'storm-impact',
    text:
      'Bộ du hành báo thủng ở vai trái. Áp suất trong bộ đồ tụt từ một trăm lên bốn mươi kPa ' +
      'trong chưa đầy hai giây. Rồi máy đo sinh tồn trên ngực {name} ngừng phát tín hiệu.',
  },
  {
    type: 'dialogue',
    who: 'pilot',
    text:
      'Không có tín hiệu. Không có nhịp tim, không có hơi thở, không có gì cả. ' +
      'Tôi đang nhìn vào một màn hình trống.',
  },
  {
    type: 'dialogue',
    who: 'medic',
    text:
      'Tôi cần thêm thời gian. Cho tôi năm phút. Chỉ năm phút thôi, tôi có thể ra đó.',
  },
  {
    type: 'dialogue',
    who: 'pilot',
    text:
      'Năm phút nữa thì gió lật tàu. Cả bốn người chết, không phải một.',
  },
  {
    type: 'narration',
    art: 'storm-impact',
    text:
      'Chỉ huy im lặng bốn giây. Bốn giây dài nhất trong toàn bộ chương trình sao Hỏa.',
  },
  {
    type: 'dialogue',
    who: 'commander',
    text: 'Cất cánh.',
  },

  /* --- 5. rời đi --- */
  {
    type: 'narration',
    art: 'departure',
    caption: '14:58 · rời bề mặt',
    text:
      'Tàu rời bề mặt lúc mười bốn giờ năm mươi tám. Ba người trên khoang nhìn xuống qua cửa sổ ' +
      'cho tới khi bức tường bụi nuốt mất chỗ họ vừa đứng.',
  },
  {
    type: 'dialogue',
    who: 'medic',
    text: 'Tôi đã để cậu ấy lại đó. Cậu hiểu không. Tôi để cậu ấy lại đó.',
  },
  {
    type: 'narration',
    art: 'departure',
    text:
      'Trên hồ sơ, phi hành đoàn bốn người giờ còn ba. Trạm điều khiển ghi nhận một sự cố ' +
      'thiết bị. Bốn năm nữa mới có chuyến tiếp theo tới Acidalia Planitia.',
  },

  /* --- 6. tỉnh dậy --- */
  {
    type: 'log',
    text: 'SOL 019 · 04:11 · ÁP SUẤT KHOANG 101,3 kPa · KHÔNG CÓ TÍN HIỆU TỪ TRẠM',
  },
  {
    type: 'narration',
    art: 'awake',
    caption: 'Sol 19 · 04:11',
    text:
      'Cơn bão đi qua sau mười một giờ. Bụi lắng xuống, trời chuyển sang màu vàng nhợt quen thuộc.',
  },
  {
    type: 'narration',
    art: 'awake',
    text:
      '{name} mở mắt. Vai trái rách một đường, đã được bộ đồ tự hàn. Áp suất trong khoang ' +
      'bình thường. Đèn khẩn cấp vẫn nhấp nháy.',
  },
  {
    type: 'narration',
    art: 'awake',
    text:
      'Ngoài cửa sổ không có tàu. Trong khoang không có ai. Radio mở suốt hai mươi phút chỉ ' +
      'trả về tiếng rè đều đều của một tần số chết.',
  },
  {
    type: 'narration',
    art: 'awake',
    text:
      'Bốn năm. Đó là khoảng thời gian trước khi có ai quay lại đây. ' +
      'Và trong bốn năm, một người cần ăn khoảng bốn nghìn bữa.',
  },
];
