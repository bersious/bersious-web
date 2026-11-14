/* ============================================================
   base-flavor.js
   Toàn bộ câu chữ của màn căn cứ. File dữ liệu thuần, không logic.

   >>> MỌI CÂU PHẢI CÓ CẢ vi VÀ en <<<
   Thiếu một bên là lỗi. Không để dịch sau.

   Cách dùng:
     DAY_LOG  lời nhật ký của từng ngày. day đếm từ 1.
              Day quá số phần tử thì lấy day % DAY_LOG.length (hoặc lặp vòng),
              đừng thêm dòng mới ở phía giao diện.
     IDLE_LINES   chọn ngẫu nhiên một câu khi người chơi đứng yên.
     SLEEP_LINES  chọn ngẫu nhiên một câu khi bấm đi ngủ.
     MORNING_LINES chọn ngẫu nhiên một câu khi thức dậy.
     ACTION_FLAVOR mô tả dưới từng nút: farm, bag, explore, sleep.
     NOTIFY       thông báo khi bấm nút chưa mở.

   Quy tắc viết: một hình ảnh cụ thể mỗi câu, không tính từ trừu tượng,
   không giải thích cảm xúc sau hành động, không liệt kê ba ý đối xứng,
   không kết bằng châm ngôn. Không dùng dấu gạch dài.
   ============================================================ */

