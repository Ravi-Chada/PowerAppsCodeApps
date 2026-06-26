import type { Feedback } from './data';
import { THEMES, SENTIMENTS } from './feedback';

/**
 * Generates a suggested customer response.
 *
 * This is a local heuristic placeholder. To produce AI-drafted responses,
 * wire this to a Copilot Studio agent using the MCS Copilot connector
 * (run `/add-mcscopilot`) and replace the body below with a call to the
 * generated agent service — never a direct fetch/HTTP call, which will not
 * work in the Power Apps sandbox.
 */
export function draftResponse(feedback: Feedback): string {
  const name = feedback.crfaa_customername?.trim() || 'there';
  const theme = feedback.crfaa_theme ? THEMES[feedback.crfaa_theme] : undefined;
  const sentiment = feedback.crfaa_sentiment ? SENTIMENTS[feedback.crfaa_sentiment] : undefined;

  const opening = `Hi ${name},`;
  let body: string;

  switch (sentiment) {
    case 'Positive':
      body =
        `Thank you so much for your kind words` +
        (theme ? ` about our ${theme.toLowerCase()}` : '') +
        `. We're thrilled to hear you had a great experience, and we'll share your feedback with the team.`;
      break;
    case 'Negative':
      body =
        `Thank you for taking the time to share this, and I'm sorry for the trouble` +
        (theme ? ` with our ${theme.toLowerCase()}` : '') +
        `. We take this seriously and are looking into it right away. I'll follow up with the next steps shortly.`;
      break;
    default:
      body =
        `Thank you for your feedback` +
        (theme ? ` regarding our ${theme.toLowerCase()}` : '') +
        `. We appreciate you reaching out and will review your comments carefully.`;
      break;
  }

  return `${opening}\n\n${body}\n\nBest regards,\nCustomer Experience Team`;
}
