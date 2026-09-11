# The two recordings

Connecting looks different on each platform, so each has its own pair. Drop
the screen recordings here, in these folders, named exactly:

    android/connect-this-phone.mp4     ios/connect-this-phone.mp4
    android/connect-other-phone.mp4    ios/connect-other-phone.mp4

| File | The screen it appears on |
| --- | --- |
| `connect-this-phone.mp4` | "Account on this phone" — logging in with the phone number |
| `connect-other-phone.mp4` | "Account on another phone" — scanning the QR code |

Which folder is read comes from `?platform=android|ios`, which the app sends;
a page opened without it reads the browser instead, and a desktop browser
previews the Android ones.

The page asks for each file before it draws the button, so until a file is
here nobody sees a "Watch the video" button that does nothing. Adding one is
enough — the screens and platforms without a recording simply have no button,
so you can ship Android first and add iOS later. The paths come from
`assets/js/content.js`; change them there if you want different ones.

## Keep them small

They are fetched over mobile data, so aim for **under 3 MB** and no sound
track — the guide is read, not listened to. A 40-second phone recording
compresses to about 2 MB:

    ffmpeg -i raw.mov -an -vf "scale=-2:720,fps=24" \
      -c:v libx264 -profile:v baseline -level 3.1 -crf 30 \
      -movflags +faststart connect-this-phone.mp4

- `-an` drops the audio, `-crf 30` trades a little sharpness for half the size.
- `+faststart` puts the index at the front so playback starts before the file
  has finished downloading — without it a phone waits for the whole file.
- `baseline` profile plays on every Android and iOS WebView worth supporting.

Check the result before pushing — once per platform:

    index.html?screen=connect_here&platform=android
    index.html?screen=connect_other&platform=ios
