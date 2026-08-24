using System;
using System.Threading.Tasks;
using MailKit.Net.Smtp;
using MimeKit;
using Microsoft.Extensions.Configuration; 

namespace SmartJourneyPlanner.API.Services
{
    public class EmailService
    {
        private readonly IConfiguration _configuration;

        // injecting IConfiguration to read email settings from appsettings.json or environment variables
        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        //  1. Verification Email Sender
        public async Task SendVerificationEmailAsync(string receiverEmail, string verificationLink)
        {
           var senderEmail = _configuration["EmailSettings:SenderEmail"]
           ?? throw new InvalidOperationException("Sender email is missing.");
           
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("Smart Journey", senderEmail));
            message.To.Add(new MailboxAddress("", receiverEmail));
            message.Subject = "Verify Your Email - Smart Journey Planner";

            message.Body = new TextPart("html")
            {
                Text = $@"
                <div style=""font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; line-height: 1.5;"">
                    <h2 style=""color: #28a745;"">Welcome to Smart Journey Planner!</h2>
                    <p>Thank you for registering. Please verify your email address to activate your account and start planning your adventures.</p>
                    <p>Click the button below to verify your email (This link expires in 24 hours):</p>
                    <div style=""margin: 30px 0;"">
                        <a href=""{verificationLink}"" style=""background-color: #28a745; color: #ffffff !important; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;"">Verify My Email</a>
                    </div>
                    <p style=""font-size: 14px; color: #666;"">If you did not create an account, please ignore this email.</p>
                    <hr style=""border: 0; border-top: 1px solid #eee; margin: 20px 0;"" />
                    <p>Happy Journey!<br><b>Smart Journey Team</b></p>
                </div>"
            };

            await SendEmailAsync(message);
        }

        // 2. Trip Invitation Email Sender
        public async Task SendInviteEmailAsync(string receiverEmail, string tripName, string role, string tripId)
        {
            var senderEmail = _configuration["EmailSettings:SenderEmail"]
            ?? throw new InvalidOperationException("Sender email is missing.");
            
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("Smart Journey", senderEmail));
            message.To.Add(new MailboxAddress("", receiverEmail));
            message.Subject = "Trip Invitation - Smart Journey";

            string invitationLink = $"http://localhost:4200/login?tripId={tripId}&role={role.ToLower()}";

            message.Body = new TextPart("html")
            {
                Text = $@"
                <div style=""font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; line-height: 1.5;"">
                    <h2 style=""color: #007bff;"">Hi there!</h2>
                    <p>You have been invited to join the trip <b>'{tripName}'</b> as a <b>{role}</b>.</p>
                    <p>To view the trip details and join your friends, please click the button below:</p>
                    <div style=""margin: 30px 0;"">
                        <a href=""{invitationLink}"" style=""background-color: #007bff; color: #ffffff !important; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;"">Accept Invitation & View Details</a>
                    </div>
                    <p style=""font-size: 14px; color: #666;"">If you don't have an account yet, you'll be asked to create one after clicking the button.</p>
                    <hr style=""border: 0; border-top: 1px solid #eee; margin: 20px 0;"" />
                    <p>Happy Journey!<br><b>Smart Journey Team</b></p>
                </div>"
            };

            await SendEmailAsync(message);
        }

        //  3. Password Reset Email Sender
        public async Task SendPasswordResetEmailAsync(string receiverEmail, string resetLink)
        {
            var senderEmail = _configuration["EmailSettings:SenderEmail"]
            ?? throw new InvalidOperationException("Sender email is missing.");
    
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("Smart Journey", senderEmail));
            message.To.Add(new MailboxAddress("", receiverEmail));
            message.Subject = "Reset Your Password - Smart Journey Planner";

            message.Body = new TextPart("html")
           {
                Text = $@"
                <div style=""font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; line-height: 1.5;"">
                   <h2 style=""color: #dc3545;"">Password Reset Request</h2>
                   <p>You requested to reset your password for your Smart Journey Planner account.</p>
                   <p>Please click the button below to set a new password. **This link will expire in 1 hour**:</p>
                   <div style=""margin: 30px 0;"">
                   <a href=""{resetLink}"" style=""background-color: #dc3545; color: #ffffff !important; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;"">Reset Password</a>
                   </div>
                   <p style=""font-size: 14px; color: #666;"">If you did not request a password reset, please ignore this email safely.</p>
                   <hr style=""border: 0; border-top: 1px solid #eee; margin: 20px 0;"" />
                   <p>Best Regards,<br><b>Smart Journey Team</b></p>
                </div>"
         };

            await SendEmailAsync(message);
       }
       

       public async Task SendEmailChangeVerificationAsync(string newEmail, string verificationLink, string userName)
{
    var senderEmail = _configuration["EmailSettings:SenderEmail"]
        ?? throw new InvalidOperationException("Sender email is missing.");

    var message = new MimeMessage();
    message.From.Add(new MailboxAddress("Smart Journey", senderEmail));
    message.To.Add(new MailboxAddress("", newEmail));
    message.Subject = "Confirm Your New Email - Smart Journey Planner";

    message.Body = new TextPart("html")
    {
        Text = $@"
        <div style=""font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; line-height: 1.5;"">
            <h2 style=""color: #007bff;"">Confirm Email Change</h2>
            <p>Hi {(string.IsNullOrEmpty(userName) ? "there" : userName)},</p>
            <p>You requested to change your account email to <b>{newEmail}</b>.</p>
            <p>Click the button below to confirm. This link expires in <b>24 hours</b>.</p>
            <div style=""margin: 30px 0;"">
                <a href=""{verificationLink}"" style=""background-color: #007bff; color: #ffffff !important; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;"">Confirm New Email</a>
            </div>
            <p style=""font-size: 14px; color: #666;"">If you did not request this change, please ignore this email. Your current email will remain unchanged.</p>
            <hr style=""border: 0; border-top: 1px solid #eee; margin: 20px 0;"" />
            <p>Smart Journey Team</p>
        </div>"
    };

    await SendEmailAsync(message);
}

        // Core Email Sender Logic reading from Configuration
        private async Task SendEmailAsync(MimeMessage message)
        {
            var smtpServer = _configuration["EmailSettings:SmtpServer"]
            ?? throw new InvalidOperationException("SMTP Server is missing.");

            var senderEmail = _configuration["EmailSettings:SenderEmail"]
            ?? throw new InvalidOperationException("Sender Email is missing.");

            var appPassword = _configuration["EmailSettings:AppPassword"]
            ?? throw new InvalidOperationException("App Password is missing.");

            var portString = _configuration["EmailSettings:Port"] ?? "587";
            var port = int.Parse(portString);

            try
            {
                using (var client = new SmtpClient())
                {
                    // මෙතැනදී _emailSettings වෙනුවට උඩින් ඩික්ලේර් කරපු variables (smtpServer, port, senderEmail, appPassword) පාවිච්චි කළා
                    await client.ConnectAsync(smtpServer, port, MailKit.Security.SecureSocketOptions.StartTls);
                    await client.AuthenticateAsync(senderEmail, appPassword);
                    await client.SendAsync(message);
                    await client.DisconnectAsync(true);
                }
                Console.WriteLine("Email sent successfully!");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"MAIL ERROR: {ex.Message}");
                Console.WriteLine($"INNER EXCEPTION: {ex.InnerException?.Message}");
            }
        }
    }
}