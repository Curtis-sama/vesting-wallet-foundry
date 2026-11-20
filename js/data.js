// OpenComply: reference data (SOC 2 control library and policy templates).
// The control wording is an original paraphrase written for this project;
// the "tsc" field maps each control to the AICPA Trust Services Criteria (2017, rev. 2022).

window.OC_DATA = (function () {
  const categories = {
    CC1: "Control environment",
    CC2: "Communication & information",
    CC3: "Risk assessment",
    CC4: "Monitoring activities",
    CC5: "Control activities",
    CC6: "Logical & physical access",
    CC7: "System operations",
    CC8: "Change management",
    CC9: "Risk mitigation",
    A1: "Availability",
    C1: "Confidentiality",
  };

  // [id, category, tsc, title, guidance, suggested evidence, related policy id]
  const raw = [
    ["CTL-01", "CC1", "CC1.1", "Code of conduct acknowledged", "Every employee and contractor reads and accepts a code of conduct at hire and once a year.", "Signed acknowledgments or HR system export", "acceptable-use"],
    ["CTL-02", "CC1", "CC1.2", "Leadership oversees security", "A named executive owns the security program and leadership reviews its status at least once a year.", "Meeting minutes or slides from the security review", "infosec"],
    ["CTL-03", "CC1", "CC1.3", "Roles and reporting lines defined", "An up-to-date org chart exists and security responsibilities are written into the relevant job descriptions.", "Org chart, job descriptions", "infosec"],
    ["CTL-04", "CC1", "CC1.4", "Background checks for new hires", "New hires in roles that touch customer data pass a background check where local law allows it.", "Background check confirmations (redacted)", "hr-security"],
    ["CTL-05", "CC1", "CC1.5", "Accountability for security duties", "A disciplinary process covers policy violations, and security duties are part of performance expectations.", "Disciplinary section of the handbook", "hr-security"],
    ["CTL-06", "CC2", "CC2.2", "Policies published to staff", "Security policies are stored where every employee can read them and staff are told when they change.", "Link to the policy portal, change announcements", "infosec"],
    ["CTL-07", "CC2", "CC2.2", "Security awareness training", "Staff complete security awareness training within 30 days of hire and every year after.", "Training completion report", "hr-security"],
    ["CTL-08", "CC2", "CC2.3", "Customer-facing security commitments", "Customers can find your security commitments and a way to report a vulnerability or incident.", "Terms of service, security page, security@ inbox", "incident-response"],
    ["CTL-09", "CC2", "CC2.1", "System description documented", "An architecture diagram and data-flow description of the in-scope system are kept current.", "Architecture diagram, data-flow diagram", "infosec"],
    ["CTL-10", "CC3", "CC3.1", "Security objectives defined", "Written security and availability objectives guide the risk assessment.", "Objectives section of the security policy", "risk-management"],
    ["CTL-11", "CC3", "CC3.2", "Annual risk assessment", "Risks to the system are identified, scored and reviewed at least once a year.", "Completed risk assessment, risk register export", "risk-management"],
    ["CTL-12", "CC3", "CC3.3", "Fraud risk considered", "The risk assessment explicitly covers fraud, insider misuse and management override.", "Fraud entries in the risk register", "risk-management"],
    ["CTL-13", "CC3", "CC3.4", "Significant changes assessed", "Major changes (new product, acquisition, new region, new critical vendor) trigger a risk review.", "Risk review notes tied to a change", "risk-management"],
    ["CTL-14", "CC4", "CC4.1", "Controls reviewed periodically", "Control owners confirm at least every quarter that their controls still operate.", "Quarterly control review sign-off", "infosec"],
    ["CTL-15", "CC4", "CC4.2", "Deficiencies tracked to closure", "Failed controls and audit findings are logged as tickets with an owner and a due date.", "Ticket list of findings and their status", "infosec"],
    ["CTL-16", "CC4", "CC4.1", "Annual penetration test", "An independent tester attacks the application and infrastructure every year, and findings are fixed.", "Pen test report and remediation tickets", "vulnerability"],
    ["CTL-17", "CC5", "CC5.3", "Policies approved and reviewed yearly", "Management approves every security policy and reviews each one at least once a year.", "Policy approval dates and approver names", "infosec"],
    ["CTL-18", "CC5", "CC5.2", "Technology controls selected", "General IT controls (access, change, operations) are chosen to address the risks in the register.", "Control-to-risk mapping", "risk-management"],
    ["CTL-19", "CC6", "CC6.1", "Unique accounts, SSO and MFA", "Each person has their own account, and MFA is required on email, source control, cloud console and production.", "Identity provider MFA settings screenshot", "access-control"],
    ["CTL-20", "CC6", "CC6.2", "Access requests approved", "New access to production and sensitive systems is requested and approved before it is granted.", "Access request tickets with approvals", "access-control"],
    ["CTL-21", "CC6", "CC6.3", "Prompt offboarding", "Departing staff lose all access within one business day of their last day.", "Offboarding checklist, deprovisioning logs", "access-control"],
    ["CTL-22", "CC6", "CC6.3", "Quarterly access reviews", "Owners review who has access to critical systems every quarter and remove what is not needed.", "Signed access review per system", "access-control"],
    ["CTL-23", "CC6", "CC6.3", "Least privilege for admin rights", "Administrator and production access is limited to people who need it for their job.", "List of admins per system", "access-control"],
    ["CTL-24", "CC6", "CC6.1", "Encryption at rest", "Databases, storage buckets and backups that hold customer data are encrypted at rest.", "Cloud encryption settings screenshot", "data-protection"],
    ["CTL-25", "CC6", "CC6.7", "Encryption in transit", "All external traffic uses TLS 1.2 or newer, and plain HTTP redirects to HTTPS.", "TLS scan result, load balancer config", "data-protection"],
    ["CTL-26", "CC6", "CC6.8", "Endpoint protection", "Company laptops have disk encryption, automatic screen lock, OS updates and malware protection.", "MDM compliance report", "acceptable-use"],
    ["CTL-27", "CC6", "CC6.6", "Network boundaries", "Firewalls or security groups block all inbound traffic except what is needed; databases are not public.", "Security group rules export", "access-control"],
    ["CTL-28", "CC6", "CC6.4", "Physical access", "Data centers are run by a provider with its own SOC 2 report; offices restrict entry to staff and guests.", "Cloud provider SOC 2 report, office access policy", "vendor"],
    ["CTL-29", "CC6", "CC6.1", "Secrets management", "Passwords, API keys and certificates are kept in a secrets manager, never in source code.", "Secrets manager inventory, secret scanning results", "access-control"],
    ["CTL-30", "CC6", "CC6.5", "Secure disposal of devices and media", "Retired laptops and disks are wiped or destroyed and the disposal is recorded.", "Disposal log or certificates", "data-protection"],
    ["CTL-31", "CC7", "CC7.1", "Vulnerability scanning and patching", "Dependencies, containers and hosts are scanned and critical issues are fixed within a set deadline.", "Scanner reports, patch SLA tracking", "vulnerability"],
    ["CTL-32", "CC7", "CC7.2", "Logging and alerting", "Security-relevant logs are centralized, kept for at least a year, and generate alerts on suspicious activity.", "Log retention settings, alert rules", "vulnerability"],
    ["CTL-33", "CC7", "CC7.3", "Security events triaged", "Alerts are reviewed by an on-call person and escalated to an incident when needed.", "On-call schedule, alert tickets", "incident-response"],
    ["CTL-34", "CC7", "CC7.4", "Incident response plan", "A written plan defines severity levels, roles, communication and customer notification.", "Incident response plan", "incident-response"],
    ["CTL-35", "CC7", "CC7.4", "Incident response exercise", "The team runs a tabletop exercise or a real post-mortem at least once a year.", "Tabletop notes or post-mortems", "incident-response"],
    ["CTL-36", "CC7", "CC7.5", "Recovery after incidents", "After an incident, systems are restored, the root cause is fixed and lessons are recorded.", "Post-mortem documents", "business-continuity"],
    ["CTL-37", "CC8", "CC8.1", "Code review before merge", "Every change to production code is reviewed and approved by someone other than the author.", "Branch protection settings, sample pull requests", "change-management"],
    ["CTL-38", "CC8", "CC8.1", "Automated testing and separate environments", "Changes pass automated tests and are tried outside production before release.", "CI pipeline config, staging environment", "change-management"],
    ["CTL-39", "CC8", "CC8.1", "Restricted deployments", "Only the pipeline or authorized people can deploy, and emergency changes are reviewed afterwards.", "Deploy permissions, emergency change log", "change-management"],
    ["CTL-40", "CC8", "CC8.1", "Infrastructure configuration managed", "Infrastructure is defined as code or has a documented baseline, and changes go through review.", "Terraform repo, configuration baseline", "change-management"],
    ["CTL-41", "CC9", "CC9.2", "Vendor inventory and review", "Vendors that touch customer data are listed, risk-rated and reviewed once a year.", "Vendor register, vendor SOC 2 reports", "vendor"],
    ["CTL-42", "CC9", "CC9.1", "Business continuity plan", "A written plan explains how the business keeps running if a key system, vendor or person is lost.", "Business continuity plan", "business-continuity"],
    ["CTL-43", "CC9", "CC9.1", "Insurance coverage", "Cyber and liability insurance cover the risks you have chosen to transfer.", "Insurance certificate", "risk-management"],
    ["CTL-44", "A1", "A1.1", "Capacity and uptime monitoring", "Usage and uptime are monitored and alerts fire before capacity runs out.", "Monitoring dashboards, uptime reports", "business-continuity"],
    ["CTL-45", "A1", "A1.2", "Automated backups", "Production data is backed up automatically to a separate location.", "Backup configuration, backup job history", "business-continuity"],
    ["CTL-46", "A1", "A1.3", "Restore and disaster recovery test", "A restore from backup and a disaster recovery drill are performed at least once a year.", "Restore test record with timings", "business-continuity"],
    ["CTL-47", "C1", "C1.1", "Data classification", "Data is classified (for example public, internal, confidential) and handled according to its class.", "Data classification policy, data inventory", "data-protection"],
    ["CTL-48", "C1", "C1.2", "Data retention and deletion", "Customer data is kept only as long as needed and deleted securely on request or at contract end.", "Retention schedule, deletion tickets", "data-protection"],
    ["CTL-49", "C1", "C1.1", "Confidentiality agreements", "Employees and contractors sign confidentiality agreements before they get access.", "Signed NDAs or employment contracts", "hr-security"],
  ];

  const controls = raw.map(([id, category, tsc, title, guidance, evidence, policy]) => ({
    id, category, tsc, title, guidance, evidence, policy,
  }));

  const policies = [
    {
      id: "infosec",
      title: "Information Security Policy",
      body: `# Information Security Policy

**Owner:** {{owner}} · **Applies to:** all employees and contractors of {{company}}

## Purpose
This policy sets out how {{company}} protects the confidentiality, integrity and availability of its systems and of the data customers entrust to it.

## Objectives
- Protect customer data from unauthorized access, change or loss.
- Keep the service available within the commitments made to customers.
- Meet legal, regulatory and contractual security obligations.

## Responsibilities
- **Leadership** approves this policy, funds the security program and reviews its status at least once a year.
- **The security owner** ({{owner}}) runs the program, keeps policies current and reports on risks.
- **Every employee** follows the security policies and reports suspected incidents immediately.

## Policy set
This policy is supported by the Access Control, Change Management, Incident Response, Risk Management, Vendor Management, Business Continuity, Data Protection, Vulnerability Management, HR Security and Acceptable Use policies.

## Review
All security policies are reviewed and re-approved at least once a year, or sooner after a significant change.

## Exceptions
Exceptions must be requested in writing, approved by the security owner and recorded with an expiry date.`,
    },
    {
      id: "access-control",
      title: "Access Control Policy",
      body: `# Access Control Policy

**Owner:** {{owner}} · **Applies to:** all systems that store or process {{company}} or customer data

## Principles
- Access is granted on a least-privilege, need-to-know basis.
- Every person uses a unique account; shared accounts are not allowed.
- Multi-factor authentication is required for email, source control, cloud consoles and production.

## Granting access
Access to production and sensitive systems is requested through a ticket and approved by the system owner before it is granted.

## Removing access
- When someone leaves, all access is removed within one business day.
- When someone changes role, access no longer needed is removed within five business days.

## Access reviews
System owners review user access to critical systems every quarter and record the result.

## Secrets
Passwords, keys and tokens are stored in an approved secrets manager and are never committed to source code.

## Network
Inbound network access is denied by default. Databases are never exposed to the public internet.`,
    },
    {
      id: "change-management",
      title: "Change Management Policy",
      body: `# Change Management Policy

**Owner:** {{owner}} · **Applies to:** application code and infrastructure of {{company}}

## Requirements
- All changes are tracked in version control.
- Every change to production is reviewed and approved by someone other than its author.
- Automated tests must pass before a change can be merged.
- Changes are tried in a non-production environment before release when practical.
- Only the deployment pipeline or authorized engineers can deploy to production.

## Infrastructure
Infrastructure is managed as code where possible. Manual changes to production infrastructure are logged and reviewed.

## Emergency changes
An emergency change may skip prior review to restore service. It must be reviewed within two business days and documented.`,
    },
    {
      id: "incident-response",
      title: "Incident Response Plan",
      body: `# Incident Response Plan

**Owner:** {{owner}} · **Applies to:** all security and availability incidents at {{company}}

## Reporting
Anyone who suspects an incident reports it right away to the security owner or the on-call engineer. Customers and researchers can report to the published security contact.

## Severity levels
- **SEV1:** confirmed breach of customer data or full outage.
- **SEV2:** partial outage or suspected breach.
- **SEV3:** minor issue with no customer impact.

## Roles
- **Incident lead:** coordinates the response and makes decisions.
- **Communications lead:** handles internal updates and customer notices.
- **Responders:** investigate, contain and fix.

## Phases
1. Detect and triage.
2. Contain the damage.
3. Remove the cause and recover.
4. Notify affected customers and authorities within legal and contractual deadlines.
5. Hold a blameless post-mortem and track follow-up actions.

## Testing
This plan is tested with a tabletop exercise at least once a year.`,
    },
    {
      id: "risk-management",
      title: "Risk Management Policy",
      body: `# Risk Management Policy

**Owner:** {{owner}} · **Applies to:** {{company}}

## Process
1. **Identify** risks to the security, availability and confidentiality of the system, including fraud and insider risk.
2. **Score** each risk for likelihood and impact on a 1–5 scale. Score = likelihood × impact.
3. **Treat** each risk: mitigate, transfer, avoid or accept.
4. **Assign** an owner to every risk.

## Risk appetite
Risks scoring 15 or more must be mitigated or formally accepted by leadership.

## Frequency
A full risk assessment is performed at least once a year and whenever a significant change occurs (new product, new region, acquisition, new critical vendor).

## Records
All risks are kept in the risk register with their score, treatment, owner and status.`,
    },
    {
      id: "vendor",
      title: "Vendor Management Policy",
      body: `# Vendor Management Policy

**Owner:** {{owner}} · **Applies to:** third parties that access {{company}} or customer data

## Inventory
Every vendor that stores, processes or can access customer data is listed in the vendor register.

## Risk rating
Vendors are rated high, medium or low risk based on the data they access and how critical they are.

## Due diligence
Before onboarding a high-risk vendor, {{company}} obtains its SOC 2 report, ISO 27001 certificate or a completed security questionnaire.

## Contracts
Contracts with vendors that handle customer data include confidentiality and security obligations and a data processing agreement where required.

## Review
High-risk vendors are reviewed every year. Vendors no longer used are removed and their access revoked.`,
    },
    {
      id: "business-continuity",
      title: "Business Continuity & Disaster Recovery Plan",
      body: `# Business Continuity & Disaster Recovery Plan

**Owner:** {{owner}} · **Applies to:** the production service of {{company}}

## Objectives
- **Recovery time objective (RTO):** {{rto}}
- **Recovery point objective (RPO):** {{rpo}}

## Backups
Production data is backed up automatically at least daily to a separate region or account. Backups are encrypted.

## Recovery
The engineering team keeps written runbooks to restore the service from backup or move it to another region.

## Key people and vendors
Critical knowledge is documented so the service does not depend on a single person. Alternatives are identified for critical vendors.

## Testing
A restore from backup and a disaster recovery exercise are performed at least once a year, and results are recorded.`,
    },
    {
      id: "data-protection",
      title: "Data Protection & Classification Policy",
      body: `# Data Protection & Classification Policy

**Owner:** {{owner}} · **Applies to:** all data handled by {{company}}

## Classification
- **Public:** approved for public release.
- **Internal:** for employees only.
- **Confidential:** customer data, credentials, financial and personal data.

## Handling
- Confidential data is encrypted at rest and in transit (TLS 1.2 or newer).
- Confidential data is not copied to personal devices or unapproved services.
- Production customer data is not used for testing unless anonymized.

## Retention and deletion
Customer data is kept only as long as needed for the service or required by law, and is deleted securely at contract end or on a valid request.

## Disposal
Devices and media that held confidential data are wiped or destroyed before disposal, and the disposal is recorded.`,
    },
    {
      id: "vulnerability",
      title: "Vulnerability Management Policy",
      body: `# Vulnerability Management Policy

**Owner:** {{owner}} · **Applies to:** {{company}} applications, dependencies and infrastructure

## Scanning
Dependencies, container images and hosts are scanned automatically and continuously.

## Fix deadlines
- **Critical:** 7 days
- **High:** 30 days
- **Medium:** 90 days
- **Low:** best effort

## Penetration testing
An independent penetration test is performed at least once a year. Findings follow the deadlines above.

## Logging and monitoring
Security-relevant logs are centralized and kept for at least one year. Alerts on suspicious activity are reviewed by the on-call engineer.`,
    },
    {
      id: "hr-security",
      title: "Human Resources Security Policy",
      body: `# Human Resources Security Policy

**Owner:** {{owner}} · **Applies to:** employees and contractors of {{company}}

## Before hiring
- Background checks are completed for roles with access to customer data, where permitted by law.
- Confidentiality agreements are signed before access is granted.

## During employment
- Security awareness training is completed within 30 days of hire and every year after.
- Staff acknowledge the security policies and the code of conduct at hire and every year.
- Violations of security policies may lead to disciplinary action.

## Leaving
- All access is removed within one business day of the last working day.
- Company devices and data are returned.`,
    },
    {
      id: "acceptable-use",
      title: "Acceptable Use & Code of Conduct",
      body: `# Acceptable Use & Code of Conduct

**Owner:** {{owner}} · **Applies to:** everyone who uses {{company}} systems or devices

## Conduct
Act honestly, treat colleagues and customers with respect and report wrongdoing without fear of retaliation.

## Devices
- Company laptops must have disk encryption, automatic screen lock (15 minutes or less) and current OS updates.
- Do not disable security software.
- Report a lost or stolen device immediately.

## Accounts
- Never share passwords or MFA codes.
- Use the company password manager.

## Data
- Only use approved tools to store or share company and customer data.
- Do not paste confidential data into unapproved AI tools or websites.

## Acknowledgment
I have read and will follow this policy.`,
    },
  ];

  return { categories, controls, policies };
})();
