// The guide itself: which screens exist and what is on them.
//
// It is not a slideshow any more. `home` asks the user what they want to know
// and every answer is one screen away, so nobody reads anything they did not
// ask for. Every piece of text is a string id from i18n.js, so a screen is
// written once and reads in all eleven languages.
//
// To change the guide, edit this file (and i18n.js for new wording) — nothing
// else needs to be touched.
//
//   tone   primary | success | info      the accent the screen is painted in
//   full   true when the screen or option belongs to the full guide only. With
//          ?full=0 — what the app asks for when its extra features are switched
//          off — everything marked `full` disappears, leaving connecting.
//   platform  'android' or 'ios' on a block, an option or a slide, when it
//          applies to only one of them. In a video or image path, {platform} is
//          filled in instead, so the two phones are shown their own pictures.
//
// Blocks, in the order they are drawn:
//   options  big tappable cards that open another screen (`go`)
//   trust    the privacy panel
//   video    "Watch the video" — plays inline, hides itself if there is no file
//   slides   numbered screenshots, one at a time, each with one short sentence
//   steps    numbered instructions, each with an optional screenshot
//   list     icon + title + description rows, each with an optional screenshot
//   grid     small tiles, icon and title only
//   shot     one screenshot on its own
//   note     a closing tip
//   done     the "Got it" button that returns to the home screen

