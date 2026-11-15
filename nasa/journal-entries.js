/* ============================================================
   journal-entries.js
   Nội dung sổ nhật ký 35 ngày, bản viết lại có cung bậc cảm xúc.

   Dữ liệu thuần, không logic. Mỗi ngày: { day, vi, en, mood }.
   mood quyết định màu mực trên trang sổ, xem journal-book.css:
     calm    xanh đen     bình tĩnh, hài hước khô
     tired   xám          mệt, câu ngắn dần
     scared  đỏ nâu       hoảng, sự cố
     hopeful xanh navy ấm mầm sống, hy vọng
     bitter  nâu sẫm      cay đắng, tự mắng mình
     numb    xám nhạt     buông xuôi, trống rỗng

   Quy tắc: không dấu gạch dài, không giọng tóm tắt, mỗi ngày
   2 tới 5 câu. Chi tiết giữ lại từ base-flavor.js: con số 302,
   chuông báo cháy, củ khoai cắt bốn, gioăng nước, mười hai gói
   cà phê, vết giày tuột của Martinez, vạch sol một trăm.
   ============================================================ */

export const JOURNAL_DAYS = [
  {
    day: 1,
    mood: 'calm',
    vi: 'Đếm gói thức ăn ba lần, lần nào cũng ra ba trăm lẻ hai. Con số không đổi nên tôi để nguyên, đi kiểm tra bộ lọc CO2 cho có việc. Bộ lọc chạy tốt. Tốt hơn tôi tưởng, và tôi không biết phải làm gì với tin tốt lúc bảy giờ sáng.',
    en: 'Counted the ration packs three times and got 302 every time. The number held, so I left it alone and went to check the CO2 scrubber, just to have something to do. The scrubber runs fine. Better than I expected, and I did not know what to do with good news at seven in the morning.',
  },
  {
    day: 2,
    mood: 'calm',
    vi: 'Tháo cái chuông báo cháy khỏi trần khoang. Nó kêu mỗi lần tôi mở lò vi sóng, và từ giờ chỉ còn mình tôi ở đây để nghe. Để nó lên kệ, cạnh bộ đồ dự phòng. Không biết tại sao, nhưng khoang im hơn thì dễ thở hơn.',
    en: 'Took the smoke alarm down off the ceiling. It went off every time I opened the microwave, and I am the only one left here to hear it. Put it on a shelf next to the spare suit. No idea why, but the Hab is easier to breathe in when it is quiet.',
  },
  {
    day: 3,
    mood: 'calm',
    vi: 'Lập bảng việc cần làm. Chia ra: việc để sống, việc để khỏi phát điên. Cột thứ hai dài hơn cột thứ nhất, và đó có lẽ là tin tốt. Ghi dòng đầu tiên của cột hai là "viết sổ này".',
    en: 'Made a list of things to do. Split it: things to stay alive, things to stay sane. The second column came out longer than the first, which is probably good news. Wrote "keep this log" as the first line of column two.',
  },
  {
    day: 4,
    mood: 'calm',
    vi: 'Cắt củ khoai làm bốn. Chỉ một miếng có mắt mầm. Ba miếng kia tôi ăn sống, nhai lâu hơn bình thường để nó có vẻ nhiều hơn. Vị đất. Mai chắc sẽ cười nếu con bé thấy bố ăn khoai sống một mình trong cái hộp này.',
    en: 'Cut a potato into four. Only one piece had a live eye. I ate the other three raw, chewing longer than usual so it would feel like more. Tastes like dirt. Mai would laugh if she saw her dad eating raw potato alone in this box.',
  },
  {
    day: 5,
    mood: 'calm',
    vi: 'Quét bụi khỏi tấm pin, lấy lại được bảy phần trăm. Một tiếng sau bụi phủ đúng chỗ cũ. Tôi ghi số bảy vào sổ và tự nhủ: từ nay quét lúc chiều muộn, ít nhất thì buổi tối được sướng một chút.',
    en: 'Brushed the dust off the panel and bought back seven percent. An hour later the dust sat on the same spot. I wrote seven in the log and decided: from now on I brush late in the afternoon, so at least the evening feels better.',
  },
  {
    day: 6,
    mood: 'calm',
    vi: 'Đồng hồ khoang đếm sol theo giờ Sao Hỏa. Đêm nằm nghe nó tách một tiếng rồi mới nhảy số. Cái tiếng đó to hơn tôi tưởng. Có lẽ cả khoang chỉ có hai thứ còn thức: tôi và nó.',
    en: 'The Hab clock counts sols in Mars hours. At night it clicks once before rolling over, and the click is louder than I expected. Maybe two things in this Hab stay awake: me and the clock.',
  },
  {
    day: 7,
    mood: 'calm',
    vi: 'Tìm được cách ghi sổ rẻ hơn: viết lên mặt sau giấy in báo cáo. Bút bi đông cứng trong khoang lạnh, phải hơ qua ống thông gió mới ra mực. Hơ bút trước khi viết. Đây là kỹ năng mới đầu tiên tôi học ở tuổi bốn mươi.',
    en: 'Found a cheaper way to keep this log: write on the back of printed reports. The ballpoint freezes in a cold Hab, so I warm it over the vent first. Warm the pen, then write. First new skill I have learned at forty.',
  },
  {
    day: 8,
    mood: 'tired',
    vi: 'Máy tạo nước chạy bốn tiếng rồi nghẹt. Tháo ra, trong buồng xúc tác có một mẩu gioăng cao su. Không biết nó nằm đó bao lâu trước tôi. Sửa xong trời cũng chưa tối mà tôi đã muốn đi ngủ.',
    en: 'The water maker ran four hours and choked. Took it apart and found a chunk of rubber gasket in the catalyst bed. No idea how long it sat there before me. Fixed it, and it was not even dark yet and I already wanted bed.',
  },
  {
    day: 9,
    mood: 'tired',
    vi: 'Khẩu phần hôm nay: một gói thịt khô, nửa gói bánh quy. Nửa còn lại dán băng dính lên nắp hộp, ghi ngày bằng bút xoá. Nhìn cái nắp hộp lâu hơn cần thiết. Ăn chậm là cách duy nhất để bữa ăn kéo dài.',
    en: 'Today: one pack of dried meat, half a pack of crackers. Taped the other half to the lid and dated it with a grease pencil. Stared at that lid longer than necessary. Eating slow is the only way to make a meal last.',
  },
  {
    day: 10,
    mood: 'tired',
    vi: 'Trong hộp y tế có cái gương nhỏ. Dán lên tay tuốc nơ vít để nhìn ra sau lưng khi thay lọc gió. Phía sau chẳng có gì. Tôi vẫn để nguyên cái gương trên tay vít.',
    en: 'There was a small mirror in the medical kit. Taped it to a screwdriver handle so I can see behind me while changing the air filter. There is nothing behind me. I left the mirror on the handle anyway.',
  },
  {
    day: 11,
    mood: 'calm',
    vi: 'Khay khoai xuống âm hai độ ban đêm, nên tôi quấn dây đốt quanh khay. Gọi nó là hệ thống sưởi sàn. Linh mà nghe chắc cười: hồi còn ở Quảng Ngãi, nhà ngoại cũng sàn đá mà vẫn trồng được cả vườn hành.',
    en: 'The potato trays drop to minus two at night, so I wrapped a heater coil around them. I call it underfloor heating. Linh would laugh: back in Quang Ngai, Grandma had a stone floor too and still grew a whole garden of onions.',
  },
  {
    day: 12,
    mood: 'tired',
    vi: 'Bụi lọt vào ủng qua đường chỉ khâu. Đổ ra được một nắm cát đỏ, cân thử hai mươi ba gam. Rồi tự hỏi tại sao mình lại đi cân nó. Không có đáp án. Ghi vào sổ cho có số.',
    en: 'Dust gets into my boots through the stitching. Poured out a fistful of red sand and weighed it at twenty three grams. Then wondered why I weighed it. No answer. Logged it anyway.',
  },
  {
    day: 13,
    mood: 'bitter',
    vi: 'Cà phê còn mười hai gói. Không phải mười hai ngày. Mười hai gói. Tôi viết chữ HOA lên lịch để khỏi tự lừa mình, rồi ngồi nhìn chữ HOA đó mười phút, tự hỏi mình đang giận ai.',
    en: 'Twelve packets of instant coffee left. Not twelve days. Twelve packets. I wrote it in capitals on the calendar so I stop lying to myself, then sat looking at the capitals for ten minutes, wondering who exactly I was mad at.',
  },
  {
    day: 14,
    mood: 'tired',
    vi: 'Ống nhựa nứt ở khúc cua thứ ba. Bọc lưới thuỷ tinh với epoxy, ép mười hai tiếng. Vẫn rỉ, chỉ chậm hơn hôm qua. Hôm nay gọi là tiến bộ. Chuẩn này thấp quá, nhưng là chuẩn của tôi.',
    en: 'Plastic line split at the third elbow. Wrapped it in fiberglass and epoxy, clamped it twelve hours. Still weeping, just slower than yesterday. Today that counts as progress. Low bar, but it is my bar.',
  },
  {
    day: 15,
    mood: 'tired',
    vi: 'Bật máy thu lúc sáu giờ tối giờ Trái Đất, để nửa tiếng. Toàn nhiễu. Nghe nhiễu cũng vẫn hơn không nghe gì, và nó làm tôi ngủ sai giờ. Sai giờ thì ngày mai lại lặp lại. Vòng quay hoàn hảo.',
    en: 'Ran the receiver at six, Earth time, for half an hour. Static the whole way. Static still beats silence, and it puts me to sleep at the wrong hour. Wrong hour means I repeat it tomorrow. A perfect loop.',
  },
  {
    day: 16,
    mood: 'hopeful',
    vi: 'Đếm lại khay: bốn mươi mầm mọc, ba cây héo. Bốn mươi. Tôi đếm hai lần vì không tin. Bụi trong khay trông như đường cát, tôi nếm một nhúm, mặn hơn tưởng. Không sao. Bốn mươi cây là bốn mươi cây.',
    en: 'Recounted the trays: forty sprouts up, three wilted. Forty. I counted twice because I did not believe it. The dust in them looks like fine sugar; I tasted a pinch and it was saltier than expected. Does not matter. Forty is forty.',
  },
  {
    day: 17,
    mood: 'hopeful',
    vi: 'Gioăng cửa khoang khí giãn ở chỗ hứng nắng. Xoay lại một phần tư vòng, đủ cho tuần này. Hôm nay tôi bắt đầu nghĩ tới chuyện thu hoạch thay vì chỉ nghĩ tới chuyện sống sót. Hai chữ đó nghe khác nhau hơn tôi tưởng.',
    en: 'The airlock gasket stretched where the sun hits it. Rotated it a quarter turn, enough for the week. Today I started thinking about harvest instead of just survival. Those two words sound more different than I expected.',
  },
  {
    day: 18,
    mood: 'hopeful',
    vi: 'Lò vi sóng ngắt cầu dao khi chạy cùng máy bơm. Đánh dấu ổ cắm bằng bút chì, tự dặn đừng bật hai thứ cùng lúc. Tối nay tôi đã quên, đúng như dự đoán. Nhưng khoai trong khay vẫn sống, nên hôm nay vẫn là ngày tốt.',
    en: 'The microwave tripped the breaker with the pump running. Marked the outlet in pencil and told myself not to run both. Tonight I forgot, exactly as predicted. But the potato trays are still alive, so today was a good day.',
  },
  {
    day: 19,
    mood: 'calm',
    vi: 'Giặt tấm lọc HEPA cuối cùng trong bồn rửa, phơi trên dây phía trên bếp. Nước rỏ xuống sàn suốt buổi tối, tiếng tách tách đều đặn. Nghe giống mưa. Tôi ngồi dưới sàn nghe tới khi nó cạn.',
    en: 'Washed the last HEPA filter in the sink and hung it on the line over the stove. It dripped on the floor all evening, a steady tapping. It sounded like rain. I sat on the floor and listened until it ran dry.',
  },
  {
    day: 20,
    mood: 'hopeful',
    vi: 'Trồng xong đợt hai. Mười ô, mỗi ô mười hai củ, đất lạnh tay nên đeo găng y tế để trộn. Mười ô. Trên Trái Đất tôi chưa từng trồng gì nhiều hơn một chậu. Cái hộp này đang dạy tôi làm nông.',
    en: 'Second planting done. Ten squares, twelve tubers each. The soil is cold on the hands, so I mix it in surgical gloves. Ten squares. On Earth I never grew more than one pot of basil. This box is teaching me to farm.',
  },
  {
    day: 21,
    mood: 'hopeful',
    vi: 'Cắt tóc bằng kéo phẫu thuật, trước gương trên bồn rửa. Không tệ. Tóc rơi xuống sàn thì cứ để đó, sàn này đã dính đủ thứ. Nhìn mình trong gương thấy gầy đi, nhưng mắt thì sáng hơn tuần trước.',
    en: 'Cut my hair with the surgical scissors at the sink mirror. Not bad. Hair on the floor stays on the floor; this floor has seen worse. The face in the mirror is thinner, but the eyes are brighter than last week.',
  },
  {
    day: 22,
    mood: 'numb',
    vi: 'Hôm nay tôi không ra khỏi giường cho tới trưa. Không buồn, không mệt, chỉ là không có lý do để dậy. Rồi tôi nhớ ra con số 302 đã thành 118 và đi kiểm tra bộ lọc. Bộ lọc vẫn chạy. Tôi cũng vẫn chạy. Kiểu gì thì kiểu.',
    en: 'Did not get out of bed until noon today. Not sad, not tired, just no reason to get up. Then I remembered 302 had become 118 and went to check the scrubber. The scrubber still runs. So do I. Somehow.',
  },
  {
    day: 23,
    mood: 'scared',
    vi: 'Áp suất khoang tụt 0,8 kPa trong một giờ, tôi chạy quanh khoang tìm chỗ rò như người điên. Hoá ra là cảm biến. Cảm biến. Tôi ngồi bệt xuống sàn giữa khoang, hai tay còn run, và tự mắng mình vì đã run.',
    en: 'Cabin pressure dropped 0.8 kPa in an hour and I ran around the Hab like a madman hunting the leak. It was the sensor. The sensor. I sat down on the deck in the middle of the Hab, hands still shaking, and told myself off for shaking.',
  },
  {
    day: 24,
    mood: 'scared',
    vi: 'Đêm nay quạt lọc im bặt ba phút. Ba phút thôi, nhưng tôi đứng cạnh công tắc suốt ba phút đó, không thở nổi. Rồi nó tự chạy lại. Tôi không biết mình sẽ làm gì nếu nó không chạy lại, và tôi không muốn biết.',
    en: 'The scrubber fan went silent for three minutes tonight. Only three, but I stood next to the switch the whole time, unable to breathe. Then it started again on its own. I do not know what I would have done if it had not, and I do not want to know.',
  },
  {
    day: 25,
    mood: 'scared',
    vi: 'Cơn bão bụi ngoài kia kéo ba ngày nay, tấm pin tụt xuống hai mươi phần trăm. Tôi nằm nghe gió gào vào vách, và vách nghe mỏng hơn mọi ngày. Đã tính sẵn phương án rút vào khoang nhỏ nhất. Không nói ra với ai, vì không có ai.',
    en: 'The dust storm outside has run three days now and the panel is down to twenty percent. I lie there listening to the wind scream against the wall, and the wall sounds thinner every day. I worked out a plan to retreat into the smallest compartment. Did not tell anyone, because there is no one.',
  },
  {
    day: 26,
    mood: 'numb',
    vi: 'Bão vẫn kéo. Tôi ăn, kiểm tra số, đi ngủ. Không viết được gì khác, vì không có gì khác xảy ra. Ngày trống. Trang này trống cũng được, nhưng giấy thì vẫn phải lật.',
    en: 'Storm still going. I ate, checked the numbers, went to bed. Nothing else to write, because nothing else happened. An empty day. This page could be blank too, but the paper still has to turn.',
  },
  {
    day: 27,
    mood: 'bitter',
    vi: 'Hôm nay tôi nói chuyện với cái máy lọc không khí. Gọi nó là Dave. Nó trả lời bằng tiếng quạt, đều đều, không bao giờ cãi. Đúng là bạn tốt. Nhục nhã ở chỗ tôi biết rõ nó không phải bạn, mà vẫn gọi.',
    en: 'Talked to the air scrubber today. Named it Dave. It answers with fan noise, steady, never argues. Ideal company. The humiliating part is knowing perfectly well it is not a friend, and calling it one anyway.',
  },
  {
    day: 28,
    mood: 'numb',
    vi: 'Mở tấm ảnh nhóm Ares 3, phóng to chỗ dây giày tuột của Martinez, cười thành tiếng. Tiếng đó vang trong khoang lâu hơn tôi muốn. Sau đó tôi ngồi im rất lâu, không nghĩ gì cả. Không nghĩ gì cũng là một loại nghỉ ngơi.',
    en: 'Opened the Ares 3 photo, zoomed in on Martinez bootlace coming untied, and laughed out loud. The laugh echoed in the Hab longer than I wanted. Then I sat very still for a long time, thinking nothing. Thinking nothing is also a kind of rest.',
  },
  {
    day: 29,
    mood: 'bitter',
    vi: 'Nhớ mùi cà phê. Không phải vị, là mùi, cái mùi lan trong bếp buổi sáng khi Linh còn pha cho hai người. Gói cuối cùng tôi để ở đáy hộp, chưa mở. Không phải để dành, chỉ là chưa đủ can đảm uống nốt.',
    en: 'Missed the smell of coffee. Not the taste, the smell, the one that filled the kitchen in the morning when Linh still made it for two. The last packet sits at the bottom of the box, unopened. Not saving it. Just not brave enough to finish it.',
  },
  {
    day: 30,
    mood: 'numb',
    vi: 'Đánh dấu sol thứ một trăm trên khung cửa bằng bút dạ. Mực không bám, tôi gạch lại lần nữa, lần này tối hơn một chút. Một trăm ngày. Con số to hơn tôi tưởng, và tôi không biết mình nên tự hào hay nên sợ.',
    en: 'Marked sol one hundred on the doorframe with a marker. The ink did not take, so I went over it again, and this time it came out a shade darker. One hundred days. A bigger number than I expected, and I do not know whether to be proud or afraid of it.',
  },
  {
    day: 31,
    mood: 'bitter',
    vi: 'Hôm nay tôi tự hỏi mình có điên không. Rồi trả lời: điên thì đã có việc để làm, còn tôi thì có. Vậy là không điên. Logic kiểu này chỉ dùng được trong cái hộp này, và tôi dùng nó mỗi ngày.',
    en: 'Asked myself today whether I was going mad. Then answered: mad people have nothing to do, and I have plenty. So, not mad. This logic only works inside this box, and I use it every day.',
  },
  {
    day: 32,
    mood: 'hopeful',
    vi: 'Cây khoai đầu tiên có lá thật, xanh, không héo. Tôi ngồi trước khay hai mươi phút, không làm gì, chỉ nhìn. Nó không biết mình là tin tốt đầu tiên sau một tuần. Hay nó biết, và đang cố.',
    en: 'The first potato plant has real leaves now, green, not wilted. I sat in front of the tray for twenty minutes doing nothing, just looking. It does not know it is the first good news in a week. Or maybe it does, and it is trying.',
  },
  {
    day: 33,
    mood: 'bitter',
    vi: 'Nhớ quê. Nhớ mùi đất sau mưa ở vườn ngoại, thứ mùi mà cái hành tinh này không có và sẽ không bao giờ có. Đất ở đây chỉ có mùi sắt. Tôi trộn giá thể bằng tay không, không găng, để ít nhất tay được đụng vào thứ gì giống đất.',
    en: 'Missed home. The smell of soil after rain in Grandma garden, a smell this planet does not have and never will. Dirt here smells only of iron. Mixed the growing bed bare handed today, no gloves, so at least my hands touched something like earth.',
  },
  {
    day: 34,
    mood: 'hopeful',
    vi: 'Tín hiệu cầu cứu đã đi từ hai tuần trước, và hôm nay tôi bắt đầu dám nghĩ nó có thể tới. Không có gì xác nhận cả. Chỉ là tôi tính nhẩm lại quỹ đạo và thấy con số không sai. Con số không sai là đủ cho một ngày.',
    en: 'The distress signal went out two weeks ago, and today I started daring to think it might have arrived. Nothing confirms it. I just redid the orbit math and the numbers held. Numbers holding is enough for one day.',
  },
  {
    day: 35,
    mood: 'bitter',
    vi: 'Ngày 35. Vẫn sống. Vẫn trồng khoai, vẫn hơ bút trước khi viết, vẫn nói chuyện với Dave. Mai, nếu con đọc được trang này khi bố về: bố không bỏ cuộc, bố chỉ chậm thôi. Còn Linh: anh vẫn pha cà phê cho hai người, trong đầu.',
    en: 'Day 35. Still alive. Still growing potatoes, still warming the pen before writing, still talking to Dave. Mai, if you ever read this page when I get home: I did not give up, I was just slow. And Linh: I still make coffee for two, in my head.',
  },
];