export const DAY_LOG = [
  {
    day: 1,
    vi: 'Đếm gói thức ăn ba lần, lần nào cũng ra ba trăm lẻ hai. Con số không đổi nên tôi để nguyên đó và đi kiểm tra bộ lọc CO2.',
    en: 'Counted the ration packs three times and got 302 every time. The number held, so I left it alone and went to check the CO2 scrubber.',
  },
  {
    day: 2,
    vi: 'Tháo cái chuông báo cháy khỏi trần khoang. Nó kêu mỗi lần tôi mở lò vi sóng, và từ giờ chỉ còn mình tôi ở đây để nghe.',
    en: 'Took the smoke alarm down off the ceiling. It went off every time I opened the microwave, and I am the only one left here to hear it.',
  },
  {
    day: 3,
    vi: 'Cắt một củ khoai làm bốn, chỉ một miếng có mắt mầm sống. Ba miếng kia tôi ăn sống, vì không nấu được thì giữ cũng vô ích.',
    en: 'Cut one potato into four. Only one piece had a live eye. I ate the other three raw, because there is no way to cook them and no point keeping them.',
  },
  {
    day: 4,
    vi: 'Máy tạo nước chạy bốn tiếng rồi nghẹt. Tháo ra, trong buồng xúc tác có một mẩu gioăng cao su. Không biết nó nằm đó bao lâu trước tôi.',
    en: 'The water maker ran four hours and choked. Took it apart and found a chunk of rubber gasket sitting in the catalyst bed. No idea how long it was in there before me.',
  },
  {
    day: 5,
    vi: 'Quét bụi khỏi tấm pin lấy lại được bảy phần trăm. Một tiếng sau bụi phủ đúng chỗ cũ. Tôi ghi vào sổ con số bảy và từ nay quét lúc chiều muộn.',
    en: 'Brushing the dust off the panel bought back seven percent. An hour later the dust was back on the same spot. I wrote down seven, and now I brush late in the afternoon.',
  },
  {
    day: 6,
    vi: 'Đồng hồ khoang đếm sol theo giờ Sao Hỏa. Đêm nào tôi cũng nằm nghe nó nhảy số, và cái tiếng tách đó to hơn tôi tưởng.',
    en: 'The Hab clock counts sols in Mars hours. Every night I lie there listening to it tick over, and that click is louder than I expected.',
  },
  {
    day: 7,
    vi: 'Tìm được cách ghi nhật ký rẻ hơn: viết lên mặt sau giấy in báo cáo. Bút bi đông cứng trong khoang lạnh, phải hơ qua ống thông gió mới ra mực.',
    en: 'Found a cheaper way to keep this log: write on the back of printed reports. Ballpoint freezes in a cold Hab, so I warm the pen over the vent first.',
  },
  {
    day: 8,
    vi: 'Buồng xúc tác iridium chạy suốt đêm. Sáng ra có năm mươi lít nước và một mùi khét nhẹ như tóc cháy. May là nó không thành lửa.',
    en: 'The iridium bed ran all night. In the morning, fifty liters of water and a burnt-hair smell that did not turn into a fire. I will take it.',
  },
  {
    day: 9,
    vi: 'Khẩu phần hôm nay: một gói thịt khô, nửa gói bánh quy. Nửa còn lại dán băng dính lên nắp hộp, ghi ngày bằng bút xoá.',
    en: 'Today: one pack of dried meat, half a pack of crackers. I taped the other half to the lid and dated it with a grease pencil.',
  },
  {
    day: 10,
    vi: 'Trong hộp dụng cụ y tế có một cái gương nhỏ. Tôi dán nó lên tay tuốc nơ vít để nhìn ra sau lưng khi thay lọc gió. Phía sau chẳng có gì, tôi vẫn để nguyên.',
    en: 'There was a small mirror in the medical kit. I taped it to a screwdriver handle so I can see behind me while changing the air filter. There is nothing behind me. I left it on anyway.',
  },
  {
    day: 11,
    vi: 'Khay khoai giữ được nhiệt ban ngày, ban đêm xuống âm hai độ. Tôi quấn dây đốt quanh khay và gọi nó là hệ thống sưởi sàn.',
    en: 'The potato trays hold heat in the day and drop to minus two at night. I wrapped a heater coil around them, and now I call it underfloor heating.',
  },
  {
    day: 12,
    vi: 'Bụi lọt vào ủng qua đường chỉ khâu. Đổ ra được một nắm cát đỏ, cân thử hai mươi ba gam, rồi tự hỏi tại sao mình lại đi cân nó.',
    en: 'Dust gets into my boots through the stitching. I poured out a fistful of red sand, weighed it at twenty three grams, then wondered why I weighed it.',
  },
  {
    day: 13,
    vi: 'Cà phê hoà tan còn mười hai gói. Không phải mười hai ngày. Mười hai gói. Tôi viết chữ HOA lên lịch để khỏi tự lừa mình.',
    en: 'Twelve packets of instant coffee left. Not twelve days. Twelve packets. I wrote it in capitals on the calendar so I stop pretending otherwise.',
  },
  {
    day: 14,
    vi: 'Ống nhựa nứt ở khúc cua thứ ba. Bọc lưới sợi thuỷ tinh với epoxy, ép mười hai tiếng. Nó vẫn rỉ, chỉ chậm hơn hôm qua.',
    en: 'Plastic line split at the third elbow. Wrapped it in fiberglass and epoxy and clamped it for twelve hours. Still weeping, just slower than yesterday.',
  },
  {
    day: 15,
    vi: 'Bật máy thu lúc sáu giờ tối giờ Trái Đất, để chạy nửa tiếng. Toàn nhiễu. Tiếng nhiễu làm tôi buồn ngủ sai giờ.',
    en: 'Ran the receiver at six, Earth time, and left it on half an hour. Static the whole way. Static puts me to sleep at the wrong hour of the day.',
  },
  {
    day: 16,
    vi: 'Đếm lại khay khoai: bốn mươi mầm mọc, ba cây héo. Bụi trong khay trông như đường cát. Tôi nếm một nhúm bằng đầu lưỡi, mặn hơn tôi tưởng.',
    en: 'Recounted the trays: forty sprouts up, three wilted. The dust in them looks like fine sugar. Tasted a pinch, saltier than I expected.',
  },
  {
    day: 17,
    vi: 'Gioăng cửa khoang khí giãn ra ở chỗ hứng nắng. Xoay lại một phần tư vòng, thế là đủ cho tuần này.',
    en: 'The airlock gasket stretched where the sun hits it. Rotated it a quarter turn. That buys me the week.',
  },
  {
    day: 18,
    vi: 'Lò vi sóng ngắt cầu dao khi chạy cùng máy bơm. Tôi đánh dấu ổ cắm bằng bút chì và tự dặn đừng bật hai thứ cùng lúc. Tối nay chắc lại quên.',
    en: 'The microwave tripped the breaker with the pump running. Marked the outlet in pencil and told myself not to run both. I will forget by tonight.',
  },
  {
    day: 19,
    vi: 'Giặt tấm lọc HEPA cuối cùng trong bồn rửa. Phơi trên dây phía trên bếp, nước rỏ xuống sàn suốt cả buổi tối.',
    en: 'Washed the last HEPA filter in the sink. Hung it on the line over the stove, and it dripped on the floor all evening.',
  },
  {
    day: 20,
    vi: 'Trồng xong đợt hai. Mười ô, mỗi ô mười hai củ. Đất lạnh tay, tôi đeo găng y tế để trộn.',
    en: 'Second planting done. Ten squares, twelve tubers each. The soil is cold on the hands, so I mix it in surgical gloves.',
  },
  {
    day: 21,
    vi: 'Cắt tóc bằng kéo phẫu thuật, trước cái gương trên bồn rửa. Không tệ. Tóc rơi xuống sàn thì cứ để đó.',
    en: 'Cut my hair with the surgical scissors at the sink mirror. Not bad. Hair on the floor stays on the floor.',
  },
  {
    day: 22,
    vi: 'Mở tấm ảnh nhóm Ares 3, phóng to chỗ dây giày tuột của Martinez, cười thành tiếng. Tiếng đó vang trong khoang lâu hơn tôi muốn.',
    en: 'Opened the Ares 3 photo, zoomed in on Martinez bootlace coming untied, and laughed out loud. It echoed in the Hab longer than I wanted.',
  },
  {
    day: 23,
    vi: 'Đồng hồ áp suất lệch 0,4 kPa so với cái thứ hai. Tôi chọn tin cái vừa hiệu chuẩn. Từ giờ chỉ có một cái là thật.',
    en: 'One pressure gauge reads 0.4 kPa off the other. I trust the one I just calibrated. From now on only one of them is real.',
  },
  {
    day: 24,
    vi: 'Đánh dấu sol thứ một trăm trên khung cửa bằng bút dạ. Mực không bám, tôi gạch lại lần nữa, lần này tối hơn một chút.',
    en: 'Marked sol one hundred on the doorframe with a marker. The ink did not take. Went over it again, and this time it came out a shade darker.',
  },
];

