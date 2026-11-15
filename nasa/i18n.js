/* ============================================================
   i18n.js
   Hệ thống song ngữ Việt / Anh cho toàn bộ game.

   >>> KHI THÊM NỘI DUNG MỚI, BẮT BUỘC THÊM CẢ HAI BẢN <<<
   Mọi câu chữ hiện ra cho người chơi phải có khoá trong VI và EN.
   Thiếu một bên là lỗi, không phải "để sau".

   Cách dùng trong JS:
       import { t, setLang, getLang, onLangChange } from './i18n.js';
       el.textContent = t('settings.title');

   Cách dùng trong HTML tĩnh:
       <span data-i18n="settings.title"></span>
   rồi gọi applyToDom() sau khi đổi ngôn ngữ.
   ============================================================ */

const KEY = 'smdg.lang';

export const STRINGS = {
  vi: {
    /* ---------- chung ---------- */
    'app.title': 'Space Mission Design Game',
    'app.tagline': 'Thiết kế một sứ mệnh không gian và hiểu ra cái giá của từng quyết định.',
    'app.start': 'Bắt đầu',
    'app.again': 'Xem lại mở đầu',
    'app.continue': 'Tiếp tục',

    /* ---------- điều hướng màn mở đầu ---------- */
    'nav.prev': 'Trước',
    'nav.next': 'Tiếp',

    /* ---------- hồi ---------- */
    'act.0': 'Hồi I · Trên Trái Đất',
    'act.1': 'Hồi II · Khảo sát',
    'act.2': 'Hồi III · Cơn bão',
    'act.3': 'Hồi IV · Sol 19',

    /* ---------- nhập tên ---------- */
    'name.label': 'Tên phi hành gia',
    'name.sign': 'Ký tên',
    'name.placeholder': 'Tên của bạn',
    'name.prompt': 'Bạn là ai trong nhóm này?',
    'name.hint': 'Nhật ký sứ mệnh cần một cái tên. Gõ vào rồi bấm Enter.',

    /* ---------- bảng cài đặt ---------- */
    'settings.open': 'Cài đặt',
    'base.sleep.forecastTitle': 'Dự báo sáng mai',
    'base.sleep.forecastSub': 'Chỉ số lúc 07:00 nếu bạn đi ngủ bây giờ.',
    'base.sleep.forecastDeath': 'Cảnh báo: bạn sẽ không tỉnh lại. Hãy ăn uống trước khi ngủ.',
    'base.sleep.forecastThirsty': 'Cảnh báo: sẽ khát nước khi thức dậy.',
    'base.sleep.confirmYes': 'Đi ngủ',
    'base.sleep.confirmNo': 'Chưa ngủ',
    'hud.crew': 'Phi hành gia',
    'hud.station': 'Trạm',
    'hud.stamina': 'Thể lực',
    'hud.calories': 'Calo',
    'hud.water': 'Nước',
    'hud.sanity': 'Tinh thần',
    'hud.power': 'Điện',
    'hud.oxygen': 'Oxy',
    'hud.seal': 'Độ kín',
    'base.craft.patch_seal': 'Vá lỗ thủng vỏ trạm',
    'base.craft.make_water': 'Đốt hydrazine tạo nước',
    'base.craft.water_filter': 'Lắp bộ lọc nước',
    'base.craft.power_cell': 'Lắp pin mở rộng',
    'base.craft.title': 'Bàn chế tạo',
    'base.craft.sub': 'Ghép vật phẩm thành thứ dùng được.',
    'base.craft.cost': 'Tốn:',
    'base.craft.gives': 'Được:',
    'base.craft.risk': 'Tinh thần dưới 40: {n} phần trăm hỏng việc.',
    'base.craft.do': 'Chế tạo',
    'base.craft.short': 'Thiếu vật tư',
    'base.craft.done': 'Xong rồi.',
    'base.craft.fail': 'Không chế tạo được.',
    'base.craft.upg.waterFilter': 'Bộ lọc nước: tốn ít nước hơn',
    'base.craft.upg.powerCell': 'Pin mở rộng: chứa thêm điện',
    'base.radio.title': 'Liên lạc',
    'base.radio.sub': 'Gọi về Trái Đất qua đĩa sóng còn lại.',
    'base.radio.locked': 'Chưa lắp được bộ phát. Cần 2 linh kiện và 1 băng keo.',
    'base.radio.buildFirst': 'Chưa dùng được',
    'base.radio.call': 'Gọi',
    'base.radio.limit': 'Mỗi lần gọi hồi 10 điểm tinh thần.',
    'base.radio.intro': 'Tôi: “Đây là trạm Ares 3, có ai nghe không?”',
    'base.radio.calling': 'Tôi: “Đang gọi… sóng đi 20 phút mới tới.”',
    'base.radio.contactToast': 'Liên lạc được. Tinh thần hồi 10 điểm.',
    'settings.title': 'Cài đặt',
    'settings.close': 'Đóng',

    'settings.audio': 'Âm thanh',
    'settings.music': 'Nhạc nền',
    'settings.music.desc': 'Nhạc không lời phát trong suốt màn chơi.',
    'settings.sfx': 'Hiệu ứng âm thanh',
    'settings.sfx.desc': 'Tiếng bấm nút và phản hồi giao diện.',
    'settings.volume': 'Âm lượng',

    'settings.graphics': 'Đồ hoạ',
    'settings.fullscreen': 'Chế độ toàn màn hình',
    'settings.fullscreen.desc': 'Giống phím F11. Bấm F để bật tắt nhanh.',
    'settings.fullscreen.enter': 'Bật toàn màn hình',
    'settings.fullscreen.exit': 'Thoát toàn màn hình',
    'settings.quality': 'Chất lượng hình',
    'settings.quality.auto': 'Tự động',
    'settings.quality.high': 'Cao',
    'settings.quality.low': 'Thấp',
    'settings.quality.desc': 'Mức thấp tắt hiệu ứng chuyển động để máy yếu chạy mượt hơn.',
    'settings.motion': 'Hiệu ứng chuyển động',
    'settings.motion.desc': 'Tắt để giảm chuyển động, phù hợp khi chóng mặt hoặc máy yếu.',
    'settings.textsize': 'Cỡ chữ',
    'settings.textsize.desc': 'Tăng cỡ chữ nếu đọc trên màn hình lớn thấy nhỏ.',

    'settings.language': 'Ngôn ngữ',
    'settings.language.desc': 'Đổi ngôn ngữ cho toàn bộ giao diện và lời kể.',

    'settings.data': 'Dữ liệu',
    'settings.reset': 'Xoá dữ liệu đã lưu',
    'settings.reset.desc': 'Xoá tên đã lưu và mọi cài đặt, đưa game về trạng thái ban đầu.',
    'settings.reset.confirm': 'Xoá hết?',
    'settings.credits': 'Ghi nguồn',

    /* ---------- giá trị bật tắt ---------- */
    'on': 'Bật',
    'off': 'Tắt',

    /* ---------- màn căn cứ ---------- */
    'base.who': 'Phi hành gia',
    'base.whoFallback': 'Chưa đặt tên',
    'base.heading': 'Chọn việc cho hôm nay',
    'base.day': 'Ngày {n}',
    'base.night': 'Ban đêm',
    'base.daytime': 'Ban ngày',
    'base.close': 'Đóng',

    'base.farm': 'Nông trại',
    'base.farm.desc': 'Khoang trồng rau trong nhà kính. Chưa có gì để gieo.',
    'base.farm.locked': 'Chưa mở được. Còn thiếu:',
    'base.farm.needSeed': 'mẫu hạt giống',
    'base.farm.needWater': '10 bình nước',
    'base.farm.needTape': '2 cuộn băng keo',
    'base.farm.harvested': 'Thu được {n} củ khoai ngày {day}.',
    'base.explore.found': 'Tìm được {name} ×{n}.',

    'base.bag': 'Túi đồ',
    'base.bag.desc': 'Mọi thứ bạn còn lại sau cơn bão.',
    'base.bag.title': 'Túi đồ của bạn',

    'base.explore': 'Đi thám hiểm',
    'base.explore.desc': 'Ra ngoài khảo sát địa hình quanh căn cứ.',
    'base.explore.locked': 'Khu vực này chưa dựng xong. Bản đồ còn đang vẽ.',

    'base.sleep': 'Đi ngủ',
    'base.sleep.desc': 'Ngủ qua đêm, thức dậy lúc 07:00 sáng hôm sau.',
    'base.craft': 'Bàn chế tạo',
    'base.craft.desc': 'Ghép vật tư thành thứ dùng được.',
    'base.radio': 'Liên lạc',
    'base.radio.desc': 'Gọi về Trái Đất qua đĩa sóng.',

    'base.footer.survived': 'Đã sống sót {n} ngày',
    'base.footer.items': '{n} vật phẩm',

    'base.item.toolkit': 'Hộp dụng cụ',
    'base.item.oxygen': 'Bình oxy',
    'base.item.ration': 'Khẩu phần ăn',
    'base.item.water_bottle': 'Bình nước',
    'base.item.tape': 'Băng keo chịu lực',
    'base.item.electronics': 'Linh kiện điện tử',
    'base.item.hydrazine': 'Bình hydrazine',
    'base.item.media': 'Đĩa nhạc cũ',
    'base.item.potato': 'Củ khoai tây',
    'base.item.potato_seed': 'Mẫu hạt giống',
    'base.item.radio': 'Máy liên lạc hỏng',
    'base.item.family_photo': 'Tấm ảnh gia đình',
    'base.item.family_photo.desc': 'Xem lại',

    'mem.error.title': 'Không mở được',
    'mem.error.body': 'Tệp hồi tưởng chưa nạp được. Đóng lại rồi thử lần nữa.',
    'mem.close': 'Đóng',

    /* ---------- Giai đoạn 1: bảng điều khiển viễn thông ---------- */
    'comms.eyebrow': 'Giai đoạn 1 · Cầu cứu',
    'comms.title': 'Bảng điều khiển viễn thông',
    'comms.loading': 'Đang nạp giao thức viễn thông...',
    'comms.loadFail': 'Không nạp được tệp giao thức viễn thông. Kiểm tra kết nối rồi tải lại trang.',
    'comms.on': 'Bật',
    'comms.off': 'Tắt',
    'comms.step1': 'Cân bằng điện',
    'comms.step2': 'Bắt nhịp vệ tinh',
    'comms.step3': 'Đóng gói và phát',

    'comms.info.open': 'Giải thích bước này',
    'comms.info.close': 'Đã hiểu',
    'comms.info.source': 'Mọi con số trong bảng này lấy từ tệp giao thức viễn thông của sứ mệnh. Con số nào của NASA và con số nào của nhóm làm game đều được ghi rõ trong tệp đó.',

    'comms.info.1.title': 'Vì sao bụi làm pin yếu đi',
    'comms.info.1.body': 'Cảm biến MEDA trên rover Perseverance đo độ sâu quang học của bầu khí quyển. Con số đó càng lớn thì bụi lơ lửng càng dày, và ánh sáng Mặt Trời tới được tấm pin càng ít.\n\nBụi không chặn hết ánh sáng, nó tán xạ nó. Một phần photon vẫn tới được tấm pin nhưng từ mọi hướng, không còn là chùm thẳng, nên tấm pin phẳng không thu được bao nhiêu. Kết quả là giàn pin danh định 5.200 W chỉ còn 1.820 W, tức 35 phần trăm.\n\nVì thế mọi thiết bị trong trạm không thể cùng bật khi có thêm bộ phát. Phải cắt bớt tải, và thứ tự cắt chính là quyết định của bạn.',
    'comms.info.1.tau': 'Độ sâu quang học MEDA đo được trong bão bụi.',
    'comms.info.1.eff': 'Phần công suất còn lại của giàn pin dưới bầu trời đầy bụi.',

    'comms.info.2.title': 'Vì sao phải qua vệ tinh',
    'comms.info.2.body': 'Phát thẳng từ mặt đất Sao Hỏa về Trái Đất nghe có vẻ đơn giản, nhưng không dùng được vì ba khó khăn cộng lại.\n\nThứ nhất là công suất. Bộ phát trên trạm chỉ có vài chục oát, còn quãng đường dài 225 triệu km thì tín hiệu loãng đi theo bình phương khoảng cách.\n\nThứ hai là băng thông. Vệ tinh MRO mang ăng-ten độ lợi cao ba mét và bộ khuếch đại 100 W, đẩy được 500 kbps tới chảo 34 m và 2,6 Mbps tới chảo 70 m. Đường phát thẳng yếu hơn con số đó hàng nghìn lần.\n\nThứ ba là bụi. Băng UHF quanh 400 MHz xuyên qua bụi và khí quyển mỏng tốt hơn băng X rất nhiều, nên một gói tin nhỏ vẫn tới được vệ tinh ngay giữa bão.\n\nGhép lại thành hai chặng: trạm phát UHF lên vệ tinh, vệ tinh phát X-band xuống Trái Đất. Không chặng nào làm được việc của chặng kia.',
    'comms.info.2.orbit': 'Độ cao quỹ đạo gần cực của MRO, cận điểm tới viễn điểm.',
    'comms.info.2.period': 'Chu kỳ một vòng quỹ đạo, tức khoảng một giờ năm mươi hai phút.',

    'comms.info.3.title': 'Vì sao mười sáu byte và ba trạm',
    'comms.info.3.body': 'Mười sáu byte là toàn bộ ngân sách của khung tin. So cho dễ hình dung: một bức ảnh chụp từ điện thoại nặng khoảng ba triệu byte, tức ngân sách này nhỏ hơn nó hàng trăm nghìn lần. Đó là mức khan hiếm thật của kỹ sư viễn thông vũ trụ.\n\nBăng thông hẹp như vậy vì khung tin phải vừa một lượt phát ngắn ở tốc độ thấp, để còn sống sót qua vài lần mất khung trong cửa sổ chín mươi giây.\n\nBa trạm DSN đặt cách nhau gần 120 độ kinh độ vì Trái Đất quay. Một trạm ở California sẽ mất dấu Sao Hỏa khi hành tinh đó lặn xuống dưới đường chân trời. Rải ba trạm quanh vòng kinh tuyến thì lúc nào cũng có ít nhất một trạm nhìn thấy mục tiêu. Ba kinh độ thật là 116,78 độ tây, 4,25 độ tây và 148,98 độ đông, không đúng chính xác 120 độ nhưng đủ để luôn có trạm trực.',
    'comms.info.3.budget': 'Trần dung lượng của cả khung tin cầu cứu.',
    'comms.info.3.spacing': 'Khoảng cách quen thuộc giữa ba trạm DSN quanh Trái Đất.',

    'comms.s1.envTitle': 'Điều kiện MEDA',
    'comms.s1.envSub': 'Cảm biến trên rover Perseverance',
    'comms.s1.tau': 'Độ sâu quang học',
    'comms.s1.eff': 'Công suất pin còn lại',
    'comms.s1.temp': 'Nhiệt độ ngoài trời',
    'comms.s1.press': 'Áp suất khí quyển',
    'comms.s1.wind': 'Tốc độ gió',
    'comms.s1.lifeTitle': 'Sự sống trong khoang',
    'comms.s1.o2': 'Oxy khoang',
    'comms.s1.cabin': 'Nhiệt độ khoang',
    'comms.s1.lifeNote': 'Bơm oxy và sưởi chính là hai thiết bị thiết yếu. Tắt một trong hai là phi hành gia chết trước khi tín hiệu tới Trái Đất.',
    'comms.s1.used': 'Đang dùng / khả dụng',
    'comms.s1.legEss': 'Thiết yếu',
    'comms.s1.legLoad': 'Tải thường',
    'comms.s1.legFree': 'Còn trống',
    'comms.s1.devTitle': 'Thiết bị trong trạm',
    'comms.s1.essential': 'thiết yếu',
    'comms.s1.warnEss': 'Cảnh báo: {names} đang tắt. Bật lại trước khi qua bước sau.',
    'comms.s1.freeOk': 'Còn trống {n} W, đủ cho bộ phát 850 W.',
    'comms.s1.freeShort': 'Còn trống {n} W. Bộ phát cần 850 W, thiếu {d} W.',
    'comms.s1.next': 'Sang bước 2',
    'comms.s1.statusOk': 'Đủ điện cho bộ phát. Sang bước bắt nhịp vệ tinh.',
    'comms.s1.statusEss': 'Không được tắt thiết bị thiết yếu. Bật lại rồi tính tiếp.',
    'comms.s1.statusShort': 'Chưa đủ 850 W cho bộ phát. Cắt thêm {n} W tải không thiết yếu.',

    'comms.s2.passTitle': 'Cửa sổ bay ngang',
    'comms.s2.snr': 'Tỉ số tín hiệu trên tạp âm',
    'comms.s2.threshold': 'Ngưỡng đạt {n} dB',
    'comms.s2.elev': 'Góc ngắm',
    'comms.s2.freq': 'Tần số UHF',
    'comms.s2.pass': 'Đạt ngưỡng',
    'comms.s2.noPass': 'Chưa đạt',
    'comms.s2.hintPass': 'Tín hiệu đạt {snr} dB. Ăng-ten đã khoá vào vệ tinh.',
    'comms.s2.hintHigh': 'Góc cao quá {n} độ. Hạ ăng-ten xuống.',
    'comms.s2.hintLow': 'Góc thấp quá {n} độ. Nâng ăng-ten lên.',
    'comms.s2.hintFreqHigh': 'Tần số cao hơn đỉnh {n} MHz. Hạ xuống.',
    'comms.s2.hintFreqLow': 'Tần số thấp hơn đỉnh {n} MHz. Nâng lên.',
    'comms.s2.hintFine': 'Góc và tần số đã gần đúng. Chỉnh thêm một nấc.',
    'comms.s2.locked': 'Ăng-ten đã khoá. Chuyển sang bước đóng gói.',
    'comms.s2.expired': 'Đã hết cửa sổ bay ngang. Chờ lượt sau.',
    'comms.s2.nextPass': 'Lượt bay sau đã tới. Thử lại từ đầu cửa sổ.',
    'comms.s2.inWindow': 'Vệ tinh đang trong cửa sổ liên lạc',
    'comms.s2.radarAlt': 'Radar quỹ đạo: Sao Hỏa ở giữa, vệ tinh MRO bay trên vòng quỹ đạo, cung sáng là cửa sổ liên lạc chín mươi giây.',
    'comms.s2.spec': 'Chu kỳ {period} phút · UHF {freq} MHz',
    'comms.s2.next': 'Sang bước 3',
    'comms.s2.statusOk': 'Tín hiệu đã khoá. Sang bước đóng gói telemetry.',
    'comms.s2.statusWait': 'Căn ăng-ten tới khi tỉ số tín hiệu trên tạp âm đạt ngưỡng.',

    'comms.s3.pktTitle': 'Gói telemetry',
    'comms.s3.budget': 'Ngân sách khung tin',
    'comms.s3.ofBudget': '{n} / {max} byte',
    'comms.s3.left': 'Còn {n} byte trống.',
    'comms.s3.over': 'Vượt ngân sách {n} byte. Bỏ bớt một gói.',
    'comms.s3.tooMany': 'Chỉ được chọn tối đa ba gói.',
    'comms.s3.empty': 'Chưa chọn gói nào.',
    'comms.s3.ready': 'Sẵn sàng phát {n} trên {max} byte.',
    'comms.s3.blocked': 'Chọn từ một tới ba gói, tổng không quá mười sáu byte.',
    'comms.s3.transmit': 'PHÁT TÍN HIỆU',
    'comms.s3.transmitting': 'Đang phát {n} byte lên vệ tinh...',
    'comms.s3.flying': 'Tín hiệu đang bay',
    'comms.s3.arrived': 'Đã tới Trái Đất',
    'comms.s3.delay': 'Độ trễ một chiều {n} phút, tua nhanh trong vài giây.',
    'comms.s3.standing': 'Đang trực',
    'comms.s3.listening': 'Chờ tới lượt',
    'comms.s3.below': 'Sao Hỏa dưới chân trời',
    'comms.s3.acquired': 'SIGNAL ACQUIRED',
    'comms.s3.ackText': 'Trạm {station} đã bắt được khung tin và chuyển vào trung tâm điều khiển.',
    'comms.s3.summary': 'Đã gửi về Trái Đất',
    'comms.s3.sumBytes': 'Tổng dung lượng',
    'comms.s3.sumStation': 'Trạm nhận',
    'comms.s3.sumDelay': 'Độ trễ một chiều',
    'comms.s3.continue': 'Tiếp tục',
    'comms.s3.sent': 'Tín hiệu cầu cứu đã tới Trái Đất.',
    'comms.s3.statusIdle': 'Chọn gói tin rồi bấm phát.',
    'comms.s3.next': 'Hoàn tất',
  },

  en: {
    /* ---------- general ---------- */
    'app.title': 'Space Mission Design Game',
    'app.tagline': 'Design a space mission and learn what every decision costs.',
    'app.start': 'Begin',
    'app.again': 'Replay the prologue',
    'app.continue': 'Continue',

    /* ---------- prologue navigation ---------- */
    'nav.prev': 'Back',
    'nav.next': 'Next',

    /* ---------- acts ---------- */
    'act.0': 'Act I · On Earth',
    'act.1': 'Act II · The Survey',
    'act.2': 'Act III · The Storm',
    'act.3': 'Act IV · Sol 19',

    /* ---------- name entry ---------- */
    'name.label': 'Astronaut name',
    'name.sign': 'Sign',
    'name.placeholder': 'Your name',
    'name.prompt': 'Who are you in this crew?',
    'name.hint': 'The mission log needs a name. Type it and press Enter.',

    /* ---------- settings ---------- */
    'base.sleep.forecastTitle': 'Tomorrow morning forecast',
    'base.sleep.forecastSub': 'Readings at 07:00 if you sleep now.',
    'base.sleep.forecastDeath': 'Warning: you will not wake up. Eat and drink first.',
    'base.sleep.forecastThirsty': 'Warning: you will wake up thirsty.',
    'base.sleep.confirmYes': 'Sleep',
    'base.sleep.confirmNo': 'Not yet',
    'settings.open': 'Settings',
    'hud.crew': 'Crew',
    'hud.station': 'Station',
    'hud.stamina': 'Stamina',
    'hud.calories': 'Calories',
    'hud.water': 'Water',
    'hud.sanity': 'Sanity',
    'hud.power': 'Power',
    'hud.oxygen': 'Oxygen',
    'hud.seal': 'Seal',
    'base.craft.patch_seal': 'Patch a hull breach',
    'base.craft.make_water': 'Burn hydrazine for water',
    'base.craft.water_filter': 'Install water recycler',
    'base.craft.power_cell': 'Install extra battery',
    'base.craft.title': 'Workbench',
    'base.craft.sub': 'Turn spare parts into working things.',
    'base.craft.cost': 'Cost:',
    'base.craft.gives': 'Yield:',
    'base.craft.risk': 'Sanity below 40: {n} percent chance of failure.',
    'base.craft.do': 'Craft',
    'base.craft.short': 'Missing parts',
    'base.craft.done': 'Done.',
    'base.craft.fail': 'Could not craft that.',
    'base.craft.upg.waterFilter': 'Water recycler: uses less water',
    'base.craft.upg.powerCell': 'Extra battery: stores more power',
    'base.radio.title': 'Comms',
    'base.radio.sub': 'Call Earth through the surviving dish.',
    'base.radio.locked': 'Transmitter not built yet. Needs 2 electronics and 1 tape.',
    'base.radio.buildFirst': 'Not available',
    'base.radio.call': 'Call',
    'base.radio.limit': 'Each call restores 10 sanity.',
    'base.radio.intro': 'Me: “This is Ares 3 station, anyone copy?”',
    'base.radio.calling': 'Me: “Calling… signal takes 20 minutes each way.”',
    'base.radio.contactToast': 'Contact made. Sanity restored by 10.',
    'settings.title': 'Settings',
    'settings.close': 'Close',

    'settings.audio': 'Audio',
    'settings.music': 'Background music',
    'settings.music.desc': 'Instrumental score that plays throughout.',
    'settings.sfx': 'Sound effects',
    'settings.sfx.desc': 'Button clicks and interface feedback.',
    'settings.volume': 'Volume',

    'settings.graphics': 'Graphics',
    'settings.fullscreen': 'Fullscreen mode',
    'settings.fullscreen.desc': 'Same as pressing F11. Press F to toggle quickly.',
    'settings.fullscreen.enter': 'Enter fullscreen',
    'settings.fullscreen.exit': 'Exit fullscreen',
    'settings.quality': 'Image quality',
    'settings.quality.auto': 'Auto',
    'settings.quality.high': 'High',
    'settings.quality.low': 'Low',
    'settings.quality.desc': 'Low disables motion effects so weaker machines stay smooth.',
    'settings.motion': 'Motion effects',
    'settings.motion.desc': 'Turn off to reduce movement, useful if it makes you dizzy or on slow hardware.',
    'settings.textsize': 'Text size',
    'settings.textsize.desc': 'Increase if the text reads small on a large screen.',

    'settings.language': 'Language',
    'settings.language.desc': 'Changes the language for the whole interface and the story.',

    'settings.data': 'Data',
    'settings.reset': 'Clear saved data',
    'settings.reset.desc': 'Removes your saved name and all settings, resetting the game.',
    'settings.reset.confirm': 'Clear everything?',
    'settings.credits': 'Credits',

    /* ---------- toggles ---------- */
    'on': 'On',
    'off': 'Off',

    /* ---------- base screen ---------- */
    'base.who': 'Astronaut',
    'base.whoFallback': 'Unnamed',
    'base.heading': 'Pick today\'s work',
    'base.day': 'Day {n}',
    'base.night': 'Night',
    'base.daytime': 'Daylight',
    'base.close': 'Close',

    'base.farm': 'Greenhouse',
    'base.farm.desc': 'The indoor grow bay. Nothing to sow yet.',
    'base.farm.locked': 'Cannot open yet. Still needed:',
    'base.farm.needSeed': 'seed sample',
    'base.farm.needWater': '10 water bottles',
    'base.farm.needTape': '2 rolls of tape',
    'base.farm.harvested': 'Harvested {n} potatoes on day {day}.',
    'base.explore.found': 'Found {name} x{n}.',

    'base.bag': 'Pack',
    'base.bag.desc': 'Everything you have left after the storm.',
    'base.bag.title': 'Your pack',

    'base.explore': 'Explore',
    'base.explore.desc': 'Head outside and survey the ground around the base.',
    'base.explore.locked': 'This area is not built yet. The map is still being drawn.',

    'base.sleep': 'Sleep',
    'base.sleep.desc': 'Sleep through the night, wake at 07:00 next morning.',
    'base.craft': 'Workbench',
    'base.craft.desc': 'Turn spare parts into working gear.',
    'base.radio': 'Comms',
    'base.radio.desc': 'Call Earth through the dish.',

    'base.footer.survived': 'Survived {n} days',
    'base.footer.items': '{n} items',

    'base.item.toolkit': 'Tool kit',
    'base.item.oxygen': 'Oxygen tank',
    'base.item.ration': 'Ration pack',
    'base.item.water_bottle': 'Water bottle',
    'base.item.tape': 'Duct tape',
    'base.item.electronics': 'Electronics',
    'base.item.hydrazine': 'Hydrazine tank',
    'base.item.media': 'Old record',
    'base.item.potato': 'Potato',
    'base.item.potato_seed': 'Seed sample',
    'base.item.radio': 'Broken radio',
    'base.item.family_photo': 'Family photo',
    'base.item.family_photo.desc': 'Look through it',

    'mem.error.title': 'Could not open',
    'mem.error.body': 'The memory file did not load. Close this and try again.',
    'mem.close': 'Close',

    /* ---------- Phase 1: comms console ---------- */
    'comms.eyebrow': 'Phase 1 · Distress call',
    'comms.title': 'Comms console',
    'comms.loading': 'Loading the comms protocol...',
    'comms.loadFail': 'Could not load the comms protocol file. Check the connection and reload the page.',
    'comms.on': 'On',
    'comms.off': 'Off',
    'comms.step1': 'Balance the load',
    'comms.step2': 'Catch the orbiter',
    'comms.step3': 'Pack and transmit',

    'comms.info.open': 'Explain this step',
    'comms.info.close': 'Got it',
    'comms.info.source': 'Every figure in this panel comes from the mission comms protocol file. Which numbers are NASA figures and which are the game team estimate is written out in that file.',

    'comms.info.1.title': 'Why dust starves the array',
    'comms.info.1.body': 'The MEDA suite on the Perseverance rover measures the optical depth of the atmosphere. A bigger number means thicker suspended dust, and less sunlight reaching the array.\n\nDust does not block light so much as scatter it. Some photons still arrive, but from every direction instead of as a straight beam, and a flat panel cannot gather much of that. The array drops from 5200 W rated to 1820 W available, which is 35 percent.\n\nThat is why the Hab cannot keep every load on while the transmitter runs. Something has to be shed, and the choice of what to shed is yours.',
    'comms.info.1.tau': 'Optical depth measured by MEDA in the dust storm.',
    'comms.info.1.eff': 'The share of array output left under a dust loaded sky.',

    'comms.info.2.title': 'Why the signal goes through the orbiter',
    'comms.info.2.body': 'Transmitting straight from the Martian surface to Earth sounds simple and does not work, for three difficulties that stack up.\n\nFirst is power. A station transmitter puts out a few tens of watts, and the signal spreads thin over 225 million km following the square of distance.\n\nSecond is bandwidth. MRO carries a 3 m high gain antenna and a 100 W amplifier that push 500 kbps to a 34 m dish and 2.6 Mbps to a 70 m dish. A direct surface link is thousands of times weaker.\n\nThird is dust. UHF near 400 MHz punches through dust and the thin atmosphere far better than X-band, so a small packet still reaches the orbiter mid storm.\n\nPut together that is a two hop link: the station sends UHF up to the orbiter, and the orbiter sends X-band down to Earth. Neither hop can do the other one job.',
    'comms.info.2.orbit': 'MRO near polar orbit altitude, periapsis to apoapsis.',
    'comms.info.2.period': 'One orbital revolution, about one hour fifty two minutes.',

    'comms.info.3.title': 'Why sixteen bytes and three stations',
    'comms.info.3.body': 'Sixteen bytes is the whole budget for the frame. For scale, a phone photo is about three million bytes, so this budget is hundreds of thousands of times smaller. That is the real scarcity a deep space communications engineer works with.\n\nThe bandwidth is that narrow because the frame has to fit one short low rate transmission and still survive a few dropped frames inside the ninety second window.\n\nThe three DSN sites sit nearly 120 degrees of longitude apart because Earth rotates. A single California dish loses Mars once the planet sets below its horizon. Spread three sites around the meridian and at least one of them always sees the target. The real longitudes are 116.78 west, 4.25 west and 148.98 east, not exactly 120 degrees apart, but enough that one site is always on duty.',
    'comms.info.3.budget': 'The ceiling on the whole distress frame.',
    'comms.info.3.spacing': 'The familiar spacing between the three DSN sites around Earth.',

    'comms.s1.envTitle': 'MEDA conditions',
    'comms.s1.envSub': 'Sensors on the Perseverance rover',
    'comms.s1.tau': 'Optical depth',
    'comms.s1.eff': 'Array output left',
    'comms.s1.temp': 'Outside temperature',
    'comms.s1.press': 'Atmospheric pressure',
    'comms.s1.wind': 'Wind speed',
    'comms.s1.lifeTitle': 'Life support in the cabin',
    'comms.s1.o2': 'Cabin oxygen',
    'comms.s1.cabin': 'Cabin temperature',
    'comms.s1.lifeNote': 'The oxygen pump and the main heater are the two essentials. Switch either off and the crew dies before the signal reaches Earth.',
    'comms.s1.used': 'In use / available',
    'comms.s1.legEss': 'Essential',
    'comms.s1.legLoad': 'Normal load',
    'comms.s1.legFree': 'Headroom',
    'comms.s1.devTitle': 'Station loads',
    'comms.s1.essential': 'essential',
    'comms.s1.warnEss': 'Warning: {names} is switched off. Restore it before moving on.',
    'comms.s1.freeOk': '{n} W of headroom, enough for the 850 W transmitter.',
    'comms.s1.freeShort': '{n} W of headroom. The transmitter needs 850 W, short by {d} W.',
    'comms.s1.next': 'Go to step 2',
    'comms.s1.statusOk': 'Enough power for the transmitter. Move on to catching the orbiter.',
    'comms.s1.statusEss': 'You cannot cut an essential load. Restore it and recalculate.',
    'comms.s1.statusShort': 'Not enough for the 850 W transmitter. Shed {n} W more of non essential load.',

    'comms.s2.passTitle': 'Pass window',
    'comms.s2.snr': 'Signal to noise ratio',
    'comms.s2.threshold': 'Pass at {n} dB',
    'comms.s2.elev': 'Elevation',
    'comms.s2.freq': 'UHF frequency',
    'comms.s2.pass': 'Above threshold',
    'comms.s2.noPass': 'Below threshold',
    'comms.s2.hintPass': 'Signal at {snr} dB. The antenna is locked onto the orbiter.',
    'comms.s2.hintHigh': 'Elevation {n} degrees too high. Bring the antenna down.',
    'comms.s2.hintLow': 'Elevation {n} degrees too low. Raise the antenna.',
    'comms.s2.hintFreqHigh': 'Frequency {n} MHz above the peak. Lower it.',
    'comms.s2.hintFreqLow': 'Frequency {n} MHz below the peak. Raise it.',
    'comms.s2.hintFine': 'Angle and frequency are close. Nudge one more notch.',
    'comms.s2.locked': 'Antenna locked. Move on to packing the frame.',
    'comms.s2.expired': 'Pass window closed. Wait for the next one.',
    'comms.s2.nextPass': 'Next pass has arrived. You get the full window again.',
    'comms.s2.inWindow': 'Orbiter is inside the contact window',
    'comms.s2.radarAlt': 'Orbit radar: Mars in the centre, the MRO orbiter riding the orbit ring, the bright arc marking the ninety second contact window.',
    'comms.s2.spec': 'Period {period} min · UHF {freq} MHz',
    'comms.s2.next': 'Go to step 3',
    'comms.s2.statusOk': 'Signal locked. Move on to packing the telemetry.',
    'comms.s2.statusWait': 'Tune the antenna until the signal to noise ratio clears the threshold.',

    'comms.s3.pktTitle': 'Telemetry packets',
    'comms.s3.budget': 'Frame budget',
    'comms.s3.ofBudget': '{n} / {max} bytes',
    'comms.s3.left': '{n} bytes left free.',
    'comms.s3.over': 'Over budget by {n} bytes. Drop a packet.',
    'comms.s3.tooMany': 'Three packets is the maximum.',
    'comms.s3.empty': 'No packet selected yet.',
    'comms.s3.ready': 'Ready to send {n} of {max} bytes.',
    'comms.s3.blocked': 'Pick one to three packets, sixteen bytes or less in total.',
    'comms.s3.transmit': 'TRANSMIT',
    'comms.s3.transmitting': 'Sending {n} bytes up to the orbiter...',
    'comms.s3.flying': 'Signal in flight',
    'comms.s3.arrived': 'Reached Earth',
    'comms.s3.delay': 'One way delay {n} minutes, fast forwarded over a few seconds.',
    'comms.s3.standing': 'On duty',
    'comms.s3.listening': 'Waiting its turn',
    'comms.s3.below': 'Mars below horizon',
    'comms.s3.acquired': 'SIGNAL ACQUIRED',
    'comms.s3.ackText': 'The {station} site has the frame and has forwarded it to mission control.',
    'comms.s3.summary': 'Sent to Earth',
    'comms.s3.sumBytes': 'Total size',
    'comms.s3.sumStation': 'Receiving site',
    'comms.s3.sumDelay': 'One way delay',
    'comms.s3.continue': 'Continue',
    'comms.s3.sent': 'The distress call has reached Earth.',
    'comms.s3.statusIdle': 'Pick your packets, then transmit.',
    'comms.s3.next': 'Done',
  },
};

let lang = localStorage.getItem(KEY) || 'vi';
const listeners = new Set();

export function getLang() {
  return lang;
}

export function setLang(next) {
  if (!STRINGS[next] || next === lang) return;
  lang = next;
  localStorage.setItem(KEY, next);
  document.documentElement.lang = next;
  applyToDom();
  listeners.forEach((fn) => fn(next));
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function t(key, fallback) {
  const table = STRINGS[lang] || STRINGS.vi;
  return table[key] ?? STRINGS.vi[key] ?? fallback ?? key;
}

/* Gán lại chữ cho mọi phần tử có data-i18n trong DOM tĩnh. */
export function applyToDom(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val) el.textContent = val;
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    const val = t(key);
    if (val) el.setAttribute('placeholder', val);
  });
}

/* Áp ngôn ngữ đã lưu ngay khi nạp module. */
document.documentElement.lang = lang;
