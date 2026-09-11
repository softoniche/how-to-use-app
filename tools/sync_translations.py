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
        'de': "Was möchten Sie über {app} wissen?",
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
        'de': "Wählen Sie ein Thema — es dauert nur eine Minute.",
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
        'de': "Verbinden Sie Ihr WhatsApp-Konto Schritt für Schritt.",
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
        'de': "Wo ist das WhatsApp-Konto, das Sie verbinden möchten?",
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
        'de': "Es ist auf dem Telefon angemeldet, das Sie in der Hand halten.",
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
        'de': "Sehen Sie jeden Schritt auf dem Bildschirm.",
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
        'de': "Tippen Sie auf „+ Hinzufügen“, benennen Sie das Konto und speichern Sie.",
        'id': "Ketuk “+ Tambah”, beri nama akun, lalu simpan.",
        'es': "Toca “+ Añadir”, ponle un nombre a la cuenta y guarda.",
        'pt': "Toque em “+ Adicionar”, dê um nome à conta e salve.",
        'ar': "اضغط على «+ إضافة»، وامنح الحساب اسمًا ثم احفظ.",
        'fr': "Touchez « + Ajouter », donnez un nom au compte et enregistrez.",
        'ms': "Ketik “+ Tambah”, beri nama akaun dan simpan.",
        'af': "Tik “+ Voeg by”, gee die rekening 'n naam en stoor.",
        'hi': "“+ जोड़ें” पर टैप करें, खाते को नाम दें और सेव करें।",
    },
    'here_login_title': {
        'en': "Choose “Log in with phone number”",
        'tr': "“Telefon numarasıyla giriş yap” seçeneğini seçin",
        'de': "Wählen Sie „Mit Telefonnummer anmelden“",
        'id': "Pilih “Masuk dengan nomor telepon”",
        'es': "Elige “Iniciar sesión con número de teléfono”",
        'pt': "Escolha “Entrar com número de telefone”",
        'ar': "اختر «تسجيل الدخول برقم الهاتف»",
        'fr': "Choisissez « Se connecter avec un numéro de téléphone »",
        'ms': "Pilih “Log masuk dengan nombor telefon”",
        'af': "Kies “Meld aan met foonnommer”",
        'hi': "“फ़ोन नंबर से लॉग इन करें” चुनें",
    },
    'here_login_desc': {
        'en': "It sits under the QR code. Pick your country, enter your number and tap OK.",
        'tr': "QR kodun altındadır. Ülkenizi seçin, numaranızı girin ve Tamam'a dokunun.",
        'de': "Er steht unter dem QR-Code. Wählen Sie Ihr Land, geben Sie Ihre Nummer ein und tippen Sie auf OK.",
        'id': "Ada di bawah kode QR. Pilih negara Anda, masukkan nomor, lalu ketuk OK.",
        'es': "Está debajo del código QR. Elige tu país, escribe tu número y toca OK.",
        'pt': "Fica abaixo do código QR. Escolha seu país, digite seu número e toque em OK.",
        'ar': "يوجد أسفل رمز QR. اختر بلدك وأدخل رقمك ثم اضغط على OK.",
        'fr': "Il se trouve sous le code QR. Choisissez votre pays, saisissez votre numéro et touchez OK.",
        'ms': "Ia berada di bawah kod QR. Pilih negara anda, masukkan nombor dan ketik OK.",
        'af': "Dit is onder die QR-kode. Kies jou land, tik jou nommer in en tik OK.",
        'hi': "यह QR कोड के नीचे है। अपना देश चुनें, नंबर डालें और OK पर टैप करें।",
    },
    'here_code_title': {
        'en': "Enter the code in WhatsApp",
        'tr': "Kodu WhatsApp'a girin",
        'de': "Geben Sie den Code in WhatsApp ein",
        'id': "Masukkan kode di WhatsApp",
        'es': "Introduce el código en WhatsApp",
        'pt': "Digite o código no WhatsApp",
        'ar': "أدخل الرمز في واتساب",
        'fr': "Entrez le code dans WhatsApp",
        'ms': "Masukkan kod dalam WhatsApp",
        'af': "Voer die kode in WhatsApp in",
        'hi': "कोड WhatsApp में डालें",
    },
    'here_code_desc': {
        'en': "WhatsApp asks for a code. Type in the code shown on the screen.",
        'tr': "WhatsApp bir kod ister. Ekranda görünen kodu yazın.",
        'de': "WhatsApp fragt nach einem Code. Geben Sie den Code ein, der auf dem Bildschirm steht.",
        'id': "WhatsApp meminta kode. Ketik kode yang muncul di layar.",
        'es': "WhatsApp pide un código. Escribe el código que aparece en la pantalla.",
        'pt': "O WhatsApp pede um código. Digite o código que aparece na tela.",
        'ar': "سيطلب واتساب رمزًا. أدخل الرمز الظاهر على الشاشة.",
        'fr': "WhatsApp demande un code. Saisissez le code affiché à l'écran.",
        'ms': "WhatsApp meminta kod. Taip kod yang dipaparkan pada skrin.",
        'af': "WhatsApp vra vir 'n kode. Tik die kode in wat op die skerm wys.",
        'hi': "WhatsApp एक कोड मांगेगा। स्क्रीन पर दिख रहा कोड डालें।",
    },
    'wait_title': {
        'en': "Wait a few seconds", 'tr': "Birkaç saniye bekleyin", 'de': "Warten Sie ein paar Sekunden",
        'id': "Tunggu beberapa detik", 'es': "Espera unos segundos", 'pt': "Aguarde alguns segundos",
        'ar': "انتظر بضع ثوانٍ", 'fr': "Patientez quelques secondes", 'ms': "Tunggu beberapa saat",
        'af': "Wag 'n paar sekondes", 'hi': "कुछ सेकंड प्रतीक्षा करें",
    },
    'wait_desc': {
        'en': "Your chats load by themselves. Keep the app open until they do.",
        'tr': "Sohbetleriniz kendiliğinden yüklenir. Yüklenene kadar uygulamayı açık tutun.",
        'de': "Ihre Chats werden von selbst geladen. Lassen Sie die App so lange geöffnet.",
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
        'de': "Öffnen Sie WhatsApp auf dem anderen Telefon",
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
        'de': "Öffnen Sie Einstellungen › Verknüpfte Geräte und tippen Sie auf „Gerät verknüpfen“.",
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
        'de': "Richten Sie dieses Telefon auf den QR-Code auf diesem Bildschirm.",
        'id': "Arahkan ponsel itu ke kode QR di layar ini.",
        'es': "Apunta ese teléfono al código QR de esta pantalla.",
        'pt': "Aponte aquele telefone para o código QR desta tela.",
        'ar': "وجّه ذلك الهاتف نحو رمز QR الظاهر على هذه الشاشة.",
        'fr': "Dirigez cet autre téléphone vers le code QR affiché à l'écran.",
        'ms': "Halakan telefon itu ke kod QR pada skrin ini.",
        'af': "Rig daardie foon op die QR-kode op hierdie skerm.",
        'hi': "उस फ़ोन को इस स्क्रीन पर दिख रहे QR कोड की ओर रखें।",
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
