# CONTRACT: Giai đoạn 2 — Trung tâm Điều khiển Sứ mệnh

File này là hợp đồng giữa các module. Đọc hết trước khi viết dòng code nào. Mọi
sub-agent phải theo đúng tên hàm, tên sự kiện và cấu trúc dữ liệu dưới đây, nếu
không thì các mảnh ghép lại sẽ hỏng.

## Tình trạng thật của repo

`phase2/` **chưa tồn tại**. `phase2-engine.js` **chưa có**. Vậy engine phải viết
mới, nhưng **không viết lại công thức vật lý** vì đã có sẵn và đã test:

- `src/nasa-data.js` (30 KB) export đủ hàm cần:
  `loadRescueData`, `tsiolkovskyFuelFraction(dv, isp)`, `tsiolkovskyMassRatio`,
  `propellantNeededKg`, `signalDelayMinutes(km)`, `summarizeModules(ids)`,
  `availableDeltaV_ms(summary, isp)`, `validateRescueDesign(design)`,
  `REQUIRED_DELTA_V_MS` (6650), `NASA_CONSTANTS`, `getModule(id)`,
  `marsDistanceForSol(sol)`, `deltaVLegs()`, `formatVi(v, digits)`
- `src/data/nasa/rescue_modules.json`: 12 module, 8 nhóm
  (`propulsion` 3, `power` 2, `communications` 1, `life_support` 2,
  `propellant` 1, `shielding` 1, `supplies` 1, `science_and_edl` 1)
- `src/data/nasa/rescue_mission.json`: 4 chặng delta-v, 258,9 ngày bay
- `src/engine.js`: `computeMission(design, scenarioId, opts)`, trả
  `{design, scenario, resources, checks, objectives, events, score}`
- `data/scenarios.json`: 3 kịch bản, nhưng đều là **vệ tinh quan sát Trái Đất**,
  không liên quan cứu hộ Sao Hỏa. Giai đoạn 2 tự định nghĩa kịch bản riêng.

## Cấu trúc file

```
phase2/
  CONTRACT.md                  file này
  phase2-engine.js             bộ não, sub A viết
  bridge-adapter.js            cầu nối sự kiện, sub A viết
  feature-cml1-telemetry.js    bắt sóng + chọn mục tiêu, sub B
  feature-cml3-tradespace.js   xưởng lắp ráp, sub B
  feature-cml4-checklist.js    bảng đèn kiểm duyệt, sub C
  feature-execution-viz.js     quỹ đạo + EDL + tổng kết, sub C
  phase2-app.js                điều phối, sub D
  phase2.css                   toàn bộ CSS, sub D
  assets/                      icon và nền, sub D
```

## API của `phase2-engine.js`

Xuất một object duy nhất, gắn lên `window.phase2Engine` VÀ export ES module:

```js
export const phase2Engine = {
  /* Khởi tạo từ trạng thái Giai đoạn 1 */
  initFromPhase1({ solsRemaining = 300, crewOnMars = 1, signalStrength = 0.8 } = {}),

  /* Chuyển bước CML: 'cml1' | 'cml3' | 'cml4' | 'execution' */
  setCmlStep(step),

  /* Cập nhật lựa chọn. part nhận id module trong rescue_modules.json */
  updateSelection({ group, part }),
  /* group là một trong: 'objective' | 'launcher' | 'power' | 'comms' | 'edl'
     'objective' nhận 'supplies' hoặc 'mav_kit', không phải module id */

  /* Bật tắt công tắc tuân thủ ở bước kiểm duyệt */
  updateCompliance({ key, value }),
  /* key: 'sterilized' | 'rtg_approved' */

  /* Đọc trạng thái hiện tại, luôn trả object mới, không trả tham chiếu */
  getState(),

  /* Đăng ký nghe. Trả hàm huỷ đăng ký. */
  subscribe(event, fn),
  /* event: 'state:changed' | 'step:changed' | 'mission:launched'
            | 'mission:landed' | 'mission:failed' */

  /* Phóng. Chỉ chạy được khi checks không có mục đỏ. */
  launchMission(),

  /* Giai đoạn 1 gọi khi người chơi cắm đèn hiệu xong */
  completeMarsGroundPrep(),
};
```

## Cấu trúc `getState()` trả về