window.GUIDE_CONTENT = {
  // Where the guide opens. ?screen=<id> can start it somewhere else.
  home: 'home',

  screens: {
    // ── The question. Two answers, and the reassurance underneath. ──
    home: {
      tone: 'primary',
      kicker: 'home_kicker',
      title: 'home_title',
      subtitle: 'home_subtitle',
      blocks: [
        {
          type: 'options',
          items: [
            { icon: 'link', title: 'home_connect_title', desc: 'home_connect_desc', go: 'connect' },
            { icon: 'moon', title: 'features_title', desc: 'features_subtitle', go: 'features', full: true },
          ],
        },
        {
          type: 'trust',
          icon: 'shield-check',
          title: 'privacy_title',
          items: [
            { icon: 'phone', title: 'privacy_device_title', desc: 'privacy_device_desc' },
            { icon: 'user-off', title: 'privacy_tracking_title', desc: 'privacy_tracking_desc' },
            { icon: 'shield', title: 'privacy_control_title', desc: 'privacy_control_desc' },
          ],
        },
      ],
    },

    // ── Connecting · which of the two flows is theirs. ──
    connect: {
      tone: 'primary',
      icon: 'link',
      // The same words the user tapped on the home screen, so the answer
      // plainly belongs to the question.
      title: 'home_connect_title',
      subtitle: 'connect_where_subtitle',
      blocks: [
        {
          type: 'options',
          items: [
            { icon: 'phone', title: 'connect_phone_title', desc: 'connect_here_where', go: 'connect_here' },
            { icon: 'devices', title: 'connect_qr_title', desc: 'connect_other_where', go: 'connect_other' },
          ],
        },
      ],
    },

    // ── Connecting · the account is on this phone: log in with the number. ──
    connect_here: {
      tone: 'primary',
      icon: 'phone',
      title: 'connect_phone_title',
      subtitle: 'here_steps_subtitle',
      blocks: [
        // {platform} is android or ios, so each phone is shown its own
        // recording. Drop the file in and the card appears by itself; while
        // there is none, nobody sees a button that does nothing.
        { type: 'video', src: 'assets/video/{platform}/connect-this-phone.mp4' },
        // Every tap, as a picture of the phone reading this. The two platforms
        // only part ways at the menu that leads to Linked devices.
        {
          type: 'slides',
          items: [
            { image: 'assets/img/connection-steps/{platform}/01-open-app.jpg', text: 'step_open_app' },
            { image: 'assets/img/connection-steps/{platform}/02-name-account.jpg', text: 'step_name_account' },
            { image: 'assets/img/connection-steps/{platform}/03-log-in-with-number.jpg', text: 'step_log_in_with_number' },
            { image: 'assets/img/connection-steps/{platform}/04-enter-number.jpg', text: 'step_enter_number' },
            { image: 'assets/img/connection-steps/{platform}/05-code-copied.jpg', text: 'step_code_copied' },
            { image: 'assets/img/connection-steps/{platform}/06-open-whatsapp.jpg', text: 'step_open_whatsapp' },
            { image: 'assets/img/connection-steps/android/07-linked-devices.jpg', text: 'step_linked_devices_android', platform: 'android' },
            { image: 'assets/img/connection-steps/ios/07-linked-devices.jpg', text: 'step_linked_devices_ios', platform: 'ios' },
            { image: 'assets/img/connection-steps/{platform}/08-link-a-device.jpg', text: 'step_link_a_device' },
            { image: 'assets/img/connection-steps/{platform}/09-link-with-number.jpg', text: 'step_link_with_number' },
            { image: 'assets/img/connection-steps/{platform}/10-paste-code.jpg', text: 'step_paste_code' },
            { image: 'assets/img/connection-steps/{platform}/11-connected.jpg', text: 'step_connected' },
          ],
        },
        { type: 'note', icon: 'bulb', title: 'ready_open_title', desc: 'ready_open_desc' },
        { type: 'done' },
      ],
    },

    // ── Connecting · the account is on another phone: scan the QR code. ──
    connect_other: {
      tone: 'primary',
      icon: 'qr',
      title: 'connect_qr_title',
      subtitle: 'connect_qr_desc',
      blocks: [
        { type: 'video', src: 'assets/video/{platform}/connect-other-phone.mp4' },
        {
          type: 'steps',
          items: [
            { title: 'add_account', desc: 'add_account_desc' },
            { title: 'other_open_title', desc: 'other_open_desc' },
            { title: 'other_scan_title', desc: 'other_scan_desc' },
            { title: 'wait_title', desc: 'wait_desc' },
          ],
        },
        { type: 'shot', image: 'assets/img/connect-qr.jpg' },
        { type: 'note', icon: 'bulb', title: 'ready_open_title', desc: 'ready_open_desc' },
        { type: 'done' },
      ],
    },

    // ── What the app can do, and where to look for it. ──
    features: {
      full: true,
      tone: 'info',
      icon: 'moon',
      kicker: 'features_kicker',
      title: 'features_title',
      subtitle: 'features_subtitle',
      blocks: [
        {
          type: 'grid',
          items: [
            { icon: 'eye-off', title: 'feature_ticks' },
            { icon: 'clock', title: 'feature_hidden' },
            { icon: 'eye', title: 'feature_status_secret' },
            { icon: 'download', title: 'feature_status_download' },
            { icon: 'restore', title: 'feature_status_deleted' },
            { icon: 'history', title: 'feature_deleted' },
            { icon: 'edit', title: 'feature_edited' },
            { icon: 'unlock', title: 'feature_view_once' },
          ],
        },
        {
          type: 'options',
          label: 'see_how',
          items: [
            { icon: 'download', title: 'status_title', desc: 'status_subtitle', go: 'statuses' },
            { icon: 'sliders', title: 'toolbar_title', desc: 'toolbar_subtitle', go: 'toolbar' },
          ],
        },
        { type: 'done' },
      ],
    },

    // ── Saving a status. ──
    statuses: {
      full: true,
      tone: 'info',
      icon: 'download',
      title: 'status_title',
      subtitle: 'status_subtitle',
      blocks: [
        {
          type: 'steps',
          items: [
            { title: 'status_tab_title', desc: 'status_tab_desc', image: 'assets/img/status-tab.jpg' },
            { title: 'status_save_title', desc: 'status_save_desc', image: 'assets/img/status-save.jpg' },
          ],
        },
        { type: 'done' },
      ],
    },

    // ── The three buttons on top of a chat. ──
    toolbar: {
      full: true,
      tone: 'info',
      icon: 'sliders',
      title: 'toolbar_title',
      subtitle: 'toolbar_subtitle',
      blocks: [
        {
          type: 'list',
          items: [
            { icon: 'lock', title: 'toolbar_lock_title', desc: 'toolbar_lock_desc', image: 'assets/img/icon-keyboard.jpg' },
            { icon: 'moon', title: 'toolbar_ghost_title', desc: 'toolbar_ghost_desc', image: 'assets/img/icon-ghost.jpg' },
            { icon: 'bookmark', title: 'toolbar_saved_title', desc: 'toolbar_saved_desc', image: 'assets/img/icon-saved.jpg' },
          ],
        },
        { type: 'done' },
      ],
    },
  },
};

