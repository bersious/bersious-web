/* ============================================================
   endings.js
   Tám cảnh kết thúc THUA của cả hai giai đoạn, kèm báo cáo phân tích.

   Vì sao có file này: trước đây hab-stats.js đã có checkDeath() trả về
   nguyên nhân chết, nhưng không màn nào hiển thị nó. Người chơi chết mà
   game vẫn chạy tiếp, chỉ số âm dần, không ai báo. Cùng lúc
   phase2-engine.js có trường state.failed nhưng chưa bao giờ được đặt
   thành true. File này là màn hình duy nhất cho mọi kiểu thua, để hai
   giai đoạn dùng chung một giao diện và một giọng văn.

   Ba phần nội dung của mỗi cảnh:
     summaryVi/En   kể lại chuyện gì đã xảy ra, 2 tới 3 câu, có chi tiết
     analysisVi/En  cơ chế thật của NASA, có số liệu cụ thể
     fixVi/En       gợi ý khắc phục cho lần chơi sau

   Đường dẫn ảnh dựng từ import.meta.url, không dùng location.href:
   game vào ở /nasa không có dấu chéo cuối, đường dẫn tương đối trần sẽ
   trỏ về gốc site và 404.
   ============================================================ */

import { t, getLang, onLangChange } from './i18n.js';
import { getSettings } from './settings.js';
import { playOneShotSfx } from './audio-sfx.js';
import { clampMusicVolume } from './audio.js';

const BASE = new URL('.', import.meta.url).href;
const CSS_ID = 'endings-css';

/* ============================================================
   TÁM CẢNH
   ============================================================ */

