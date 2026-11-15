/* ============================================================
   phase2/feature-component-modal.js
   Cửa sổ chọn linh kiện chi tiết cho xưởng lắp ráp.

   Một modal rộng tối đa 720px, cuộn bên trong, liệt kê mọi linh kiện
   của một nhóm. Mỗi thẻ có icon vẽ riêng, tên, dòng đánh đổi ngắn, ba
   chỉ số, nút Chọn hoặc Gỡ, và một nút kính lúp mở thẻ khoa học có
   bảng thông số cùng liên kết thật tới trang NASA.

   API theo phase2/CONTRACT.md:
     openComponentModal({ group, engine, onClose }) -> { root, close }

   Sáu nhóm hợp lệ:
     launcher    reference_launchers.vehicles
     propellant  category propellant + propulsion
     spacecraft  category power + shielding
     comms       category communications
     supplies    category supplies + life_support
     trajectory  không có trong JSON, xem TRAJECTORIES bên dưới

   Đường dẫn lấy bằng new URL('.', import.meta.url).href, không dùng
   location.href. Mọi màu đọc từ ../src/css/tokens.css.
   ============================================================ */

import { getLang, onLangChange } from '../i18n.js';

const BASE = new URL('.', import.meta.url).href;
const DATA_URL = new URL('../data/nasa/rescue_modules.json', import.meta.url).href;
const CSS_URL = new URL('css-component-modal.css', import.meta.url).href;

/* ============================================================
   1. CHUỖI SONG NGỮ CỦA RIÊNG MODAL NÀY
   Không sửa src/i18n.js vì các sub khác đang chạy song song.
   ============================================================ */

const STR = {
  vi: {
    eyebrow: 'DANH MỤC LINH KIỆN',
    close: 'Đóng cửa sổ',
    closeLens: 'Đóng thẻ khoa học',
    pick: 'Chọn',
    picked: 'Gỡ',
    pickedMark: 'Đang chọn',
    lens: 'Mở thông số khoa học',
    lensShort: 'Thông số khoa học',
    done: 'XONG',

    gLauncher: 'Động cơ đẩy lên quỹ đạo',
    gLauncherSub:
      'Tên lửa quyết định tàu của bạn có rời được mặt đất hay không. Sức chở lên quỹ đạo thấp càng lớn thì tàu càng nặng được, nhưng giá phóng tăng rất nhanh.',
    gPropellant: 'Động cơ và nhiên liệu',
    gPropellantSub:
      'Cặp động cơ và bình nhiên liệu quyết định tàu đi được bao xa. Động cơ có Isp cao thì cùng một bình nhiên liệu bay xa hơn hẳn.',
    gSpacecraft: 'Thân tàu, nguồn điện và che chắn',
    gSpacecraftSub:
      'Phần này giữ cho con tàu có điện và giữ cho phi hành đoàn không bị bức xạ đánh trong hơn hai trăm ngày bay.',
    gComms: 'Liên lạc về Trái Đất',
    gCommsSub:
      'Không có kênh liên lạc thì không có lệnh hạ cánh. Chảo càng lớn thì tín hiệu càng rõ, nhưng cũng càng phải chĩa chính xác.',
    gSupplies: 'Tiếp tế và tái chế',
    gSuppliesSub:
      'Đồ ăn, nước và oxy cho cả hành trình. Tái chế tốt thì mang ít hơn, nhưng máy tái chế lại ăn điện và dễ hỏng.',
    gTrajectory: 'Đường bay',
    gTrajectorySub:
      'Đường bay đổi thời gian tới nơi và lượng nhiên liệu phải đốt. Hướng bay chính thức được chốt ở bước lập kế hoạch bay.',

    statMass: 'Khối lượng',
    statCost: 'Chi phí',
    statIsp: 'Isp',
    statPower: 'Công suất',
    statLift: 'Sức chở',
    statDv: 'Thêm delta-v',
    statGen: 'Phát điện',
    statDraw: 'Tiêu thụ',

    totalMass: 'Tổng khối lượng nhóm này',
    totalCost: 'Tổng chi phí nhóm này',
    totalNone: 'Chưa chọn linh kiện nào trong nhóm này.',
    totalCount: '{n} linh kiện',

    specTitle: 'Thông số kỹ thuật',
    specName: 'Tên gốc',
    specMass: 'Khối lượng',
    specCost: 'Chi phí',
    specPower: 'Điện năng',
    specIsp: 'Xung lực riêng (Isp)',
    specLift: 'Sức chở lên quỹ đạo thấp',
    specDv: 'Ngân sách delta-v',
    specSrc: 'Nguồn',
    physicsTitle: 'Nguyên lý hoạt động',
    tradeoffTitle: 'Đánh đổi',
    nasaLink: 'Đọc bài viết khoa học của NASA',
    nasaLinkNote: 'Mở trong tab mới, trang chính thức của NASA.',
    sciNote: 'Số liệu lấy từ danh mục linh kiện và tài liệu nguồn của dự án.',

    trajNote:
      'Hướng bay được chốt ở bước lập kế hoạch bay, màn này chỉ ghi lại lựa chọn để bạn so sánh.',
    trajPicked: 'Đang ghi nhận',

    loadErr: 'Không nạp được danh mục linh kiện.',
    noItems: 'Nhóm này chưa có linh kiện nào trong danh mục.',
    unitKg: 'kg',
    unitMusd: 'triệu USD',
    unitW: 'W',
    unitS: 'giây',
    unitMs: 'm/s',
  },

  en: {
    eyebrow: 'PARTS CATALOGUE',
    close: 'Close the window',
    closeLens: 'Close the science card',
    pick: 'Select',
    picked: 'Remove',
    pickedMark: 'Selected',
    lens: 'Open the science spec',
    lensShort: 'Science spec',
    done: 'DONE',

    gLauncher: 'Launch to orbit',
    gLauncherSub:
      'The rocket decides whether your ship leaves the ground at all. More lift capacity carries a heavier ship, but the launch price climbs very fast.',
    gPropellant: 'Engine and propellant',
    gPropellantSub:
      'The engine and tank pair sets how far the ship can go. A higher Isp engine flies much further on the same tank.',
    gSpacecraft: 'Hull, power and shielding',
    gSpacecraftSub:
      'This part keeps the ship powered and keeps the crew from being hit by radiation across two hundred days of flight.',
    gComms: 'Link back to Earth',
    gCommsSub:
      'No link means no landing command. A bigger dish gives a clearer signal, but it has to point more precisely.',
    gSupplies: 'Supplies and recycling',
    gSuppliesSub:
      'Food, water and oxygen for the whole trip. Good recycling means carrying less, but the recycler draws power and breaks.',
    gTrajectory: 'Flight path',
    gTrajectorySub:
      'The path changes the arrival time and how much propellant you burn. The official path is locked in at the flight planning step.',

    statMass: 'Mass',
    statCost: 'Cost',
    statIsp: 'Isp',
    statPower: 'Power',
    statLift: 'Lift',
    statDv: 'Extra delta-v',
    statGen: 'Generates',
    statDraw: 'Draws',

    totalMass: 'Total mass in this group',
    totalCost: 'Total cost in this group',
    totalNone: 'Nothing selected in this group yet.',
    totalCount: '{n} parts',

    specTitle: 'Technical data',
    specName: 'Original name',
    specMass: 'Mass',
    specCost: 'Cost',
    specPower: 'Electrical power',
    specIsp: 'Specific impulse (Isp)',
    specLift: 'Lift to low Earth orbit',
    specDv: 'Delta-v budget',
    specSrc: 'Source',
    physicsTitle: 'How it works',
    tradeoffTitle: 'Tradeoff',
    nasaLink: 'Read the NASA science article',
    nasaLinkNote: 'Opens in a new tab, on NASAs official site.',
    sciNote: 'Figures come from the parts catalogue and the project source documents.',

    trajNote:
      'The flight path is locked in at the flight planning step. This screen only records your choice so you can compare.',
    trajPicked: 'Recorded',

    loadErr: 'Could not load the parts catalogue.',
    noItems: 'This group has no parts in the catalogue.',
    unitKg: 'kg',
    unitMusd: 'M USD',
    unitW: 'W',
    unitS: 's',
    unitMs: 'm/s',
  },
};

