/**
 * Plain-language one-liners for events — used by both apps' activity feeds and
 * the integration showcase, so a person can read the conversation between the
 * systems without decoding JSON.
 */
import { pathwayMeta, kindMeta, interventionMeta, destinationMeta } from './vocab.js';

export function describe(e, model) {
  const p = e.payload ?? {};
  const s = model?.students?.[p.studentNumber ?? model?.matches?.[p.matchId]?.studentNumber];
  const who = s ? `${s.firstName} ${s.lastName}` : p.studentNumber ?? 'A student';
  const opp = model?.opportunities?.[p.opportunityId ?? model?.applications?.[p.applicationId]?.opportunityId];
  switch (e.type) {
    case 'student.synced':
      return `${p.firstName} ${p.lastName}'s academic profile synced (${p.degree}, ${p.average}%)`;
    case 'pathway.declared':
      return `${who} chose ${pathwayMeta(p.primary)?.label ?? p.primary}${p.backup ? ` (backup: ${pathwayMeta(p.backup)?.label})` : ''}`;
    case 'opportunity.published':
      return `Published: ${p.title} — ${kindMeta(p.kind).label}`;
    case 'opportunity.closed':
      return `Closed: ${opp?.title ?? p.opportunityId}`;
    case 'opportunity.saved':
      return `${who} ${p.saved ? 'saved' : 'unsaved'} ${opp?.title ?? 'an opportunity'}`;
    case 'application.submitted':
      return `${who} applied to ${opp?.title ?? 'an opportunity'}`;
    case 'application.updated':
      return `${who}: ${opp?.title ?? 'application'} → ${p.status}`;
    case 'mentorship.requested':
      return `${who} asked for an alumni mentor`;
    case 'mentorship.offer.made':
      return `${p.mentor?.firstName} ${p.mentor?.lastName} offered to mentor ${who}`;
    case 'mentorship.offer.responded':
      return `${who} ${p.accept ? 'accepted' : 'declined'} a mentor offer`;
    case 'mentorship.match.updated':
      return `Mentorship for ${who} → ${p.status}`;
    case 'mentorship.milestone.updated':
      return `${who}'s mentor ticked "${p.key}"`;
    case 'mentorship.message.sent': {
      const mentor = model?.matches?.[p.matchId]?.mentor;
      return p.from === 'mentor'
        ? `${mentor ? mentor.firstName : 'Mentor'} messaged ${who}`
        : `${who} messaged ${mentor ? mentor.firstName : 'their mentor'}`;
    }
    case 'mentorship.meeting.scheduled':
      return `Meeting booked for ${who} on ${p.date} ${p.time}`;
    case 'intervention.assigned':
      return `Careers assigned ${interventionMeta(p.type).label} to ${who}`;
    case 'intervention.updated':
      return `${who} ${p.status} ${model?.interventions?.[p.interventionId]?.title ?? 'support'}`;
    case 'destination.reported':
      return `${who} reported: ${destinationMeta(p.destination)?.label}${p.organisation ? ` · ${p.organisation}` : ''}`;
    default:
      return e.type;
  }
}

export function timeAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}