export const ENDING_SPECS = [
  /* ---------- Giai đoạn 1 ---------- */
  {
    id: 'hypoxia',
    art: 'assets/art/ending_hypoxia.webp',
    phase: 1,
    titleVi: 'Hết oxy',
    titleEn: 'Out of oxygen',
    summaryVi:
      'Áp suất oxy tụt dần trong mười một phút. Anh ấy còn kịp ngồi xuống '
      + 'trước khi bảng điều khiển chuyển hết sang màu đỏ. Ngoài kia bão vẫn '
      + 'đang thổi, và không ai nghe thấy tiếng báo động.',
    summaryEn:
      'The oxygen pressure fell for eleven minutes. He had just enough time '
      + 'to sit down before the whole console turned red. Outside the storm '
      + 'kept blowing, and nobody heard the alarm.',
    analysisVi:
      'Trạm Hab giữ khoang ở 101,3 kPa như trên Trái Đất, nhưng khi mất điện '
      + 'thì máy MOXIE và bộ tách CO2 ngừng chạy, oxy trong khoang chỉ còn '
      + 'lượng dự trữ. Ở 6 kPa cơ thể bắt đầu thiếu oxy não, và dưới 4 kPa thì '
      + 'bất tỉnh trong vòng 40 giây, chết trong khoảng bốn phút. Bộ lọc coban '
      + 'clorua của bộ đồ EVA chỉ giữ được 4 tới 6 giờ, nên phương án duy nhất '
      + 'là bật lại nguồn hoặc mở van bình dự phòng trước khi áp suất rời khỏi '
      + 'dải an toàn 16 kPa.',
    analysisEn:
      'A habitat holds its cabin at 101.3 kPa to match Earth, but once the '
      + 'power dies the MOXIE unit and the CO2 scrubber stop, and the cabin '
      + 'oxygen is only what is already stored. At 6 kPa the brain starts '
      + 'starving and below 4 kPa a person is unconscious in 40 seconds and '
      + 'dead in about four minutes. A suit\'s cobalt chloride scrubber buys '
      + 'only 4 to 6 hours, so the only real option is to restore power or open '
      + 'the backup tank before pressure leaves the 16 kPa safety band.',
    fixVi:
      'Đặt mức cảnh báo sớm ở 30 phần trăm oxy, không phải 10 phần trăm, và '
      + 'luôn giữ ít nhất một pin dự phòng đã sạc cho máy tách oxy trước khi '
      + 'đi ngủ hoặc đi thám hiểm.',
    fixEn:
      'Raise the early warning to 30 percent oxygen rather than 10, and always '
      + 'keep one charged spare cell for the oxygen generator before you sleep '
      + 'or leave on a scouting run.',
  },
  {
    id: 'dehydration',
    art: 'assets/art/ending_dehydration.webp',
    phase: 1,
    titleVi: 'Hết nước',
    titleEn: 'Out of water',
    summaryVi:
      'Bình tái chế ECLSS chạy khô trong đêm thứ ba liên tiếp. Anh ấy ngồi '
      + 'xuống sàn cạnh cái chai rỗng, không còn buồn đi lấy dụng cụ sửa. '
      + 'Buổi sáng, bụi đỏ đã phủ lên vai anh một lớp mỏng.',
    summaryEn:
      'The ECLSS recycler ran dry for the third night in a row. He sat down on '
      + 'the floor beside an empty bottle and did not bother fetching the tools '
      + 'to fix it. By morning a thin layer of red dust had settled on his '
      + 'shoulders.',
    analysisVi:
      'Hệ thống UPA trên ISS thu hồi được 93 phần trăm nước thải, kể cả mồ '
      + 'hôi và hơi thở, nên một phi hành gia chỉ cần khoảng 2,5 lít nước mới '
      + 'mỗi ngày. Ở đây bộ tái chế chỉ đạt 70 phần trăm, tức mỗi giờ mất 1,05 '
      + 'phần trăm lượng nước dự trữ. Mất nước quá 12 giờ làm máu cô đặc, thận '
      + 'ngừng lọc ở mức 15 phần trăm dịch cơ thể, và nhiệt độ cơ thể vọt lên '
      + 'khi cơ thể không còn mồ hôi để toả nhiệt.',
    analysisEn:
      'The ISS urine processor recovers 93 percent of waste water, sweat and '
      + 'breath included, so one astronaut needs only about 2.5 litres of new '
      + 'water a day. The recycler on this station recovers just 70 percent, so '
      + '1.05 percent of the reserve drains away every hour. Past 12 hours '
      + 'without water the blood thickens, the kidneys stop filtering at around '
      + '15 percent fluid loss, and core temperature climbs because there is no '
      + 'sweat left to shed heat.',
    fixVi:
      'Dự trữ nước theo số ngày còn lại chứ không theo cảm giác: mỗi người '
      + 'cần 2,5 lít một ngày, và nên sửa bộ tái chế trước khi dự trữ xuống '
      + 'dưới ba ngày.',
    fixEn:
      'Stock water by the days remaining, not by feel: 2.5 litres per person '
      + 'per day, and repair the recycler before the reserve drops under three '
      + 'days.',
  },
  {
    id: 'starvation',
    art: 'assets/art/ending_starvation.webp',
    phase: 1,
    titleVi: 'Hết lương thực',
    titleEn: 'Out of food',
    summaryVi:
      'Tủ khẩu phần trống trơn từ sáng, chỉ còn mấy vỏ gói bạc bị bóc phẳng '
      + 'trên sàn. Anh ấy ngồi xuống bàn, hai tay ôm đầu, và không đứng dậy '
      + 'nữa. Cây khoai cuối cùng trong nhà kính đã chết khô từ tuần trước.',
    summaryEn:
      'The ration locker had been bare since morning, only flattened silver '
      + 'pouches left on the floor. He sat down at the table with his head in '
      + 'his hands and did not get up again. The last potato plant in the '
      + 'greenhouse had dried out a week earlier.',
    analysisVi:
      'Một phi hành gia cần khoảng 2.800 kcal mỗi Sol, tương đương 0,62 kg '
      + 'thức ăn khô, và dự trữ cho 300 Sol nặng gần 190 kg. Khẩu phần của '
      + 'NASA đóng gói được 5 năm nhưng không sinh thêm calo, nên nông trại là '
      + 'nguồn duy nhất. Cây khoai cần 90 tới 100 Sol mới cho củ và cần 20 lít '
      + 'nước mỗi mét vuông, trong khi cơ thể chỉ chịu được khoảng 24 giờ không '
      + 'ăn trước khi đường huyết sụp và cơ bắt đầu tự phân giải.',
    analysisEn:
      'An astronaut needs about 2,800 kcal per Sol, roughly 0.62 kg of dry '
      + 'food, and a 300 Sol reserve weighs close to 190 kg. NASA rations keep '
      + 'for five years but they do not make new calories, so the farm is the '
      + 'only source. A potato crop needs 90 to 100 Sols to tuber and 20 litres '
      + 'of water per square metre, while the body tolerates about 24 hours '
      + 'without food before blood sugar collapses and muscle starts breaking '
      + 'itself down.',
    fixVi:
      'Gieo khoai ngay từ Sol 1 chứ không đợi đủ dụng cụ, và giữ lại ít nhất '
      + 'ba khẩu phần làm quỹ dự phòng cho những ngày bão không ra ngoài được.',
    fixEn:
      'Plant potatoes on Sol 1 instead of waiting for the full toolkit, and '
      + 'hold back at least three rations as a reserve for storm days when '
      + 'nobody can go outside.',
  },
  {
    id: 'blackout',
    art: 'assets/art/ending_blackout.webp',
    phase: 1,
    titleVi: 'Mất điện',
    titleEn: 'Total blackout',
    summaryVi:
      'Bão phủ kín tấm pin từ chiều, và bình acquy cạn sạch lúc 23:40. Sương '
      + 'đọng thành băng ở mặt trong cửa sổ. Anh ấy co người trong góc, chiếu '
      + 'đèn pin lên trần và chờ một bình minh không tới.',
    summaryEn:
      'The storm buried the solar array by mid afternoon and the battery hit '
      + 'zero at 23:40. Frost turned to ice on the inside of the window. He '
      + 'curled up in the corner, pointed his torch at the ceiling and waited '
      + 'for a sunrise that did not come.',
    analysisVi:
      'Mảng pin của trạm sinh 8 kW mỗi giờ nắng, nhưng trong bão bụi chỉ còn '
      + 'khoảng 3,2 kW, tức 40 phần trăm hiệu suất, vì bụi lơ lửng chặn tới 90 '
      + 'phần trăm ánh sáng tới. Hệ thống sống tiêu thụ 3 kW liên tục, nên '
      + 'không có nắng là pin tụt thẳng. Khi điện về 0, máy sưởi ngừng và nhiệt '
      + 'độ trong khoang rơi từ 21 độ C xuống âm 20 độ C trong vài giờ, đủ để '
      + 'nước trong đường ống đóng băng và làm nứt van.',
    analysisEn:
      'The array makes 8 kW in full sun, but a dust storm cuts it to about '
      + '3.2 kW, some 40 percent, because airborne dust blocks up to 90 percent '
      + 'of the incoming light. Life support draws 3 kW continuously, so with no '
      + 'sun the battery falls straight down. At zero the heaters stop and the '
      + 'cabin drops from 21 C to minus 20 C within a few hours, which is enough '
      + 'to freeze the water lines and crack the valves.',
    fixVi:
      'Sạc đầy trước khi bão tới, tắt đèn UV nông trại và mọi tải không cần '
      + 'thiết khi điện xuống dưới 40 phần trăm, và đừng bao giờ ngủ khi pin '
      + 'dưới 30 phần trăm mà bão còn kéo dài.',
    fixEn:
      'Top the battery up before a storm, switch off the greenhouse UV lamp and '
      + 'every non essential load once power drops below 40 percent, and never '
      + 'sleep on a battery under 30 percent with the storm still running.',
  },

  /* ---------- Giai đoạn 2 ---------- */
  {
    id: 'orbit_miss',
    art: 'assets/art/ending_orbit_miss.webp',
    phase: 2,
    titleVi: 'Trượt quỹ đạo',
    titleEn: 'Orbit missed',
    summaryVi:
      'Con tàu lướt qua Sao Hỏa ở khoảng cách sáu nghìn cây số, quá xa để '
      + 'bắt quỹ đạo. Một tấm pin mặt trời gãy cong, khí vẫn xì ra từ mối nối '
      + 'nứt. Trong mười một phút, hành tinh đỏ trượt khỏi khung cửa sổ và '
      + 'không có gì ngoài màu đen.',
    summaryEn:
      'The ship slid past Mars at six thousand kilometres, far too wide to '
      + 'capture. One solar panel was bent, gas still hissing from a cracked '
      + 'fitting. In eleven minutes the red planet drifted out of the window '
      + 'and there was nothing but black.',
    analysisVi:
      'Chặng chuyển tiếp Hohmann từ Trái Đất tới Sao Hỏa cần khoảng 5.600 m/s '
      + 'delta-v, cộng thêm 900 m/s cho lần đốt bắt quỹ đạo và 150 m/s dự phòng '
      + 'sửa đường, thành ngân sách 6.650 m/s. Thiếu một phần trăm của con số '
      + 'đó nghĩa là điểm cận Hỏa tăng vọt: sai 10 m/s ở điểm xuất phát làm '
      + 'điểm đến lệch hàng trăm cây số, và tàu bay ngang qua rồi tiếp tục trên '
      + 'quỹ đạo mặt trời với chu kỳ 780 ngày.',
    analysisEn:
      'A Hohmann transfer from Earth to Mars costs about 5,600 m/s of delta-v, '
      + 'plus 900 m/s for the capture burn and 150 m/s of margin for a mid '
      + 'course correction, a 6,650 m/s budget. Being one percent short of that '
      + 'number pushes the periapsis up sharply: a 10 m/s error at departure '
      + 'moves the arrival point by hundreds of kilometres, and the ship flies '
      + 'past and stays on a solar orbit with a 780 day period.',
    fixVi:
      'Đặt delta-v dự phòng ít nhất 5 phần trăm và kiểm lại ngân sách sau khi '
      + 'đổi động cơ: Isp cao hơn 20 giây tiết kiệm được khoảng 200 m/s cho '
      + 'cùng khối lượng nhiên liệu.',
    fixEn:
      'Hold at least 5 percent delta-v margin and recheck the budget after any '
      + 'engine change: 20 extra seconds of Isp is worth roughly 200 m/s on the '
      + 'same propellant mass.',
  },
  {
    id: 'mutiny',
    art: 'assets/art/ending_mutiny.webp',
    phase: 2,
    titleVi: 'Binh biến',
    titleEn: 'Mutiny',
    summaryVi:
      'Người thứ ba đứng dậy giữa cuộc họp và bước ra cửa khoang, không nói '
      + 'một câu. Màn hình điều hướng đã vẽ sẵn đường cong quay về Trái Đất. '
      + 'Ba người, ba góc khoang, và không ai còn nhìn vào cùng một màn hình.',
    summaryEn:
      'The third one stood up in the middle of the meeting and walked to the '
      + 'hatch without a word. The nav screen had already drawn a curve back to '
      + 'Earth. Three people, three corners of the cabin, and nobody looking at '
      + 'the same display any more.',
    analysisVi:
      'Đồng thuận nhóm không phải khái niệm mềm trong một sứ mệnh dài: các '
      + 'nghiên cứu về nhóm ở Nam Cực và trên ISS cho thấy hiệu suất ra quyết '
      + 'định giảm rõ khi niềm tin giữa các vai trò xuống dưới 30 phần trăm. Ở '
      + 'đây mỗi quyết định tranh chấp kéo niềm tin của một vai trò xuống 15 tới '
      + '25 điểm, và khi cả ba cùng dưới ngưỡng thì không ai còn ký vào kế '
      + 'hoạch hạ cánh. Một sứ mệnh 258,9 ngày cần khoảng 1.400 quyết định '
      + 'chung, và tỉ lệ phản đối trên 40 phần trăm là đủ để khối cộng tác tan.',
    analysisEn:
      'Group cohesion is not a soft idea on a long mission: studies of '
      + 'Antarctic and ISS crews show decision performance falls sharply once '
      + 'trust between roles drops under 30 percent. Here each contested '
      + 'decision pulls one role\'s trust down by 15 to 25 points, and once all '
      + 'three are below the line nobody signs the landing plan. A 258.9 day '
      + 'mission needs around 1,400 joint decisions, and a dissent rate above '
      + '40 percent is enough to break the working group.',
    fixVi:
      'Cứ hai quyết định khó thì nhượng một lần cho vai trò đang thấp điểm '
      + 'nhất, và đừng dồn ba cuộc tranh chấp vào cùng một giai đoạn chuyển '
      + 'tiếp.',
    fixEn:
      'Concede one in every two hard calls to whichever role is lowest, and do '
      + 'not stack three disputes into the same cruise phase.',
  },
  {
    id: 'comms_lost',
    art: 'assets/art/ending_comms_lost.webp',
    phase: 2,
    titleVi: 'Mất liên lạc',
    titleEn: 'Comms lost',
    summaryVi:
      'Ba màn hình cùng chuyển sang nhiễu trắng trong cùng một giây. Ngoài '
      + 'kia, chảo DSN đứng im dưới trời đêm, miệng loa hướng vào khoảng không '
      + 'không có ai trả lời. Từ đó, con tàu bay một mình.',
    summaryEn:
      'All three screens turned to white static in the same second. Outside, '
      + 'the DSN dish stood still under the night sky, its feed pointed at '
      + 'nothing that would answer. From then on the ship flew alone.',
    analysisVi:
      'Một chảo 3 mét phát 20 W ở băng X cho tín hiệu yếu đi theo bình phương '
      + 'khoảng cách: ở khoảng cách Sao Hỏa, độ trễ một chiều là 12,5 phút và '
      + 'biên tín hiệu chỉ còn vài dB trên nền nhiễu. Ngưỡng của trò chơi là 3 '
      + 'dB, dưới mức đó không còn đủ dư địa để sửa lỗi bit, và gói lệnh hạ '
      + 'cánh không tới được. Mất kênh lên trong 20 phút cuối là mất quyền can '
      + 'thiệp vào điểm hạ cánh.',
    analysisEn:
      'A 3 metre dish pushing 20 W at X band loses signal with the square of '
      + 'distance: at Mars range the one way delay is 12.5 minutes and the '
      + 'margin is only a few dB above the noise floor. The game threshold is 3 '
      + 'dB, below which there is not enough margin for bit error correction and '
      + 'the landing command never arrives. Losing the uplink in the final 20 '
      + 'minutes is losing any say in where the ship touches down.',
    fixVi:
      'Chọn ăng-ten có dự trữ trên 6 dB và giữ một kênh dự phòng băng S; đừng '
      + 'đổi sang ăng-ten nhỏ để tiết kiệm khối lượng ở chặng cuối.',
    fixEn:
      'Pick an antenna with better than 6 dB of margin and keep an S band '
      + 'backup; do not trade down to a smaller dish for mass on the last leg.',
  },
  {
    id: 'edl_crash',
    art: 'assets/art/ending_edl_crash.webp',
    phase: 2,
    titleVi: 'Hạ cánh thất bại',
    titleEn: 'Landing failed',
    summaryVi:
      'Một vệt khói đen lao xuống từ bầu trời màu gỉ sét và cắm vào bãi đá. '
      + 'Cách đó bốn cây số, đèn báo động trên nóc trạm Hab nhấp nháy một mình. '
      + 'Chiếc dù rách nằm vắt trên mỏm đá, không còn che được gì.',
    summaryEn:
      'A black trail of smoke came down out of a rust coloured sky and drove '
      + 'into the boulder field. Four kilometres away the beacons on the habitat '
      + 'roof blinked at nobody. The torn parachute lay draped over a rock, '
      + 'sheltering nothing.',
    analysisVi:
      'Khí quyển Sao Hỏa chỉ dày bằng khoảng 1 phần trăm của Trái Đất, khoảng '
      + '0,6 kPa ở mặt đất, nên một chiếc dù không thể hãm đủ và mọi tàu đều '
      + 'phải có lần đốt cuối. Bộ radar hạ cánh đo mặt đất ở 4,3 GHz và cảm biến '
      + 'quán tính phải khớp nhau trong khoảng 10 mili giây, nếu không tàu tin '
      + 'nhầm độ cao và đốt động cơ quá muộn. Curiosity nặng gần 900 kg cần bảy '
      + 'phút từ khí quyển vào tới đất, gọi là bảy phút kinh hoàng vì tín hiệu '
      + 'về Trái Đất trễ 14 phút, không ai can thiệp được.',
    analysisEn:
      'The Martian atmosphere is only about 1 percent as thick as Earth\'s, '
      + 'some 0.6 kPa at the surface, so a parachute cannot do the job alone and '
      + 'every vehicle needs a final burn. Landing radar measures the ground at '
      + '4.3 GHz and has to agree with the inertial sensors within about 10 '
      + 'milliseconds, otherwise the ship believes the wrong altitude and fires '
      + 'late. Curiosity, at nearly 900 kg, needed seven minutes from '
      + 'atmospheric entry to touchdown, the seven minutes of terror, because '
      + 'the signal takes 14 minutes to reach Earth and nobody can intervene.',
    fixVi:
      'Lắp bộ radar hạ cánh và cảm biến quán tính, và cắm đèn hiệu bãi đáp '
      + 'trước khi tàu tới điểm hạ cánh ít nhất một Sol.',
    fixEn:
      'Carry the landing radar and inertial sensor suite, and have the landing '
      + 'beacon up at least one Sol before the ship reaches the touchdown point.',
  },
];

