export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  tag: string;
  highlights: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v1.1.2',
    date: '2026-10-29',
    title: 'Typed Rule Selection & Rules Guide Refinements',
    tag: 'Latest',
    highlights: [
      'Combined typing and dropdown suggestions in a single justification field across solving modes.',
      'Added automatic rule selection from abbreviations or full names, ignoring case and punctuation.',
      'Kept Rules Guide selection connected to the justification field and added feedback for unrecognized rules.',
      'Simplified the Rules Guide by removing line-count badges, example boxes, and the reference badge, with shorter category labels and search text.'
    ]
  },
  {
    version: 'v1.1.1',
    date: '2026-09-09',
    title: 'Daily Solve Persistence & Reset Rollover',
    tag: 'Release',
    highlights: [
      'Added persistent solved state tracking across page refreshes for both guest and authenticated users.',
      'Added a real-time countdown timer tracking the 00:00 UTC daily problem rotation rollover.',
      'Secured daily rotation endpoints to strictly block previewing unreleased problems from future dates.',
      'Locked completed stages from redundant re-submissions while preserving solved proof steps.'
    ]
  },
  {
    version: 'v1.1.0',
    date: '2026-09-09',
    title: 'Textbook Rotation & Solving QoL "Kyojin"',
    tag: 'Release',
    highlights: [
      'Added 96 verified canonical problems from Copi\'s Introduction to Logic (14th Ed.) across Easy, Medium, and Hard tiers.',
      'Added an in-game deductive rules reference drawer with instant search and 1-click rule insertion.',
      'Preserved proof progress across tab navigation with background KaTeX rendering hibernation.',
      'Hardened the bidirectional Distribution equivalence engine and verified full problem suite solvability.',
      'Refined problem titles into distraction-free editorial designations.'
    ]
  }
];
