export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  tag: string;
  highlights: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v1.1.0',
    date: '2026-09-09',
    title: 'Textbook Rotation & Solving QoL "Kyojin"',
    tag: 'Latest',
    highlights: [
      'Added 96 verified canonical problems from Copi\'s Introduction to Logic (14th Ed.) across Easy, Medium, and Hard tiers.',
      'Added an in-game deductive rules reference drawer with instant search and 1-click rule insertion.',
      'Preserved proof progress across tab navigation with background KaTeX rendering hibernation.',
      'Hardened the bidirectional Distribution equivalence engine and verified full problem suite solvability.',
      'Refined problem titles into distraction-free editorial designations.'
    ]
  }
];