function T(key, vars) {
  const table = STR[getLang()] || STR.vi;
  let s = table[key] ?? STR.vi[key] ?? key;
  if (vars) {
    for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
  }
  return s;
}

function isEn() {
  return getLang() === 'en';
}

function pick(obj, field) {
  if (!obj) return '';
  return (isEn() ? obj[field + '_en'] : obj[field + '_vi']) || obj[field + '_vi'] || obj[field + '_en'] || '';
}

function fmt(n, digits = 0) {
  if (!Number.isFinite(Number(n))) return '0';
  const fixed = Number(n).toFixed(digits);
  const neg = fixed.startsWith('-');
  const body = neg ? fixed.slice(1) : fixed;
  const parts = body.split('.');
  const sep = isEn() ? ',' : '.';
  const dec = isEn() ? '.' : ',';
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return (neg ? '-' : '') + parts.join(dec);
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Cắt dòng đánh đổi còn khoảng 90 ký tự, cắt ở ranh giới từ. */
function clip(s, max = 90) {
  const text = String(s || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:.\s]+$/, '') + '…';
}

/* ============================================================
   2. SÁU NHÓM LINH KIỆN
   Mỗi nhóm gom theo category của rescue_modules.json. `engineGroup`
   là tên nhóm mà phase2-engine.js chấp nhận trong updateSelection.
   ============================================================ */

const CATEGORY_ENGINE_GROUP = {
  propulsion: 'propulsion',
  propellant: 'propellant',
  power: 'power',
  shielding: 'shielding',
  communications: 'comms',
  supplies: 'supplies',
  life_support: 'life_support',
  science_and_edl: 'edl',
};

const GROUPS = {
  launcher: { titleKey: 'gLauncher', subKey: 'gLauncherSub', kind: 'launcher' },
  propellant: { titleKey: 'gPropellant', subKey: 'gPropellantSub', kind: 'modules', cats: ['propellant', 'propulsion'] },
  spacecraft: { titleKey: 'gSpacecraft', subKey: 'gSpacecraftSub', kind: 'modules', cats: ['power', 'shielding'] },
  comms: { titleKey: 'gComms', subKey: 'gCommsSub', kind: 'modules', cats: ['communications'] },
  supplies: { titleKey: 'gSupplies', subKey: 'gSuppliesSub', kind: 'modules', cats: ['supplies', 'life_support'] },
  trajectory: { titleKey: 'gTrajectory', subKey: 'gTrajectorySub', kind: 'trajectory' },
};

/* Bốn hồ sơ đường bay. Không có trong JSON vì JSON chỉ chứa module
   phần cứng; đây là lựa chọn của nhóm làm game dựa trên bốn chặng
   delta-v trong rescue_mission.json. */
const TRAJECTORIES = [
  {
    id: 'traj_hohmann',
    group: 'trajectory',
    name_vi: 'Cửa sổ Hohmann tiết kiệm nhất',
    name_en: 'Leanest Hohmann window',
    tradeoff_vi: 'Đốt đúng một lần mỗi chặng, tốn ít nhiên liệu nhất nhưng bay lâu nhất và không có chỗ sửa sai.',
    tradeoff_en: 'One burn per leg, the least propellant of any option, but the slowest trip and no room to correct a mistake.',
    extra_dv_ms: 0,
    days: 258.9,
    cost_musd: 0,
    source: 'Bốn chặng delta-v 3.570 + 2.080 + 1.000 m/s và thời gian bay 258,9 ngày: src/data/nasa/rescue_mission.json.',
  },
  {
    id: 'traj_fast',
    group: 'trajectory',
    name_vi: 'Chuyển tiếp nhanh, tới sớm 54 ngày',
    name_en: 'Fast transfer, 54 days earlier',
    tradeoff_vi: 'Đốt thêm khoảng 900 m/s để rút ngắn hành trình 54 ngày, đổi lại phải mang nhiên liệu dự trữ và bình to hơn.',
    tradeoff_en: 'About 900 m/s of extra burn buys a 54 day shorter trip, paid for with more reserve propellant and a bigger tank.',
    extra_dv_ms: 900,
    days: 205,
    cost_musd: 40,
    source: 'Ước tính của nhóm làm game, không phải số liệu NASA. Mốc 258,9 ngày lấy từ rescue_mission.json.',
  },
  {
    id: 'traj_split',
    group: 'trajectory',
    name_vi: 'Đốt chia ba lần để sửa sai số',
    name_en: 'Three burns to trim the aim',
    tradeoff_vi: 'Ba lần đốt nhỏ thay vì một lần lớn, sai số tới nơi giảm mạnh nhưng tốn thêm khoảng 120 m/s và thêm một ngày.',
    tradeoff_en: 'Three small burns instead of one big one, which cuts the arrival error sharply for about 120 m/s and one extra day.',
    extra_dv_ms: 120,
    days: 262,
    cost_musd: 12,
    source: 'Ước tính của nhóm làm game dựa trên thông lệ hiệu chỉnh quỹ đạo của các sứ mệnh Sao Hỏa.',
  },
  {
    id: 'traj_aerocapture',
    group: 'trajectory',
    name_vi: 'Hãm bằng khí quyển Sao Hỏa',
    name_en: 'Aerocapture into Mars orbit',
    tradeoff_vi: 'Dùng khí quyển mỏng để hãm thay vì đốt động cơ, tiết kiệm khoảng 1.200 m/s nhưng lá chắn nhiệt phải chịu nhiệt lớn và rủi ro cao.',
    tradeoff_en: 'Using the thin atmosphere to brake instead of burning saves about 1200 m/s, but the heat shield takes a heavy load and the risk is high.',
    extra_dv_ms: -1200,
    days: 250,
    cost_musd: 25,
    source: 'Ước tính của nhóm làm game. Chặng bắt quỹ đạo 2.080 m/s lấy từ rescue_mission.json.',
  },
];

/* ============================================================
   3. DẮT LIỆU RIÊNG CHO TÊN LỬA ĐẨY
   reference_launchers chỉ có sức chở và giá, thiếu phần đánh đổi,
   nguồn và nguyên lý, nên bổ sung ở đây thay vì sửa JSON.
   ============================================================ */

