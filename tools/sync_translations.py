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
EXTRA = {}


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
