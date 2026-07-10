/* prosodyFeet.js — قاعدة معرفة القدم العروضية الغربية (نبر: منبور/غير منبور)
   يختلف هذا النظام عن ●/▬ في rhyme.js (متحرك/ساكن — كمية صوتية عربية خالصة):
   هنا القياس نبري (stress) يخص التفعيلة الإنجليزية/اليونانية الكلاسيكية،
   يُعرض كأداة مقارنة معرفية إلى جانب محرك الوزن العربي، لا بديلاً عنه. */

export const STRESSED = '-'
export const UNSTRESSED = '~'

export const CATEGORY_LABELS = {
  mono: 'أحادي المقطع',
  di: 'ثنائي المقطع',
  tri: 'ثلاثي المقطع',
  quad: 'رباعي المقطع',
}

/** لون شارة لكل فئة (تدرجات الحبر المعتمدة في الهوية) */
export const CATEGORY_COLOR = { mono: 'rhyme-c0', di: 'rhyme-c1', tri: 'rhyme-c5', quad: 'rhyme-c6' }

export const FEET = {
  '-': { name: 'منبور مفرد (Monosyllabic)', category: 'mono', example: 'fiend', desc: 'لبنة أساسية لفهم النبر المنفرد.' },
  '~': { name: 'غير منبور مفرد (Monosyllabic)', category: 'mono', example: 'Hit', desc: 'وحدة بسيطة تمثل المقطع الخفيف المنفرد.' },

  '~ -': { name: 'يَمْبِي (Iamb)', category: 'di', example: 'To-day', desc: 'إيقاع صاعد؛ الأكثر شيوعًا وطبيعية في الكلام، يشبه نبض القلب.' },
  '- ~': { name: 'وَتَدِي (Trochee)', category: 'di', example: 'Dai-ly', desc: 'إيقاع هابط؛ يبدأ بقوة ويعطي إحساسًا بالجدية أو الأمر (يشبه ضربة مطرقة).' },
  '- -': { name: 'إسفندي (Spondee)', category: 'di', example: 'Day-Break', desc: 'القوة الكاملة؛ يُستخدم للتأكيد أو لإعطاء إحساس بالثقل والبطء.' },
  '~ ~': { name: 'بيريكي (Pyrrhic)', category: 'di', example: 'fast-food', desc: 'انعدام القوة؛ يُستخدم لتسريع الإيقاع بين الكلمات القوية وإضفاء السلاسة.' },

  '~ ~ -': { name: 'أنَبَسْت (Anapest)', category: 'tri', example: 'In-ter-vene', desc: 'إيقاع متدفق وسريع يصعد بقوة في نهايته.' },
  '- ~ ~': { name: 'إصبعي (Dactyl)', category: 'tri', example: 'Yes-ter-day', desc: 'إيقاع هابط سريع يبدأ بنبرة قوية تليها خفتان.' },
  '~ ~ ~': { name: 'ترايبراك (Tribrach)', category: 'tri', example: '—', desc: 'ثلاثة مقاطع خفيفة متتالية لتسريع التدفق الموسيقي.' },
  '- - -': { name: 'مولوسوس (Molossus)', category: 'tri', example: '—', desc: 'ثلاثة مقاطع شديدة الوطأة تعكس بطئًا وثقلًا شديدين.' },
  '~ - ~': { name: 'أمفيبراك (Amphibrach)', category: 'tri', example: '—', desc: 'مقطع قوي محاط بمقطعين خفيفين، يتميز بتوازن متموج.' },
  '~ - -': { name: 'باكيك (Bacchic)', category: 'tri', example: '—', desc: 'بداية خفيفة يتلوها تأكيد مزدوج متتالٍ.' },
  '- ~ -': { name: 'كريتيك (Cretic)', category: 'tri', example: '—', desc: 'تذبذب إيقاعي (قوي-خفيف-قوي) يعطي إحساسًا بالتقطيع المؤكد.' },
  '- - ~': { name: 'أنتي باكيك (Antibacchic)', category: 'tri', example: '—', desc: 'تأكيد قوي في البداية والوسط ينتهي بخفة.' },

  '~ ~ ~ ~': { name: 'بروسليوسماتيك (Proceleusmatic)', category: 'quad', example: '—', desc: 'أربعة مقاطع خفيفة سريعة جدًا ونادرة الاستخدام.' },
  '- ~ ~ ~': { name: 'البيون الأول (1st Peon)', category: 'quad', example: '—', desc: 'تركيب رباعي يبدأ بنبرة قوية تليها ثلاثة مقاطع خفيفة.' },
  '~ - ~ ~': { name: 'البيون الثاني (2nd Peon)', category: 'quad', example: '—', desc: 'يقع المقطع المنبور في الموضع الثاني في البنية الرباعية.' },
  '~ ~ - ~': { name: 'البيون الثالث (3rd Peon)', category: 'quad', example: '—', desc: 'يقع المقطع المنبور في الموضع الثالث في البنية الرباعية.' },
  '~ ~ ~ -': { name: 'البيون الرابع (4th Peon)', category: 'quad', example: '—', desc: 'تصاعد بطيء ينتهي بمقطع قوي واحد في الختام.' },
  '~ - - -': { name: 'الإبيطريت الأول (1st Epitrite)', category: 'quad', example: '—', desc: 'مقطع خفيف يتبعه ثلاثة مقاطع قوية.' },
  '- ~ - -': { name: 'الإبيطريت الثاني (2nd Epitrite)', category: 'quad', example: '—', desc: 'المقطع الخفيف يقع في الموضع الثاني بين ثلاثة منبورة.' },
  '- - ~ -': { name: 'الإبيطريت الثالث (3rd Epitrite)', category: 'quad', example: '—', desc: 'المقطع الخفيف يقع في الموضع الثالث بين ثلاثة منبورة.' },
  '- - - ~': { name: 'الإبيطريت الرابع (4th Epitrite)', category: 'quad', example: '—', desc: 'ثلاثة مقاطع قوية تنتهي بمقطع خفيف.' },
  '- ~ - ~': { name: 'داي-تروكي (Ditrochee)', category: 'quad', example: '—', desc: 'تضاعف لقدم الوَتَدِي (هابط مزدوج).' },
  '- - - -': { name: 'ديسـبوندي (Dispondee)', category: 'quad', example: '—', desc: 'أربعة مقاطع قوية متتالية؛ ثقل إيقاعي فائق.' },
  '~ - ~ -': { name: 'داي-يَمْبِي (Di-iamb)', category: 'quad', example: '—', desc: 'تضاعف لقدم اليَمْبِي (صاعد مزدوج).' },
  '~ - - ~': { name: 'أنتيباست (Antipast)', category: 'quad', example: '—', desc: 'مقطعان قويان محاطان بمقطعين خفيفين في الأطراف.' },
  '- - ~ ~': { name: 'الأيوني الكبير (Major Ionic)', category: 'quad', example: '—', desc: 'مقطعان قويان يتبعهما مقطعان خفيفان.' },
  '~ ~ - -': { name: 'الأيوني الصغير (Minor Ionic)', category: 'quad', example: '—', desc: 'مقطعان خفيفان يتبعهما مقطعان قويان.' },
  '- ~ ~ -': { name: 'كوريامب (Choriamb)', category: 'quad', example: '—', desc: 'مقطعان خفيفان محاطان بمقطعين قويين في الأطراف.' },
}

