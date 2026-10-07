# Reviewer notes and publication prerequisites

This packet is for testing, as confirmed by the owner. It is not a representation that nook is legally or operationally ready for public launch. The terms are complete enough to review, with explicit placeholders rather than invented decisions.

## Decisions and implementation to resolve

1. Complete [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md): operator, age/capacity, territories, dates, contact details, free-access assumption, governing law, venue, liability cap and warranty posture. Approve the proposed conduct rules and operational UGC license. No indemnity or arbitration is assumed.
2. Publish a real privacy policy following a data/retention review. Confirm CheFu Account/API and Firebase data handling, operational logs, backups, transfers, retention of deletion markers and methods for rights requests. The deletion-status record retains an account identifier indefinitely in current code; do not describe it as anonymous or “no data retained.”
3. Replace app legal alerts with reachable approved documents at sign-in and Settings. Verify conspicuous notice before account creation and appropriate assent/version records. Implement a workable material-change notice/reacceptance method before promising one. Publishing this static site alone does none of these.
4. Define content complaints, action on unlawful content, operator enforcement and any review/appeal process. Current reporting, blocking and support controls do not work. Confirm obligations for the actual release countries and distribution channels; prose does not implement those controls.
5. Validate deletion against a disposable CheFu test account in the intended environment. Verify retries, cleanup, the failure/locked state, and what members see before cleanup. Deletion removes the entire conversation for both participants. Agree retention and recovery procedures before filling in retention wording.
6. Review the operator's executed authentication, backend and hosting agreements and any required end-user restrictions. Decide which obligations apply to this consumer-facing use and how to obtain any required assent. Do not presume Nook members owe infrastructure subscription fees or accept the operator's entire vendor contract.
7. Confirm rights in the name, logo, screenshots and all underlying demo assets. The root MIT license credits Expo; it is not proof that every photo/likeness is licensed or that the operator owns all code. Preserve third-party notices. Screenshots include fictional engagement and chat simulation: retain the nearby landing-page disclosure.
8. Confirm whether the app will remain internal or be distributed through a store. Add any applicable store-specific EULA provisions only after the distribution arrangement is known. “Testing” does not establish an exemption from consumer, privacy or child-protection rules.

## Drafting choices

- Operational facts have source citations in [INVESTIGATION.md](INVESTIGATION.md). The member-facing document avoids source-code references except the closing reviewer notice.
- No “free forever,” paid plan, automatic renewal, refund waiver, permanent marketing license, AI-training license, sale of content, indiscriminate discretionary ban, guaranteed moderation, instant total deletion, end-to-end encryption or uptime commitment is asserted.
- File size is expressed as MiB because the code uses `1024 * 1024`; the UI uses “MB.” Text limits reflect UTF-16 length. Story captions are API-only; saved bookmarks do not yet have a gallery. Those distinctions are intentional.
- No AI-output section: deterministic filtering and development tools are not a consumer AI feature. No blanket vendor-contract incorporation: an operator's commercial obligations and a member's obligations are different questions.
- The narrow UGC license and its termination must be reconciled with actual provider terms. Do not promise provider-side erasure or limitations unsupported by the signed agreements. The placeholder in section 7 expressly flags this.
- Suspension/enforcement remains a placeholder because the repo only implements a deletion lock, not an abuse-suspension workflow. If a manual operational process is adopted, describe its grounds, notice and redress accurately.
- Liability language is proposed, not extracted from code. The cap is deliberately unresolved. Do not mechanically import a $50 or fees-paid cap from another service.

## Current primary-source checks

Reviewed 12 September 2026. These are issue-spotting sources, not a country-specific legal opinion. No external terms were copied wholesale.

| Source | Relevance and limits |
| --- | --- |
| CheFu Account and CheFu API agreements | Confirm the operator's executed agreements, roles, user-facing terms and applicable data processing; no provider contract has been reviewed for this draft. |
| Firebase service agreements | Confirm configured database/storage terms, data regions, subprocessors, retention and transfer obligations with the operator's executed terms. |
| [FTC COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions) | Child-directed services and actual knowledge can raise obligations; choosing a placeholder age or using social login does not resolve those issues. Actual intended audience and geography require counsel review. |
| [EU consumer guidance on unfair contract terms](https://europa.eu/youreurope/citizens/consumers/unfair-treatment/unfair-contract-terms/index_en.htm) | Supports review of unilateral changes, liability exclusions and dispute restrictions if EU consumers are involved. Do not infer EU applicability from a cloud deployment location. |
| [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/) | Consulted as the repository requires before implementing the standalone site; no Expo application code or native tabs were changed. |

## Verification limits

The existing 28 backend tests passed locally. They cover mocked authentication and authorization, publication and interaction behavior, upload validation, stories, messaging, seed safety and account deletion. They do not prove live provider settings, age eligibility, contractual assent, production backup deletion or asset rights. The landing page is standalone, uses local assets and sends no forms or analytics requests. No deployment was performed.

**A qualified attorney should review the final text and product implementation before these Terms are published or used to bind testers or the public.**