const LAUNCHER_TEXT = {
  electron: {
    tradeoff_vi: 'Rẻ và bay thường xuyên nhưng chỉ 200 kg lên quỹ đạo thấp, không đủ chở một mảnh tàu cứu hộ.',
    tradeoff_en: 'Cheap and it flies often, but 200 kg to low orbit cannot lift a single piece of the rescue ship.',
    physics_vi:
      'Tên lửa nhỏ đẩy một khối hàng ra khỏi bầu khí quyển bằng sức phản lực của khí phụt xuống dưới. Sức chở nhỏ vì hầu hết khối lượng là nhiên liệu của chính nó. Muốn chở nặng hơn thì phải to hơn, không có cách nào khác.',
    physics_en:
      'A small rocket pushes a payload out of the atmosphere by throwing exhaust downward. Its lift is small because most of its mass is its own propellant. Lifting more always means building bigger.',
  },
  falcon9_dedicated: {
    tradeoff_vi: '10 tấn lên quỹ đạo thấp với giá khiêm tốn, đủ cho một mảnh nhưng không đủ cho cả tàu trong một lần.',
    tradeoff_en: '10 tonnes to low orbit at a modest price, enough for one piece but never the whole ship in a single launch.',
    physics_vi:
      'Tên lửa hai tầng bỏ dần khối lượng rỗng để nhẹ đi giữa đường. Mỗi lần bỏ một tầng, phần còn lại không phải mang theo vỏ thép đã hết nhiên liệu, nên tầng cuối tới nơi với rất ít nhiên liệu.',
    physics_en:
      'A two stage rocket drops empty mass as it climbs. Every stage it sheds is steel and tanks it no longer has to carry, which is what lets the final stage reach orbit with so little propellant left.',
  },
  ariane6: {
    tradeoff_vi: 'Sức chở 12 tấn, giá cao hơn Falcon 9 đáng kể trên mỗi ki-lô-gam hàng đưa lên quỹ đạo.',
    tradeoff_en: '12 tonnes of lift, but a noticeably higher price per kilogram than Falcon 9.',
    physics_vi:
      'Hai tầng với cụm tăng lực rắn ở chân, phần rắn cháy hết rất nhanh để đẩy khỏi bệ rồi tách ra. Phần lớn công đẩy nặng nhất được làm lúc tàu còn chậm và còn nặng, đó là lý do phải dùng tăng lực.',
    physics_en:
      'Two stages with solid boosters at the base. The solids burn out fast to clear the pad and then fall away. The heaviest work is done while the vehicle is still slow and heavy, which is why boosters exist.',
  },
  falcon_heavy: {
    tradeoff_vi: 'Ba lõi cho 25 tấn, đủ chở phần thân và nhiên liệu, nhưng ghép nhiều mảnh trên quỹ đạo thì rủi ro tăng.',
    tradeoff_en: 'Three cores give 25 tonnes, enough for the hull and the propellant, but assembling many pieces in orbit adds risk.',
    physics_vi:
      'Ba lõi giống nhau cháy cùng lúc cho lực đẩy gấp ba lúc đầu, rồi hai lõi bên tách ra. Cách này rẻ hơn chế tạo một tên lửa khổng lồ mới vì dùng lại đúng một loại lõi.',
    physics_en:
      'Three identical cores burn together for triple thrust at liftoff, then the side cores peel off. It is cheaper than building one giant new rocket because all three cores are the same design.',
  },
  sls_block1: {
    tradeoff_vi: '70 tấn trong một lần phóng, nhưng 2.200 triệu USD một suất, tức hơn nửa ngân sách cả sứ mệnh.',
    tradeoff_en: '70 tonnes in one launch, but 2,200 million USD a flight, more than half the whole mission budget.',
    physics_vi:
      'Hai tăng lực rắn khổng lồ gánh phần lớn lực đẩy lúc đầu, còn tầng chính chạy hydro lỏng rất nhẹ nên đạt vận tốc lớn. Sức chở lớn vì tầng trên chỉ phải mang hàng, không phải mang thêm nhiên liệu đẩy khỏi mặt đất.',
    physics_en:
      'Two huge solid boosters carry most of the liftoff thrust, while the core stage burns very light liquid hydrogen to reach high speed. It lifts so much because the upper stage carries payload only, not the fuel needed to leave the ground.',
  },
};

/* ============================================================
   4. NGUYÊN LÝ VẬT LÝ, VIẾT RIÊNG CHO TỪNG LINH KIỆN
   Hai tới ba câu, tiếng Việt đời thường, kèm bản tiếng Anh.
   ============================================================ */