export const IDLE_LINES = [
  {
    vi: 'Quạt lọc gió đổi tiếng sau mỗi bốn mươi giây, nghe như ai đó thở ra.',
    en: 'The scrubber fan changes pitch every forty seconds, like someone exhaling.',
  },
  {
    vi: 'Trên vách phía bắc có một vết bẩn hình chiếc ủng, in từ hồi cả nhóm còn ở đây.',
    en: 'There is a boot print on the north wall, left over from when the whole crew was here.',
  },
  {
    vi: 'Đồng hồ trong khoang chậm bốn giây so với máy tính bảng, và tôi không sửa.',
    en: 'The Hab clock runs four seconds behind the tablet, and I have not corrected it.',
  },
  {
    vi: 'Trong khoang có mùi bụi sắt trộn với keo epoxy, giống mùi một tiệm sửa xe.',
    en: 'The Hab smells like iron dust mixed with epoxy, the smell of a repair shop.',
  },
  {
    vi: 'Sàn lạnh hơn không khí khoảng ba độ, bàn chân biết trước đầu.',
    en: 'The deck runs about three degrees colder than the air. My feet notice before I do.',
  },
  {
    vi: 'Con số áp suất nhích từng phần mười rồi đứng im cả phút.',
    en: 'The pressure number creeps a tenth at a time, then sits still for a full minute.',
  },
  {
    vi: 'Miếng dán trên ống nước đã bong một góc, đủ để nhìn thấy sợi lưới bên trong.',
    en: 'The patch on the water line has lifted at one corner, enough to show the weave under it.',
  },
  {
    vi: 'Bơm nước chạy hai mươi giây rồi tắt, hai mươi giây rồi tắt, đều như kim đồng hồ.',
    en: 'The pump runs twenty seconds, cuts out, runs twenty more. Steady as a metronome.',
  },
  {
    vi: 'Có một sợi tóc mắc trong khe tủ lạnh, không phải của tôi. Tóc tôi ngắn hơn.',
    en: 'There is a hair caught in the fridge seal that is not mine. Mine is shorter.',
  },
  {
    vi: 'Đèn trần nhấp một cái, xong rồi thôi, kiểu nó vẫn hay làm.',
    en: 'The ceiling light flickers once and quits, the way it always does.',
  },
  {
    vi: 'Ngoài cửa sổ chỉ có một màu hồng nhạt đứng im như tấm bìa.',
    en: 'Outside the window there is only a flat pale pink, still as cardboard.',
  },
  {
    vi: 'Dây điện của tấm pin căng ra từ trưa, gió kéo.',
    en: 'The panel cable has been taut since noon. Wind pulling on it.',
  },
  {
    vi: 'Mặt bàn in một vòng tròn của cốc nước nóng, cái vòng ấy từ hôm đầu tiên.',
    en: 'There is a ring on the table from a hot cup, and it has been there since day one.',
  },
  {
    vi: 'Trong khoang nghe rõ tiếng mình nuốt, và tiếng đó to hơn dự kiến.',
    en: 'I can hear myself swallow in here, and it is louder than it has any right to be.',
  },
];

