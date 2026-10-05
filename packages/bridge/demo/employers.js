/**
 * DEMO DATA — employer accounts (private to the Careers Service platform).
 * Employers sign in to post opportunities and manage their applicants. One
 * company can post several kinds — Ubuntu Bank has a graduate programme AND
 * an Honours bursary. All organisations are fictional samples.
 */
export function demoEmployers() {
  return [
    { id: 'emp-ubuntu', name: 'Ubuntu Bank (sample)', email: 'recruit@ubuntubank.example', contact: 'Lebo Maseko', role: 'Graduate Recruitment Lead', sector: 'Finance & Banking' },
    { id: 'emp-atlantic', name: 'Atlantic Infrastructure (sample)', email: 'careers@atlantic.example', contact: 'Pieter Smit', role: 'HR Business Partner', sector: 'Engineering' },
    { id: 'emp-kasi', name: 'Kasi Cloud (sample)', email: 'talent@kasicloud.example', contact: 'Ayanda Zulu', role: 'Talent Partner', sector: 'Technology' },
  ];
}

/** Which seeded opportunities each employer owns. */
export const EMPLOYER_OF = {
  'opp-ubuntu-grad': 'emp-ubuntu',
  'opp-ubuntu-bursary': 'emp-ubuntu',
  'opp-atlantic-eng': 'emp-atlantic',
  'opp-kasi-dev': 'emp-kasi',
};