const PHYSICS = {
  prop_chemical_320: {
    vi:
      'Động cơ hóa học đốt nhiên liệu với chất oxy hóa trong một buồng kín, khí nóng phụt ra phía sau và đẩy tàu về phía trước. Con số Isp đo mức tiết kiệm: Isp 320 nghĩa là một kilôgam nhiên liệu tạo được lực đẩy trong 320 giây. Isp càng cao thì cùng một bình nhiên liệu đi được càng xa, và đây chính là chỗ mà động cơ hóa học thua thiệt.',
    en:
      'A chemical engine burns fuel with an oxidiser inside a closed chamber, and the hot gas rushing out the back pushes the ship forward. Isp measures the economy: Isp 320 means one kilogram of propellant buys 320 seconds of thrust. Higher Isp means the same tank flies further, and this is exactly where chemical engines fall behind.',
  },
  prop_hypergolic_450: {
    vi:
      'Hai chất lỏng này tự bốc cháy ngay khi chạm nhau, không cần bugi và không thể tắt nhầm, nên động cơ nổ rất chắc chắn. Khí thải của chúng nhẹ và nóng hơn nên Isp lên tới 450. Cái giá là hai chất này cực độc, phải nạp trong bộ đồ bảo hộ và không được rò rỉ.',
    en:
      'These two liquids ignite on contact, with no igniter and no way to misfire, which makes the engine extremely reliable. Their exhaust is lighter and hotter, which is what lifts Isp to 450. The price is that both fluids are highly toxic and must be loaded in protective gear without a single leak.',
  },
  prop_nuclear_ntp_900: {
    vi:
      'Lò phản ứng làm nóng khí hydro tới hàng nghìn độ rồi phụt thẳng khí đó ra sau, không đốt cháy gì cả. Vì khí ra rất nhanh nên Isp tới 900, gần gấp ba động cơ hóa học, và cùng một bình nhiên liệu bay xa hơn hẳn. Đổi lại là một lò phản ứng thật trên tàu, phải được cấp phép và không ai muốn thấy nó gặp sự cố gần Trái Đất.',
    en:
      'A reactor heats hydrogen gas to thousands of degrees and throws that gas straight out the back without burning anything. The exhaust leaves so fast that Isp reaches 900, close to three times a chemical engine, so one tank flies much further. In exchange you fly a real reactor, one that needs a licence and that nobody wants to see fail near Earth.',
  },
  power_solar_rosa: {
    vi:
      'Pin quang điện biến ánh sáng Mặt Trời thành dòng điện, và sản lượng tỉ lệ với diện tích tấm pin và độ mạnh của ánh sáng. Ở Sao Hỏa ánh sáng yếu hơn Trái Đất khoảng 43 phần trăm vì xa Mặt Trời hơn, nên 30 kW trên giấy chỉ còn khoảng 17 kW thực tế. Tấm pin cũng phải có cơ cấu gạt bụi, nếu không bụi Sao Hỏa phủ lên là mất điện dần.',
    en:
      'Solar cells turn sunlight into current, and the output scales with panel area and with how strong the light is. Mars sunlight is about 43 percent weaker than at Earth because it is further out, so 30 kW on paper is closer to 17 kW in practice. The array also needs a way to shed dust, or Martian dust settles on it and the power fades away.',
  },
  power_rtg_mmrtg: {
    vi:
      'Một khối plutonium 238 tự tỏa nhiệt vì phân rã phóng xạ, và các cặp nhiệt điện biến chênh lệch nhiệt đó thành điện. Máy này không có bộ phận chuyển động và không cần ánh sáng, nên bão bụi che kín Mặt Trời cũng không làm nó dừng. Đổi lại mỗi kilôgam chỉ cho hơn hai oát, thấp hơn tấm pin hơn hai chục lần.',
    en:
      'A plutonium 238 core gives off heat simply by decaying, and thermocouples turn that heat difference into current. There are no moving parts and no need for light, so a dust storm that blacks out the Sun does not stop it. In exchange each kilogram gives just over two watts, more than twenty times worse than a solar array.',
  },
  comms_high_gain: {
    vi:
      'Chảo parabol hội tụ sóng vô tuyến thành một chùm hẹp bắn về phía Trái Đất, giống như gương lõm gom ánh sáng vào một điểm. Chùm càng hẹp thì năng lượng tới nơi càng dày, nhưng sai lệch một chút là lệch hẳn khỏi Trái Đất. Ở khoảng cách xa nhất, sóng đi một chiều mất 22,3 phút, nên mọi lệnh gửi đi đều là lệnh mù.',
    en:
      'A parabolic dish focuses radio waves into a narrow beam aimed at Earth, the same way a concave mirror gathers light into a spot. The narrower the beam, the denser the energy that arrives, but a small pointing error throws it clear of Earth. At the far end of the range the signal takes 22.3 minutes each way, so every command goes out blind.',
  },
  life_moxie_filter: {
    vi:
      'MOXIE hút khí CO2 của Sao Hỏa, nung nóng rồi tách phân tử đó ra thành oxy và cacbon monoxit bằng điện phân. Làm được vậy nghĩa là không phải mang oxy cho chặng về từ Trái Đất, tiết kiệm hàng trăm kilôgam. Nhưng nó chạy hoàn toàn bằng điện, nên mất điện là mất nguồn oxy.',
    en:
      'MOXIE pulls in Martian CO2, heats it, then splits the molecule into oxygen and carbon monoxide by electrolysis. That trick means you do not carry the return leg oxygen from Earth, saving hundreds of kilograms. It runs entirely on electricity, so losing power means losing the oxygen supply.',
  },
  life_eclss_recycler: {
    vi:
      'Nước thải, mồ hôi và hơi thở được lọc, chưng cất rồi khử trùng, sau đó quay lại thành nước uống được. Thu hồi 93 phần trăm nghĩa là mỗi vòng chỉ mất 7 phần trăm, nên một tấn nước mang theo biến thành hơn mười bốn tấn nước dùng được. Máy này ăn điện liên tục và chuỗi đường ống của nó rất khó sửa giữa hành trình.',
    en:
      'Waste water, sweat and breath are filtered, distilled and sterilised, then come back as drinking water. Recovering 93 percent means each pass loses only 7 percent, so one tonne carried turns into more than fourteen tonnes used. The loop draws power continuously and its plumbing is very hard to repair in transit.',
  },
  tank_propellant_main: {
    vi:
      'Bình này chứa nhiên liệu lỏng, và lượng nhiên liệu quyết định tàu đổi được bao nhiêu vận tốc. Công thức Tsiolkovsky cho biết delta-v tăng theo vận tốc khí thải và theo logarit của tỉ số khối lượng, nghĩa là muốn nhanh gấp đôi thì phải tăng khối lượng nhiên liệu rất nhiều chứ không phải gấp đôi. Cùng 21 tấn khí đốt, Isp 900 cho khoảng 7.719 m/s còn Isp 320 chỉ cho khoảng 3.229 m/s.',
    en:
      'The tank holds liquid propellant, and how much you carry sets how much velocity the ship can change. The Tsiolkovsky equation says delta-v grows with exhaust velocity and with the logarithm of the mass ratio, so doubling the speed needs far more than double the propellant. The same 21 tonnes gives about 7719 m/s at Isp 900 and only about 3229 m/s at Isp 320.',
  },
  shield_radiation: {
    vi:
      'Vật liệu giàu hydro như polyetylen chặn các hạt tích điện và nơtron của tia vũ trụ bằng cách làm chúng va đập và mất năng lượng dần. Chắn dày gấp đôi không chặn được gấp đôi, lợi ích tăng chậm dần trong khi khối lượng tăng đều. Vì vậy 1,9 tấn ở đây chỉ mua được khoảng 40 phần trăm liều bức xạ bị chặn.',
    en:
      'Hydrogen rich material such as polyethylene stops charged particles and neutrons from cosmic rays by making them collide and lose energy bit by bit. Doubling the thickness does not double the shielding, so the benefit flattens while the mass keeps climbing. That is why 1.9 tonnes here buys only about 40 percent of the dose blocked.',
  },
  supplies_crew_three: {
    vi:
      'Mỗi người cần khoảng 2.900 kcal thức ăn, vài lít nước và gần một kilôgam oxy mỗi ngày, nhân lên với số người và số ngày là ra khối lượng phải mang. Đây là môn số học không thể né: ba người một nghìn ngày là hơn năm tấn hàng tiêu hao. Tái chế nước và oxy tại chỗ là cách duy nhất để con số đó không phình thêm.',
    en:
      'Each person needs about 2900 kcal of food, a few litres of water and nearly a kilogram of oxygen a day, multiplied by crew size and days aloft. This is arithmetic you cannot dodge: three people for a thousand days is well over five tonnes of consumables. Recycling water and oxygen on board is the only way to stop that number from growing.',
  },
  sensor_edl_suite: {
    vi:
      'Khí quyển Sao Hỏa mỏng chỉ bằng khoảng một phần trăm khí quyển Trái Đất, nên dù chỉ hãm được một phần và phần lớn việc giảm tốc phải do động cơ gánh. Radar đo độ cao và cảm biến quán tính cho biết tàu đang ở đâu và đang rơi nhanh cỡ nào, để động cơ biết lúc nào phải bật. Thiếu bộ này thì hạ cánh là hạ cánh mù, và hạ cánh mù trên Sao Hỏa gần như luôn là hỏng tàu.',
    en:
      'The Martian atmosphere is only about one percent as thick as Earths, so a parachute does part of the braking and the engines must cover the rest. Radar and inertial sensors say where the ship is and how fast it is falling, which tells the engines when to fire. Without them the landing is blind, and a blind landing on Mars almost always ends with a broken ship.',
  },
};

