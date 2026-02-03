export const sendSubscriptionEmail = async (toEmail: string, planName: string, amount: string) => {
    const apiKey = import.meta.env.VITE_SENDGRID_API_KEY;
    const senderEmail = import.meta.env.VITE_SENDGRID_SENDER_EMAIL;

    if (!apiKey || !senderEmail) {
        console.warn('SendGrid API Key or Sender Email not configured.');
        return;
    }

    const emailData = {
        personalizations: [
            {
                to: [{ email: toEmail }],
                subject: `Welcome to My Donkey ${planName} Plan!`,
            },
        ],
        from: { email: senderEmail, name: 'My Donkey OTT' },
        content: [
            {
                type: 'text/html',
                value: `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h1>Welcome to the Herd! 🫏</h1>
                        <p>Hi there,</p>
                        <p>Thank you for subscribing to the <strong>${planName}</strong> plan.</p>
                        <p><strong>Amount Paid:</strong> ${amount}</p>
                        <p>You now have access to premium entertainment. Sit back, relax, and enjoy!</p>
                        <br/>
                        <p>Best regards,</p>
                        <p>The My Donkey Team</p>
                    </div>
                `,
            },
        ],
    };

    try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailData),
        });

        if (response.ok) {
            console.log('Subscription email sent successfully!');
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('Failed to send email:', response.status, errorData);
            console.warn('Note: Client-side calls to SendGrid often fail due to CORS. This is expected in a browser-only environment without a proxy.');
        }
    } catch (error) {
        console.error('Error sending email:', error);
    }
};
