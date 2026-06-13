using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SmartJourneyPlanner.API.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;

public class UserUpdateDto
{
    [FromForm(Name = "fullName")]
    public string? FullName { get; set; }

    [FromForm(Name = "email")]
    public string? Email { get; set; }

    [FromForm(Name = "bio")] 
    public string? Bio { get; set; }

    [FromForm(Name = "location")] 
    public string? Location { get; set; }

    [FromForm(Name = "interests")] 
    public string? Interests { get; set; } 

    [FromForm(Name = "profileImage")] 
    public IFormFile? ProfileImage { get; set; } 

    [FromForm(Name = "profilePictureUrl")]
    public string? ProfilePictureUrl { get; set; }
} 

public class ChangePasswordDto
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

[Route("api/[controller]")]
[ApiController]
public class UsersController : ControllerBase
{
    private readonly IMongoCollection<User> _usersCollection;

    public UsersController(IMongoDatabase database)
    {
        _usersCollection = database.GetCollection<User>("Users");
    }

    // 1. GET: api/users/{id} - Fetch user profile details without password exposure
    [HttpGet("{id}")]
    public async Task<ActionResult<User>> GetUserProfile(string id)
    {
        var user = await _usersCollection.Find(u => u.Id == id).FirstOrDefaultAsync();
        if (user == null) return NotFound();
        
        user.PasswordHash = null;
        return Ok(user);
    }

    // 2. PUT: api/users/{id} - Update partial profile metadata including physical asset storage
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProfile(string id, [FromForm] UserUpdateDto dto)
    {
        var user = await _usersCollection.Find(u => u.Id == id).FirstOrDefaultAsync();
        if (user == null) return NotFound();

        // Safe evaluation updates for optional fields
        if (!string.IsNullOrEmpty(dto.FullName)) user.FullName = dto.FullName;
        if (!string.IsNullOrEmpty(dto.Email)) user.Email = dto.Email;
        
        user.Bio = dto.Bio;
        user.Location = dto.Location;

        if (!string.IsNullOrEmpty(dto.Interests))
        {
            try 
            { 
                user.Interests = JsonSerializer.Deserialize<List<string>>(dto.Interests); 
            }
            catch (Exception) 
            { 
                user.Interests = new List<string>(); 
            }
        }

        // Handle structural file management logic for physical profile uploads
        if (dto.ProfileImage != null && dto.ProfileImage.Length > 0)
        {
            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

            var uniqueFileName = Guid.NewGuid().ToString() + "_" + dto.ProfileImage.FileName;
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await dto.ProfileImage.CopyToAsync(fileStream);
            }

            user.ProfilePictureUrl = $"http://localhost:5233/uploads/{uniqueFileName}";
        }
        else 
        {
            // Empty string parameters evaluate to an unassigned asset state
            if (dto.ProfilePictureUrl == "") user.ProfilePictureUrl = "";
        }

        await _usersCollection.ReplaceOneAsync(u => u.Id == id, user);

        return Ok(new { 
            message = "Profile updated successfully!",
            fullName = user.FullName,
            email = user.Email,
            profilePictureUrl = user.ProfilePictureUrl,
            bio = user.Bio,
            location = user.Location,
            interests = user.Interests
        });
    }

    // 3. PUT: api/users/change-password/{id} - Secured password signature alteration
    [HttpPut("change-password/{id}")]
    public async Task<IActionResult> ChangePassword(string id, [FromBody] ChangePasswordDto dto)
    {
        var user = await _usersCollection.Find(u => u.Id == id).FirstOrDefaultAsync();
        if (user == null) return NotFound("User not found");

        // Validate security signature context via BCrypt match tracking
        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash)) 
        {
            return BadRequest(new { message = "Incorrect current password!" });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);

        await _usersCollection.ReplaceOneAsync(u => u.Id == id, user);
        return Ok(new { message = "Password changed successfully!" });
    }
}