/* Icon theo id, nét mảnh. viewBox 0 0 48 48 để khớp ô 56px. */
const ICONS = {
  /* động cơ hóa học: chuông phun và ngọn lửa ngắn */
  prop_chemical_320: `
    <path d="M17 8h14l-3 13H20Z"/>
    <path d="M20 21h8"/>
    <path d="M21 25c1 7 2 12 3 16 1-4 2-9 3-16"/>
    <path d="M15 13h2M31 13h2"/>`,
  /* hypergolic: hai chuông đôi, hai đường nhiên liệu */
  prop_hypergolic_450: `
    <path d="M9 9h11l-3 11h-5Z"/>
    <path d="M28 9h11l-3 11h-5Z"/>
    <path d="M13 20h6l-3 9-3-9Z"/>
    <path d="M32 20h6l-3 9-3-9Z"/>
    <path d="M23 13h4"/>`,
  /* NTP: lò phản ứng vuông trên, vòi phun dưới */
  prop_nuclear_ntp_900: `
    <rect x="16" y="5" width="16" height="13" rx="2"/>
    <path d="M16 11h16M21 5v13M27 5v13"/>
    <path d="M18 18h12l-3 9h-6Z"/>
    <path d="M21 27c1 6 2 10 3 13 1-3 2-7 3-13"/>
    <path d="M12 9h-3M39 9h-3"/>`,
  /* pin mặt trời: hai tấm có ô và một cột giữa */
  power_solar_rosa: `
    <rect x="21" y="8" width="6" height="32" rx="1"/>
    <path d="M21 16h6M21 24h6M21 32h6"/>
    <path d="M4 12h15v13H4Z"/><path d="M4 18.5h15M11.5 12v13"/>
    <path d="M29 12h15v13H29Z"/><path d="M29 18.5h15M36.5 12v13"/>`,
  /* RTG: khối giữa có cánh tản nhiệt hai bên */
  power_rtg_mmrtg: `
    <rect x="16" y="13" width="16" height="18" rx="2"/>
    <path d="M16 19h16M16 25h16"/>
    <path d="M31 16h9v5h-9ZM31 23h9v5h-9Z"/>
    <path d="M16 16H7v5h9ZM16 23H7v5h9Z"/>
    <path d="M24 31v7M19 38h10"/>`,
  /* chảo parabol trên cột */
  comms_high_gain: `
    <path d="M24 5c10 0 17 7 17 15H7c0-8 7-15 17-15Z"/>
    <path d="M24 20v11"/>
    <path d="M17 38h14"/>
    <path d="M24 20 12 12M24 20l12-8"/>
    <circle cx="24" cy="16" r="2.4"/>`,
  /* MOXIE: hộp lọc có mũi tên khí vào và bóng oxy ra */
  life_moxie_filter: `
    <rect x="11" y="21" width="20" height="16" rx="2"/>
    <path d="M11 29h20"/>
    <path d="M24 21V9"/>
    <circle cx="24" cy="7" r="3"/>
    <path d="M31 29h6"/><path d="m34 26 3 3-3 3"/>
    <path d="M15 33h6"/>`,
  /* ECLSS: giọt nước trong vòng tuần hoàn */
  life_eclss_recycler: `
    <path d="M24 8c6 7 10 12 10 17a10 10 0 0 1-20 0c0-5 4-10 10-17Z"/>
    <path d="M19 25a5 5 0 0 0 5 5"/>
    <path d="M33 5l4 4-4 4"/>`,
  /* bình nhiên liệu: xi lanh có hai đai */
  tank_propellant_main: `
    <rect x="17" y="5" width="14" height="34" rx="6"/>
    <path d="M17 15h14M17 25h14M17 35h14"/>
    <path d="M11 20h6M31 20h6"/>
    <path d="M11 20v8M37 20v8"/>`,
  /* che chắn: ba lớp vật liệu so le */
  shield_radiation: `
    <path d="M9 8h8v32H9Z"/>
    <path d="M18 12h8v24h-8Z"/>
    <path d="M27 16h8v16h-8Z"/>
    <path d="M40 22l-3-4M40 30l-3 4M41 26l-4 0"/>`,
  /* gói tiếp tế: hộp có dây đai và nhãn */
  supplies_crew_three: `
    <path d="M8 15h32v26H8Z"/>
    <path d="M8 15l4-5h24l4 5"/>
    <path d="M24 15v26"/>
    <path d="M8 26h32"/>
    <path d="M14 20h4M30 32h5"/>`,
  /* EDL: khoang hạ cánh có dù và ba chân */
  sensor_edl_suite: `
    <path d="M15 22h18l-4 12H19Z"/>
    <path d="M19 34h10"/>
    <path d="M19 34 13 43M29 34l6 9M24 34v9"/>
    <path d="M24 22v-6"/>
    <path d="M12 14c4-6 20-6 24 0"/>
    <path d="M24 16v-8"/>`,
  /* tên lửa đẩy: thân đứng có vây */
  launcher: `
    <path d="M24 4c5 5 7 11 7 18v13H17V22c0-7 2-13 7-18Z"/>
    <path d="M17 26h14M17 33h14"/>
    <path d="M17 38 12 44h5M31 38l5 6h-5"/>
    <path d="M22 44h4"/>`,
  /* đường bay: cung quỹ đạo có hai điểm */
  trajectory: `
    <path d="M6 36c6-20 14-26 20-24 5 2 8 8 5 14"/>
    <circle cx="6" cy="36" r="2.6"/>
    <circle cx="31" cy="26" r="2.6"/>
    <path d="M34 6c3 2 4 5 3 8M38 4c4 3 5 7 4 11"/>`,
};

function iconKeyFor(item) {
  if (item.group === 'trajectory') return 'trajectory';
  if (item.group === 'launcher') return 'launcher';
  return item.id;
}

function svgIcon(key, cls = 'p2cm-ico') {
  const body = ICONS[key] || ICONS.launcher;
  return `<svg class="${cls}" viewBox="0 0 48 48" aria-hidden="true" fill="none"
    stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    ${body}
  </svg>`;
}

/* Con dấu kiểm cho thẻ đang chọn. */
const CHECK_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
  stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12 5 6L20 6"/></svg>`;

const LENS_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
  stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.4 15.4 4.6 4.6"/></svg>`;

const X_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
  stroke-width="1.9" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`;

const EXT_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
  stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
  <path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>`;

/* ============================================================
   5. LIÊN KẾT NASA, ĐÃ GỬI HEAD KIỂM TRA THẬT
   Ghi chú: ba URL đầu tiên trong đề bài trả 404 khi kiểm ngày
   15/11/2026, nên đã đổi sang trang thật đang sống của NASA. Mọi
   lựa chọn dưới đây đều trả 200 với yêu cầu HEAD.
   ============================================================ */

const NASA_LINKS = {
  /* www1.grc.nasa.gov/beginners-guide-to-aeronautics/rocket-engine-fundamentals/
     đã 404, dùng Guide to Rockets còn sống, đúng chủ đề động cơ tên lửa. */
  chemical: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/guide-to-rockets/',
  /* .../tdm/nuclear-thermal-propulsion/ đã 404, trang NTP thật là
     Space Nuclear Propulsion, trả 200. */
  ntp: 'https://www.nasa.gov/space-technology-mission-directorate/tdm/space-nuclear-propulsion/',
  /* www.nasa.gov/mission/rosa/ đã 404, bài ROSA thật là Impact Story. */
  rosa: 'https://www.nasa.gov/directorates/stmd/impact-story-roll-out-solar-arrays/',
  rtg: 'https://rps.nasa.gov/',
  comms: 'https://www.nasa.gov/directorates/somd/space-communications-navigation-program/',
  humansInSpace: 'https://www.nasa.gov/humans-in-space/',
  /* www.jpl.nasa.gov/missions/mars-2020-perseverance/ trả 404, trang
     Perseverance thật nằm trên science.nasa.gov. */
  edl: 'https://science.nasa.gov/mission/mars-2020-perseverance/',
  radiation: 'https://www.nasa.gov/hrp/',
  launcher: 'https://www.nasa.gov/humans-in-space/space-launch-system/',
};

