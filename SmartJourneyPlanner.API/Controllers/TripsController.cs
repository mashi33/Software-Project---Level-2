using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SmartJourneyPlanner.API.Models;
using MailKit.Net.Smtp;
using MimeKit;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;

namespace SmartJourneyPlanner.API.Controllers
{
  [ApiController]
  [Route("api/trips")]
  public class TripsController : ControllerBase
  {
    private readonly IMongoCollection<Trip> _tripsCollection;

    public TripsController(IMongoClient mongoClient)
    {
      var database = mongoClient.GetDatabase("SmartJourneyDb");
      _tripsCollection = database.GetCollection<Trip>("Trips");
    }

    [HttpGet]
    public async Task<ActionResult<List<Trip>>> GetAllTrips()
    {
      try
      {
        var trips = await _tripsCollection.Find(_ => true).ToListAsync();
        return Ok(trips);
      }
      catch (Exception ex)
      {
        return BadRequest(new { message = "Error: " + ex.Message });
      }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTrip(string id)
    {
      try
      {
        var trip = await _tripsCollection.Find(t => t.Id == id).FirstOrDefaultAsync();
        if (trip == null) return NotFound(new { message = "Trip not found" });
        return Ok(trip);
      }
      catch (Exception ex)
      {
        return BadRequest(new { message = "Error: " + ex.Message });
      }
    }

    [HttpGet("by-email/{email}")]
    public async Task<ActionResult<List<Trip>>> GetTripsByEmail(string email)
    {
      try
      {
        var filter = Builders<Trip>.Filter.Or(
            Builders<Trip>.Filter.Eq(t => t.CreatedBy, email),
            Builders<Trip>.Filter.ElemMatch(t => t.Members, m => m.Email == email)
        );
        var trips = await _tripsCollection.Find(filter).ToListAsync();
        return Ok(trips);
      }
      catch (Exception ex)
      {
        return BadRequest(new { message = "Error: " + ex.Message });
      }
    }

    [HttpPost("{tripId}/add-place")]
    public async Task<IActionResult> AddPlaceToTrip(string tripId, [FromBody] TripPlace place)
    {
      try
      {
        var filter = Builders<Trip>.Filter.Eq(t => t.Id, tripId);
        var update = Builders<Trip>.Update.Push(t => t.SavedPlaces, place);
        var result = await _tripsCollection.UpdateOneAsync(filter, update);

        if (result.MatchedCount == 0)
          return NotFound(new { message = "Trip not found" });

        return Ok(new { message = "Place added to trip successfully!" });
      }
      catch (Exception ex)
      {
        return BadRequest(new { message = "Error: " + ex.Message });
      }
    }

    [HttpPost]
    public async Task<IActionResult> CreateTrip([FromBody] Trip newTrip)
    {
      try
      {
        await _tripsCollection.InsertOneAsync(newTrip);
        if (newTrip.Members != null)
        {
          foreach (var member in newTrip.Members)
          {
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

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTrip(string id, [FromBody] Trip updatedTrip)
    {
      try
      {
        var filter = Builders<Trip>.Filter.Eq(t => t.Id, id);
        updatedTrip.Id = id;
        var result = await _tripsCollection.ReplaceOneAsync(filter, updatedTrip);
        if (result.MatchedCount == 0)
          return NotFound(new { message = "Trip not found in database." });
        return Ok(new { message = "Trip updated successfully!" });
      }
      catch (Exception ex)
      {
        return BadRequest(new { message = ex.Message });
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
        string invitationLink = $"http://localhost:4200/trip-summary/{tripId}";
        message.Body = new TextPart("html")
        {
          Text = $@"<div style='font-family: Arial, sans-serif;'>
                        <h3>Hi there!</h3>
                        <p>You have been invited to join the trip <b>{tripName}</b> as an <b>{role}</b>.</p>
                        <a href='{invitationLink}' style='background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>View Trip Details</a>
                     </div>"
        };
        using (var client = new SmtpClient())
        {
          await client.ConnectAsync("smtp.gmail.com", 587, MailKit.Security.SecureSocketOptions.StartTls);
          await client.AuthenticateAsync("dinuriththsarani@gmail.com", "ejuh wevn elec dkpn");
          await client.SendAsync(message);
          await client.DisconnectAsync(true);
        }
        Console.WriteLine($"Email sent to {receiverEmail}");
      }
      catch (Exception ex)
      {
        Console.WriteLine($"Email fail: {ex.Message}");
      }
    }
  }
}
