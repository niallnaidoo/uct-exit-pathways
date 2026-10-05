/**
 * Employer portal — employers sign in to post opportunities (jobs, graduate
 * programmes, internships, AND bursaries/scholarships — one company can offer
 * all of them), target the right students, and manage applicants. Everything
 * they post goes live in EdOS; every stage change reaches the student there.
 */
import { useQuery } from '@tanstack/react-query';
import * as api from './api.js';
import { OpportunityBoard } from './OpportunityBoard.jsx';

export function EmployerPortal({ employerId, toast }) {
  const { data: employer } = useQuery({ queryKey: ['employer', employerId], queryFn: () => api.getEmployer(employerId) });
  const { data } = useQuery({ queryKey: ['careers'], queryFn: api.getCareers });
  if (!employer || !data) return <div className="muted">Loading…</div>;
  const mine = data.opportunities.filter((o) => o.employerId === employer.id);
  const apps = data.applications.filter((a) => mine.some((o) => o.id === a.opportunityId));
  const count = (st) => apps.filter((a) => a.status === st).length;
  return (
    <>
      <div className="emp-hero">
        <div>
          <h1>{employer.name}</h1>
          <p>
            {employer.contact} · {employer.role} · recruiting through UCT Careers
          </p>
        </div>
      </div>
      <div className="ms-admin-kpis" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
        <div>
          <strong>{mine.filter((o) => !o.closed).length}</strong>
          <span>Live in EdOS</span>
        </div>
        <div>
          <strong>{apps.length}</strong>
          <span>Applications</span>
        </div>
        <div>
          <strong>{count('shortlisted') + count('interview')}</strong>
          <span>Shortlisted / interviewing</span>
        </div>
        <div>
          <strong>{count('offer')}</strong>
          <span>Offers out</span>
        </div>
        <div>
          <strong>{count('accepted')}</strong>
          <span>Hired / accepted</span>
        </div>
      </div>
      <OpportunityBoard scope="employer" employer={employer} toast={toast} />
    </>
  );
}
