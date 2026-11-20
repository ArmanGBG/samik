-- ============================================================
-- به‌روزرسانی شماره‌های اولیا برای مدرسه تار و پود در دیتابیس سامیک
-- ولی ۱ = مادر | ولی ۲ = پدر
-- ============================================================
BEGIN;

-- دانش‌آموز: آيسل كبوكي (دهم عکاسی)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09143492484', "guardianPhone2" = '09399040579', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743255765' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09143492484', "updatedAt" = NOW() WHERE "nationalCode" = '2743255765' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09143492484' AND u2."nationalCode" != '2743255765');

-- دانش‌آموز: هستي شجاع دل (دهم طراحي و دوخت)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09373574212', "guardianPhone2" = NULL, "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743149221' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09339888624', "updatedAt" = NOW() WHERE "nationalCode" = '2743149221' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09339888624' AND u2."nationalCode" != '2743149221');

-- دانش‌آموز: روژدا حسيني (دهم طراحي و دوخت)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09038734104', "guardianPhone2" = '09135276168', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '6380281495' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09038734104', "updatedAt" = NOW() WHERE "nationalCode" = '6380281495' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09038734104' AND u2."nationalCode" != '6380281495');

-- دانش‌آموز: رزا غفارنژادثاني (دهم طراحي و دوخت)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09149703016', "guardianPhone2" = '09147224073', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743283599' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09944418005', "updatedAt" = NOW() WHERE "nationalCode" = '2743283599' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09944418005' AND u2."nationalCode" != '2743283599');

-- دانش‌آموز: سولماز تقي زاده (دهم طراحي و دوخت)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09142089394', "guardianPhone2" = '09148161595', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743213061' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09038538638', "updatedAt" = NOW() WHERE "nationalCode" = '2743213061' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09038538638' AND u2."nationalCode" != '2743213061');

-- دانش‌آموز: سيده نازنين عارف زاده (دهم طراحي و دوخت)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09144401190', "guardianPhone2" = NULL, "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743192720' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09148710288', "updatedAt" = NOW() WHERE "nationalCode" = '2743192720' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09148710288' AND u2."nationalCode" != '2743192720');

-- دانش‌آموز: ال آي تلچي (دهم شبكه و نرم‌افزار رايانه)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09141873814', "guardianPhone2" = '09143468061', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743324635' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09928898344', "updatedAt" = NOW() WHERE "nationalCode" = '2743324635' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09928898344' AND u2."nationalCode" != '2743324635');

-- دانش‌آموز: آرميتا ولي زاده ولنده (دهم عکاسی)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09934079949', "guardianPhone2" = '09144486988', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743191600' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09911827645', "updatedAt" = NOW() WHERE "nationalCode" = '2743191600' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09911827645' AND u2."nationalCode" != '2743191600');

-- دانش‌آموز: يسنا كوكيائي سنگر (دهم معماري داخلي)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09963517188', "guardianPhone2" = '09144414596', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743279273' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09963517671', "updatedAt" = NOW() WHERE "nationalCode" = '2743279273' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09963517671' AND u2."nationalCode" != '2743279273');

-- دانش‌آموز: ملينا شندواري قوشجي (دهم شبكه و نرم‌افزار رايانه)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09147109235', "guardianPhone2" = '09102660484', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743241071' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09962922876', "updatedAt" = NOW() WHERE "nationalCode" = '2743241071' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09962922876' AND u2."nationalCode" != '2743241071');

-- دانش‌آموز: ريحانه نباتي (دهم شبكه و نرم‌افزار رايانه)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09144637341', "guardianPhone2" = NULL, "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743316764' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09050489456', "updatedAt" = NOW() WHERE "nationalCode" = '2743316764' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09050489456' AND u2."nationalCode" != '2743316764');

-- دانش‌آموز: ريحانه وليمحمدي (دهم معماري داخلي)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09383268066', "guardianPhone2" = '09338089799', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743350261' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09383268066', "updatedAt" = NOW() WHERE "nationalCode" = '2743350261' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09383268066' AND u2."nationalCode" != '2743350261');

-- دانش‌آموز: نسا مظلوم تومتري (دهم عکاسی)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09399227315', "guardianPhone2" = '09144479721', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743309512' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09916179721', "updatedAt" = NOW() WHERE "nationalCode" = '2743309512' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09916179721' AND u2."nationalCode" != '2743309512');

-- دانش‌آموز: اليف فرهمنداصل (دهم شبكه و نرم‌افزار رايانه)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09360498436', "guardianPhone2" = NULL, "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2745464574' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09360498436', "updatedAt" = NOW() WHERE "nationalCode" = '2745464574' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09360498436' AND u2."nationalCode" != '2745464574');