export const FEET_COUNT = Object.keys(FEET).length

export const ENDINGS = {
  masculine: {
    pattern: '~ -',
    label: 'النهاية المذكرة (Masculine Ending)',
    example: 'something there is that … love a wall',
    effect: 'تمنح البيت إحساسًا بالحسم، القوة، والاكتمال، وتمثل نقطة وقفة قوية وثابتة للقارئ.',
  },
  feminine: {
    pattern: '- ~',
    label: 'النهاية المؤنثة (Feminine Ending)',
    example: 'like to the lark … of day rising',
    effect: 'توحي بإيقاع هابط وأكثر ليونة وسلاسة، وتساهم في خلق شعور بالاستمرارية أو التأمل يمتد تلقائيًا إلى البيت التالي.',
  },
}

/** مصفوفة التكرار البنيوي — تسعة مستويات صوتية وتركيبية تنظّم إيقاع القصيدة */
export const REPETITION_LEVELS = [
  { id: 'sounds', label: 'الأصوات (Sounds)' },
  { id: 'syllables', label: 'المقاطع (Syllables)' },
  { id: 'words', label: 'الكلمات (Words)' },
  { id: 'phrases', label: 'العبارات (Phrases)' },
  { id: 'lines', label: 'الأبيات (Lines)' },
  { id: 'stanzas', label: 'المقاطع الشعرية (Stanzas)' },
  { id: 'meter', label: 'الأنماط الوزنية' },
  { id: 'word-endings', label: 'نهايات الكلمات' },
  { id: 'rhyme', label: 'المقاطع المتطابقة' },
]
