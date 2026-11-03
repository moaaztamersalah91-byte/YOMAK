# YOMAK — نسخة الموقع (كمبيوتر)

نفس الموقع بتاعك بدون أي ملفات أندرويد. التصميم بيتجاوب: على الكمبيوتر بيظهر بالقايمة الجانبية.

## تجربة سريعة على جهازك
افتح PowerShell جوه المجلد ده واكتب:
    npx serve .
وبعدين افتح العنوان اللي هيظهر (غالبًا http://localhost:3000). ماتفتحش الملفات بالضغط عليها (file://) لأن Firebase مش هيشتغل.

## نشره على الإنترنت (Firebase Hosting)
    npm install -g firebase-tools
    firebase login
    firebase init hosting     (اختار مشروع yomak-9186b، والمجلد public = .  ، و No لـ single-page app)
    firebase deploy --only hosting,firestore:rules

## مهم
- في Firebase Console > Authentication > Settings > Authorized domains: ضيف دومين موقعك الجديد (غير كده تسجيل الدخول مش هيشتغل).
- القرآن والتفسير في نسخة الموقع بيتحمّلوا من الإنترنت تلقائيًا، مش محتاج تنزّل حاجة.
- الألعاب الثلاثة (السلم والثعبان، بنك الحظ، لودو) متشالة.