export const SLEEP_LINES = [
  {
    vi: 'Tôi kê đôi ủng cạnh giường để sáng mai khỏi phải tìm.',
    en: 'I set my boots by the bed so I do not have to hunt for them in the morning.',
  },
  {
    vi: 'Cởi bộ đồ ngoài ra, lớp vải lót còn ấm và hơi ẩm.',
    en: 'Peeled the suit off. The liner is still warm and slightly damp.',
  },
  {
    vi: 'Không khí khô tới mức môi nứt ngay khi vừa nằm xuống.',
    en: 'The air is so dry my lip splits the moment I lie down.',
  },
  {
    vi: 'Tôi để đèn ngủ sáng một nửa và tự nhủ đó là tiết kiệm điện.',
    en: 'Left the night light at half and told myself it was about the power draw.',
  },
  {
    vi: 'Tiếng quạt đều tới mức tôi đếm tới ba trăm rồi quên mình đang đếm.',
    en: 'The fan is even enough that I counted to three hundred and forgot I was counting.',
  },
  {
    vi: 'Cái gối nhồi túi cát nặng quá, tôi đẩy nó xuống dưới chân.',
    en: 'The sandbag pillow is too heavy, so I pushed it down by my feet.',
  },
  {
    vi: 'Ngủ được ba tiếng thì lạnh, đắp lại túi ngủ, ngủ tiếp.',
    en: 'Slept three hours, woke up cold, pulled the bag back over my shoulder, slept again.',
  },
  {
    vi: 'Tắt máy bơm sớm để đầu óc im hơn lúc đặt lưng.',
    en: 'Shut the pump down early so the inside of my head is quieter when I lie down.',
  },
  {
    vi: 'Tôi đặt bút dạ lên trên sổ để mai mở mắt là thấy việc.',
    en: 'I laid the marker on top of the notebook so the work is right there when I open my eyes.',
  },
];

