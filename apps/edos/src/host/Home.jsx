/**
 * Stand-in for EdOS's student Home. The hero is EdOS's; everything below it
 * is an Exit Pathways widget — that's all the real Home page needs to add.
 */
import { useEdos } from '../pathways/store.js';
import {
  PathwayCard,
  MentorCard,
  SupportFromCareers,
  OpportunitiesForYou,
  DestinationCard,
} from '../pathways/widgets.jsx';
import { nextTest } from '../../../../packages/bridge/demo/roster.js';

export function Home() {
  const { me, decl } = useEdos();
  const hour = new Date().getHours();
  const greet = `Good ${hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}`;

  if (me.status === 'graduated')
    return (
      <div className="ed-page">
        <div className="card card--ink ed-hero appear">
          <div className="ed-hero-main">
            <div className="t-eyebrow" style={{ color: 'rgba(243,238,229,0.6)' }}>
              Class of {me.expectedGraduation} · {me.degree}
            </div>
            <h1 className="t-display">Welcome back, {me.firstName}.</h1>
            <p>You’ll always have a home at UCT. Tell us where you are now — it helps us support you and the students behind you.</p>
          </div>
        </div>
        <SupportFromCareers />
        <DestinationCard />
        <OpportunitiesForYou />
      </div>
    );

  const test = nextTest(me);
  const days = test ? Math.ceil((new Date(`${test.date}T12:00:00`) - Date.now()) / 86400000) : null;
  return (
    <div className="ed-page">
      <div className="card card--ink ed-hero appear">
        <div className="ed-hero-main">
          <div className="t-eyebrow" style={{ color: 'rgba(243,238,229,0.6)' }}>
            {me.stage} · {me.degree}
          </div>
          <h1 className="t-display">
            {greet}, {me.firstName}.
          </h1>
          <p>
            {decl
              ? 'Here’s what will move your plan forward this week.'
              : `You graduate in ${me.expectedGraduation}. Have you thought about what comes next? It takes two minutes to plan.`}
          </p>
        </div>
        <div className="ed-hero-stats">
          <div>
            <span className="t-num">{me.average}%</span>
            <small>Average</small>
          </div>
          <div>
            <span className="t-num">
              {me.creditsCompleted}
              <em>/{me.creditsRequired}</em>
            </span>
            <small>Credits</small>
          </div>
          {test && (
            <div>
              <span className="t-num">{days}d</span>
              <small>To {test.label.toLowerCase()} · {test.code}</small>
            </div>
          )}
        </div>
      </div>

      <div className="ed-grid-2">
        <PathwayCard />
        <MentorCard />
      </div>
      <SupportFromCareers />
      <OpportunitiesForYou />
    </div>
  );
}