-- دانش‌آموز: ريحانه پورآذري (دهم طراحي و دوخت)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09903012580', "guardianPhone2" = '09144494220', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2900619734' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09903012580', "updatedAt" = NOW() WHERE "nationalCode" = '2900619734' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09903012580' AND u2."nationalCode" != '2900619734');

-- دانش‌آموز: زهرا حاجي نصيري خانقاه (دهم شبكه و نرم‌افزار رايانه)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09045805721', "guardianPhone2" = '09149373056', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743294272' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09147606493', "updatedAt" = NOW() WHERE "nationalCode" = '2743294272' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09147606493' AND u2."nationalCode" != '2743294272');

-- دانش‌آموز: عسل كشي آده مرتضي پاشا (دهم معماري داخلي)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09028423666', "guardianPhone2" = '09143466549', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743268425' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09361419916', "updatedAt" = NOW() WHERE "nationalCode" = '2743268425' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09361419916' AND u2."nationalCode" != '2743268425');

-- دانش‌آموز: سما همتي (دهم شبكه و نرم‌افزار رايانه)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09300326742', "guardianPhone2" = '09148541986', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743299835' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09374585311', "updatedAt" = NOW() WHERE "nationalCode" = '2743299835' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09374585311' AND u2."nationalCode" != '2743299835');

-- دانش‌آموز: ستايش آهمند (دهم طراحي و دوخت)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09058842405', "guardianPhone2" = '09149434639', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743246693' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09376832124', "updatedAt" = NOW() WHERE "nationalCode" = '2743246693' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09376832124' AND u2."nationalCode" != '2743246693');

-- دانش‌آموز: محيا رضائي تمر (دهم عکاسی)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09146577643', "guardianPhone2" = '09143400714', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2840893835' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09375800896', "updatedAt" = NOW() WHERE "nationalCode" = '2840893835' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09375800896' AND u2."nationalCode" != '2840893835');

-- دانش‌آموز: زهرا جعفري اهرنجاني (دهم شبكه و نرم‌افزار رايانه)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09333232578', "guardianPhone2" = '09144492748', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743309709' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09148558373', "updatedAt" = NOW() WHERE "nationalCode" = '2743309709' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09148558373' AND u2."nationalCode" != '2743309709');

-- دانش‌آموز: سلوي سادات اكبري كافي (دهم عکاسی)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09055906252', "guardianPhone2" = '09143839575', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743236116' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09056436116', "updatedAt" = NOW() WHERE "nationalCode" = '2743236116' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09056436116' AND u2."nationalCode" != '2743236116');

-- دانش‌آموز: ستايش جعفرزاده (دهم عکاسی)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09043026594', "guardianPhone2" = '09144850059', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743240301' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09043026594', "updatedAt" = NOW() WHERE "nationalCode" = '2743240301' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09043026594' AND u2."nationalCode" != '2743240301');

-- دانش‌آموز: مليكا قره نقدهي (دهم طراحي و دوخت)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09147163102', "guardianPhone2" = '09145078195', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743255341' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09058508116', "updatedAt" = NOW() WHERE "nationalCode" = '2743255341' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09058508116' AND u2."nationalCode" != '2743255341');

-- دانش‌آموز: الهه رستمي گمچي (دهم عکاسی)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09142766001', "guardianPhone2" = '09143470120', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743167815' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09366995630', "updatedAt" = NOW() WHERE "nationalCode" = '2743167815' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09366995630' AND u2."nationalCode" != '2743167815');

-- دانش‌آموز: تارا شجاع حسن آباد (دهم عکاسی)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09141860665', "guardianPhone2" = '09149701315', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743282916' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09023271215', "updatedAt" = NOW() WHERE "nationalCode" = '2743282916' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09023271215' AND u2."nationalCode" != '2743282916');

-- دانش‌آموز: مائده علي بگلوئي (دهم طراحي و دوخت)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09354766923', "guardianPhone2" = '09144838388', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743184558' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09390344341', "updatedAt" = NOW() WHERE "nationalCode" = '2743184558' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09390344341' AND u2."nationalCode" != '2743184558');

-- دانش‌آموز: فاطمه اميري چلانسفلي (دهم عکاسی)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09149226189', "guardianPhone2" = '09911547232', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743161973' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09148778419', "updatedAt" = NOW() WHERE "nationalCode" = '2743161973' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09148778419' AND u2."nationalCode" != '2743161973');

-- دانش‌آموز: زهرا كاويد (دهم طراحي و دوخت)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09104413558', "guardianPhone2" = '09148113002', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743200952' LIMIT 1);

