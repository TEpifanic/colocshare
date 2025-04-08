import sgMail from '@sendgrid/mail';

// Initialiser SendGrid avec l'API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function sendVerificationEmail(email: string, code: string) {
  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL as string,
    subject: 'Votre code de vérification - ColocShare',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4F46E5;">Votre code de vérification</h1>
        <p>Voici votre code de vérification pour ColocShare :</p>
        <div style="background-color: #F3F4F6; padding: 24px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 0.5em; color: #4F46E5;">${code}</span>
        </div>
        <p>Ce code est valable pendant 10 minutes.</p>
        <p style="color: #666;">Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error('Erreur lors de l\'envoi du code de vérification:', error);
    throw error;
  }
}

export async function sendInvitationEmail(email: string, url: string, colocationName: string) {
  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL as string,
    subject: `Invitation à rejoindre la colocation ${colocationName} - ColocShare`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4F46E5;">Invitation à rejoindre une colocation</h1>
        <p>Vous avez été invité(e) à rejoindre la colocation <strong>${colocationName}</strong> sur ColocShare.</p>
        <p>Pour accepter l'invitation, cliquez sur le lien ci-dessous :</p>
        <a href="${url}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Rejoindre la colocation
        </a>
        <p style="color: #666;">Si vous n'êtes pas intéressé(e), vous pouvez ignorer cet email. L'invitation expirera dans 48 heures.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email d\'invitation:', error);
    throw error;
  }
} 