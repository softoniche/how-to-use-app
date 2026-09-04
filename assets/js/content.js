// The walkthrough itself: which pages exist, in which order, and what is on
// them. Every piece of text is a string id from i18n.js, so a page is written
// once and reads in all eleven languages.
//
// To change the guide, edit this file (and i18n.js for new wording) — nothing
// else needs to be touched.
//
//   tone    success | primary | info  — the accent the page is painted in.
//   layout  list    icon + title + description rows
//           grid    two-column tiles, icon and title only
//           steps   numbered cards with a screenshot underneath
//   full    true when the page belongs to the full tutorial only. With
//           ?full=0 the guide shrinks to privacy → connect → ready, which is
//           what the app asks for when its extra features are switched off.

window.GUIDE_CONTENT = {
  pages: [
    // ── Trust first: what we do *not* do with their data. ──
    {
      id: 'privacy',
      tone: 'success',
      layout: 'list',
      icon: 'shield',
      kicker: 'privacy_kicker',
      title: 'privacy_title',
      subtitle: 'privacy_subtitle',
      cards: [
        { icon: 'phone', title: 'privacy_device_title', desc: 'privacy_device_desc' },
        { icon: 'user-off', title: 'privacy_tracking_title', desc: 'privacy_tracking_desc' },
        { icon: 'shield-check', title: 'privacy_control_title', desc: 'privacy_control_desc' },
      ],
    },

    // ── What the app can actually do. ──
    {
      id: 'features',
      full: true,
      tone: 'primary',
      layout: 'grid',
      icon: 'moon',
      kicker: 'features_kicker',
      title: 'features_title',
      subtitle: 'features_subtitle',
      cards: [
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

    // ── Step 1 · Connect the account. ──
    {
      id: 'connect',
      tone: 'primary',
      layout: 'steps',
      icon: 'link',
      kicker: 'connect_kicker',
      title: 'connect_title',
      subtitle: 'connect_subtitle',
      cards: [
        { icon: 'qr', title: 'connect_qr_title', desc: 'connect_qr_desc', image: 'assets/img/connect-qr.jpg' },
        { icon: 'phone', title: 'connect_phone_title', desc: 'connect_phone_desc', image: 'assets/img/connect-phone.jpg' },
      ],
    },

    // ── Step 2 · Save statuses. ──
    {
      id: 'statuses',
      full: true,
      tone: 'primary',
      layout: 'steps',
      icon: 'download',
      kicker: 'status_kicker',
      title: 'status_title',
      subtitle: 'status_subtitle',
      cards: [
        { icon: 'tab', title: 'status_tab_title', desc: 'status_tab_desc', image: 'assets/img/status-tab.jpg' },
        { icon: 'save', title: 'status_save_title', desc: 'status_save_desc', image: 'assets/img/status-save.jpg' },
      ],
    },

    // ── Step 3 · The chat toolbar. ──
    {
      id: 'toolbar',
      full: true,
      tone: 'primary',
      layout: 'steps',
      icon: 'sliders',
      kicker: 'toolbar_kicker',
      title: 'toolbar_title',
      subtitle: 'toolbar_subtitle',
      cards: [
        { icon: 'lock', title: 'toolbar_lock_title', desc: 'toolbar_lock_desc', image: 'assets/img/icon-keyboard.jpg' },
        { icon: 'moon', title: 'toolbar_ghost_title', desc: 'toolbar_ghost_desc', image: 'assets/img/icon-ghost.jpg' },
        { icon: 'bookmark', title: 'toolbar_saved_title', desc: 'toolbar_saved_desc', image: 'assets/img/icon-saved.jpg' },
      ],
    },

    // ── The closing note. ──
    {
      id: 'ready',
      tone: 'info',
      layout: 'list',
      icon: 'rocket',
      kicker: 'ready_kicker',
      title: 'ready_title',
      subtitle: 'ready_subtitle',
      cards: [
        { icon: 'bulb', title: 'ready_open_title', desc: 'ready_open_desc' },
        { icon: 'shield', title: 'ready_private_title', desc: 'ready_private_desc' },
      ],
    },
  ],
};

// Line icons, drawn on a 24×24 grid. Stroked rather than filled so one set
// works at every size and follows the accent colour of the page it sits on.
window.GUIDE_ICONS = {
  shield: '<path d="M12 3.2l7 2.6v5.6c0 4.3-2.9 7.5-7 8.9-4.1-1.4-7-4.6-7-8.9V5.8l7-2.6z"/>',
  'shield-check': '<path d="M12 3.2l7 2.6v5.6c0 4.3-2.9 7.5-7 8.9-4.1-1.4-7-4.6-7-8.9V5.8l7-2.6z"/><path d="M9.2 11.9l2.1 2.1 3.9-4.2"/>',
  phone: '<rect x="7" y="2.6" width="10" height="18.8" rx="2.6"/><path d="M10.6 18.6h2.8"/>',
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
  tab: '<rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.6"/><path d="M3.4 10.2h17.2"/><path d="M9.7 4.6v5.6"/>',
  save: '<path d="M12 3.8v10"/><path d="M8.4 10.2l3.6 3.6 3.6-3.6"/><rect x="4" y="16.2" width="16" height="4.2" rx="1.7"/>',
  bookmark: '<path d="M6.8 4.6h10.4v15.4L12 16.4l-5.2 3.6V4.6z"/>',
  bulb: '<path d="M12 3.2a5.9 5.9 0 0 1 3.6 10.6c-.6.5-1 1.2-1.1 2H9.5c-.1-.8-.5-1.5-1.1-2A5.9 5.9 0 0 1 12 3.2z"/><path d="M9.7 18.6h4.6"/><path d="M10.7 21h2.6"/>',
  rocket: '<path d="M12 3.2c2.6 2 4.1 5.2 4.1 8.7 0 1.9-.4 3.4-1 4.5H8.9c-.6-1.1-1-2.6-1-4.5 0-3.5 1.5-6.7 4.1-8.7z"/><circle cx="12" cy="10" r="1.8"/><path d="M8.9 16.4l-2.2 1.5.8 2.9 2.4-1.8"/><path d="M15.1 16.4l2.2 1.5-.8 2.9-2.4-1.8"/>',
  sliders: '<path d="M4 8.5h7.9"/><path d="M16.5 8.5h3.5"/><path d="M4 15.5h3.5"/><path d="M12.1 15.5H20"/><circle cx="14.2" cy="8.5" r="2.3"/><circle cx="9.8" cy="15.5" r="2.3"/>',
  check: '<path d="M5.2 12.4l4.6 4.6L18.8 7.6"/>',
  arrow: '<path d="M4.6 12h13.8"/><path d="M13 6.5l5.5 5.5-5.5 5.5"/>',
  close: '<path d="M6.2 6.2l11.6 11.6"/><path d="M17.8 6.2L6.2 17.8"/>',
  chevron: '<path d="M9.6 5.6l6.4 6.4-6.4 6.4"/>',
  'zoom-in': '<circle cx="10.8" cy="10.8" r="6.6"/><path d="M15.6 15.6l4.4 4.4"/><path d="M10.8 8.2v5.2"/><path d="M8.2 10.8h5.2"/>',
  expand: '<path d="M9.4 4.6H4.6v4.8"/><path d="M14.6 19.4h4.8v-4.8"/><path d="M4.6 4.6l5.6 5.6"/><path d="M19.4 19.4l-5.6-5.6"/>',
};
