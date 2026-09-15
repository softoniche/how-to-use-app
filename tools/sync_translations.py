#!/usr/bin/env python3
"""Regenerates assets/js/i18n.js from the Flutter app's translation files.

The guide shows exactly the same sentences as the in-app walkthrough did, and
those are already translated into all eleven supported languages under
`lib/config/translate/`. Rather than keeping a second copy by hand, this script
reads those Dart maps and writes the strings the page needs into one JS file,
keyed by the short ids used in `content.js`.

    python3 tools/sync_translations.py

Run it after changing a translation in the Flutter app. To add a string that
the app does not have, add it to `EXTRA` below (it is written out as-is).
"""

import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.dirname(HERE)
APP = os.path.dirname(WEB)
TRANSLATIONS = os.path.join(APP, 'lib', 'config', 'translate')
OUT = os.path.join(WEB, 'assets', 'js', 'i18n.js')

# language code -> Dart file. Mirrors Messages.keys in localization_service.dart.
LANGUAGES = {
    'en': 'english.dart',
    'tr': 'turkish.dart',
    'de': 'german.dart',
    'id': 'indonesian.dart',
    'es': 'spanish.dart',
    'pt': 'portuguese.dart',
    'ar': 'arabic.dart',
    'fr': 'french.dart',
    'ms': 'malay.dart',
    'af': 'afrikaans.dart',
    'hi': 'hindi.dart',
}

# short id used by the page -> the English string that keys the Dart maps.
IDS = {
    # chrome
    'guide_title': 'How the app works',
    'skip': 'Skip',
    'next': 'Next',
    'back': 'Back',
    'get_started': 'Get started',
    'done': 'Done',
    'swipe_hint': 'Swipe to continue',
    'tap_zoom': 'Tap to zoom',
    'tap_enlarge': 'Tap to enlarge',
    'pinch_hint': 'Pinch or double-tap to zoom',
    'got_it': 'Got it',
    'add_account': 'Add account',
    'video_error': 'Could not play this video',

    # 1 · privacy
    'privacy_kicker': '100% private',
    'privacy_title': 'Your data stays with you',
    'privacy_subtitle': 'We never access your messages, contacts or media. Everything runs on your phone, inside your own account — nothing is sent to us.',
    'privacy_device_title': 'Runs on your phone',
    'privacy_device_desc': 'Your messages and media never leave this device.',
    'privacy_tracking_title': 'No sign-up, no tracking',
    'privacy_tracking_desc': 'We never ask for an account and never build a profile on you.',
    'privacy_control_title': 'You stay in control',
    'privacy_control_desc': 'Everything happens inside your own account, exactly as you left it.',

    # 2 · features
    'features_kicker': 'Ghost mode',
    'features_title': 'What you can do',
    'features_subtitle': 'Read, watch and save — without ever being seen.',
    'feature_ticks': 'Read without blue ticks',
    'feature_hidden': 'Stay hidden',
    'feature_status_secret': 'Watch statuses secretly',
    'feature_status_download': 'Download statuses',
    'feature_status_deleted': 'Recover deleted statuses',
    'feature_deleted': 'Recover deleted messages',
    'feature_edited': 'See edited messages',
    'feature_view_once': 'Unlock view-once media',

    # 3 · connect
    'connect_kicker': 'Step 1',
    'connect_title': 'Connect your account',
    'connect_subtitle': 'Choose how to link your account.',
    'connect_qr_title': 'Account on another phone',
    'connect_qr_desc': 'Scan the QR code on the screen with that phone.',
    'connect_phone_title': 'Account on this phone',
    'connect_phone_desc': 'Tap “Log in with phone number” and follow the steps.',

    # 4 · statuses
    'status_kicker': 'Step 2',
    'status_title': 'Save statuses',
    'status_subtitle': 'Open the Statuses tab, then save any photo or video to your gallery.',
    'status_tab_title': 'Go to the Statuses tab',
    'status_tab_desc': 'Tap the Statuses tab to see all statuses.',
    'status_save_title': 'Open a status and save it',
    'status_save_desc': 'Open any status, then tap the “Save to gallery” button that appears.',

    # 5 · toolbar
    'toolbar_kicker': 'Step 3',
    'toolbar_title': 'The toolbar icons',
    'toolbar_subtitle': 'These buttons appear at the top of the chat screen.',
    'toolbar_lock_title': 'Lock / unlock keyboard',
    'toolbar_lock_desc': 'Lock the keyboard so you never type or send by accident while reading.',
    'toolbar_ghost_title': 'Ghost mode',
    'toolbar_ghost_desc': 'Turn invisible reading on or off. When on, messages are not marked as seen and your last seen stays hidden.',
    'toolbar_saved_title': 'Saved Messages',
    'toolbar_saved_desc': 'Everything the app saved for you: deleted, edited and view-once messages, and deleted statuses.',

    # 6 · ready
    'ready_kicker': 'Ready',
    'ready_title': 'You’re all set',
    'ready_subtitle': 'One last thing worth remembering.',
    'ready_open_title': 'Keep the account open',
    'ready_open_desc': 'Capturing only works while your account is open. Keep it open so nothing is missed.',
    'ready_private_title': 'Private by design',
    'ready_private_desc': 'No account, no tracking, nothing uploaded.',

    # the app's own labels, so the guide's pictures say what the app says
    'continue': 'Continue',
    'view_once': 'View once',
    'save_to_gallery': 'Save to gallery',
    'saved_to_gallery': 'Saved to gallery',
    'journey_title': 'How it works',
}

