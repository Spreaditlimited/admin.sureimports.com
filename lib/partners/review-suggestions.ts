export const reviewSuggestions = {
  evidence: {
    positive: ['The answers identify a clear customer group and a practical route to reach them.', 'The applicant describes relevant sales experience and a workable customer-support plan.'],
    negative: ['The customer-access claims need supporting evidence before they can be relied on.', 'The proposed acquisition channels need specific actions and measurable milestones.'],
  },
  concerns: {
    positive: ['The proposed operating plan addresses order follow-up and customer communication.', 'No additional business-fit concerns were identified in this review.'],
    negative: ['Customer-support ownership and response times need clarification.', 'The demand assumptions are not yet supported by concrete examples or enquiries.'],
  },
  message: {
    positive: ['Your answers show a clear customer focus and a practical plan for getting started.', 'Please agree the pilot targets and review date with our team before launch.'],
    negative: ['Please explain how you will reach your first ten customers, including the channels and actions you will use.', 'Please provide specific examples of customer interest and explain how you will handle daily customer support.'],
  },
  overrideReason: {
    positive: ['A limited pilot is appropriate because the customer-acquisition plan can be tested against clear milestones.', 'The identified gaps can be addressed during a closely monitored pilot with agreed support limits.'],
    negative: ['The remaining evidence gaps do not support an exception at this stage.', 'Clarification is required before an exception can be justified.'],
  },
  pilotTargets: {
    positive: ['Agree a launch date, customer-enquiry target and first-order milestone before the pilot starts.', 'Review qualified enquiries, completed orders and customer response times weekly.'],
    negative: ['Do not expand beyond the agreed pilot scope until the outstanding concerns have been resolved.', 'Pause expansion if customer-support commitments or agreed review milestones are missed.'],
  },
  kycMessage: {
    positive: ['Your business-verification evidence has been accepted. Business activation is reviewed separately.'],
    negative: ['Please upload a clear, complete copy of the requested document with all pages visible.', 'Please correct the details that do not match your business-registration documents and resubmit.'],
  },
  evidenceReference: {
    positive: ['Business registration, identity and ownership checks completed; record the check references here.'],
    negative: ['Registration details require clarification; record the mismatch and check reference here.', 'Ownership or authority is not yet supported by the submitted evidence; specify the missing document here.'],
  },
} as const;

export function appendReviewSuggestion(current: string, suggestion: string, maxLength: number) {
  if (current.split('\n').some(line => line.trim() === suggestion)) return current;
  const next = current.trimEnd() ? `${current.trimEnd()}\n${suggestion}` : suggestion;
  return next.length <= maxLength ? next : current;
}