export const MORNING_LINES = [
  {
    vi: 'Miệng có mùi sắt, cái mùi của hôm qua vẫn chưa trôi.',
    en: 'My mouth tastes like iron. Yesterday has not rinsed out yet.',
  },
  {
    vi: 'Cổ tay trái sưng lên sờ thấy rõ, xoay thì hơi đau.',
    en: 'My left wrist is swollen enough to feel, and it complains when I turn it.',
  },
  {
    vi: 'Đồng hồ báo tôi ngủ bảy tiếng ba mươi phút, tôi không tin lắm.',
    en: 'The clock says I slept seven hours thirty. I do not believe it.',
  },
  {
    vi: 'Trên vách có thêm một vết nứt nhỏ, sáng nay đèn chiếu đúng góc mới thấy.',
    en: 'There is a new hairline crack on the wall. The light only hits it at this angle.',
  },
  {
    vi: 'Bàn chân chạm sàn vẫn lạnh như đêm qua, không đổi.',
    en: 'The floor is as cold under my feet as it was last night. No change.',
  },
  {
    vi: 'Sương giá đọng trên mặt ngoài cửa sổ, tan chậm hơn hôm qua.',
    en: 'Frost on the outside of the window. Slower to clear than yesterday.',
  },
  {
    vi: 'Tôi hắt hơi hai lần liền, và tự hỏi có phải bụi mới lọt vào khoang.',
    en: 'Sneezed twice in a row, then wondered if new dust got into the Hab overnight.',
  },
  {
    vi: 'Cà phê còn nửa gói đã mở, mùi không còn giống cà phê mà giống bột ngũ cốc.',
    en: 'Half a packet of coffee left open. It smells like breakfast cereal now, not coffee.',
  },
  {
    vi: 'Khoang lạnh hơn hôm qua ba độ, hoặc tôi quên chỉnh. Tôi chỉnh lại.',
    en: 'The Hab is three degrees colder than yesterday, or I forgot to adjust it. Adjusted it.',
  },
];

export const ACTION_FLAVOR = {
  farm: {
    vi: 'Trộn giá thể, đặt củ, tưới. Khoai lên chậm hơn mọi thứ tôi từng trồng ở Trái Đất.',
    en: 'Mix the growing bed, set the tubers, water them. Nothing I planted on Earth ever came up this slowly.',
  },
  bag: {
    vi: 'Cái túi đựng phần còn lại của mọi thứ: dây, ốc, pin cũ, vài mét băng dính.',
    en: 'The bag holds what is left of everything: wire, bolts, dead batteries, a few meters of tape.',
  },
  explore: {
    vi: 'Ra ngoài bằng cửa khoang khí, đi theo tuyến cọc đã cắm trước cơn bão.',
    en: 'Out through the airlock, following the marker stakes we planted before the storm.',
  },
  sleep: {
    vi: 'Ngủ cho hết số giờ còn lại, dù ngoài kia trời chưa tối.',
    en: 'Sleep off the rest of the hours, even though it is not dark out there.',
  },
};

export const NOTIFY = {
  farmLocked: {
    vi: 'Chưa trồng được. Khay chưa có nước, hạt cũng chưa ngâm.',
    en: 'Not planting yet. The tray has no water and the seeds are not soaking.',
  },
  farmNoWater: {
    vi: 'Bình chứa còn quá ít nước. Tạo thêm nước trước đã.',
    en: 'The tank is nearly dry. Make more water first.',
  },
  exploreSoon: {
    vi: 'Chưa ra ngoài được. Bộ đồ còn đang sấy, sáng mai hãy tính.',
    en: 'Not going out yet. The suit is still drying. Try in the morning.',
  },
  exploreStorm: {
    vi: 'Bão bụi đang lên. Tầm nhìn ngoài kia bằng không, đóng cửa lại.',
    en: 'Dust storm building. Visibility out there is zero. Keep the hatch shut.',
  },
  bagEmpty: {
    vi: 'Túi rỗng. Đồ còn lại đã dùng hết từ đợt trước.',
    en: 'The bag is empty. Everything in it got used up last week.',
  },
  sleepLocked: {
    vi: 'Đồng hồ chưa chốt số liệu hôm nay. Ngủ bây giờ thì mất dấu.',
    en: 'The log is not closed out for today. Sleep now and the numbers go missing.',
  },
};