# Strings the page needs that the app does not have. Written out unchanged, so
# add every language you want translated here.
EXTRA = {
    # ── The home screen: the welcome, the question, the two answers ──
    'home_kicker': {
        'en': "Welcome", 'tr': "Hoş geldiniz", 'de': "Willkommen", 'id': "Selamat datang",
        'es': "Bienvenido", 'pt': "Bem-vindo", 'ar': "أهلًا بك", 'fr': "Bienvenue",
        'ms': "Selamat datang", 'af': "Welkom", 'hi': "स्वागत है",
    },
    # {app} is replaced with the app's name, so the question greets by name.
    'home_title': {
        'en': "What would you like to know about {app}?",
        'tr': "{app} hakkında ne bilmek istersiniz?",
        'de': "Was möchtest du über {app} wissen?",
        'id': "Apa yang ingin Anda ketahui tentang {app}?",
        'es': "¿Qué te gustaría saber sobre {app}?",
        'pt': "O que você gostaria de saber sobre {app}?",
        'ar': "ما الذي تود معرفته عن {app}؟",
        'fr': "Que souhaitez-vous savoir sur {app} ?",
        'ms': "Apa yang anda ingin tahu tentang {app}?",
        'af': "Wat wil jy graag oor {app} weet?",
        'hi': "{app} के बारे में आप क्या जानना चाहते हैं?",
    },
    'home_subtitle': {
        'en': "Pick a topic — it only takes a minute.",
        'tr': "Bir konu seçin — yalnızca bir dakika sürer.",
        'de': "Wähle ein Thema — es dauert nur eine Minute.",
        'id': "Pilih topik — hanya butuh satu menit.",
        'es': "Elige un tema: solo toma un minuto.",
        'pt': "Escolha um tópico — leva só um minuto.",
        'ar': "اختر موضوعًا — لن يستغرق سوى دقيقة.",
        'fr': "Choisissez un sujet — cela ne prend qu'une minute.",
        'ms': "Pilih satu topik — hanya mengambil masa seminit.",
        'af': "Kies 'n onderwerp — dit neem net 'n minuut.",
        'hi': "एक विषय चुनें — इसमें बस एक मिनट लगता है।",
    },
    'home_connect_title': {
        'en': "How to connect my account",
        'tr': "Hesabımı nasıl bağlarım?",
        'de': "Wie verbinde ich mein Konto?",
        'id': "Cara menghubungkan akun saya",
        'es': "Cómo conectar mi cuenta",
        'pt': "Como conectar minha conta",
        'ar': "كيف أربط حسابي؟",
        'fr': "Comment connecter mon compte",
        'ms': "Cara menghubungkan akaun saya",
        'af': "Hoe koppel ek my rekening?",
        'hi': "मेरा खाता कैसे कनेक्ट करें",
    },
    'home_connect_desc': {
        'en': "Link your WhatsApp account, step by step.",
        'tr': "WhatsApp hesabınızı adım adım bağlayın.",
        'de': "Verbinde dein WhatsApp-Konto Schritt für Schritt.",
        'id': "Hubungkan akun WhatsApp Anda, langkah demi langkah.",
        'es': "Vincula tu cuenta de WhatsApp paso a paso.",
        'pt': "Conecte sua conta do WhatsApp passo a passo.",
        'ar': "اربط حساب واتساب خطوة بخطوة.",
        'fr': "Connectez votre compte WhatsApp, étape par étape.",
        'ms': "Hubungkan akaun WhatsApp anda, langkah demi langkah.",
        'af': "Koppel jou WhatsApp-rekening, stap vir stap.",
        'hi': "अपना WhatsApp खाता चरण दर चरण कनेक्ट करें।",
    },

    # ── Which of the two connect flows is theirs ──
    'connect_where_subtitle': {
        'en': "Where is the WhatsApp account you want to connect?",
        'tr': "Bağlamak istediğiniz WhatsApp hesabı nerede?",
        'de': "Wo ist das WhatsApp-Konto, das du verbinden möchtest?",
        'id': "Di mana akun WhatsApp yang ingin Anda hubungkan?",
        'es': "¿Dónde está la cuenta de WhatsApp que quieres conectar?",
        'pt': "Onde está a conta do WhatsApp que você quer conectar?",
        'ar': "أين حساب واتساب الذي تريد ربطه؟",
        'fr': "Où se trouve le compte WhatsApp que vous voulez connecter ?",
        'ms': "Di manakah akaun WhatsApp yang anda mahu hubungkan?",
        'af': "Waar is die WhatsApp-rekening wat jy wil koppel?",
        'hi': "जिस WhatsApp खाते को आप कनेक्ट करना चाहते हैं वह कहाँ है?",
    },
    'connect_here_where': {
        'en': "It is signed in on the phone you are holding.",
        'tr': "Elinizdeki telefonda oturum açılmış.",
        'de': "Es ist auf dem Telefon angemeldet, das du in der Hand hältst.",
        'id': "Akun masuk di ponsel yang Anda pegang.",
        'es': "La sesión está iniciada en este mismo teléfono.",
        'pt': "A conta está conectada neste mesmo telefone.",
        'ar': "الحساب مسجَّل الدخول على الهاتف الذي بين يديك.",
        'fr': "Le compte est connecté sur le téléphone que vous tenez.",
        'ms': "Akaun log masuk pada telefon yang anda pegang.",
        'af': "Dit is aangemeld op die foon in jou hand.",
        'hi': "यह उसी फ़ोन में साइन इन है जो आपके हाथ में है।",
    },
    'connect_other_where': {
        'en': "It is signed in on a different phone.",
        'tr': "Başka bir telefonda oturum açılmış.",
        'de': "Es ist auf einem anderen Telefon angemeldet.",
        'id': "Akun masuk di ponsel lain.",
        'es': "La sesión está iniciada en otro teléfono.",
        'pt': "A conta está conectada em outro telefone.",
        'ar': "الحساب مسجَّل الدخول على هاتف آخر.",
        'fr': "Le compte est connecté sur un autre téléphone.",
        'ms': "Akaun log masuk pada telefon lain.",
        'af': "Dit is op 'n ander foon aangemeld.",
        'hi': "यह किसी दूसरे फ़ोन में साइन इन है।",
    },

    # ── The video card ──
    'watch_video': {
        'en': "Watch the video", 'tr': "Videoyu izleyin", 'de': "Video ansehen",
        'id': "Tonton videonya", 'es': "Ver el video", 'pt': "Assistir ao vídeo",
        'ar': "شاهد الفيديو", 'fr': "Regarder la vidéo", 'ms': "Tonton video",
        'af': "Kyk die video", 'hi': "वीडियो देखें",
    },
    'watch_video_desc': {
        'en': "See every step done on screen.",
        'tr': "Her adımı ekranda görün.",
        'de': "Sieh dir jeden Schritt auf dem Bildschirm an.",
        'id': "Lihat setiap langkah langsung di layar.",
        'es': "Mira cada paso en pantalla.",
        'pt': "Veja cada passo na tela.",
        'ar': "شاهد كل خطوة على الشاشة.",
        'fr': "Voyez chaque étape à l'écran.",
        'ms': "Lihat setiap langkah pada skrin.",
        'af': "Sien elke stap op die skerm.",
        'hi': "हर चरण स्क्रीन पर देखें।",
    },
    'see_how': {
        'en': "See how it works", 'tr': "Nasıl çalıştığını görün", 'de': "So funktioniert es",
        'id': "Lihat cara kerjanya", 'es': "Mira cómo funciona", 'pt': "Veja como funciona",
        'ar': "شاهد كيف يعمل", 'fr': "Voir comment ça marche", 'ms': "Lihat cara ia berfungsi",
        'af': "Sien hoe dit werk", 'hi': "देखें यह कैसे काम करता है",
    },

    # ── The steps, in the words the app itself uses for these buttons ──
    'add_account_desc': {
        'en': "Tap “+ Add”, give the account a name and save.",
        'tr': "“+ Ekle”ye dokunun, hesaba bir ad verin ve kaydedin.",
        'de': "Tippe auf „+ Hinzufügen“, benenne das Konto und speichere es.",
        'id': "Ketuk “+ Tambah”, beri nama akun, lalu simpan.",
        'es': "Toca “+ Añadir”, ponle un nombre a la cuenta y guarda.",
        'pt': "Toque em “+ Adicionar”, dê um nome à conta e salve.",
        'ar': "اضغط على «+ إضافة»، وامنح الحساب اسمًا ثم احفظ.",
        'fr': "Touchez « + Ajouter », donnez un nom au compte et enregistrez.",
        'ms': "Ketik “+ Tambah”, beri nama akaun dan simpan.",
        'af': "Tik “+ Voeg by”, gee die rekening 'n naam en stoor.",
        'hi': "“+ जोड़ें” पर टैप करें, खाते को नाम दें और सेव करें।",
    },
    'wait_title': {
        'en': "Wait a few seconds", 'tr': "Birkaç saniye bekleyin", 'de': "Warte ein paar Sekunden",
        'id': "Tunggu beberapa detik", 'es': "Espera unos segundos", 'pt': "Aguarde alguns segundos",
        'ar': "انتظر بضع ثوانٍ", 'fr': "Patientez quelques secondes", 'ms': "Tunggu beberapa saat",
        'af': "Wag 'n paar sekondes", 'hi': "कुछ सेकंड प्रतीक्षा करें",
    },
    'wait_desc': {
        'en': "Your chats load by themselves. Keep the app open until they do.",
        'tr': "Sohbetleriniz kendiliğinden yüklenir. Yüklenene kadar uygulamayı açık tutun.",
        'de': "Deine Chats laden von selbst. Lass die App so lange geöffnet.",
        'id': "Obrolan Anda dimuat dengan sendirinya. Biarkan aplikasi terbuka sampai selesai.",
        'es': "Tus chats se cargan solos. Mantén la app abierta hasta que terminen.",
        'pt': "Suas conversas carregam sozinhas. Mantenha o app aberto até terminar.",
        'ar': "ستُحمَّل محادثاتك تلقائيًا. أبقِ التطبيق مفتوحًا حتى تنتهي.",
        'fr': "Vos discussions se chargent toutes seules. Gardez l'application ouverte jusqu'à la fin.",
        'ms': "Perbualan anda dimuatkan dengan sendirinya. Biarkan aplikasi terbuka sehingga selesai.",
        'af': "Jou geselse laai vanself. Hou die app oop totdat hulle klaar is.",
        'hi': "आपकी चैट अपने आप लोड हो जाती हैं। तब तक ऐप खुला रखें।",
    },
    'other_open_title': {
        'en': "Open WhatsApp on the other phone",
        'tr': "Diğer telefonda WhatsApp'ı açın",
        'de': "Öffne WhatsApp auf dem anderen Telefon",
        'id': "Buka WhatsApp di ponsel yang satunya",
        'es': "Abre WhatsApp en el otro teléfono",
        'pt': "Abra o WhatsApp no outro telefone",
        'ar': "افتح واتساب على الهاتف الآخر",
        'fr': "Ouvrez WhatsApp sur l'autre téléphone",
        'ms': "Buka WhatsApp pada telefon yang satu lagi",
        'af': "Maak WhatsApp op die ander foon oop",
        'hi': "दूसरे फ़ोन में WhatsApp खोलें",
    },
    'other_open_desc': {
        'en': "Open Settings › Linked Devices and tap “Link a Device”.",
        'tr': "Ayarlar › Bağlı Cihazlar'ı açın ve “Cihaz Bağla”ya dokunun.",
        'de': "Öffne Einstellungen › Verknüpfte Geräte und tippe auf „Gerät verknüpfen“.",
        'id': "Buka Setelan › Perangkat Tertaut, lalu ketuk “Tautkan Perangkat”.",
        'es': "Abre Ajustes › Dispositivos vinculados y toca “Vincular un dispositivo”.",
        'pt': "Abra Configurações › Aparelhos conectados e toque em “Conectar um aparelho”.",
        'ar': "افتح الإعدادات › الأجهزة المرتبطة واضغط على «ربط جهاز».",
        'fr': "Ouvrez Réglages › Appareils connectés et touchez « Associer un appareil ».",
        'ms': "Buka Tetapan › Peranti Terpaut dan ketik “Pautkan Peranti”.",
        'af': "Maak Instellings › Gekoppelde toestelle oop en tik “Koppel 'n toestel”.",
        'hi': "सेटिंग्स › लिंक्ड डिवाइस खोलें और “डिवाइस लिंक करें” पर टैप करें।",
    },
    'other_scan_title': {
        'en': "Scan the QR code", 'tr': "QR kodunu tarayın", 'de': "QR-Code scannen",
        'id': "Pindai kode QR", 'es': "Escanea el código QR", 'pt': "Escaneie o código QR",
        'ar': "امسح رمز QR", 'fr': "Scannez le code QR", 'ms': "Imbas kod QR",
        'af': "Skandeer die QR-kode", 'hi': "QR कोड स्कैन करें",
    },
    'other_scan_desc': {
        'en': "Point that phone at the QR code shown on this screen.",
        'tr': "O telefonu bu ekrandaki QR koduna doğrultun.",
        'de': "Richte das andere Telefon auf den QR-Code auf diesem Bildschirm.",
        'id': "Arahkan ponsel itu ke kode QR di layar ini.",
        'es': "Apunta ese teléfono al código QR de esta pantalla.",
        'pt': "Aponte aquele telefone para o código QR desta tela.",
        'ar': "وجّه ذلك الهاتف نحو رمز QR الظاهر على هذه الشاشة.",
        'fr': "Dirigez cet autre téléphone vers le code QR affiché à l'écran.",
        'ms': "Halakan telefon itu ke kod QR pada skrin ini.",
        'af': "Rig daardie foon op die QR-kode op hierdie skerm.",
        'hi': "उस फ़ोन को इस स्क्रीन पर दिख रहे QR कोड की ओर रखें।",
    },

    # ── Connecting on this phone, one picture per step ──
    # One short sentence each, under a screenshot that already points at the
    # button. WhatsApp's own labels are quoted the way the app's link-code
    # sheet quotes them ('Tap "Link a Device"…' in lib/config/translate).
    'here_steps_subtitle': {
        'en': "Follow the pictures, one step at a time.",
        'tr': "Resimleri adım adım takip edin.",
        'de': "Folge den Bildern, Schritt für Schritt.",
        'id': "Ikuti gambar-gambar ini, langkah demi langkah.",
        'es': "Sigue las imágenes, paso a paso.",
        'pt': "Siga as imagens, passo a passo.",
        'ar': "اتبع الصور خطوة بخطوة.",
        'fr': "Suivez les images, étape par étape.",
        'ms': "Ikuti gambar-gambar ini, langkah demi langkah.",
        'af': "Volg die prente, stap vir stap.",
        'hi': "तस्वीरों के साथ एक-एक चरण पूरा करें।",
    },
    'step_open_app': {
        'en': "Open {app}.",
        'tr': "{app} uygulamasını açın.",
        'de': "Öffne {app}.",
        'id': "Buka {app}.",
        'es': "Abre {app}.",
        'pt': "Abra o {app}.",
        'ar': "افتح {app}.",
        'fr': "Ouvrez {app}.",
        'ms': "Buka {app}.",
        'af': "Maak {app} oop.",
        'hi': "{app} खोलें।",
    },
    'step_name_account': {
        'en': "Tap “+ Add”, type a name and tap Save.",
        'tr': "“+ Ekle”ye dokunun, bir ad yazın ve Kaydet'e dokunun.",
        'de': "Tippe auf „+ Hinzufügen“, gib einen Namen ein und tippe auf Speichern.",
        'id': "Ketuk “+ Tambah”, ketik nama, lalu ketuk Simpan.",
        'es': "Toca “+ Añadir”, escribe un nombre y toca Guardar.",
        'pt': "Toque em “+ Adicionar”, digite um nome e toque em Salvar.",
        'ar': "اضغط على «+ إضافة»، واكتب اسمًا ثم اضغط على حفظ.",
        'fr': "Touchez « + Ajouter », saisissez un nom et touchez Enregistrer.",
        'ms': "Ketik “+ Tambah”, taip nama dan ketik Simpan.",
        'af': "Tik “+ Voeg by”, tik ’n naam in en tik Stoor.",
        'hi': "“+ जोड़ें” पर टैप करें, कोई नाम लिखें और सहेजें पर टैप करें।",
    },
    'step_log_in_with_number': {
        'en': "Tap “Log in with phone number” at the bottom.",
        'tr': "Alttaki “Telefon numarası kullanarak giriş yapın” bağlantısına dokunun.",
        'de': "Tippe unten auf „Mit Telefonnummer anmelden“.",
        'id': "Ketuk “Masuk dengan nomor telepon” di bagian bawah.",
        'es': "Toca “Iniciar sesión con número de teléfono” abajo.",
        'pt': "Toque em “Entrar com número de telefone”, lá embaixo.",
        'ar': "اضغط على «تسجيل الدخول برقم الهاتف» في الأسفل.",
        'fr': "Touchez « Se connecter avec un numéro de téléphone » en bas.",
        'ms': "Ketik “Log masuk dengan nombor telefon” di bahagian bawah.",
        'af': "Tik “Meld aan met foonnommer” onderaan.",
        'hi': "नीचे “फ़ोन नंबर से लॉग इन करें” पर टैप करें।",
    },
    'step_enter_number': {
        'en': "Choose your country, type your number and tap Next.",
        'tr': "Ülkenizi seçin, numaranızı yazın ve İleri'ye dokunun.",
        'de': "Wähle dein Land, gib deine Nummer ein und tippe auf Weiter.",
        'id': "Pilih negara Anda, ketik nomor Anda, lalu ketuk Berikutnya.",
        'es': "Elige tu país, escribe tu número y toca Siguiente.",
        'pt': "Escolha seu país, digite seu número e toque em Avançar.",
        'ar': "اختر بلدك، واكتب رقمك ثم اضغط على التالي.",
        'fr': "Choisissez votre pays, saisissez votre numéro et touchez Suivant.",
        'ms': "Pilih negara anda, taip nombor anda dan ketik Seterusnya.",
        'af': "Kies jou land, tik jou nommer in en tik Volgende.",
        'hi': "अपना देश चुनें, अपना नंबर लिखें और आगे पर टैप करें।",
    },
    'step_code_copied': {
        'en': "Your code is ready and already copied. Tap “Open WhatsApp”.",
        'tr': "Kodunuz hazır ve kopyalandı. “WhatsApp'ı açın” düğmesine dokunun.",
        'de': "Dein Code ist fertig und schon kopiert. Tippe auf „WhatsApp öffnen“.",
        'id': "Kode Anda sudah siap dan tersalin. Ketuk “Buka WhatsApp”.",
        'es': "Tu código está listo y ya copiado. Toca “Abrir WhatsApp”.",
        'pt': "Seu código está pronto e já copiado. Toque em “Abrir o WhatsApp”.",
        'ar': "رمزك جاهز ومنسوخ بالفعل. اضغط على «افتح واتساب».",
        'fr': "Votre code est prêt et déjà copié. Touchez « Ouvrir WhatsApp ».",
        'ms': "Kod anda sudah sedia dan disalin. Ketik “Buka WhatsApp”.",
        'af': "Jou kode is gereed en reeds gekopieer. Tik “Maak WhatsApp oop”.",
        'hi': "आपका कोड तैयार है और कॉपी हो चुका है। “WhatsApp खोलें” पर टैप करें।",
    },
    'step_open_whatsapp': {
        'en': "Open WhatsApp — your code stays on the screen.",
        'tr': "WhatsApp'ı açın — kodunuz ekranda kalır.",
        'de': "Öffne WhatsApp — dein Code bleibt auf dem Bildschirm.",
        'id': "Buka WhatsApp — kode Anda tetap tampil di layar.",
        'es': "Abre WhatsApp: tu código se queda en la pantalla.",
        'pt': "Abra o WhatsApp — seu código fica na tela.",
        'ar': "افتح واتساب — سيبقى رمزك ظاهرًا على الشاشة.",
        'fr': "Ouvrez WhatsApp — votre code reste affiché à l'écran.",
        'ms': "Buka WhatsApp — kod anda kekal pada skrin.",
        'af': "Maak WhatsApp oop — jou kode bly op die skerm.",
        'hi': "WhatsApp खोलें — आपका कोड स्क्रीन पर ही रहेगा।",
    },
    # The one step the two phones do differently. On iOS the tab is WhatsApp's
    # "You", whose label we cannot quote in every language — its icon, the
    # user's own photo, reads the same in all of them.
    'step_linked_devices_android': {
        'en': "Tap ⋮ at the top, then “Linked devices”.",
        'tr': "Üstteki ⋮ simgesine, ardından “Bağlı Cihazlar”a dokunun.",
        'de': "Tippe oben auf ⋮ und dann auf „Verknüpfte Geräte“.",
        'id': "Ketuk ⋮ di bagian atas, lalu “Perangkat Tertaut”.",
        'es': "Toca ⋮ arriba y luego “Dispositivos vinculados”.",
        'pt': "Toque em ⋮ no topo e depois em “Aparelhos conectados”.",
        'ar': "اضغط على ⋮ في الأعلى، ثم على «الأجهزة المرتبطة».",
        'fr': "Touchez ⋮ en haut, puis « Appareils connectés ».",
        'ms': "Ketik ⋮ di bahagian atas, kemudian “Peranti Terpaut”.",
        'af': "Tik ⋮ bo-aan en dan “Gekoppelde toestelle”.",
        'hi': "ऊपर ⋮ पर टैप करें, फिर “लिंक्ड डिवाइस” पर।",
    },
    'step_linked_devices_ios': {
        'en': "Tap your profile photo at the bottom, then “Linked devices”.",
        'tr': "Alttaki profil fotoğrafınıza, ardından “Bağlı Cihazlar”a dokunun.",
        'de': "Tippe unten auf dein Profilbild und dann auf „Verknüpfte Geräte“.",
        'id': "Ketuk foto profil Anda di bagian bawah, lalu “Perangkat Tertaut”.",
        'es': "Toca tu foto de perfil abajo y luego “Dispositivos vinculados”.",
        'pt': "Toque na sua foto de perfil embaixo e depois em “Aparelhos conectados”.",
        'ar': "اضغط على صورتك الشخصية في الأسفل، ثم على «الأجهزة المرتبطة».",
        'fr': "Touchez votre photo de profil en bas, puis « Appareils connectés ».",
        'ms': "Ketik foto profil anda di bahagian bawah, kemudian “Peranti Terpaut”.",
        'af': "Tik jou profielfoto onderaan en dan “Gekoppelde toestelle”.",
        'hi': "नीचे अपनी प्रोफ़ाइल फ़ोटो पर टैप करें, फिर “लिंक्ड डिवाइस” पर।",
    },
    'step_link_a_device': {
        'en': "Tap “Link a device”.",
        'tr': "“Cihaz Bağla”ya dokunun.",
        'de': "Tippe auf „Gerät verknüpfen“.",
        'id': "Ketuk “Tautkan Perangkat”.",
        'es': "Toca “Vincular un dispositivo”.",
        'pt': "Toque em “Conectar um aparelho”.",
        'ar': "اضغط على «ربط جهاز».",
        'fr': "Touchez « Associer un appareil ».",
        'ms': "Ketik “Pautkan Peranti”.",
        'af': "Tik “Koppel ’n toestel”.",
        'hi': "“डिवाइस लिंक करें” पर टैप करें।",
    },
    'step_link_with_number': {
        'en': "The camera opens. Tap “Link with phone number instead” at the bottom.",
        'tr': "Kamera açılır. Alttaki “Bunun yerine telefon numarasıyla bağla” seçeneğine dokunun.",
        'de': "Die Kamera öffnet sich. Tippe unten auf „Stattdessen mit Telefonnummer verknüpfen“.",
        'id': "Kamera akan terbuka. Ketuk “Tautkan dengan nomor telepon” di bagian bawah.",
        'es': "Se abre la cámara. Toca “Vincular con número de teléfono” abajo.",
        'pt': "A câmera abre. Toque em “Conectar com número de telefone” embaixo.",
        'ar': "ستفتح الكاميرا. اضغط على «الربط برقم الهاتف بدلاً من ذلك» في الأسفل.",
        'fr': "L'appareil photo s'ouvre. Touchez « Associer avec un numéro de téléphone » en bas.",
        'ms': "Kamera akan terbuka. Ketik “Pautkan dengan nombor telefon” di bahagian bawah.",
        'af': "Die kamera maak oop. Tik “Koppel eerder met foonnommer” onderaan.",
        'hi': "कैमरा खुलेगा। नीचे “इसके बजाय फ़ोन नंबर से लिंक करें” पर टैप करें।",
    },
    'step_paste_code': {
        'en': "Hold down the code boxes and tap Paste, or type the code.",
        'tr': "Kod kutularına basılı tutup Yapıştır'a dokunun ya da kodu yazın.",
        'de': "Halte die Code-Felder gedrückt und tippe auf Einfügen — oder gib den Code ein.",
        'id': "Tekan lama kotak kode lalu ketuk Tempel, atau ketik kodenya.",
        'es': "Mantén pulsadas las casillas del código y toca Pegar, o escribe el código.",
        'pt': "Pressione as caixas do código e toque em Colar, ou digite o código.",
        'ar': "اضغط مطولاً على خانات الرمز ثم اختر لصق، أو اكتب الرمز.",
        'fr': "Maintenez les cases du code et touchez Coller, ou saisissez le code.",
        'ms': "Tekan lama kotak kod dan ketik Tampal, atau taip kod itu.",
        'af': "Hou die kodeblokkies in en tik Plak, of tik die kode in.",
        'hi': "कोड बॉक्स को दबाकर रखें और पेस्ट पर टैप करें, या कोड लिख दें।",
    },
    'step_connected': {
        'en': "You're connected! The first time, your chats take a little while to load.",
        'tr': "Bağlandınız! İlk seferde sohbetlerinizin yüklenmesi biraz zaman alır.",
        'de': "Du bist verbunden! Beim ersten Mal dauert es etwas, bis deine Chats geladen sind.",
        'id': "Anda sudah terhubung! Pertama kali, obrolan Anda butuh sedikit waktu untuk dimuat.",
        'es': "¡Ya estás conectado! La primera vez, tus chats tardan un poco en cargar.",
        'pt': "Pronto, você está conectado! Na primeira vez, suas conversas levam um tempinho para carregar.",
        'ar': "تم الربط! في المرة الأولى تحتاج محادثاتك بعض الوقت لتظهر.",
        'fr': "Vous êtes connecté ! La première fois, vos discussions mettent un peu de temps à se charger.",
        'ms': "Anda sudah bersambung! Kali pertama, perbualan anda mengambil sedikit masa untuk dimuatkan.",
        'af': "Jy is gekoppel! Die eerste keer neem dit ’n rukkie vir jou geselse om te laai.",
        'hi': "आप कनेक्ट हो गए! पहली बार आपकी चैट लोड होने में थोड़ा समय लगता है।",
    },

    # ── The start: the promise, and each thing the app does ──
    'hero_title': {
        'en': "Never miss a message again",
        'tr': "Hiçbir mesajı kaçırmayın",
        'de': "Verpasse nie wieder eine Nachricht",
        'id': "Jangan pernah lewatkan pesan lagi",
        'es': "No vuelvas a perderte ningún mensaje",
        'pt': "Nunca mais perca uma mensagem",
        'ar': "لن تفوتك أي رسالة بعد اليوم",
        'fr': "Ne manquez plus jamais un message",
        'ms': "Jangan terlepas mesej lagi",
        'af': "Moet nooit weer ’n boodskap mis nie",
        'hi': "अब कोई भी संदेश न छूटे",
    },
    'hero_subtitle': {
        'en': "Recover deleted messages, see view-once photos and videos again, and save statuses — all automatically.",
        'tr': "Silinen mesajları kurtarın, tek görüntülük fotoğraf ve videoları yeniden görün, durumları kaydedin — hepsi otomatik.",
        'de': "Stelle gelöschte Nachrichten wieder her, sieh dir Einmalansicht-Fotos und -Videos erneut an und speichere Status — ganz automatisch.",
        'id': "Pulihkan pesan yang dihapus, lihat lagi foto dan video sekali lihat, dan simpan status — semuanya otomatis.",
        'es': "Recupera mensajes eliminados, vuelve a ver fotos y videos de una sola vez y guarda estados, todo de forma automática.",
        'pt': "Recupere mensagens apagadas, veja de novo fotos e vídeos de visualização única e salve status — tudo automaticamente.",
        'ar': "استرجع الرسائل المحذوفة، وشاهد صور وفيديوهات العرض مرة واحدة من جديد، واحفظ الحالات — كل ذلك تلقائيًا.",
        'fr': "Récupérez les messages supprimés, revoyez les photos et vidéos à vue unique et enregistrez les statuts — automatiquement.",
        'ms': "Pulihkan mesej dipadam, lihat semula foto dan video lihat sekali, dan simpan status — semuanya secara automatik.",
        'af': "Herwin verwyderde boodskappe, sien eenmalige foto’s en video’s weer en stoor statusse — alles outomaties.",
        'hi': "हटाए गए संदेश वापस पाएं, एक बार देखे जाने वाली फ़ोटो और वीडियो फिर से देखें, और स्टेटस सहेजें — सब अपने आप।",
    },
    # With the extra features off (?full=0) the start only welcomes and connects.
    'hero_title_lite': {
        'en': "Welcome to {app}",
        'tr': "{app} uygulamasına hoş geldiniz",
        'de': "Willkommen bei {app}",
        'id': "Selamat datang di {app}",
        'es': "Te damos la bienvenida a {app}",
        'pt': "Boas-vindas ao {app}",
        'ar': "مرحبًا بك في {app}",
        'fr': "Bienvenue dans {app}",
        'ms': "Selamat datang ke {app}",
        'af': "Welkom by {app}",
        'hi': "{app} में आपका स्वागत है",
    },
    'hero_subtitle_lite': {
        'en': "Connect your WhatsApp account in about a minute. Here is how.",
        'tr': "WhatsApp hesabınızı yaklaşık bir dakikada bağlayın. İşte nasıl yapılacağı.",
        'de': "Verbinde dein WhatsApp-Konto in etwa einer Minute. So geht’s.",
        'id': "Hubungkan akun WhatsApp Anda dalam sekitar satu menit. Begini caranya.",
        'es': "Conecta tu cuenta de WhatsApp en un minuto. Así se hace.",
        'pt': "Conecte sua conta do WhatsApp em cerca de um minuto. Veja como.",
        'ar': "اربط حساب واتساب في دقيقة تقريبًا. إليك الطريقة.",
        'fr': "Connectez votre compte WhatsApp en une minute environ. Voici comment.",
        'ms': "Hubungkan akaun WhatsApp anda dalam kira-kira seminit. Begini caranya.",
        'af': "Koppel jou WhatsApp-rekening in omtrent ’n minuut. Só werk dit.",
        'hi': "लगभग एक मिनट में अपना WhatsApp खाता कनेक्ट करें। तरीका यह है।",
    },
    'show_deleted_desc': {
        'en': "Read a message even after the sender deletes it.",
        'tr': "Gönderen silse bile mesajı okuyun.",
        'de': "Lies eine Nachricht, auch wenn der Absender sie gelöscht hat.",
        'id': "Baca pesan meski pengirim sudah menghapusnya.",
        'es': "Lee un mensaje aunque quien lo envió lo haya eliminado.",
        'pt': "Leia a mensagem mesmo depois que quem enviou a apagar.",
        'ar': "اقرأ الرسالة حتى بعد أن يحذفها المرسل.",
        'fr': "Lisez un message même après sa suppression par l’expéditeur.",
        'ms': "Baca mesej walaupun selepas pengirim memadamnya.",
        'af': "Lees ’n boodskap selfs nadat die sender dit verwyder het.",
        'hi': "भेजने वाले के हटाने के बाद भी संदेश पढ़ें।",
    },
    'show_view_once_title': {
        'en': "See view-once media again",
        'tr': "Tek görüntülük medyayı yeniden görün",
        'de': "Einmalansicht-Medien erneut ansehen",
        'id': "Lihat lagi media sekali lihat",
        'es': "Vuelve a ver contenido de una sola vez",
        'pt': "Veja de novo mídias de visualização única",
        'ar': "شاهد وسائط العرض مرة واحدة مجددًا",
        'fr': "Revoyez les médias à vue unique",
        'ms': "Lihat semula media lihat sekali",
        'af': "Sien eenmalige media weer",
        'hi': "एक बार देखे जाने वाला मीडिया फिर से देखें",
    },
    'show_view_once_desc': {
        'en': "View-once photos and videos are kept, so you can open them as often as you like.",
        'tr': "Tek görüntülük fotoğraf ve videolar saklanır; istediğiniz kadar açabilirsiniz.",
        'de': "Einmalansicht-Fotos und -Videos werden aufbewahrt — öffne sie, so oft du willst.",
        'id': "Foto dan video sekali lihat disimpan, jadi Anda bisa membukanya sesering yang Anda mau.",
        'es': "Las fotos y videos de una sola vez se guardan para que los abras las veces que quieras.",
        'pt': "Fotos e vídeos de visualização única ficam guardados para você abrir quantas vezes quiser.",
        'ar': "تُحفظ صور وفيديوهات العرض مرة واحدة، فتفتحها كلما أردت.",
        'fr': "Les photos et vidéos à vue unique sont conservées : ouvrez-les autant de fois que vous voulez.",
        'ms': "Foto dan video lihat sekali disimpan, jadi anda boleh membukanya sekerap yang anda mahu.",
        'af': "Eenmalige foto’s en video’s word gehou, sodat jy dit so dikwels as wat jy wil kan oopmaak.",
        'hi': "एक बार देखे जाने वाली फ़ोटो और वीडियो सहेज लिए जाते हैं, ताकि आप उन्हें जितनी बार चाहें खोल सकें।",
    },
    'show_status_desc': {
        'en': "Save any photo or video status to your gallery in one tap.",
        'tr': "Herhangi bir fotoğraf veya video durumunu tek dokunuşla galerinize kaydedin.",
        'de': "Speichere jeden Foto- oder Video-Status mit einem Tippen in deiner Galerie.",
        'id': "Simpan status foto atau video apa pun ke galeri dengan sekali ketuk.",
        'es': "Guarda cualquier estado de foto o video en tu galería con un toque.",
        'pt': "Salve qualquer status de foto ou vídeo na sua galeria com um toque.",
        'ar': "احفظ أي حالة صورة أو فيديو في معرضك بلمسة واحدة.",
        'fr': "Enregistrez n’importe quel statut photo ou vidéo dans votre galerie en un geste.",
        'ms': "Simpan sebarang status foto atau video ke galeri anda dengan satu ketikan.",
        'af': "Stoor enige foto- of videostatus met een tik in jou galery.",
        'hi': "किसी भी फ़ोटो या वीडियो स्टेटस को एक टैप में अपनी गैलरी में सहेजें।",
    },
    'show_ticks_desc': {
        'en': "With Ghost mode on, reading a message does not send blue ticks.",
        'tr': "Hayalet modu açıkken bir mesajı okumak mavi tik göndermez.",
        'de': "Mit aktivem Geistermodus sendet das Lesen einer Nachricht keine blauen Häkchen.",
        'id': "Saat Mode hantu aktif, membaca pesan tidak mengirim centang biru.",
        'es': "Con el Modo fantasma activado, leer un mensaje no envía el doble check azul.",
        'pt': "Com o Modo fantasma ativado, ler uma mensagem não envia o tique azul.",
        'ar': "عند تفعيل وضع الشبح، لا تُرسل قراءة الرسالة العلامات الزرقاء.",
        'fr': "Avec le Mode fantôme activé, lire un message n’envoie pas de coches bleues.",
        'ms': "Apabila Mod hantu dihidupkan, membaca mesej tidak menghantar tanda biru.",
        'af': "Met Spookmodus aan stuur die lees van ’n boodskap nie blou merkies nie.",
        'hi': "घोस्ट मोड चालू होने पर संदेश पढ़ने से ब्लू टिक नहीं जाते।",
    },

    # ── Drawn into the pictures, next to the real chat screenshots ──
    'demo_deleted_text': {
        'en': "Running late, see you at 8 🙂",
        'tr': "Biraz gecikiyorum, 8’de görüşürüz 🙂",
        'de': "Bin etwas spät dran, bis um 8 🙂",
        'id': "Agak telat, sampai jumpa jam 8 🙂",
        'es': "Voy un poco tarde, nos vemos a las 8 🙂",
        'pt': "Vou me atrasar, te vejo às 8 🙂",
        'ar': "سأتأخر قليلًا، أراك الساعة 8 🙂",
        'fr': "Je suis en retard, on se voit à 20 h 🙂",
        'ms': "Lambat sikit, jumpa pukul 8 🙂",
        'af': "Ek is bietjie laat, sien jou om 8 🙂",
        'hi': "थोड़ी देर हो जाएगी, 8 बजे मिलते हैं 🙂",
    },
    'demo_recovered': {
        'en': "Recovered", 'tr': "Kurtarıldı", 'de': "Wiederhergestellt", 'id': "Dipulihkan",
        'es': "Recuperado", 'pt': "Recuperada", 'ar': "تم الاسترجاع", 'fr': "Récupéré",
        'ms': "Dipulihkan", 'af': "Herwin", 'hi': "वापस मिला",
    },
    'demo_view_again': {
        'en': "View again", 'tr': "Yeniden gör", 'de': "Erneut ansehen", 'id': "Lihat lagi",
        'es': "Ver de nuevo", 'pt': "Ver de novo", 'ar': "شاهد مجددًا", 'fr': "Revoir",
        'ms': "Lihat semula", 'af': "Kyk weer", 'hi': "फिर से देखें",
    },

    # ── How it works, in three steps ──
    'journey_connect_desc': {
        'en': "Link it once through WhatsApp’s Linked devices, just like WhatsApp Web.",
        'tr': "WhatsApp Web’de olduğu gibi, WhatsApp’ın Bağlı Cihazlar özelliğiyle bir kez bağlayın.",
        'de': "Verknüpfe es einmal über „Verknüpfte Geräte“ in WhatsApp — genau wie WhatsApp Web.",
        'id': "Tautkan sekali melalui Perangkat Tertaut di WhatsApp, sama seperti WhatsApp Web.",
        'es': "Vincúlala una vez con Dispositivos vinculados de WhatsApp, igual que WhatsApp Web.",
        'pt': "Conecte uma vez pelos Aparelhos conectados do WhatsApp, igual ao WhatsApp Web.",
        'ar': "اربطه مرة واحدة عبر «الأجهزة المرتبطة» في واتساب، تمامًا مثل واتساب ويب.",
        'fr': "Associez-le une fois via Appareils connectés de WhatsApp, comme WhatsApp Web.",
        'ms': "Pautkan sekali melalui Peranti Terpaut WhatsApp, sama seperti WhatsApp Web.",
        'af': "Koppel dit een keer deur WhatsApp se Gekoppelde toestelle, net soos WhatsApp Web.",
        'hi': "WhatsApp Web की तरह, WhatsApp के लिंक्ड डिवाइस से इसे एक बार लिंक करें।",
    },
    'saved_open_title': {
        'en': "Open Saved Messages",
        'tr': "Kayıtlı Mesajlar’ı açın",
        'de': "Öffne Gespeicherte Nachrichten",
        'id': "Buka Pesan Tersimpan",
        'es': "Abre Mensajes guardados",
        'pt': "Abra Mensagens salvas",
        'ar': "افتح الرسائل المحفوظة",
        'fr': "Ouvrez Messages enregistrés",
        'ms': "Buka Mesej Disimpan",
        'af': "Maak Gestoorde Boodskappe oop",
        'hi': "सहेजे गए संदेश खोलें",
    },
    'saved_open_desc': {
        'en': "Deleted, edited and view-once messages wait for you there.",
        'tr': "Silinen, düzenlenen ve tek görüntülük mesajlar sizi orada bekler.",
        'de': "Gelöschte, bearbeitete und Einmalansicht-Nachrichten warten dort auf dich.",
        'id': "Pesan yang dihapus, diedit, dan sekali lihat menunggu Anda di sana.",
        'es': "Allí te esperan los mensajes eliminados, editados y de una sola vez.",
        'pt': "Mensagens apagadas, editadas e de visualização única esperam por você lá.",
        'ar': "تنتظرك هناك الرسائل المحذوفة والمعدّلة ورسائل العرض مرة واحدة.",
        'fr': "Les messages supprimés, modifiés et à vue unique vous y attendent.",
        'ms': "Mesej dipadam, disunting dan lihat sekali menanti anda di sana.",
        'af': "Verwyderde, geredigeerde en eenmalige boodskappe wag daar vir jou.",
        'hi': "हटाए गए, संपादित और एक बार देखे जाने वाले संदेश वहाँ आपका इंतज़ार करते हैं।",
    },
    # Quotes the app's own button labels ('Saved Messages', 'Messages').
    'saved_where_desc': {
        'en': "Tap “Saved Messages” at the top of a chat, or “Messages” under your account.",
        'tr': "Sohbetin üstündeki “Kayıtlı Mesajlar”a ya da hesabınızın altındaki “Mesajlar”a dokunun.",
        'de': "Tippe oben im Chat auf „Gespeicherte Nachrichten“ oder unter deinem Konto auf „Nachrichten“.",
        'id': "Ketuk “Pesan Tersimpan” di bagian atas obrolan, atau “Pesan” di bawah akun Anda.",
        'es': "Toca “Mensajes guardados” arriba en el chat, o “Mensajes” debajo de tu cuenta.",
        'pt': "Toque em “Mensagens salvas” no topo da conversa ou em “Mensagens” abaixo da sua conta.",
        'ar': "اضغط على «الرسائل المحفوظة» أعلى الدردشة، أو على «الرسائل» أسفل حسابك.",
        'fr': "Touchez « Messages enregistrés » en haut d’une discussion, ou « Messages » sous votre compte.",
        'ms': "Ketik “Mesej Disimpan” di bahagian atas sembang, atau “Mesej” di bawah akaun anda.",
        'af': "Tik “Gestoorde Boodskappe” bo-aan ’n klets, of “Boodskappe” onder jou rekening.",
        'hi': "चैट के ऊपर “सहेजे गए संदेश” पर टैप करें, या अपने खाते के नीचे “संदेश” पर।",
    },
    'saved_view_title': {
        'en': "Open them as often as you like",
        'tr': "İstediğiniz kadar açın",
        'de': "Öffne sie, so oft du willst",
        'id': "Buka sesering yang Anda mau",
        'es': "Ábrelos las veces que quieras",
        'pt': "Abra quantas vezes quiser",
        'ar': "افتحها كلما أردت",
        'fr': "Ouvrez-les autant de fois que vous voulez",
        'ms': "Buka sekerap yang anda mahu",
        'af': "Maak dit so dikwels oop as wat jy wil",
        'hi': "जितनी बार चाहें खोलें",
    },
    'saved_view_desc': {
        'en': "Filter by type, then tap any message to open it.",
        'tr': "Türe göre filtreleyin, ardından açmak için herhangi bir mesaja dokunun.",
        'de': "Filtere nach Art und tippe dann auf eine Nachricht, um sie zu öffnen.",
        'id': "Saring berdasarkan jenis, lalu ketuk pesan mana pun untuk membukanya.",
        'es': "Filtra por tipo y toca cualquier mensaje para abrirlo.",
        'pt': "Filtre por tipo e toque em qualquer mensagem para abrir.",
        'ar': "صفِّ حسب النوع، ثم اضغط على أي رسالة لفتحها.",
        'fr': "Filtrez par type, puis touchez un message pour l’ouvrir.",
        'ms': "Tapis mengikut jenis, kemudian ketik mana-mana mesej untuk membukanya.",
        'af': "Filtreer volgens soort en tik dan op enige boodskap om dit oop te maak.",
        'hi': "प्रकार के अनुसार फ़िल्टर करें, फिर किसी भी संदेश को खोलने के लिए उस पर टैप करें।",
    },

    # ── Why it is safe. Only what is true of the app: it links like WhatsApp
    #    Web, never asks for the SMS code, and keeps captures on the phone. ──
    'trust_title': {
        'en': "Safe and private", 'tr': "Güvenli ve gizli", 'de': "Sicher und privat",
        'id': "Aman dan pribadi", 'es': "Seguro y privado", 'pt': "Seguro e privado",
        'ar': "آمن وخاص", 'fr': "Sûr et privé", 'ms': "Selamat dan peribadi",
        'af': "Veilig en privaat", 'hi': "सुरक्षित और निजी",
    },
    'trust_official_title': {
        'en': "Works like WhatsApp Web",
        'tr': "WhatsApp Web gibi çalışır",
        'de': "Funktioniert wie WhatsApp Web",
        'id': "Bekerja seperti WhatsApp Web",
        'es': "Funciona como WhatsApp Web",
        'pt': "Funciona como o WhatsApp Web",
        'ar': "يعمل مثل واتساب ويب",
        'fr': "Fonctionne comme WhatsApp Web",
        'ms': "Berfungsi seperti WhatsApp Web",
        'af': "Werk soos WhatsApp Web",
        'hi': "WhatsApp Web की तरह काम करता है",
    },
    'trust_official_desc': {
        'en': "It connects through Linked devices, WhatsApp’s own feature. We never ask for your SMS code.",
        'tr': "WhatsApp’ın kendi özelliği olan Bağlı Cihazlar üzerinden bağlanır. SMS kodunuzu asla istemeyiz.",
        'de': "Die Verbindung läuft über „Verknüpfte Geräte“, eine Funktion von WhatsApp selbst. Wir fragen nie nach deinem SMS-Code.",
        'id': "Terhubung melalui Perangkat Tertaut, fitur milik WhatsApp sendiri. Kami tidak pernah meminta kode SMS Anda.",
        'es': "Se conecta con Dispositivos vinculados, una función de WhatsApp. Nunca te pedimos tu código SMS.",
        'pt': "A conexão é feita pelos Aparelhos conectados, um recurso do próprio WhatsApp. Nunca pedimos seu código SMS.",
        'ar': "يتصل عبر «الأجهزة المرتبطة»، وهي ميزة من واتساب نفسه. لن نطلب منك رمز الرسائل القصيرة أبدًا.",
        'fr': "La connexion passe par Appareils connectés, une fonction de WhatsApp. Nous ne vous demandons jamais votre code SMS.",
        'ms': "Ia bersambung melalui Peranti Terpaut, ciri WhatsApp sendiri. Kami tidak sekali-kali meminta kod SMS anda.",
        'af': "Dit koppel deur Gekoppelde toestelle, WhatsApp se eie funksie. Ons vra nooit vir jou SMS-kode nie.",
        'hi': "यह लिंक्ड डिवाइस से जुड़ता है, जो WhatsApp की अपनी सुविधा है। हम कभी आपका SMS कोड नहीं मांगते।",
    },
    'trust_local_title': {
        'en': "Saved only on your phone",
        'tr': "Yalnızca telefonunuzda saklanır",
        'de': "Nur auf deinem Handy gespeichert",
        'id': "Hanya tersimpan di ponsel Anda",
        'es': "Solo se guarda en tu teléfono",
        'pt': "Salvo só no seu celular",
        'ar': "محفوظ على هاتفك فقط",
        'fr': "Enregistré uniquement sur votre téléphone",
        'ms': "Disimpan pada telefon anda sahaja",
        'af': "Net op jou foon gestoor",
        'hi': "सिर्फ़ आपके फ़ोन में सहेजा जाता है",
    },
    'trust_local_desc': {
        'en': "Recovered messages and media stay on this device — never on our servers.",
        'tr': "Kurtarılan mesajlar ve medya bu cihazda kalır — asla sunucularımızda değil.",
        'de': "Wiederhergestellte Nachrichten und Medien bleiben auf diesem Gerät — nie auf unseren Servern.",
        'id': "Pesan dan media yang dipulihkan tetap di perangkat ini — tidak pernah di server kami.",
        'es': "Los mensajes y archivos recuperados se quedan en este dispositivo, nunca en nuestros servidores.",
        'pt': "Mensagens e mídias recuperadas ficam neste aparelho — nunca nos nossos servidores.",
        'ar': "تبقى الرسائل والوسائط المسترجعة على هذا الجهاز — وليس على خوادمنا أبدًا.",
        'fr': "Les messages et médias récupérés restent sur cet appareil — jamais sur nos serveurs.",
        'ms': "Mesej dan media yang dipulihkan kekal pada peranti ini — tidak sekali-kali pada pelayan kami.",
        'af': "Herwinde boodskappe en media bly op hierdie toestel — nooit op ons bedieners nie.",
        'hi': "वापस पाए गए संदेश और मीडिया इसी डिवाइस पर रहते हैं — हमारे सर्वर पर कभी नहीं।",
    },
    'trust_control_desc': {
        'en': "Log out anytime from WhatsApp › Linked devices.",
        'tr': "İstediğiniz zaman WhatsApp › Bağlı Cihazlar’dan çıkış yapın.",
        'de': "Melde dich jederzeit unter WhatsApp › Verknüpfte Geräte ab.",
        'id': "Keluar kapan saja dari WhatsApp › Perangkat Tertaut.",
        'es': "Cierra sesión cuando quieras desde WhatsApp › Dispositivos vinculados.",
        'pt': "Saia quando quiser em WhatsApp › Aparelhos conectados.",
        'ar': "سجّل الخروج في أي وقت من واتساب › الأجهزة المرتبطة.",
        'fr': "Déconnectez-vous à tout moment depuis WhatsApp › Appareils connectés.",
        'ms': "Log keluar bila-bila masa dari WhatsApp › Peranti Terpaut.",
        'af': "Meld enige tyd af by WhatsApp › Gekoppelde toestelle.",
        'hi': "WhatsApp › लिंक्ड डिवाइस से कभी भी लॉग आउट करें।",
    },

    # ── Connecting: how long, which way, and how far along ──
    'connect_time': {
        'en': "About 1 minute", 'tr': "Yaklaşık 1 dakika", 'de': "Etwa 1 Minute",
        'id': "Sekitar 1 menit", 'es': "Alrededor de 1 minuto", 'pt': "Cerca de 1 minuto",
        'ar': "دقيقة واحدة تقريبًا", 'fr': "Environ 1 minute", 'ms': "Kira-kira 1 minit",
        'af': "Omtrent 1 minuut", 'hi': "लगभग 1 मिनट",
    },
    'most_common': {
        'en': "Most common", 'tr': "En yaygın", 'de': "Am häufigsten", 'id': "Paling umum",
        'es': "Lo más común", 'pt': "Mais comum", 'ar': "الأكثر شيوعًا", 'fr': "Le plus courant",
        'ms': "Paling biasa", 'af': "Mees algemeen", 'hi': "सबसे आम",
    },
    # {n} is the step being shown, {total} how many there are.
    'step_of': {
        'en': "Step {n} of {total}", 'tr': "Adım {n}/{total}", 'de': "Schritt {n} von {total}",
        'id': "Langkah {n} dari {total}", 'es': "Paso {n} de {total}", 'pt': "Passo {n} de {total}",
        'ar': "الخطوة {n} من {total}", 'fr': "Étape {n} sur {total}", 'ms': "Langkah {n} daripada {total}",
        'af': "Stap {n} van {total}", 'hi': "चरण {n} / {total}",
    },

    # ── What people ask before they link their account ──
    'faq_title': {
        'en': "Common questions", 'tr': "Sık sorulan sorular", 'de': "Häufige Fragen",
        'id': "Pertanyaan umum", 'es': "Preguntas frecuentes", 'pt': "Perguntas frequentes",
        'ar': "أسئلة شائعة", 'fr': "Questions fréquentes", 'ms': "Soalan lazim",
        'af': "Algemene vrae", 'hi': "आम सवाल",
    },
    'faq_safe_q': {
        'en': "Is it safe?", 'tr': "Güvenli mi?", 'de': "Ist das sicher?", 'id': "Apakah aman?",
        'es': "¿Es seguro?", 'pt': "É seguro?", 'ar': "هل هو آمن؟", 'fr': "Est-ce sûr ?",
        'ms': "Adakah ia selamat?", 'af': "Is dit veilig?", 'hi': "क्या यह सुरक्षित है?",
    },
    'faq_safe_a': {
        'en': "Yes. {app} is added as a linked device, just like WhatsApp Web. You can see it in WhatsApp › Linked devices and log it out at any time.",
        'tr': "Evet. {app}, WhatsApp Web gibi bağlı bir cihaz olarak eklenir. Onu WhatsApp › Bağlı Cihazlar’da görebilir ve istediğiniz zaman çıkış yapabilirsiniz.",
        'de': "Ja. {app} wird wie WhatsApp Web als verknüpftes Gerät hinzugefügt. Du siehst es unter WhatsApp › Verknüpfte Geräte und kannst es jederzeit abmelden.",
        'id': "Ya. {app} ditambahkan sebagai perangkat tertaut, sama seperti WhatsApp Web. Anda bisa melihatnya di WhatsApp › Perangkat Tertaut dan mengeluarkannya kapan saja.",
        'es': "Sí. {app} se añade como dispositivo vinculado, igual que WhatsApp Web. Puedes verlo en WhatsApp › Dispositivos vinculados y cerrar su sesión cuando quieras.",
        'pt': "Sim. O {app} é adicionado como aparelho conectado, igual ao WhatsApp Web. Você pode vê-lo em WhatsApp › Aparelhos conectados e desconectá-lo quando quiser.",
        'ar': "نعم. تتم إضافة {app} كجهاز مرتبط، تمامًا مثل واتساب ويب. يمكنك رؤيته في واتساب › الأجهزة المرتبطة وتسجيل خروجه في أي وقت.",
        'fr': "Oui. {app} est ajouté comme appareil connecté, comme WhatsApp Web. Vous le voyez dans WhatsApp › Appareils connectés et pouvez le déconnecter à tout moment.",
        'ms': "Ya. {app} ditambah sebagai peranti terpaut, sama seperti WhatsApp Web. Anda boleh melihatnya dalam WhatsApp › Peranti Terpaut dan log keluar bila-bila masa.",
        'af': "Ja. {app} word as ’n gekoppelde toestel bygevoeg, net soos WhatsApp Web. Jy sien dit by WhatsApp › Gekoppelde toestelle en kan dit enige tyd afmeld.",
        'hi': "हाँ। {app} WhatsApp Web की तरह एक लिंक्ड डिवाइस के रूप में जुड़ता है। आप इसे WhatsApp › लिंक्ड डिवाइस में देख सकते हैं और कभी भी लॉग आउट कर सकते हैं।",
    },
    'faq_phone_q': {
        'en': "Will WhatsApp keep working on my phone?",
        'tr': "WhatsApp telefonumda çalışmaya devam edecek mi?",
        'de': "Funktioniert WhatsApp auf meinem Handy weiter?",
        'id': "Apakah WhatsApp tetap berfungsi di ponsel saya?",
        'es': "¿WhatsApp seguirá funcionando en mi teléfono?",
        'pt': "O WhatsApp continua funcionando no meu celular?",
        'ar': "هل سيستمر واتساب في العمل على هاتفي؟",
        'fr': "WhatsApp continuera-t-il de fonctionner sur mon téléphone ?",
        'ms': "Adakah WhatsApp masih berfungsi pada telefon saya?",
        'af': "Sal WhatsApp steeds op my foon werk?",
        'hi': "क्या मेरे फ़ोन पर WhatsApp चलता रहेगा?",
    },
    'faq_phone_a': {
        'en': "Yes. Nothing changes on your phone — your account is simply opened in {app} too.",
        'tr': "Evet. Telefonunuzda hiçbir şey değişmez — hesabınız yalnızca {app} içinde de açılır.",
        'de': "Ja. Auf deinem Handy ändert sich nichts — dein Konto wird einfach zusätzlich in {app} geöffnet.",
        'id': "Ya. Tidak ada yang berubah di ponsel Anda — akun Anda hanya dibuka juga di {app}.",
        'es': "Sí. En tu teléfono no cambia nada: tu cuenta simplemente se abre también en {app}.",
        'pt': "Sim. Nada muda no seu celular — sua conta só passa a abrir também no {app}.",
        'ar': "نعم. لا شيء يتغير على هاتفك — يُفتح حسابك في {app} أيضًا، هذا كل ما في الأمر.",
        'fr': "Oui. Rien ne change sur votre téléphone : votre compte est simplement ouvert aussi dans {app}.",
        'ms': "Ya. Tiada apa yang berubah pada telefon anda — akaun anda hanya turut dibuka dalam {app}.",
        'af': "Ja. Niks verander op jou foon nie — jou rekening word bloot ook in {app} oopgemaak.",
        'hi': "हाँ। आपके फ़ोन पर कुछ नहीं बदलता — आपका खाता बस {app} में भी खुल जाता है।",
    },
    'faq_notice_q': {
        'en': "WhatsApp says a new device was linked",
        'tr': "WhatsApp yeni bir cihazın bağlandığını söylüyor",
        'de': "WhatsApp meldet, dass ein neues Gerät verknüpft wurde",
        'id': "WhatsApp memberi tahu ada perangkat baru yang ditautkan",
        'es': "WhatsApp dice que se vinculó un dispositivo nuevo",
        'pt': "O WhatsApp avisa que um novo aparelho foi conectado",
        'ar': "واتساب يقول إنه تم ربط جهاز جديد",
        'fr': "WhatsApp indique qu’un nouvel appareil a été connecté",
        'ms': "WhatsApp memaklumkan peranti baharu telah dipautkan",
        'af': "WhatsApp sê ’n nuwe toestel is gekoppel",
        'hi': "WhatsApp कहता है कि एक नया डिवाइस लिंक हुआ है",
    },
    'faq_notice_a': {
        'en': "That is {app}, so there is nothing to worry about. WhatsApp always lets you know when a device is linked to your account.",
        'tr': "O cihaz {app}, endişelenecek bir şey yok. WhatsApp, hesabınıza bir cihaz bağlandığında size her zaman haber verir.",
        'de': "Das ist {app} — kein Grund zur Sorge. WhatsApp informiert dich immer, wenn ein Gerät mit deinem Konto verknüpft wird.",
        'id': "Itu adalah {app}, jadi tidak perlu khawatir. WhatsApp selalu memberi tahu Anda saat ada perangkat yang ditautkan ke akun Anda.",
        'es': "Es {app}, así que no hay de qué preocuparse. WhatsApp siempre te avisa cuando se vincula un dispositivo a tu cuenta.",
        'pt': "É o {app}, então não precisa se preocupar. O WhatsApp sempre avisa quando um aparelho é conectado à sua conta.",
        'ar': "هذا هو {app}، فلا داعي للقلق. يُعلمك واتساب دائمًا عند ربط جهاز بحسابك.",
        'fr': "C’est {app}, rien d’inquiétant. WhatsApp vous prévient toujours quand un appareil est connecté à votre compte.",
        'ms': "Itu ialah {app}, jadi tiada apa yang perlu dirisaukan. WhatsApp sentiasa memaklumkan anda apabila peranti dipautkan ke akaun anda.",
        'af': "Dit is {app}, so daar is niks om oor bekommerd te wees nie. WhatsApp laat jou altyd weet wanneer ’n toestel aan jou rekening gekoppel word.",
        'hi': "वह {app} ही है, इसलिए चिंता की कोई बात नहीं। जब भी आपके खाते से कोई डिवाइस लिंक होता है, WhatsApp आपको हमेशा बताता है।",
    },
    'faq_loading_q': {
        'en': "My chats are not loading", 'tr': "Sohbetlerim yüklenmiyor", 'de': "Meine Chats laden nicht",
        'id': "Obrolan saya tidak dimuat", 'es': "Mis chats no cargan", 'pt': "Minhas conversas não carregam",
        'ar': "محادثاتي لا تظهر", 'fr': "Mes discussions ne se chargent pas", 'ms': "Perbualan saya tidak dimuatkan",
        'af': "My geselse laai nie", 'hi': "मेरी चैट लोड नहीं हो रहीं",
    },
    'faq_loading_a': {
        'en': "The first time can take a few minutes. Keep the app open and connected to the internet.",
        'tr': "İlk seferde birkaç dakika sürebilir. Uygulamayı açık ve internete bağlı tutun.",
        'de': "Beim ersten Mal kann es ein paar Minuten dauern. Lass die App geöffnet und mit dem Internet verbunden.",
        'id': "Pertama kali bisa memakan waktu beberapa menit. Biarkan aplikasi tetap terbuka dan terhubung ke internet.",
        'es': "La primera vez puede tardar unos minutos. Mantén la app abierta y conectada a internet.",
        'pt': "Na primeira vez, pode levar alguns minutos. Mantenha o app aberto e conectado à internet.",
        'ar': "قد تستغرق المرة الأولى بضع دقائق. أبقِ التطبيق مفتوحًا ومتصلًا بالإنترنت.",
        'fr': "La première fois, cela peut prendre quelques minutes. Gardez l’application ouverte et connectée à Internet.",
        'ms': "Kali pertama boleh mengambil masa beberapa minit. Biarkan aplikasi terbuka dan bersambung ke internet.",
        'af': "Die eerste keer kan ’n paar minute neem. Hou die app oop en aan die internet gekoppel.",
        'hi': "पहली बार में कुछ मिनट लग सकते हैं। ऐप खुला और इंटरनेट से जुड़ा रखें।",
    },
}


