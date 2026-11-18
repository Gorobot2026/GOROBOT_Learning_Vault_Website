/* ==========================================================================
 * GO ROBOT Learning Vault — Trainer Data Configuration
 * --------------------------------------------------------------------------
 * Edit this file to customize:
 *   1. MAX_GENS          : Maximum number of Gens allowed per level.
 *   2. LEVELS            : Tabs/pills shown at the top of the Trainer page.
 *   3. GEN_COUNTS        : Default number of Gen cards created for each level.
 *   4. DEFAULT_GEN_LINKS : Preset Photo Drive & Assessment form URLs.
 * ========================================================================== */
window.TRAINER_DATA = {
  // Maximum Gens per level (controls the "+ Add Gen" button limit)
  MAX_GENS: 4,

  // Course levels displayed as pill tabs
  LEVELS: [
    { id: 'lv1', label: 'Lv. 1' },
    { id: 'lv2', label: 'Lv. 2' },
    { id: 'lv3', label: 'Lv. 3' },
    { id: 'lv4', label: 'Lv. 4' },
    { id: 'lv5', label: 'Lv. 5' },
  ],

  // Initial number of Gen cards per level (0 = shows "Coming soon")
  GEN_COUNTS: {
    lv1: 4,
    lv2: 4,
    lv3: 2,
    lv4: 1,
    lv5: 0,
  },

  // Preset links for each level and Gen.
  // Any Gen without an entry here falls back to a placeholder "#..." link.
  DEFAULT_GEN_LINKS: {
    lv2: {
      gen4: {
        driveUrl: 'https://drive.google.com/drive/folders/1F_xJAN6aXMN2hhFTDAR6e1I2NjNohff9',
        assessmentUrl: 'https://app.smartsheet.com/b/form/01a0d6c7d4787a80915be1006c8452f7',
      },
    },
    lv3: {
      gen1: {
        assessmentUrl: 'https://app.smartsheet.com/b/form/019e96dda9807b86ab7b0b4f61010f41',
      },
      gen2: {
        driveUrl: 'https://drive.google.com/drive/folders/1kRzA8frTOtyaiPf_bAChk4LPGMAGbhg8?usp=drive_link',
        assessmentUrl: 'https://app.smartsheet.com/b/form/01a0d6c9e9de70a5af621e5d2c5f20f6',
      },
    },
    lv4: {
      gen1: {
        driveUrl: 'https://drive.google.com/drive/folders/1dGIAR6vi5gmFwwumVHgXpjve73e1B3OW?usp=drive_link',
        assessmentUrl: 'https://app.smartsheet.com/b/form/01a1c947fe91766488bf7b33e71a0b64',
      },
    },
  },
};