function nasaLinkFor(item) {
  if (item.group === 'trajectory') return 'https://science.nasa.gov/mars/';
  if (item.group === 'launcher') return NASA_LINKS.launcher;
  switch (item.id) {
    case 'prop_chemical_320':
    case 'prop_hypergolic_450':
      return NASA_LINKS.chemical;
    case 'prop_nuclear_ntp_900':
      return NASA_LINKS.ntp;
    case 'power_solar_rosa':
      return NASA_LINKS.rosa;
    case 'power_rtg_mmrtg':
      return NASA_LINKS.rtg;
    case 'comms_high_gain':
      return NASA_LINKS.comms;
    case 'life_moxie_filter':
    case 'life_eclss_recycler':
    case 'supplies_crew_three':
      return NASA_LINKS.humansInSpace;
    case 'sensor_edl_suite':
      return NASA_LINKS.edl;
    case 'tank_propellant_main':
      return NASA_LINKS.chemical;
    case 'shield_radiation':
      return NASA_LINKS.radiation;
    default:
      return 'https://www.nasa.gov/';
  }
}

/* ============================================================
   6. NẠP DỮ LIỆU VÀ CHUẨN HOÁ THÀNH DANH SÁCH CHUNG
   ============================================================ */

let catalogPromise = null;

function loadCatalog() {
  if (catalogPromise) return catalogPromise;
  catalogPromise = fetch(DATA_URL)
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .catch((err) => {
      catalogPromise = null;
      throw err;
    });
  return catalogPromise;
}

function moduleToItem(m) {
  const group = CATEGORY_ENGINE_GROUP[m.category] || null;
  return {
    id: m.id,
    group,
    category: m.category,
    nameVi: m.name_vi,
    nameEn: m.name_en,
    name_vi: m.name_vi,
    name_en: m.name_en,
    mass_kg: Number(m.mass_kg) || 0,
    power_w: Number(m.power_w) || 0,
    cost_musd: Number(m.cost_musd) || 0,
    isp_s: Number.isFinite(m.isp_s) ? m.isp_s : null,
    tradeoff_vi: m.tradeoff_vi || '',
    tradeoff_en: m.tradeoff_en || '',
    source: m.source || '',
    physics_vi: (PHYSICS[m.id] && PHYSICS[m.id].vi) || '',
    physics_en: (PHYSICS[m.id] && PHYSICS[m.id].en) || '',
  };
}

function vehicleToItem(v) {
  const text = LAUNCHER_TEXT[v.id] || {};
  return {
    id: v.id,
    group: 'launcher',
    category: 'launcher',
    nameVi: v.name_en,
    nameEn: v.name_en,
    name_vi: v.name_en,
    name_en: v.name_en,
    mass_kg: 0,
    capacity_leo_kg: Number(v.capacity_leo_kg) || 0,
    cost_musd: Number(v.cost_musd) || 0,
    power_w: 0,
    isp_s: null,
    tradeoff_vi: text.tradeoff_vi || '',
    tradeoff_en: text.tradeoff_en || '',
    source: '',
    physics_vi: text.physics_vi || '',
    physics_en: text.physics_en || '',
  };
}

function trajectoryToItem(t) {
  return {
    id: t.id,
    group: 'trajectory',
    category: 'trajectory',
    nameVi: t.name_vi,
    nameEn: t.name_en,
    name_vi: t.name_vi,
    name_en: t.name_en,
    mass_kg: 0,
    cost_musd: t.cost_musd,
    power_w: 0,
    isp_s: null,
    extra_dv_ms: t.extra_dv_ms,
    days: t.days,
    tradeoff_vi: t.tradeoff_vi,
    tradeoff_en: t.tradeoff_en,
    source: t.source,
    physics_vi:
      'Quỹ đạo chuyển tiếp là một đường elip nối quỹ đạo Trái Đất với quỹ đạo Sao Hỏa, và hình dạng elip đó do thời điểm phóng quyết định. Bay nhanh hơn thì elip dài hơn, phải đốt nhiều nhiên liệu hơn để cắt ngang, còn bay chậm theo đường Hohmann thì tốn ít nhất. Vì hai hành tinh chỉ thẳng hàng hai năm một lần, cửa sổ phóng là thứ không thể dời.',
    physics_en:
      'The transfer orbit is an ellipse linking Earths orbit to Mars orbit, and launch timing sets its shape. A faster trip means a longer ellipse that costs more propellant to cut across, while the slow Hohmann path costs the least. Because the two planets only line up every two years, the launch window cannot be moved.',
  };
}

function buildItems(groupId, data) {
  const g = GROUPS[groupId];
  if (!g) return [];
  if (g.kind === 'trajectory') return TRAJECTORIES.map(trajectoryToItem);

  if (g.kind === 'launcher') {
    const list = (data && data.reference_launchers && data.reference_launchers.vehicles) || [];
    return list.map(vehicleToItem).sort((a, b) => a.capacity_leo_kg - b.capacity_leo_kg);
  }

  const modules = (data && data.modules) || [];
  const out = [];
  (g.cats || []).forEach((cat) => {
    modules
      .filter((m) => m.category === cat)
      .forEach((m) => out.push(moduleToItem(m)));
  });
  return out;
}

/* ============================================================
   7. CSS
   ============================================================ */