def parse_dart_map(text):
    """Reads `static const Map<String, String> language = { ... }` into a dict."""
    start = text.index('{', re.search(r'language\s*=', text).end())
    out, i, n = {}, start + 1, len(text)

    def read_string(i):
        while i < n:
            if text[i] in ' \t\r\n':
                i += 1
            elif text.startswith('//', i):
                i = text.index('\n', i)
            else:
                break
        if i >= n or text[i] not in '\'"':
            return None, i
        quote, i, buf = text[i], i + 1, []
        while i < n:
            c = text[i]
            if c == '\\':
                buf.append(text[i:i + 2])
                i += 2
                continue
            if c == quote:
                i += 1
                # Dart concatenates adjacent literals: 'long ' 'sentence'.
                j = i
                while j < n and text[j] in ' \t\r\n':
                    j += 1
                if j < n and text[j] in '\'"':
                    rest, i = read_string(j)
                    return ''.join(buf) + rest, i
                return ''.join(buf), i
            buf.append(c)
            i += 1
        return ''.join(buf), i

    def unescape(s):
        return s.replace("\\'", "'").replace('\\"', '"').replace('\\n', '\n').replace('\\\\', '\\')

    while i < n:
        while i < n and (text[i] in ' \t\r\n,' or text.startswith('//', i)):
            i = text.index('\n', i) if text.startswith('//', i) else i + 1
        if i >= n or text[i] == '}':
            break
        key, i = read_string(i)
        if key is None:
            break
        while i < n and text[i] in ' \t\r\n':
            i += 1
        if i < n and text[i] == ':':
            i += 1
        value, i = read_string(i)
        out[unescape(key)] = unescape(value or '')
    return out


