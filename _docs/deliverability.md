Email deliverability for The Props List

Set these for your sending domain (e.g., thepropslist.uk) to keep invites out of junk:

- SPF (include MailerSend)
  - TXT record @ → v=spf1 include:_spf.mailersend.net ~all
- DKIM (MailerSend DKIM records)
  - In MailerSend domain settings, copy the two CNAMEs to your DNS
- DMARC (start monitor, then enforce)
  - TXT record _dmarc → v=DMARC1; p=none; rua=mailto:dmarc@thepropslist.uk; fo=1
  - After 1–2 weeks: p=quarantine, then p=reject if stable
- Tracking domain (recommended)
  - Add link.thepropslist.uk in MailerSend and CNAME to target they provide

App settings used
- From: info@thepropslist.uk, Name: The Props List
- Reply-To: info@thepropslist.uk

Post-setup checklist
- Verify domain in MailerSend
- Send a live invite; check headers show SPF=pass and DKIM=pass
- Monitor junk rate; consider BIMI later