/* Tra nhanh theo id. Trả null nếu id lạ, để nơi gọi tự quyết định. */
export function getEndingSpec(id) {
  return ENDING_SPECS.find((e) => e.id === id) || null;
}

/* ============================================================
   CHUỖI GIAO DIỆN
   Bảng chữ nằm ngay đây chứ không nhét vào i18n.js: đây là màn của một
   tính năng, và i18n.js đã rất dài. Cùng kiểu với devtool-panel.js.
   ============================================================ */

const UI = {
  vi: {
    'eyebrow.p1': 'KẾT THÚC',
    'eyebrow.p2': 'SỨ MỆNH THẤT BẠI',
    'report.title': 'Báo cáo phân tích kỹ thuật',
    'report.sol': 'Sol sống được',
    'report.oxygen': 'Oxy',
    'report.water': 'Nước',
    'report.calories': 'Calo',
    'report.power': 'Điện',
    'report.deltaV': 'Delta-v khả dụng',
    'report.mass': 'Khối lượng',
    'report.cost': 'Chi phí',
    'report.fix': 'Cách khắc phục',
    'report.solUnit': 'Sol',
    'report.solNone': 'chưa qua ngày nào',
    'btn.retry': 'Chơi lại từ điểm lưu gần nhất',
    'btn.retryNone': 'Chưa có bản lưu nào',
    'btn.slots': 'Chọn mốc lưu khác',
    'btn.restart': 'Bắt đầu sứ mệnh mới',
    'btn.review': 'Xem lại',
    'btn.close': 'Đóng',
    'slots.title': 'Chọn mốc lưu',
    'slots.sub': 'Bản lưu gần nhất của lượt chơi này. Chọn một mốc để quay lại.',
    'slots.one': 'Mốc lưu duy nhất',
    'slots.day': 'Ngày {n}',
    'slots.none': 'Chưa có bản lưu nào để chọn.',
    'slots.pick': 'Quay lại mốc này',
    'slots.close': 'Đóng',
    'review.hint': 'Bạn đang xem lại cảnh thua. Sứ mệnh đã kết thúc, không chơi tiếp được.',
    'review.back': 'Quay lại báo cáo',
    'a11y.dialog': 'Màn kết thúc sứ mệnh',
    'a11y.slots': 'Danh sách mốc lưu',
  },
  en: {
    'eyebrow.p1': 'THE END',
    'eyebrow.p2': 'MISSION FAILED',
    'report.title': 'Technical analysis report',
    'report.sol': 'Sols survived',
    'report.oxygen': 'Oxygen',
    'report.water': 'Water',
    'report.calories': 'Calories',
    'report.power': 'Power',
    'report.deltaV': 'Delta-v available',
    'report.mass': 'Mass',
    'report.cost': 'Cost',
    'report.fix': 'How to fix it',
    'report.solUnit': 'Sol',
    'report.solNone': 'not a full Sol',
    'btn.retry': 'Retry from the latest save',
    'btn.retryNone': 'No save to retry from',
    'btn.slots': 'Choose another save point',
    'btn.restart': 'Start a new mission',
    'btn.review': 'Look again',
    'btn.close': 'Close',
    'slots.title': 'Choose a save point',
    'slots.sub': 'The latest save from this run. Pick a point to go back to.',
    'slots.one': 'The only save point',
    'slots.day': 'Day {n}',
    'slots.none': 'There is no save to choose from.',
    'slots.pick': 'Return to this point',
    'slots.close': 'Close',
    'review.hint': 'You are looking back at the ending. The mission is over and cannot be resumed.',
    'review.back': 'Back to the report',
    'a11y.dialog': 'Mission ending screen',
    'a11y.slots': 'Save point list',
  },
};