-- دانش‌آموز: آتنا ژاله كريمي (یازدهم فتو-گرافيك)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09915335495', "guardianPhone2" = '09143895495', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743084588' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09039429237', "updatedAt" = NOW() WHERE "nationalCode" = '2743084588' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09039429237' AND u2."nationalCode" != '2743084588');

-- دانش‌آموز: آتنا سقاتپه (یازدهم طراحي و دوخت)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09146319842', "guardianPhone2" = '09141469842', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743103744' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09365579842', "updatedAt" = NOW() WHERE "nationalCode" = '2743103744' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09365579842' AND u2."nationalCode" != '2743103744');

-- دانش‌آموز: نورا آدم عارف (یازدهم شبكه و نرم‌افزار رايانه)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09147479044', "guardianPhone2" = NULL, "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743048905' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09302765527', "updatedAt" = NOW() WHERE "nationalCode" = '2743048905' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09302765527' AND u2."nationalCode" != '2743048905');

-- دانش‌آموز: اسما سيدخاني شنگي (یازدهم طراحي و دوخت)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09020644151', "guardianPhone2" = '09143411092', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743136707' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09391496151', "updatedAt" = NOW() WHERE "nationalCode" = '2743136707' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09391496151' AND u2."nationalCode" != '2743136707');

-- دانش‌آموز: راشين فتاحياني (یازدهم شبكه و نرم‌افزار رايانه)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09141463150', "guardianPhone2" = '09144454174', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743025001' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09904793150', "updatedAt" = NOW() WHERE "nationalCode" = '2743025001' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09904793150' AND u2."nationalCode" != '2743025001');

-- دانش‌آموز: آتنا قائمي (یازدهم فتو-گرافيك)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09370597288', "guardianPhone2" = '09141095436', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '1364998920' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09337268448', "updatedAt" = NOW() WHERE "nationalCode" = '1364998920' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09337268448' AND u2."nationalCode" != '1364998920');

-- دانش‌آموز: شكيلا محمدزاده كله رش (یازدهم شبكه و نرم‌افزار رايانه)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09142699578', "guardianPhone2" = '09145608317', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743082755' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09059198317', "updatedAt" = NOW() WHERE "nationalCode" = '2743082755' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09059198317' AND u2."nationalCode" != '2743082755');

-- دانش‌آموز: باران مردوخي (یازدهم شبكه و نرم‌افزار رايانه)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09141478313', "guardianPhone2" = '09143472279', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743137339' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09352128313', "updatedAt" = NOW() WHERE "nationalCode" = '2743137339' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09352128313' AND u2."nationalCode" != '2743137339');

-- دانش‌آموز: آيسا مهري (یازدهم طراحي و دوخت)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09145150285', "guardianPhone2" = '09144937516', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743022884' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09936381585', "updatedAt" = NOW() WHERE "nationalCode" = '2743022884' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09936381585' AND u2."nationalCode" != '2743022884');

-- دانش‌آموز: رها نوبخت (یازدهم طراحي و دوخت)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09144434727', "guardianPhone2" = '09141452732', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743089237' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09055772629', "updatedAt" = NOW() WHERE "nationalCode" = '2743089237' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09055772629' AND u2."nationalCode" != '2743089237');

-- دانش‌آموز: فاطمه حبيبي (یازدهم شبكه و نرم‌افزار رايانه)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09146055719', "guardianPhone2" = '09141407191', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743095040' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09146057191', "updatedAt" = NOW() WHERE "nationalCode" = '2743095040' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09146057191' AND u2."nationalCode" != '2743095040');

-- دانش‌آموز: اسنا احمدزاده بالدرلو (یازدهم طراحي و دوخت)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09148337415', "guardianPhone2" = '09143881719', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743133211' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09145871943', "updatedAt" = NOW() WHERE "nationalCode" = '2743133211' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09145871943' AND u2."nationalCode" != '2743133211');

-- دانش‌آموز: سيما احمدي حقيقت (یازدهم شبكه و نرم‌افزار رايانه)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09142634710', "guardianPhone2" = NULL, "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '4712075643' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09334989891', "updatedAt" = NOW() WHERE "nationalCode" = '4712075643' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09334989891' AND u2."nationalCode" != '4712075643');

-- دانش‌آموز: النا اماني دولاما (یازدهم فتو-گرافيك)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09907343853', "guardianPhone2" = '09145603859', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2742905472' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09390766079', "updatedAt" = NOW() WHERE "nationalCode" = '2742905472' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09390766079' AND u2."nationalCode" != '2742905472');

