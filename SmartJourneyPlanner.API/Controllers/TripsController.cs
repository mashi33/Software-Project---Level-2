using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using smart_journey.backend.Models;
using MailKit.Net.Smtp;
using MimeKit;

namespace smart_journey.backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TripsController : ControllerBase
    {
        private readonly IMongoCollection<Trip> _tripsCollection;

        public TripsController(IMongoClient mongoClient)
        {
            var database = mongoClient.GetDatabase("SmartJourneyDB");
            _tripsCollection = database.GetCollection<Trip>("Trips");
        }

        [HttpPost]
        public async Task<IActionResult> CreateTrip(Trip newTrip)
        {
            try
            {
                await _tripsCollection.InsertOneAsync(newTrip);

                if (newTrip.Members != null)
                {
                    foreach (var member in newTrip.Members)
                    {
                        // call the mothod of send email
                        await SendInviteEmail(member.Email, newTrip.TripName, member.Role, newTrip.Id!);
                    }
                }

                return Ok(new { message = "Trip saved and invites sent!", tripId = newTrip.Id });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error: " + ex.Message });
            }
        }

        private async Task SendInviteEmail(string receiverEmail, string tripName, string role, string tripId)
        {
            try
            {
                var message = new MimeMessage();
                message.From.Add(new MailboxAddress("Smart Journey", "dinuriththsarani@gmail.com"));
                message.To.Add(new MailboxAddress("", receiverEmail));
                message.Subject = "Trip Invitation - Smart Journey";
                
                 string invitationLink = $"http://localhost:4200/trip-summary/{tripId}"; // link with trip id
                message.Body = new TextPart("html")
                {
                     Text = $@"
                       <h3>Hi there!</h3>
                       <p>You have been invited to join the trip <b>'{tripName}'</b> as an <b>{role}</b>.</p>
                       <p>To view the trip details and join your friends, please click the link below:</p>
                       <a href='{invitationLink}' style='padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;'>View Trip & Join</a>
                      <br><br>
                      <p>If you don't have an account yet, you'll be asked to create one.</p>
                      <p>Happy Journey!<br>Smart Journey Team</p>"
};

                using (var client = new SmtpClient())
                {
                    await client.ConnectAsync("smtp.gmail.com", 587, MailKit.Security.SecureSocketOptions.StartTls);
                    
           
                    await client.AuthenticateAsync("dinuriththsarani@gmail.com", "APP PASSWORD");
                    
                    await client.SendAsync(message);
                    await client.DisconnectAsync(true);
                }
                Console.WriteLine($"✅ Email sent to {receiverEmail}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Failed to send email to {receiverEmail}: {ex.Message}");
            }
        }
    }
}