// Line icons, drawn on a 24×24 grid. Stroked rather than filled so one set
// works at every size and follows the accent colour of the screen it sits on.
window.GUIDE_ICONS = {
  shield: '<path d="M12 3.2l7 2.6v5.6c0 4.3-2.9 7.5-7 8.9-4.1-1.4-7-4.6-7-8.9V5.8l7-2.6z"/>',
  'shield-check': '<path d="M12 3.2l7 2.6v5.6c0 4.3-2.9 7.5-7 8.9-4.1-1.4-7-4.6-7-8.9V5.8l7-2.6z"/><path d="M9.2 11.9l2.1 2.1 3.9-4.2"/>',
  phone: '<rect x="7" y="2.6" width="10" height="18.8" rx="2.6"/><path d="M10.6 18.6h2.8"/>',
  devices: '<rect x="2.8" y="4.4" width="9.4" height="15.2" rx="2.4"/><rect x="14.6" y="8.4" width="6.6" height="11.2" rx="2"/><path d="M6.4 17.2h2.2"/><path d="M17.2 17h1.4"/>',
  'user-off': '<circle cx="12" cy="8.2" r="3.3"/><path d="M5.7 20a6.3 6.3 0 0 1 12.6 0"/><path d="M3.6 3.6l16.8 16.8"/>',
  moon: '<path d="M20.2 14.8A8.6 8.6 0 0 1 9.2 3.8a8.6 8.6 0 1 0 11 11z"/>',
  'eye-off': '<path d="M10.7 6.4A9.7 9.7 0 0 1 12 6.3c5.2 0 8.8 5.7 8.8 5.7a17 17 0 0 1-3 3.5"/><path d="M6.6 8.5A16.4 16.4 0 0 0 3.2 12s3.6 5.7 8.8 5.7c1.1 0 2.2-.2 3.1-.6"/><path d="M10.2 10.3a2.5 2.5 0 0 0 3.5 3.5"/><path d="M3.6 3.6l16.8 16.8"/>',
  clock: '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.2V12l3.2 1.9"/>',
  eye: '<path d="M2.8 12S6.6 5.8 12 5.8 21.2 12 21.2 12 17.4 18.2 12 18.2 2.8 12 2.8 12z"/><circle cx="12" cy="12" r="2.7"/>',
  download: '<path d="M12 3.8v10.4"/><path d="M8 10.3l4 4 4-4"/><path d="M5 19.4h14"/>',
  restore: '<path d="M20.3 12a8.4 8.4 0 1 1-2.6-6.1"/><path d="M20.4 4.2v4.7h-4.7"/>',
  history: '<path d="M3.7 12a8.4 8.4 0 1 0 2.6-6.1"/><path d="M3.6 4.2v4.7h4.7"/><path d="M12 7.8V12l3.1 1.9"/>',
  edit: '<path d="M4.2 19.8h4.1L19 9.1a2.9 2.9 0 0 0-4.1-4.1L4.2 15.7v4.1z"/><path d="M13.8 6.2l4 4"/>',
  unlock: '<rect x="4.8" y="10.4" width="14.4" height="10.2" rx="2.6"/><path d="M8.4 10.4V7.7a3.6 3.6 0 0 1 7-1.3"/>',
  lock: '<rect x="4.8" y="10.4" width="14.4" height="10.2" rx="2.6"/><path d="M8.4 10.4V7.7a3.6 3.6 0 0 1 7.2 0v2.7"/>',
  link: '<path d="M10.4 13.6a3.9 3.9 0 0 0 5.6 0l2.4-2.4a3.9 3.9 0 0 0-5.6-5.6l-1.3 1.3"/><path d="M13.6 10.4a3.9 3.9 0 0 0-5.6 0l-2.4 2.4a3.9 3.9 0 0 0 5.6 5.6l1.3-1.3"/>',
  qr: '<rect x="3.6" y="3.6" width="6.4" height="6.4" rx="1.4"/><rect x="14" y="3.6" width="6.4" height="6.4" rx="1.4"/><rect x="3.6" y="14" width="6.4" height="6.4" rx="1.4"/><path d="M14 14h3.1v3.1H14z"/><path d="M20.4 14v.01M14 20.4v.01M17.4 20.4h3"/>',
  save: '<path d="M12 3.8v10"/><path d="M8.4 10.2l3.6 3.6 3.6-3.6"/><rect x="4" y="16.2" width="16" height="4.2" rx="1.7"/>',
  bookmark: '<path d="M6.8 4.6h10.4v15.4L12 16.4l-5.2 3.6V4.6z"/>',
  bulb: '<path d="M12 3.2a5.9 5.9 0 0 1 3.6 10.6c-.6.5-1 1.2-1.1 2H9.5c-.1-.8-.5-1.5-1.1-2A5.9 5.9 0 0 1 12 3.2z"/><path d="M9.7 18.6h4.6"/><path d="M10.7 21h2.6"/>',
  sliders: '<path d="M4 8.5h7.9"/><path d="M16.5 8.5h3.5"/><path d="M4 15.5h3.5"/><path d="M12.1 15.5H20"/><circle cx="14.2" cy="8.5" r="2.3"/><circle cx="9.8" cy="15.5" r="2.3"/>',
  play: '<path d="M8.4 5.4l10 6.6-10 6.6z"/>',
  check: '<path d="M5.2 12.4l4.6 4.6L18.8 7.6"/>',
  arrow: '<path d="M4.6 12h13.8"/><path d="M13 6.5l5.5 5.5-5.5 5.5"/>',
  close: '<path d="M6.2 6.2l11.6 11.6"/><path d="M17.8 6.2L6.2 17.8"/>',
  chevron: '<path d="M9.6 5.6l6.4 6.4-6.4 6.4"/>',
  'zoom-in': '<circle cx="10.8" cy="10.8" r="6.6"/><path d="M15.6 15.6l4.4 4.4"/><path d="M10.8 8.2v5.2"/><path d="M8.2 10.8h5.2"/>',
  expand: '<path d="M9.4 4.6H4.6v4.8"/><path d="M14.6 19.4h4.8v-4.8"/><path d="M4.6 4.6l5.6 5.6"/><path d="M19.4 19.4l-5.6-5.6"/>',
};