function ui(key, vars) {
  const lang = getLang() === 'en' ? 'en' : 'vi';
  let out = UI[lang][key] ?? UI.vi[key] ?? key;
  if (vars) {
    for (const k in vars) out = out.split('{' + k + '}').join(String(vars[k]));
  }
  return out;
}

/* Chọn bản dịch của một cảnh theo ngôn ngữ đang bật. */
function pick(spec, field) {
  const lang = getLang() === 'en' ? 'En' : 'Vi';
  return spec[field + lang] || spec[field + 'Vi'] || '';
}

/* ============================================================
   CSS
   ============================================================ */

function injectCss() {
  if (document.getElementById(CSS_ID)) return;
  const link = document.createElement('link');
  link.id = CSS_ID;
  link.rel = 'stylesheet';
  link.href = BASE + 'css/endings.css';
  document.head.appendChild(link);
}

/* Tắt hiệu ứng: đọc cả class motion-off của game lẫn media query của
   hệ điều hành, vì trên máy người chơi hai nguồn này độc lập nhau. */
function motionOff() {
  if (document.documentElement.classList.contains('motion-off')) return true;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  const s = getSettings();
  return s.motion === false || s.quality === 'low';
}

/* ============================================================
   ICON
   ============================================================ */

const ICON_BULB = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
  focusable="false"><path d="M9 18h6"/><path d="M10 21h4"/>
  <path d="M12 3a6 6 0 0 0-3.6 10.8c.5.4.8 1 .9 1.6l.1.6h5.2l.1-.6c.1-.6.4-1.2.9-1.6A6 6 0 0 0 12 3z"/></svg>`;

const ICON_CLOSE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false">
  <path d="M18 6L6 18M6 6l12 12"/></svg>`;

