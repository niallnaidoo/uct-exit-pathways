/**
 * Exit Pathways — the EdOS module.
 *
 * Everything EdOS needs to add exit pathways, opportunities and alumni
 * mentorship lives in this folder. To integrate into the EdOS repo
 * (frontend/src), see docs/EDOS-INTEGRATION.md — in short:
 *
 *   1. copy this folder to frontend/src/pages/student/pathways/
 *   2. add `pathwayRoutes` inside the student <RoleLayout> in App.tsx
 *   3. add `pathwayNav` to NAV.student in components/Sidebar.tsx
 *   4. place the widgets on the student Home page
 *   5. point store.js at EdOS auth + api (two marked INTEGRATION spots)
 */
import { Route } from 'react-router-dom';
import { Pathways } from './Pathways.jsx';
import { Opportunities } from './Opportunities.jsx';
import { Mentor } from './Mentor.jsx';
import './pathways.css';

export { Pathways, Opportunities, Mentor };
export { PathwayCard, MentorCard, SupportFromCareers, OpportunitiesForYou, DestinationCard } from './widgets.jsx';
export { useEdos as usePathways, markRead } from './store.js';

/** Routes — same `/student/...` convention as EdOS App.tsx. */
export const pathwayRoutes = [
  <Route key="pathways" path="/student/pathways" element={<Pathways />} />,
  <Route key="opportunities" path="/student/opportunities" element={<Opportunities />} />,
  <Route key="mentor" path="/student/mentor" element={<Mentor />} />,
];

/** Sidebar entries — same `{ label, icon, to }` shape as EdOS Sidebar NAV. */
export const pathwayNav = [
  { label: 'Exit pathways', icon: 'target', to: '/student/pathways' },
  { label: 'Opportunities', icon: 'star', to: '/student/opportunities' },
  { label: 'Alumni mentor', icon: 'users', to: '/student/mentor' },
];
