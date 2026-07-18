using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using MongoDB.Driver;
using System.Security.Claims;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using SmartJourneyPlanner.API.Models; 
using SmartJourneyPlanner.API.DTOs;
using SmartJourneyPlanner.API.Services; 
using BCryptNet = BCrypt.Net.BCrypt;

namespace SmartJourneyPlanner.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase 
    {
        private readonly IMongoCollection<User> _users;
        private readonly IConfiguration _configuration;
        private readonly EmailService _emailService;
        private readonly UserBlockService _userBlockService;

        public AuthController(
            IMongoDatabase database,
            IConfiguration configuration,
            EmailService emailService,
            UserBlockService userBlockService)
        {
            _users = database.GetCollection<User>("Users");
            _configuration = configuration;
            _emailService = emailService;
            _userBlockService = userBlockService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(UserRegisterDto model)
        {   
            // Validate password strength
            var passwordRegex = new System.Text.RegularExpressions.Regex(
                 @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
            );

            if (string.IsNullOrWhiteSpace(model.Password) || !passwordRegex.IsMatch(model.Password))
             {
            return BadRequest(new
             {
                  message = "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character."
            });
            }
            // 1. Check if the email is already registered
            var existingUser = await _users.Find(u => u.Email == model.Email).FirstOrDefaultAsync();
            if (existingUser != null)
            {
                return BadRequest(new { message = "This email is already registered." });
            }

            // 2. Create a unique verification token for email verification
            var token = Guid.NewGuid().ToString();

            // 3. Hash the password before saving to the database
            string passwordHash = BCryptNet.HashPassword(model.Password);

            // 4. Create a new user object with the provided details and the generated token
            var newUser = new User
            {
                FullName = model.FullName,
                Email = model.Email,
                PasswordHash = passwordHash,
                UserType = model.UserType ?? "Traveller",
                Bio = "Hey there! I am using Smart Journey Planner.",
                ProfilePictureUrl = "",
                Location = "",
                Status = "Approved",
                IsBlocked = false,
                CreatedAt = DateTime.UtcNow,
                
                // Fields handling account status and email verification
                IsVerified = false, 
                VerificationToken = token,
                TokenExpiry = DateTime.UtcNow.AddHours(24) // Token will expire in 24 hours
            };

            // 5. Persist the record to MongoDB
            await _users.InsertOneAsync(newUser);

            // 6. Asynchronously send verification email using the EmailService
            Console.WriteLine($"--- 📧 EMAIL PROCESS STARTED FOR: {newUser.Email} ---");
            try
            {
                var verificationLink = $"http://localhost:4200/verify-email?token={token}";

                // Append invitation metadata to deep link if optional query fields are provided
                if (!string.IsNullOrEmpty(model.TripId))
                {
                    var role = model.Role ?? "viewer";
                    verificationLink += $"&tripId={model.TripId}&role={role}";
                }

                Console.WriteLine($"Generated Link: {verificationLink}");
                
                await _emailService.SendVerificationEmailAsync(newUser.Email!, verificationLink);
                Console.WriteLine("✅ EMAIL SENT SUCCESSFULLY VIA GMAIL SMTP!");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ EMAIL SENDING FAILED: {ex.Message}");
            }
            Console.WriteLine("------------------------------------------------");

            // 7. Return success payload matching Frontend requirements
            return Ok(new { 
                message = "Registration successful! Please check your email to verify your account.", 
                savedEmail = newUser.Email,
                databaseName = _users.Database.DatabaseNamespace.DatabaseName, 
                collectionName = _users.CollectionNamespace.CollectionName     
            });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(UserLoginDto request)
        {
            var user = await _users.Find(u => u.Email == request.Email).FirstOrDefaultAsync();

            if (user == null)
            {
                return BadRequest("User not found.");
            }

            // SECURITY CHECK 1: Auto-lift expired temporary blocks, then prevent blocked users from logging in
            await _userBlockService.ExpireTemporaryBlocksAsync();
            user = await _users.Find(u => u.Email == request.Email).FirstOrDefaultAsync();
            if (user == null)
            {
                return BadRequest("User not found.");
            }

            var (isBlocked, blockMessage) = await _userBlockService.ResolveBlockStatusAsync(user);
            if (isBlocked)
            {
                return StatusCode(403, new { message = blockMessage ?? "Your account has been suspended. Please contact the administrator." });
            }

            // SECURITY CHECK 2: Block unverified users from gaining an active session
            if (!user.IsVerified)
            {
                return BadRequest(new { code = "EMAIL_NOT_VERIFIED", message = "Please verify your email address first. Check your inbox!" });
            }

            // SECURITY CHECK 3: Match password hash signatures
            if (!BCryptNet.Verify(request.Password, user.PasswordHash))
            {
                return BadRequest("Wrong password.");
            }

            // Generate authentication token on authorization success
            var token = CreateToken(user); 
            
            return Ok(new { 
                token = token,
                message = "Login successful!", 
                userType = user.UserType,
                userId = user.Id,
                username = user.FullName,
                email = user.Email,
                profilePic = user.ProfilePictureUrl
            });
        }

        [HttpGet("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromQuery] string token)
        {
            if (string.IsNullOrEmpty(token))
            {
                return BadRequest(new { message = "Secure token is missing!" });
            }

            // 1. Get the user with the matching verification token from the database
            var user = await _users.Find(u => u.VerificationToken == token).FirstOrDefaultAsync();

            if (user == null)
            {
                return BadRequest(new { message = "The verification link is invalid or has expired." });
            }

            // 2. Check if the token has expired
            if (user.TokenExpiry < DateTime.UtcNow)
            {
                return BadRequest(new { message = "This verification link has expired. Please register again." });
            }

            // 3. Update the user's record to set IsVerified to true and clear token metadata
            var filter = Builders<User>.Filter.Eq(u => u.Id, user.Id);
            var update = Builders<User>.Update
                .Set(u => u.IsVerified, true)
                .Set(u => u.Status, "Approved") 
                .Unset(u => u.VerificationToken) 
                .Unset(u => u.TokenExpiry);

            await _users.UpdateOneAsync(filter, update);

            Console.WriteLine($"✅ USER VERIFIED SUCCESSFULLY IN DB: {user.Email}");

            return Ok(new { message = "Email verified successfully!" });
        }
        
        // forgot password endpoint
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto model)
        {
            var user = await _users.Find(u => u.Email == model.Email).FirstOrDefaultAsync();
    
            if (user == null)
            {
                return NotFound(new { message = "User with this email does not exist." });
            }

            // 1. Generate Secure Reset Token
            var resetToken = Guid.NewGuid().ToString();
    
           // 2. Set Token and Expiry (Valid for 1 Hour)
           var filter = Builders<User>.Filter.Eq(u => u.Id, user.Id);
           var update = Builders<User>.Update
             .Set(u => u.PasswordResetToken, resetToken)
             .Set(u => u.ResetTokenExpiry, DateTime.UtcNow.AddHours(1));

           await _users.UpdateOneAsync(filter, update);

           // 3. Send Email via EmailService
           try
          {
            var resetLink = $"http://localhost:4200/reset-password?token={resetToken}";
            await _emailService.SendPasswordResetEmailAsync(user.Email!, resetLink);
        
          return Ok(new { message = "Password reset link has been sent to your email." });
         }
         catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Failed to send email: {ex.Message}" });
        }
      }
         
         // reset password endpoint
         [HttpPost("reset-password")]
         public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto model)
        {
        if (string.IsNullOrEmpty(model.Token))
        {
           return BadRequest(new { message = "Reset token is missing!" });
        }

         // 1. Find user with the matching reset token
        var user = await _users.Find(u => u.PasswordResetToken == model.Token).FirstOrDefaultAsync();

        if (user == null)
       {
        return BadRequest(new { message = "Invalid or expired password reset token." });
       }

       // 2. Check if token has expired
       if (user.ResetTokenExpiry < DateTime.UtcNow)
      {
        return BadRequest(new { message = "This reset link has expired. Please request a new one." });
     }

     var passwordRegex = new System.Text.RegularExpressions.Regex(
    @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
    );

    if (string.IsNullOrWhiteSpace(model.NewPassword) || !passwordRegex.IsMatch(model.NewPassword))
    {
    return BadRequest(new
    {
        message = "Password must be at least 8 characters long and contain an uppercase letter, lowercase letter, number, and special character."
    });
    }

    // 3. Hash new password and clear token fields
    string newPasswordHash = BCrypt.Net.BCrypt.HashPassword(model.NewPassword);

    var filter = Builders<User>.Filter.Eq(u => u.Id, user.Id);
    var update = Builders<User>.Update
        .Set(u => u.PasswordHash, newPasswordHash)
        .Unset(u => u.PasswordResetToken)
        .Unset(u => u.ResetTokenExpiry);

    await _users.UpdateOneAsync(filter, update);

    return Ok(new { message = "Password has been reset successfully! You can now login with your new password." });
}


        /**
         * Generates a signed JWT containing localized user data claims for authorization handling.
         */
        private string CreateToken(User user) 
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Name, user.FullName ?? "User"), 
                new Claim(ClaimTypes.Email, user.Email ?? ""),
                
                // 🔑 THE FIX: Read directly from the fresh user instance variable data field object
                new Claim(ClaimTypes.Role, user.UserType ?? "Traveller"),
                new Claim("UserType", user.UserType ?? "Traveller"), 
                
                new Claim("userId", user.Id?.ToString() ?? ""),
                new Claim("isBlocked", user.IsBlocked.ToString())
            };

            var jwtKey = _configuration["Jwt:Key"] ?? "YourFallbackVeryLongSecretKeyHere_MustBe32Chars!";
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            
            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddDays(1),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}