```js
{
  step: 'cml1',                    // bước hiện tại
  solsRemaining: 300,              // số sol đồng đội còn sống được
  solsToArrival: 412,              // số sol tàu cần để tới nơi
  crewOnMars: 1,

  selection: {
    objective: 'mav_kit',          // 'supplies' | 'mav_kit'
    launcher: 'sls_block1',
    power: 'power_solar_rosa',
    comms: 'comm_hga_xband',
    edl: 'edl_sensors',
    moduleIds: ['prop_ntp_900', ...],  // mọi module đang chọn, để tính toán
  },

  totals: {
    massKg: 36010,
    costMusd: 666,
    powerW: -320,
    deltaVAvailableMs: 7723,
    deltaVNeededMs: 6650,
    daysToArrival: 258.9,
    lifeSupportDays: 340,
  },

  /* Bốn thanh đo an toàn. Mỗi cái có pct và status. */
  gauges: {
    time:    { value: 258.9, limit: 300, pct: 86, status: 'ok',      labelKey: 'p2.gauge.time' },
    mass:    { value: 36010, limit: 70000, pct: 51, status: 'ok',    labelKey: 'p2.gauge.mass' },
    power:   { value: 1180, limit: 1500, pct: 79, status: 'ok',      labelKey: 'p2.gauge.power' },
    comms:   { value: 22.5, limit: 30, pct: 75, status: 'ok',        labelKey: 'p2.gauge.comms' },
  },
  /* status: 'ok' | 'warn' | 'fail'
     ok khi pct <= 80, warn khi 80 < pct <= 100, fail khi pct > 100 */

  /* Bảng đèn kiểm duyệt ở CML4 */
  checks: [
    {
      id: 'mass_margin',
      labelKey: 'p2.check.mass',
      hintKey: 'p2.check.mass.hint',
      status: 'green',             // 'green' | 'yellow' | 'red'
      detailVi: 'Khối lượng 36.010 kg trên giới hạn 70.000 kg, dư 48 phần trăm.',
      detailEn: 'Mass 36,010 kg against a 70,000 kg limit, 48 percent spare.',
    },
  ],

  compliance: { sterilized: false, rtg_approved: false },

  /* Kết quả sau khi phóng */
  launched: false,
  landed: false,
  failed: false,
  comparison: null,   // điền sau khi landed, xem dưới
}
```

## `comparison` sau khi hạ cánh

```js
{
  nasaAnalogue: {
    nameVi: 'Mars Sample Return, kiến trúc tham chiếu',
    nameEn: 'Mars Sample Return, reference architecture',
    massKg: 41000,
    costMusd: 720,
    daysToArrival: 258.9,
    noteVi: '...',
    noteEn: '...',
  },
  player: { massKg, costMusd, daysToArrival },
  verdictVi: '...',
  verdictEn: '...',
}
```

## Sự kiện giữa hai tab

`bridge-adapter.js` bắc cầu qua `window.MARS_RESCUE_SHARED_STATE`. Ba sự kiện,
phát bằng `window.dispatchEvent(new CustomEvent(tên, { detail }))`:

| Tên | Ai phát | Ai nghe | detail |
|---|---|---|---|
| `mars:sos-received` | Giai đoạn 1 (comms.js) | Giai đoạn 2 | `{ solsRemaining, crewOnMars, signalStrength }` |
| `earth:dsn-command-sent` | Giai đoạn 2, ở 75 phần trăm quãng bay | Tab Sao Hỏa | `{ solsToArrival, etaDays }` |
| `mars:beacon-deployed` | Tab Sao Hỏa | Giai đoạn 2 | `{ ok: true }` |

Vì Giai đoạn 1 hiện chưa phát `mars:sos-received`, `bridge-adapter.js` phải có
hàm `simulateSosFromPhase1()` để trang demo gọi thử.

## Quy tắc bắt buộc cho mọi sub

1. **KHÔNG dấu gạch dài** (em dash) trong chuỗi hiển thị. Dự án cấm tuyệt đối.
2. **Song ngữ VI + EN**. Mỗi chuỗi mới có hai bản. Dùng `t(key)` từ `../src/i18n.js`
   hoặc object `{ vi, en }` trong chính module nếu muốn tách riêng. **Không sửa
   `src/i18n.js`** vì ba sub khác đang chạy song song và sẽ conflict. Mỗi feature
   tự giữ chuỗi của mình trong file riêng.
3. **Đường dẫn**: `new URL('.', import.meta.url).href` để lấy base. TUYỆT ĐỐI không
   `location.href`, không đường dẫn tương đối trần, không `new URL(x, img.src)`.
4. **Màu**: lấy từ `../src/css/tokens.css` qua biến CSS. Không hardcode màu.
5. Hit target mọi nút **>= 44px**. Tương phản chữ **AA**.
6. Tôn trọng `prefers-reduced-motion` và `html.motion-off`.
7. `node --check` phải qua.
8. **Mỗi sub chỉ tạo file trong `phase2/`**, không sửa bất kỳ file nào trong `src/`.
9. Test bằng trình duyệt thật, bấm bằng CDP `Input.dispatchMouseEvent`.

## Vai trò từng sub

| Sub | File được tạo | Không được đụng |
|---|---|---|
| A | `phase2-engine.js`, `bridge-adapter.js` | mọi file khác |
| B | `feature-cml1-telemetry.js`, `feature-cml3-tradespace.js` | engine, bridge, cml4, execution, app, css |
| C | `feature-cml4-checklist.js`, `feature-execution-viz.js` | engine, bridge, cml1, cml3, app, css |
| D | `phase2-app.js`, `phase2.css`, `phase2/assets/*`, `phase2-demo.html` | 4 file feature và engine |

Sub D viết app sau cùng và tự chịu trách nhiệm ghép. Nếu B hoặc C chưa xong, sub D
dùng khung tạm nhưng phải để đúng chỗ gọi hàm theo contract này.