-- دانش‌آموز: مليسا پروين (یازدهم شبكه و نرم‌افزار رايانه)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09145630891', "guardianPhone2" = '09145083014', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743138017' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09330148915', "updatedAt" = NOW() WHERE "nationalCode" = '2743138017' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09330148915' AND u2."nationalCode" != '2743138017');

-- دانش‌آموز: حديث پولادزاده (یازدهم طراحي و دوخت)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09929417795', "guardianPhone2" = '09935972605', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743130806' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09935972605', "updatedAt" = NOW() WHERE "nationalCode" = '2743130806' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09935972605' AND u2."nationalCode" != '2743130806');

-- دانش‌آموز: اسرا جعفرزاده چونقرالو (یازدهم طراحي و دوخت)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09395838722', "guardianPhone2" = '09143896441', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2742897852' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09146080512', "updatedAt" = NOW() WHERE "nationalCode" = '2742897852' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09146080512' AND u2."nationalCode" != '2742897852');

-- دانش‌آموز: ثنا رضائي (یازدهم فتو-گرافيك)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09918500634', "guardianPhone2" = '09146057991', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743033150' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09331640950', "updatedAt" = NOW() WHERE "nationalCode" = '2743033150' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09331640950' AND u2."nationalCode" != '2743033150');

-- دانش‌آموز: دنيز جليلي (یازدهم شبكه و نرم‌افزار رايانه)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '0912857633', "guardianPhone2" = '09120891994', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '0314453938' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09308400749', "updatedAt" = NOW() WHERE "nationalCode" = '0314453938' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09308400749' AND u2."nationalCode" != '0314453938');

-- دانش‌آموز: فاطمه حبيبي (یازدهم شبكه و نرم‌افزار رايانه)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09146057191', "guardianPhone2" = '09141407191', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743095040' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09146057191', "updatedAt" = NOW() WHERE "nationalCode" = '2743095040' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09146057191' AND u2."nationalCode" != '2743095040');

-- دانش‌آموز: مبينا جوادزاده (یازدهم شبكه و نرم‌افزار رايانه)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09148534605', "guardianPhone2" = '09143899413', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743061774' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09031824420', "updatedAt" = NOW() WHERE "nationalCode" = '2743061774' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09031824420' AND u2."nationalCode" != '2743061774');

-- دانش‌آموز: آيتن فيروزي خانشان (یازدهم فتو-گرافيك)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09144831083', "guardianPhone2" = '09142617008', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743146877' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09149509593', "updatedAt" = NOW() WHERE "nationalCode" = '2743146877' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09149509593' AND u2."nationalCode" != '2743146877');

-- دانش‌آموز: ساغر حسيني (یازدهم فتو-گرافيك)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09335260108', "guardianPhone2" = '09144481131', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2742833889' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09353936431', "updatedAt" = NOW() WHERE "nationalCode" = '2742833889' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09353936431' AND u2."nationalCode" != '2742833889');

-- دانش‌آموز: مهسا تمرزاده بستك آباد (یازدهم طراحي و دوخت)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09399981551', "guardianPhone2" = '09149686793', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2742993371' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09046159469', "updatedAt" = NOW() WHERE "nationalCode" = '2742993371' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09046159469' AND u2."nationalCode" != '2742993371');

-- دانش‌آموز: هستي مبين فر (یازدهم طراحي و دوخت)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09393214768', "guardianPhone2" = '09143407311', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743152575' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09373770841', "updatedAt" = NOW() WHERE "nationalCode" = '2743152575' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09373770841' AND u2."nationalCode" != '2743152575');

-- دانش‌آموز: سوگل نوري كوجان (یازدهم طراحي و دوخت)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09147148078', "guardianPhone2" = '09143451849', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2743014865' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09907431849', "updatedAt" = NOW() WHERE "nationalCode" = '2743014865' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09907431849' AND u2."nationalCode" != '2743014865');

-- دانش‌آموز: سوين وحيدي (یازدهم طراحي و دوخت)
UPDATE "SchoolEnrollment" SET "guardianPhone1" = '09142012138', "guardianPhone2" = '09148622138', "updatedAt" = NOW() WHERE "studentUserId" = (SELECT "id" FROM "User" WHERE "nationalCode" = '2742925112' LIMIT 1);
UPDATE "User" SET "phoneNumber" = '09146106901', "updatedAt" = NOW() WHERE "nationalCode" = '2742925112' AND NOT EXISTS (SELECT 1 FROM "User" u2 WHERE u2."phoneNumber" = '09146106901' AND u2."nationalCode" != '2742925112');

COMMIT;