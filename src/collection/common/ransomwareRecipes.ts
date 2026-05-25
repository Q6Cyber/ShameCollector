export const RansomwareRecipes = {
  Anubis: {
    victimRowSelector: 'div:has(> h5.fw-bold)',
    fields: {
      name: 'h5.fw-bold:first-of-type',
      dateText: '',
      links: 'a.btn-light',
    },
  },
  Abyss: {
    clickSelector: "//button[contains(text(), 'Show')]",
    closeSelector: '.btn-close',
    modalSelector: '.modal-content',

    victimRowSelector: '.synthetic-victim-wrapper',
    fields: {
      name: '.modal-title',
      dateText: '',
      links: '#full-card-links a',
    },
  },
  Ailock: {
    clickSelector: "//button[contains(text(), 'More...')]",
    closeSelector: '.close-btn',
    modalSelector: '.modal-content',

    victimRowSelector: '.synthetic-victim-wrapper',
    fields: {
      name: 'h3',
      dateText: 'span.nes-text',
      website: 'p:last-of-type',
      links: '.modal-content a',
    },
  },
  Benzona: {
    victimRowSelector: '.victims-grid .victim-card',
    fields: {
      name: 'h3',
      website: 'h3',
    },
  },
  Aurora: {
    clickSelector: "//div[@class='blog-grid'] //a",
    closeSelector: 'a.back-link',
    modalSelector: 'body',

    victimRowSelector: '.synthetic-victim-wrapper',
    fields: {
      name: 'h3',
      website: '.contact-item a[href^="http"]',
    },
  },
};
