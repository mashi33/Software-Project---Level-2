using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MongoDB.Driver;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.API.Services;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
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

    [FromForm(Name = "removeProfilePicture")]
    public string? RemoveProfilePicture { get; set; }
}

public class FeedbackDto
{
    public string Comment { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string UserRole { get; set; } = string.Empty;
    public string ProfilePictureUrl { get; set; } = string.Empty;
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
    private readonly IMongoCollection<Feedback> _feedbackCollection;
    private readonly EmailService _emailService;

    public UsersController(IMongoDatabase database, EmailService emailService)
    {
        _usersCollection = database.GetCollection<User>("Users");
        _feedbackCollection = database.GetCollection<Feedback>("Feedbacks");
        _emailService = emailService;
    }

    // 1. GET: api/users/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<User>> GetUserProfile(string id)
    {
        var user = await _usersCollection.Find(u => u.Id == id).FirstOrDefaultAsync();
        if (user == null) return NotFound();

        user.PasswordHash = "";
        return Ok(user);
    }

    // 2. PUT: api/users/{id} - Profile update + safe email change (pending verification)
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProfile(string id, [FromForm] UserUpdateDto dto)
    {
        var user = await _usersCollection.Find(u => u.Id == id).FirstOrDefaultAsync();
        if (user == null) return NotFound();

        // ----- Other profile fields -----
        if (!string.IsNullOrEmpty(dto.FullName))
            user.FullName = dto.FullName.Trim();

        user.Bio = dto.Bio ?? "";
        user.Location = dto.Location ?? "";

        if (!string.IsNullOrEmpty(dto.Interests))
        {
            try
            {
                user.Interests =
                    JsonSerializer.Deserialize<List<string>>(dto.Interests ?? "[]")
                    ?? new List<string>();
            }
            catch
            {
                user.Interests = new List<string>();
            }
        }

        // ----- Profile picture -----
        if (dto.ProfileImage != null && dto.ProfileImage.Length > 0)
        {
            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            var uniqueFileName = Guid.NewGuid().ToString() + "_" + dto.ProfileImage.FileName;
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await dto.ProfileImage.CopyToAsync(fileStream);
            }

            user.ProfilePictureUrl = $"http://localhost:5233/uploads/{uniqueFileName}";
        }
        else if (dto.RemoveProfilePicture == "true" ||
                 string.IsNullOrEmpty(dto.ProfilePictureUrl))
        {
            user.ProfilePictureUrl = "";
        }

        // ----- Email change (DO NOT apply immediately) -----
        bool emailChangePending = false;
        string? pendingEmail = null;

        var incomingEmail = (dto.Email ?? "").Trim().ToLowerInvariant();
        var currentEmail = (user.Email ?? "").Trim().ToLowerInvariant();

        if (!string.IsNullOrEmpty(incomingEmail) && incomingEmail != currentEmail)
        {
            var emailRegex = new Regex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$");
            if (!emailRegex.IsMatch(incomingEmail))
            {
                return BadRequest(new { message = "Please enter a valid email address." });
            }

            var existing = await _usersCollection
                .Find(u => u.Email == incomingEmail && u.Id != id)
                .FirstOrDefaultAsync();

            if (existing != null)
            {
                return BadRequest(new { message = "This email is already registered to another account." });
            }

            var changeToken = Guid.NewGuid().ToString();
            user.PendingEmail = incomingEmail;
            user.EmailChangeToken = changeToken;
            user.EmailChangeTokenExpiry = DateTime.UtcNow.AddHours(24);
            // user.Email stays the SAME until verified

            emailChangePending = true;
            pendingEmail = incomingEmail;

            var verifyLink = $"http://localhost:4200/verify-email-change?token={changeToken}";

            try
            {
                await _emailService.SendEmailChangeVerificationAsync(
                    incomingEmail,
                    verifyLink,
                    user.FullName ?? "User"
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Email Change] Send failed: {ex.Message}");
                // Profile other fields still saved; user can retry email change
            }
        }

        await _usersCollection.ReplaceOneAsync(u => u.Id == id, user);

        if (emailChangePending)
        {
            return Ok(new
            {
                message = "Profile updated. Please check your NEW email inbox to confirm the email change.",
                emailChangePending = true,
                pendingEmail = pendingEmail,
                fullName = user.FullName,
                email = user.Email, // still old email
                profilePictureUrl = user.ProfilePictureUrl,
                bio = user.Bio,
                location = user.Location,
                interests = user.Interests
            });
        }

        return Ok(new
        {
            message = "Profile updated successfully!",
            emailChangePending = false,
            fullName = user.FullName,
            email = user.Email,
            profilePictureUrl = user.ProfilePictureUrl,
            bio = user.Bio,
            location = user.Location,
            interests = user.Interests
        });
    }