function injectCss() {
  if (document.querySelector('link[data-phase2-component-modal]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_URL;
  link.dataset.phase2ComponentModal = '1';
  document.head.appendChild(link);
}

/* ============================================================
   8. ĐIỂM VÀO
   ============================================================ */

let uid = 0;

export function openComponentModal({ group, engine, onClose } = {}) {
  injectCss();

  const groupId = GROUPS[group] ? group : 'launcher';
  const g = GROUPS[groupId];

  uid += 1;
  const titleId = 'p2cm-title-' + uid;
  const listId = 'p2cm-list-' + uid;
  const sciId = 'p2cm-sci-' + uid;

  const root = document.createElement('div');
  root.className = 'p2cm-root';
  root.dataset.group = groupId;
  root.innerHTML = `
    <div class="p2cm-scrim" data-close="scrim"></div>
    <div class="p2cm-modal" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
      <header class="p2cm-head">
        <div class="p2cm-head-text">
          <p class="p2cm-eyebrow mono">${escapeHtml(T('eyebrow'))}</p>
          <h2 class="p2cm-title" id="${titleId}">${escapeHtml(T(g.titleKey))}</h2>
          <p class="p2cm-sub">${escapeHtml(T(g.subKey))}</p>
        </div>
        <button type="button" class="p2cm-x" data-close="x" aria-label="${escapeHtml(T('close'))}">
          ${X_SVG}
        </button>
      </header>

      <div class="p2cm-scroll">
        <ul class="p2cm-list" id="${listId}" role="list"></ul>
        <p class="p2cm-empty" hidden>${escapeHtml(T('noItems'))}</p>
        ${g.kind === 'trajectory' ? `<p class="p2cm-traj-note">${escapeHtml(T('trajNote'))}</p>` : ''}
      </div>

      <footer class="p2cm-foot">
        <p class="p2cm-total" role="status" aria-live="polite">
          <span class="p2cm-total-item" data-total="mass"></span>
          <span class="p2cm-total-item" data-total="cost"></span>
        </p>
        <button type="button" class="p2cm-done" data-close="done">${escapeHtml(T('done'))}</button>
      </footer>

      <div class="p2cm-sci" hidden role="dialog" aria-modal="true" aria-labelledby="${sciId}">
        <div class="p2cm-sci-panel">
          <header class="p2cm-sci-head">
            <p class="p2cm-sci-eyebrow mono">${escapeHtml(T('specTitle'))}</p>
            <button type="button" class="p2cm-sci-x" data-sci-close aria-label="${escapeHtml(T('closeLens'))}">
              ${X_SVG}
            </button>
          </header>
          <div class="p2cm-sci-body">
            <h3 class="p2cm-sci-title" id="${sciId}"></h3>
            <p class="p2cm-sci-nasa mono"></p>
            <p class="p2cm-sci-trade"></p>
            <h4 class="p2cm-sci-h mono"></h4>
            <dl class="p2cm-spec"></dl>
            <h4 class="p2cm-sci-h mono"></h4>
            <p class="p2cm-sci-phys"></p>
            <p class="p2cm-sci-src"></p>
            <a class="p2cm-sci-link" target="_blank" rel="noopener noreferrer"></a>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(root);

  const q = (s) => root.querySelector(s);
  const qa = (s) => Array.from(root.querySelectorAll(s));

  /* Trạng thái chọn cục bộ, khởi tạo từ engine rồi tự giữ.
     `picked` khoá theo nhóm của engine, giá trị là id linh kiện. */
  const picked = Object.create(null);
  let items = [];
  let destroyed = false;
  let unsubLang = null;
  let lastFocus = document.activeElement;
  let sciOpen = false;
  let currentLensId = null;

  function engineSelection() {
    try {
      return (engine && engine.getState && engine.getState().selection) || {};
    } catch (err) {
      return {};
    }
  }

  function syncFromEngine() {
    const sel = engineSelection();
    items.forEach((it) => {
      if (!it.group || it.group === 'trajectory') return;
      if (sel[it.group] === it.id) picked[it.group] = it.id;
    });
  }

  function isSelected(it) {
    return it.group ? picked[it.group] === it.id : false;
  }

  /* ---------- thẻ chỉ số ---------- */

  function statChips(it) {
    const chips = [];
    if (it.group === 'launcher') {
      chips.push({ k: T('statLift'), v: fmt(it.capacity_leo_kg, 0) + ' ' + T('unitKg') });
    } else {
      chips.push({ k: T('statMass'), v: fmt(it.mass_kg, 0) + ' ' + T('unitKg') });
    }
    chips.push({ k: T('statCost'), v: fmt(it.cost_musd, 1) + ' ' + T('unitMusd') });

    if (it.isp_s) {
      chips.push({ k: T('statIsp'), v: fmt(it.isp_s, 0) + ' ' + T('unitS') });
    } else if (it.group === 'trajectory') {
      const sign = it.extra_dv_ms > 0 ? '+' : '';
      chips.push({ k: T('statDv'), v: sign + fmt(it.extra_dv_ms, 0) + ' ' + T('unitMs') });
    } else if (it.power_w > 0) {
      chips.push({ k: T('statGen'), v: fmt(it.power_w, 0) + ' ' + T('unitW') });
    } else if (it.power_w < 0) {
      chips.push({ k: T('statDraw'), v: fmt(Math.abs(it.power_w), 0) + ' ' + T('unitW') });
    }
    return chips;
  }

  /* ---------- dựng danh sách ---------- */

  function renderList() {
    const ul = q('.p2cm-list');
    ul.innerHTML = '';

    if (!items.length) {
      q('.p2cm-empty').hidden = false;
    } else {
      q('.p2cm-empty').hidden = true;
    }

    items.forEach((it) => {
      const on = isSelected(it);
      const li = document.createElement('li');
      li.className = 'p2cm-item';
      li.dataset.id = it.id;
      li.dataset.sel = on ? 'yes' : 'no';

      const trade = pick(it, 'tradeoff');
      const chips = statChips(it)
        .map(
          (c) =>
            `<li class="p2cm-stat"><span class="p2cm-stat-k mono">${escapeHtml(c.k)}</span>` +
            `<span class="p2cm-stat-v mono">${escapeHtml(c.v)}</span></li>`
        )
        .join('');

      li.innerHTML = `
        <article class="p2cm-card${on ? ' is-picked' : ''}" data-card="${it.id}">
          <span class="p2cm-art" aria-hidden="true">${svgIcon(iconKeyFor(it))}</span>
          <div class="p2cm-body">
            <p class="p2cm-name">${escapeHtml(pick(it, 'name'))}</p>
            <p class="p2cm-trade">${escapeHtml(clip(trade, 90))}</p>
            <ul class="p2cm-stats">${chips}</ul>
          </div>
          <div class="p2cm-acts">
            <button type="button" class="p2cm-pick${on ? ' is-on' : ''}" data-act="pick" data-id="${it.id}"
              aria-pressed="${on ? 'true' : 'false'}">
              <span class="p2cm-pick-ico" aria-hidden="true">${on ? CHECK_SVG : ''}</span>
              <span class="p2cm-pick-txt">${escapeHtml(on ? T('picked') : T('pick'))}</span>
            </button>
            <button type="button" class="p2cm-lens" data-act="lens" data-id="${it.id}"
              aria-label="${escapeHtml(T('lens'))}">${LENS_SVG}</button>
          </div>
        </article>`;
      ul.appendChild(li);
    });

    updateTotals();
  }

  /* ---------- dòng tổng kết ---------- */

  function updateTotals() {
    const chosen = items.filter((it) => isSelected(it));
    const massEl = q('[data-total="mass"]');
    const costEl = q('[data-total="cost"]');
    if (!chosen.length) {
      massEl.textContent = T('totalNone');
      costEl.textContent = '';
      return;
    }
    const mass = chosen.reduce((s, it) => s + (Number(it.mass_kg) || 0), 0);
    const cost = chosen.reduce((s, it) => s + (Number(it.cost_musd) || 0), 0);
    const n = T('totalCount', { n: fmt(chosen.length, 0) });
    massEl.textContent = T('totalMass') + ': ' + fmt(mass, 0) + ' ' + T('unitKg') + ' · ' + n;
    costEl.textContent = T('totalCost') + ': ' + fmt(cost, 1) + ' ' + T('unitMusd');
  }

  /* ---------- chọn và gỡ ---------- */

  function choose(it) {
    if (!it || destroyed) return;
    if (it.group && it.group !== 'trajectory') {
      picked[it.group] = it.id;
      try {
        if (engine && typeof engine.updateSelection === 'function') {
          engine.updateSelection({ group: it.group, part: it.id });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[p2cm] updateSelection lỗi', err);
      }
    } else if (it.group === 'trajectory') {
      /* Đường bay chưa phải một nhóm của engine, nên chỉ ghi nhận cục
         bộ. Gọi engine với nhóm lạ sẽ chỉ sinh cảnh báo vô ích. */
      picked.trajectory = it.id;
    }
    renderList();
    focusCard(it.id);
  }

  function remove(it) {
    if (!it || destroyed) return;
    if (it.group && it.group !== 'trajectory') {
      delete picked[it.group];
      try {
        /* Hợp đồng yêu cầu gọi đúng dạng này khi gỡ. */
        if (engine && typeof engine.updateSelection === 'function') {
          engine.updateSelection({ group: it.group, part: null });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[p2cm] updateSelection lỗi', err);
      }
    } else {
      delete picked.trajectory;
    }
    renderList();
    focusCard(it.id);
  }

  function focusCard(id) {
    const btn = q('.p2cm-card[data-card="' + id + '"] .p2cm-pick');
    if (btn) btn.focus({ preventScroll: true });
  }

  /* ---------- thẻ khoa học ---------- */

  function specRows(it) {
    const rows = [];
    rows.push([T('specName'), isEn() ? it.nameEn : it.nameVi]);
    if (it.group === 'launcher') {
      rows.push([T('specLift'), fmt(it.capacity_leo_kg, 0) + ' ' + T('unitKg')]);
    } else {
      rows.push([T('specMass'), fmt(it.mass_kg, 0) + ' ' + T('unitKg')]);
    }
    rows.push([T('specCost'), fmt(it.cost_musd, 1) + ' ' + T('unitMusd')]);
    if (it.isp_s) rows.push([T('specIsp'), fmt(it.isp_s, 0) + ' ' + T('unitS')]);
    if (it.power_w > 0) rows.push([T('specPower'), '+' + fmt(it.power_w, 0) + ' ' + T('unitW')]);
    if (it.power_w < 0) rows.push([T('specPower'), '-' + fmt(Math.abs(it.power_w), 0) + ' ' + T('unitW')]);
    if (it.group === 'trajectory') {
      const sign = it.extra_dv_ms > 0 ? '+' : '';
      rows.push([T('specDv'), sign + fmt(it.extra_dv_ms, 0) + ' ' + T('unitMs')]);
    }
    return rows;
  }

  function openSci(it) {
    if (!it) return;
    currentLensId = it.id;
    sciOpen = true;

    const panel = q('.p2cm-sci');
    panel.hidden = false;

    q('.p2cm-sci-title').textContent = pick(it, 'name');
    q('.p2cm-sci-nasa').textContent = isEn() ? it.nameVi : it.nameEn;

    /* Tradeoff đầy đủ, không cắt, cả hai thứ tiếng. */
    q('.p2cm-sci-trade').innerHTML =
      `<span class="p2cm-lang mono">VI</span><span class="p2cm-txt">${escapeHtml(it.tradeoff_vi || '')}</span>` +
      `<span class="p2cm-lang mono">EN</span><span class="p2cm-txt en">${escapeHtml(it.tradeoff_en || '')}</span>`;

    const heads = qa('.p2cm-sci-h');
    if (heads[0]) heads[0].textContent = T('specTitle');
    if (heads[1]) heads[1].textContent = T('physicsTitle');

    q('.p2cm-spec').innerHTML = specRows(it)
      .map(
        (r) =>
          `<div class="p2cm-spec-row"><dt>${escapeHtml(r[0])}</dt>` +
          `<dd class="mono">${escapeHtml(r[1])}</dd></div>`
      )
      .join('');

    q('.p2cm-sci-phys').innerHTML =
      `<span class="p2cm-lang mono">VI</span><span class="p2cm-txt">${escapeHtml(it.physics_vi || '')}</span>` +
      `<span class="p2cm-lang mono">EN</span><span class="p2cm-txt en">${escapeHtml(it.physics_en || '')}</span>`;

    q('.p2cm-sci-src').innerHTML =
      `<span class="p2cm-sci-src-k mono">${escapeHtml(T('specSrc'))}:</span> ` +
      escapeHtml(it.source || T('sciNote'));

    const a = q('.p2cm-sci-link');
    a.href = nasaLinkFor(it);
    a.innerHTML = `<span>${escapeHtml(T('nasaLink'))}</span>${EXT_SVG}`;
    a.setAttribute('aria-label', T('nasaLink') + ' · ' + (isEn() ? it.nameEn : it.nameVi));

    const x = q('.p2cm-sci-x');
    if (x) x.focus({ preventScroll: true });
    panel.scrollTop = 0;
    const body = q('.p2cm-sci-body');
    if (body) body.scrollTop = 0;
  }

  function closeSci() {
    sciOpen = false;
    const panel = q('.p2cm-sci');
    if (panel) panel.hidden = true;
    if (currentLensId) focusCard(currentLensId);
    currentLensId = null;
  }

  /* ---------- đóng ---------- */

  function close() {
    if (destroyed) return;
    destroyed = true;
    document.removeEventListener('keydown', onKey, true);
    if (unsubLang) unsubLang();
    root.classList.add('is-closing');
    if (typeof onClose === 'function') {
      try {
        onClose();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[p2cm] onClose lỗi', err);
      }
    }
    root.remove();
    if (lastFocus && typeof lastFocus.focus === 'function') {
      try {
        lastFocus.focus({ preventScroll: true });
      } catch (err) {
        /* phần tử cũ đã bị gỡ thì thôi */
      }
    }
  }

  /* ---------- bàn phím: Esc, Tab giữ trong modal ---------- */

  function focusables() {
    const scope = sciOpen ? q('.p2cm-sci') : q('.p2cm-modal');
    if (!scope) return [];
    const sel = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(scope.querySelectorAll(sel)).filter((el) => {
      if (el.closest('[hidden]')) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
  }

  function onKey(ev) {
    if (destroyed) return;
    if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      if (sciOpen) closeSci();
      else close();
      return;
    }
    if (ev.key !== 'Tab') return;
    const list = focusables();
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    const active = document.activeElement;
    const inside = list.indexOf(active) >= 0;
    if (!inside) {
      ev.preventDefault();
      first.focus();
      return;
    }
    if (!ev.shiftKey && active === last) {
      ev.preventDefault();
      first.focus();
    } else if (ev.shiftKey && active === first) {
      ev.preventDefault();
      last.focus();
    }
  }

  /* ---------- sự kiện chuột ---------- */

  root.addEventListener('click', (ev) => {
    const closeEl = ev.target.closest('[data-close]');
    if (closeEl && root.contains(closeEl)) {
      close();
      return;
    }
    if (ev.target.closest('[data-sci-close]')) {
      closeSci();
      return;
    }
    const act = ev.target.closest('[data-act]');
    if (!act) return;
    const id = act.dataset.id;
    const it = items.find((x) => x.id === id);
    if (!it) return;
    if (act.dataset.act === 'pick') {
      if (isSelected(it)) remove(it);
      else choose(it);
      return;
    }
    if (act.dataset.act === 'lens') openSci(it);
  });

  /* Bấm ra ngoài panel khoa học cũng đóng nó. */
  q('.p2cm-sci').addEventListener('click', (ev) => {
    if (ev.target === q('.p2cm-sci')) closeSci();
  });

  document.addEventListener('keydown', onKey, true);

  const xBtn = q('.p2cm-x');
  if (xBtn) xBtn.focus({ preventScroll: true });

  /* ---------- nạp dữ liệu ---------- */

  function applyAll() {
    renderList();
  }

  loadCatalog()
    .then((data) => {
      if (destroyed) return;
      items = buildItems(groupId, data);
      syncFromEngine();
      applyAll();
    })
    .catch((err) => {
      if (destroyed) return;
      // eslint-disable-next-line no-console
      console.error('[p2cm] không nạp được rescue_modules.json', err);
      items = [];
      const ul = q('.p2cm-list');
      if (ul) ul.innerHTML = `<li class="p2cm-fatal">${escapeHtml(T('loadErr'))}</li>`;
    });

  unsubLang = onLangChange(() => {
    if (destroyed) return;
    /* Dựng lại chữ của khung, danh sách và dòng tổng kết. */
    q('.p2cm-title').textContent = T(g.titleKey);
    q('.p2cm-sub').textContent = T(g.subKey);
    q('.p2cm-x').setAttribute('aria-label', T('close'));
    q('.p2cm-done').textContent = T('done');
    renderList();
    if (sciOpen && currentLensId) {
      const it = items.find((x) => x.id === currentLensId);
      if (it) openSci(it);
    }
  });

  if (g.kind === 'trajectory') items = [];

  return { root, close };
}

export default openComponentModal;
