import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

async function main() {
	const apiKey = process.env.MAILERSEND_API_KEY;
	const to = process.env.TEST_RECIPIENT;
	const inviteUrl = process.env.TEST_INVITE_URL || "https://thepropslist.uk/join/test-token";
	const fromEmail = process.env.MAILERSEND_FROM_EMAIL || "info@thepropslist.uk";
	const fromName = process.env.MAILERSEND_FROM_NAME || "The Props List";

	if (!apiKey) {
		throw new Error("MAILERSEND_API_KEY not set");
	}
	if (!to) {
		throw new Error("TEST_RECIPIENT not set");
	}

	const mailerSend = new MailerSend({ apiKey });
	const sentFrom = new Sender(fromEmail, fromName);
	const recipients = [new Recipient(to, "Invitee")];

	const emailParams = new EmailParams()
		.setFrom(sentFrom)
		.setTo(recipients)
		.setSubject("The Props List — You’re invited")
		.setHtml(`<p>You’ve been invited to join Props Bible.</p><p><a href="${inviteUrl}">Accept your invite</a></p>`) 
		.setText(`You’ve been invited to join Props Bible. Accept: ${inviteUrl}`);

	const res = await mailerSend.email.send(emailParams);
	console.log("Sent. x-message-id:", res?.headers?.get?.("x-message-id"));
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