    // 2b. GET: api/users/verify-email-change?token=...
    [HttpGet("verify-email-change")]
    public async Task<IActionResult> VerifyEmailChange([FromQuery] string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return BadRequest(new { message = "Verification token is missing." });
        }

        var user = await _usersCollection
            .Find(u => u.EmailChangeToken == token)
            .FirstOrDefaultAsync();

        if (user == null)
        {
            return BadRequest(new { message = "Invalid or already used verification link." });
        }

        if (user.EmailChangeTokenExpiry == null || user.EmailChangeTokenExpiry < DateTime.UtcNow)
        {
            return BadRequest(new { message = "This verification link has expired. Please request email change again from your profile." });
        }

        if (string.IsNullOrWhiteSpace(user.PendingEmail))
        {
            return BadRequest(new { message = "No pending email change found." });
        }

        var pending = user.PendingEmail.Trim().ToLowerInvariant();

        var taken = await _usersCollection
            .Find(u => u.Email == pending && u.Id != user.Id)
            .FirstOrDefaultAsync();

        if (taken != null)
        {
            // Clear pending so user can try another email
            user.PendingEmail = null;
            user.EmailChangeToken = null;
            user.EmailChangeTokenExpiry = null;
            await _usersCollection.ReplaceOneAsync(u => u.Id == user.Id, user);

            return BadRequest(new { message = "This email was registered by another account. Change cancelled." });
        }

        user.Email = pending;
        user.PendingEmail = null;
        user.EmailChangeToken = null;
        user.EmailChangeTokenExpiry = null;

        await _usersCollection.ReplaceOneAsync(u => u.Id == user.Id, user);

        return Ok(new
        {
            message = "Email updated successfully! Please login with your new email.",
            newEmail = pending
        });
    }

    // 3. PUT: api/users/change-password/{id}
    [HttpPut("change-password/{id}")]
    public async Task<IActionResult> ChangePassword(string id, [FromBody] ChangePasswordDto dto)
    {
        var user = await _usersCollection.Find(u => u.Id == id).FirstOrDefaultAsync();
        if (user == null) return NotFound("User not found");

        if (string.IsNullOrWhiteSpace(dto.CurrentPassword) || string.IsNullOrWhiteSpace(dto.NewPassword))
        {
            return BadRequest(new { message = "Current password and new password are required." });
        }

        var passwordRegex = new Regex(
            @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
        );
        if (!passwordRegex.IsMatch(dto.NewPassword))
        {
            return BadRequest(new
            {
                message = "New password must be at least 8 characters and include uppercase, lowercase, number, and special character."
            });
        }

        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
        {
            return BadRequest(new { message = "Incorrect current password!" });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await _usersCollection.ReplaceOneAsync(u => u.Id == id, user);

        return Ok(new { message = "Password changed successfully!" });
    }

    // 4. POST: api/users/add-comment
    [HttpPost("add-comment")]
    public async Task<IActionResult> AddComment([FromBody] FeedbackDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Comment))
        {
            return BadRequest(new { message = "Comment cannot be empty!" });
        }

        var feedback = new Feedback
        {
            Comment = dto.Comment.Trim(),
            UserName = string.IsNullOrWhiteSpace(dto.UserName) ? "Anonymous" : dto.UserName.Trim(),
            UserRole = string.IsNullOrWhiteSpace(dto.UserRole) ? "Traveller" : dto.UserRole.Trim(),
            ProfilePictureUrl = dto.ProfilePictureUrl ?? string.Empty,
            CreatedAt = DateTime.UtcNow
        };

        await _feedbackCollection.InsertOneAsync(feedback);

        return Ok(new
        {
            message = "Feedback added successfully!",
            id = feedback.Id
        });
    }

    // 5. GET: api/users/feedbacks
    [HttpGet("feedbacks")]
    public async Task<ActionResult<List<Feedback>>> GetFeedbacks()
    {
        var feedbacks = await _feedbackCollection
            .Find(_ => true)
            .SortByDescending(f => f.CreatedAt)
            .Limit(6)
            .ToListAsync();

        return Ok(feedbacks);
    }
}