def main():
    maps = {}
    for code, filename in LANGUAGES.items():
        with open(os.path.join(TRANSLATIONS, filename), encoding='utf-8') as f:
            maps[code] = parse_dart_map(f.read())

    missing = []
    strings = {}
    for sid, english in IDS.items():
        entry = {}
        for code, table in maps.items():
            value = table.get(english)
            if not value:
                missing.append(f'{code}: {english}')
                value = english if code == 'en' else maps['en'].get(english, english)
            entry[code] = value
        strings[sid] = entry
    strings.update(EXTRA)

    for warning in missing:
        print('missing translation, fell back to English —', warning, file=sys.stderr)

    lines = [
        '// GENERATED by tools/sync_translations.py — do not edit by hand.',
        '// Source: lib/config/translate/*.dart in the Flutter app.',
        '// Every string carries all supported languages; the page picks one with ?lang=.',
        'window.GUIDE_I18N = {',
    ]
    for sid, entry in strings.items():
        pairs = ', '.join(f'{code}: {json.dumps(entry[code], ensure_ascii=False)}' for code in LANGUAGES)
        lines.append(f'  {sid}: {{ {pairs} }},')
    lines.append('};')

    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    print(f'wrote {len(strings)} strings × {len(LANGUAGES)} languages -> {os.path.relpath(OUT, WEB)}')


if __name__ == '__main__':
    main()