const ICON_BACK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
  focusable="false"><path d="M15 18l-6-6 6-6"/></svg>`;

/* ============================================================
   ĐỊNH DẠNG SỐ
   Dùng dấu phẩy thập phân cho VI, dấu chấm cho EN, giống phần còn lại
   của game.
   ============================================================ */

function num(v, digits = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const fixed = n.toFixed(digits);
  if (getLang() === 'en') return fixed;
  return fixed.replace('.', ',');
}

/* ============================================================
   MÀN HÌNH
   ============================================================ */

let active = null;

/* Đóng màn đang mở, dùng khi bấm nút hoặc khi chuyển màn. */
export function closeEnding() {
  if (!active) return;
  active.close();
}

/* Màn kết thúc có đang mở thật không.
   Kiểm cả DOM, không chỉ biến active: nếu ai đó gỡ lớp phủ bằng tay
   (bảng test gỡ thẳng, hoặc router của app dọn màn), biến active vẫn
   giữ con trỏ cũ và mọi lần mở sau đều bị chặn vì tưởng đang có màn
   mở. Đối chiếu isConnected là cách rẻ nhất để biết sự thật. */
export function isEndingOpen() {
  if (!active) return false;
  if (!active.root || !active.root.isConnected) {
    active = null;
    return false;
  }
  return true;
}

/**
 * Mở màn kết thúc.
 *
 * @param {{
 *   id: string,
 *   stats?: object,          chỉ số cuối của Giai đoạn 1
 *   extra?: object,          chỉ số phụ của Giai đoạn 2 (deltaV, mass, cost)
 *   onRetry?: () => void,    chơi lại từ bản lưu gần nhất
 *   onLoadSlot?: () => void, mở danh sách mốc lưu
 *   onRestart?: () => void,  bắt đầu sứ mệnh mới
 *   hasSave?: boolean,       có bản lưu để chơi lại hay không
 *   saveInfo?: object,       thông tin bản lưu, để hiện ngày trong danh sách
 * }} opts
 * @returns {{close: () => void, root: HTMLElement}}
 */
export function showEnding(opts = {}) {
  const spec = getEndingSpec(opts.id);
  if (!spec) {
    console.warn('[endings] không có cảnh kết thúc nào tên', opts.id);
    return { close: () => {}, root: null };
  }

  injectCss();

  /* Chỉ một màn kết thúc tại một thời điểm. Mở cái thứ hai thì cái cũ
     đóng lại, nếu không hai lớp phủ chồng nhau và bấm không được.
     Dùng closeEnding() chứ không đọc thẳng biến active: nó đối chiếu
     DOM để bỏ con trỏ chết khi lớp phủ đã bị gỡ bằng tay. */
  if (isEndingOpen()) closeEnding();

  const stats = opts.stats || {};
  const extra = opts.extra || {};
  const hasSave = opts.hasSave !== false;
  const saveInfo = opts.saveInfo || null;
  const instant = motionOff();

  const root = document.createElement('div');
  root.className = 'ending-root' + (instant ? ' is-instant' : '');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', ui('a11y.dialog'));
  root.dataset.phase = String(spec.phase);
  root.dataset.endingId = spec.id;

  root.innerHTML = `
    <div class="ending-backdrop"></div>
    <div class="ending-frame" tabindex="-1">
      <div class="ending-scroll">
        <figure class="ending-art">
          <img class="ending-img" alt="" decoding="async" fetchpriority="high">
        </figure>

        <div class="ending-body">
          <p class="ending-eyebrow"></p>
          <h1 class="ending-title"></h1>
          <p class="ending-summary"></p>

          <section class="ending-report" aria-labelledby="ending-report-title">
            <h2 class="ending-report-title" id="ending-report-title">
              <span class="ending-report-icon" aria-hidden="true"></span>
              <span class="ending-report-text"></span>
            </h2>

            <dl class="ending-metrics"></dl>

            <p class="ending-analysis"></p>

            <p class="ending-fix">
              <span class="ending-fix-icon" aria-hidden="true">${ICON_BULB}</span>
              <span class="ending-fix-text"></span>
            </p>
          </section>
        </div>
      </div>

      <footer class="ending-actions">
        <button type="button" class="ending-btn ending-btn-retry"></button>
        <button type="button" class="ending-btn ending-btn-slots"></button>
        <button type="button" class="ending-btn ending-btn-restart"></button>
      </footer>

      <button type="button" class="ending-review">
        <span class="ending-review-text"></span>
      </button>

      <p class="ending-look-hint" role="status" aria-live="polite" hidden></p>
    </div>

    <div class="ending-slots" hidden>
      <div class="ending-slots-backdrop" data-slots-close></div>
      <div class="ending-slots-panel" role="dialog" aria-modal="true"
           aria-labelledby="ending-slots-title">
        <header class="ending-slots-head">
          <h2 class="ending-slots-title" id="ending-slots-title"></h2>
          <button type="button" class="ending-slots-x" data-slots-close aria-label="">
            ${ICON_CLOSE}
          </button>
        </header>
        <p class="ending-slots-sub"></p>
        <div class="ending-slots-list"></div>
        <footer class="ending-slots-foot">
          <button type="button" class="ending-btn ending-slots-close" data-slots-close></button>
        </footer>
      </div>
    </div>
  `;

  const q = (sel) => root.querySelector(sel);
  const img = q('.ending-img');
  const eyebrow = q('.ending-eyebrow');
  const title = q('.ending-title');
  const summary = q('.ending-summary');
  const reportIcon = q('.ending-report-icon');
  const reportText = q('.ending-report-text');
  const metricsEl = q('.ending-metrics');
  const analysis = q('.ending-analysis');
  const fixText = q('.ending-fix-text');
  const retryBtn = q('.ending-btn-retry');
  const slotsBtn = q('.ending-btn-slots');
  const restartBtn = q('.ending-btn-restart');
  const reviewBtn = q('.ending-review');
  const reviewText = q('.ending-review-text');
  const lookHint = q('.ending-look-hint');
  const slotsOverlay = q('.ending-slots');
  const slotsTitle = q('.ending-slots-title');
  const slotsSub = q('.ending-slots-sub');
  const slotsList = q('.ending-slots-list');
  const slotsClose = q('.ending-slots-close');
  const slotsX = q('.ending-slots-x');
  const frame = q('.ending-frame');

  /* ---------- ảnh ----------
     Ảnh css đặt tỉ lệ 16:9 và trần 52 phần trăm chiều cao màn hình.
     Nếu ảnh lỗi thì giữ khung và hiện nền tối, không để vỡ bố cục. */
  img.src = BASE + spec.art;
  img.alt = pick(spec, 'title');
  img.addEventListener('error', () => {
    root.classList.add('is-art-missing');
  });

  /* ---------- chỉ số hàng ngang ----------
     Giai đoạn 1 hiện Sol, oxy, nước, calo, điện. Giai đoạn 2 hiện
     delta-v, khối lượng, chi phí. Chỉ hiện chỉ số nào có số thật, để
     không có ô trống mang chữ "không có". */
  function buildMetrics() {
    metricsEl.innerHTML = '';
    const rows = [];

    const isP2 = spec.phase === 2;

    if (!isP2) {
      /* Sol: lấy từ totalMinutes nếu có, nếu không thì từ trường day.
         totalMinutes là con số tích luỹ thật của chỉ số. */
      let sol = null;
      if (Number.isFinite(Number(stats.day))) sol = Math.floor(Number(stats.day));
      else if (Number.isFinite(Number(stats.totalMinutes))) {
        sol = Math.floor(Number(stats.totalMinutes) / 1440) + 1;
      }
      rows.push({
        label: ui('report.sol'),
        value: sol && sol > 0 ? num(sol) : ui('report.solNone'),
      });
      rows.push({ label: ui('report.oxygen'), value: pct(stats.oxygen) });
      rows.push({ label: ui('report.water'), value: pct(stats.water) });
      rows.push({ label: ui('report.calories'), value: pct(stats.calories) });
      /* Điện chỉ đáng hiện khi cảnh thua có liên quan tới điện. Với
         ba cảnh oxy, nước, calo thì vẫn hiện vì người chơi hay muốn
         biết mình cạn điện chưa. */
      rows.push({ label: ui('report.power'), value: pct(stats.power) });
    } else {
      rows.push({ label: ui('report.deltaV'), value: ms(extra.deltaVMs) });
      rows.push({ label: ui('report.mass'), value: kg(extra.massKg) });
      rows.push({ label: ui('report.cost'), value: musd(extra.costMusd) });
    }

    for (const r of rows) {
      if (r.value == null) continue;
      const cell = document.createElement('div');
      cell.className = 'ending-metric';

      const lab = document.createElement('dt');
      lab.className = 'ending-metric-label';
      lab.textContent = r.label;

      const val = document.createElement('dd');
      val.className = 'ending-metric-value';
      val.textContent = r.value;

      cell.append(lab, val);
      metricsEl.appendChild(cell);
    }
    metricsEl.hidden = metricsEl.children.length === 0;
  }

  function pct(v) {
    const n = num(v, 0);
    return n == null ? null : n + '%';
  }
  function ms(v) {
    const n = num(v, 0);
    return n == null ? null : n + ' m/s';
  }
  function kg(v) {
    const n = num(v, 0);
    return n == null ? null : n + ' kg';
  }
  function musd(v) {
    const n = num(v, 0);
    return n == null ? null : n + ' M$';
  }

  /* ---------- chữ ----------
     Tách riêng để đổi ngôn ngữ gọi lại được mà không dựng lại DOM. */
  function paintText() {
    eyebrow.textContent = spec.phase === 2 ? ui('eyebrow.p2') : ui('eyebrow.p1');
    title.textContent = pick(spec, 'title');
    summary.textContent = pick(spec, 'summary');
    reportText.textContent = ui('report.title');
    analysis.textContent = pick(spec, 'analysis');
    fixText.textContent = pick(spec, 'fix');
    img.alt = pick(spec, 'title');

    retryBtn.textContent = hasSave ? ui('btn.retry') : ui('btn.retryNone');
    retryBtn.disabled = !hasSave;
    slotsBtn.textContent = ui('btn.slots');
    restartBtn.textContent = ui('btn.restart');
    reviewText.textContent = ui('btn.review');

    slotsTitle.textContent = ui('slots.title');
    slotsSub.textContent = ui('slots.sub');
    slotsClose.textContent = ui('slots.close');
    slotsX.setAttribute('aria-label', ui('btn.close'));
    lookHint.textContent = ui('review.hint');

    buildMetrics();
    buildSlots();
  }

  /* ---------- danh sách mốc lưu ----------
     Hệ thống lưu hiện chỉ giữ MỘT bản ghi, nên danh sách có đúng một
     mục khi có bản lưu. Vẫn dựng thành danh sách để sau này thêm nhiều
     mốc không phải viết lại giao diện. */
  function buildSlots() {
    slotsList.innerHTML = '';
    const items = [];

    if (hasSave && saveInfo) {
      items.push({
        day: saveInfo.day,
        savedAt: saveInfo.savedAt,
        reason: saveInfo.reason,
      });
    } else if (hasSave) {
      items.push({ day: null, savedAt: null, reason: 'auto' });
    }

    if (!items.length) {
      const p = document.createElement('p');
      p.className = 'ending-slots-empty';
      p.textContent = ui('slots.none');
      slotsList.appendChild(p);
      return;
    }

    for (const it of items) {
      const row = document.createElement('div');
      row.className = 'ending-slot';

      const text = document.createElement('div');
      text.className = 'ending-slot-text';

      const name = document.createElement('span');
      name.className = 'ending-slot-name';
      name.textContent = items.length === 1
        ? ui('slots.one')
        : ui('slots.day', { n: num(it.day) });

      const when = document.createElement('span');
      when.className = 'ending-slot-when';
      when.textContent = it.day != null ? ui('slots.day', { n: num(it.day) }) : '';

      text.append(name);
      if (when.textContent) text.appendChild(when);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ending-btn ending-slot-btn';
      btn.textContent = ui('slots.pick');
      btn.addEventListener('click', () => {
        closeSlots();
        doRetry();
      });

      row.append(text, btn);
      slotsList.appendChild(row);
    }
  }

  /* ---------- nút ---------- */

  function doRetry() {
    if (!hasSave) return;
    if (typeof opts.onRetry === 'function') {
      try { opts.onRetry(); } catch (err) { console.error('[endings] onRetry lỗi', err); }
    }
  }

  retryBtn.addEventListener('click', () => {
    if (retryBtn.disabled) return;
    doRetry();
  });

  slotsBtn.addEventListener('click', () => openSlots());

  restartBtn.addEventListener('click', () => {
    if (typeof opts.onRestart === 'function') {
      try { opts.onRestart(); } catch (err) { console.error('[endings] onRestart lỗi', err); }
      return;
    }
    /* Không có handler thì chỉ đóng màn. Không tự xoá bản lưu ở đây:
       xoá là việc của nơi gọi, vì chỉ nơi đó biết đường về màn khởi
       động. */
    close();
  });

  /* ---------- xem lại ----------
     Đóng khung báo cáo nhưng KHÔNG đóng lớp phủ: người chơi ngắm được
     cảnh chết trên nền tối, và game vẫn ở trạng thái chết vì đồng hồ
     đã dừng từ trước khi màn này mở. Bấm lần nữa thì quay lại báo cáo. */
  let looking = false;

  function setLooking(on) {
    looking = on;
    root.classList.toggle('is-looking', on);
    lookHint.hidden = !on;
    reviewText.textContent = on ? ui('review.back') : ui('btn.review');
    if (!on) {
      /* Quay lại báo cáo thì đưa tiêu điểm về khung, để trình đọc màn
         hình không bị lạc. */
      try { frame.focus({ preventScroll: true }); } catch { /* bỏ qua */ }
    }
  }

  reviewBtn.addEventListener('click', () => setLooking(!looking));

  /* ---------- danh sách mốc lưu ---------- */

  let slotsOpen = false;

  function openSlots() {
    if (slotsOpen) return;
    slotsOpen = true;
    slotsOverlay.hidden = false;
    root.classList.add('is-slots');
    requestAnimationFrame(() => {
      if (!slotsOpen) return;
      slotsOverlay.classList.add('is-open');
      /* Đưa tiêu điểm vào nút đầu tiên trong danh sách, nếu không thì
         bàn phím vẫn ở nút phía sau lớp phủ. */
      const first = slotsList.querySelector('button') || slotsClose;
      if (first) first.focus();
    });
  }

  function closeSlots() {
    if (!slotsOpen) return;
    slotsOpen = false;
    slotsOverlay.classList.remove('is-open');
    root.classList.remove('is-slots');
    const done = () => { if (!slotsOpen) slotsOverlay.hidden = true; };
    if (instant) done();
    else setTimeout(done, 180);
    try { slotsBtn.focus({ preventScroll: true }); } catch { /* bỏ qua */ }
  }

  slotsOverlay.querySelectorAll('[data-slots-close]').forEach((b) => {
    b.addEventListener('click', closeSlots);
  });

  /* ---------- bàn phím ---------- */

  function onKey(ev) {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      if (slotsOpen) { closeSlots(); return; }
      if (looking) { setLooking(false); return; }
      /* Esc không đóng hẳn màn kết thúc: người chơi phải chọn một
         trong ba nút, nếu không sẽ kẹt ở trạng thái chết mà không có
         lối ra rõ ràng. */
      return;
    }
    if (ev.key !== 'Tab') return;

    const scope = slotsOpen ? slotsOverlay : root;
    const nodes = Array.from(scope.querySelectorAll('button:not([disabled])'))
      .filter((n) => n.offsetParent !== null);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (ev.shiftKey && document.activeElement === first) {
      ev.preventDefault();
      last.focus();
    } else if (!ev.shiftKey && document.activeElement === last) {
      ev.preventDefault();
      first.focus();
    }
  }
  document.addEventListener('keydown', onKey, true);

  /* ---------- âm thanh ----------
     Nhạc nền hạ xuống 20 phần trăm để tiếng báo tử không bị nhạc đè.
     Dùng API có sẵn trong audio.js, không tạo Audio mới. */
  const unMusic = clampMusicVolume(0.2);
  /* Một tiếng trầm ngắn: warning-chime đã có sẵn trong bộ SFX, phát
     một lần. Không có file thì playOneShotSfx tự bỏ qua êm. */
  try { playOneShotSfx('warning-chime'); } catch { /* thiếu file thì thôi */ }

  /* ---------- vòng đời ---------- */

  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    unLang();
    unMusic();
    root.classList.remove('is-open');
    const done = () => root.remove();
    if (instant) done();
    else setTimeout(done, 260);
    active = null;
  }

  const unLang = onLangChange(() => { if (!closed) paintText(); });

  document.body.appendChild(root);
  paintText();

  /* Hiện dần: lớp phủ mờ vào rồi khung trượt lên. Tắt hiệu ứng thì
     gắn class is-open ngay trong khung hình đầu, không có chuyển
     động nào. */
  if (instant) {
    root.classList.add('is-open');
  } else {
    requestAnimationFrame(() => {
      if (closed) return;
      root.classList.add('is-open');
      try { frame.focus({ preventScroll: true }); } catch { /* bỏ qua */ }
    });
  }

  active = { close, root };
  return active;
}

/* ============================================================
   TIỆN ÍCH CHO NƠI GỌI
   ============================================================ */

/* Đổi cause của hab-stats.checkDeath() sang id cảnh kết thúc. Tách ra
   để base.js không phải giữ một bảng ánh xạ riêng. */
export const DEATH_CAUSE_TO_ENDING = {
  oxygen: 'hypoxia',
  water: 'dehydration',
  calories: 'starvation',
};

export function endingIdForCause(cause) {
  return DEATH_CAUSE_TO_ENDING[cause] || null;
}

/* Nhãn tiếng cho một cảnh, dùng ở nhật ký hoặc nơi khác cần tên ngắn. */
export function endingTitle(id) {
  const spec = getEndingSpec(id);
  if (!spec) return '';
  return getLang() === 'en' ? spec.titleEn : spec.titleVi;
}

/* Giữ t() được dùng ở file này: nơi khác có thể đã import và không
   muốn cảnh báo biến rỗng. */
void t;
