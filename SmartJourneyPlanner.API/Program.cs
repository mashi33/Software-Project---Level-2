using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.API.Services;
using SmartJourneyPlanner.Hubs;
using SmartJourneyPlanner.Interfaces;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;
using System.Text;
using System.Text.Json;
using Tomlyn.Extensions.Configuration; // TOML Support

var builder = WebApplication.CreateBuilder(args);

// --- 1. CONFIGURATION LOADING (The .toml Integration) ---
// This tells .NET to prioritize your appsettings.toml file
builder.Configuration.AddTomlFile("appsettings.toml", optional: true, reloadOnChange: true);

// Extract connection values for global database registration
var mongoSettingsSection = builder.Configuration.GetSection("MongoDBSettings");
var connectionString = mongoSettingsSection["ConnectionString"] ?? "mongodb://localhost:27017";
var databaseName = mongoSettingsSection["DatabaseName"] ?? "SmartJourneyDb";
var jwtKey = builder.Configuration["Jwt:Key"] ?? "ThisIsMySuperSecretKeyForSmartJourneyPlanner2026!";

// --- 2. SERVICE CONFIGURATION (Options Pattern) ---
// These lines map the TOML sections to your C# Model classes
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
builder.Services.Configure<MongoDBSettings>(builder.Configuration.GetSection("MongoDBSettings"));
builder.Services.Configure<DatabaseSettings>(builder.Configuration.GetSection("DatabaseSettings"));

// --- 3. DATABASE REGISTRATION ---
builder.Services.AddSingleton<IMongoClient>(_ => new MongoClient(connectionString));
builder.Services.AddSingleton<IMongoDatabase>(sp =>
{
    var client = sp.GetRequiredService<IMongoClient>();
    return client.GetDatabase(databaseName);
});

// --- 4. JWT AUTHENTICATION ---
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false, 
            ValidateAudience = false, 
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

// --- 5. SIGNALR & CONTROLLERS ---
builder.Services.AddSignalR(options => { options.EnableDetailedErrors = true; })
.AddJsonProtocol(options => { options.PayloadSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase; });

builder.Services.AddControllers()
    .AddJsonOptions(options => {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

// --- 6. CORS ---
builder.Services.AddCors(options => {
    options.AddPolicy("AllowAngularApp", policy => {
        policy.WithOrigins("http://localhost:4200") 
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// --- 7. SERVICES REGISTRATION ---
builder.Services.AddSingleton<UserBlockService>();
builder.Services.AddSingleton<AdminService>(); 
builder.Services.AddSingleton<BudgetService>();
builder.Services.AddSingleton<TimelineService>(); 
builder.Services.AddSingleton<DiscussionsService>();
builder.Services.AddSingleton<CommentsService>();
builder.Services.AddScoped<IRouteService, RouteService>();
builder.Services.AddSingleton<FuelPriceService>();
builder.Services.AddSingleton<FileStorageService>();
builder.Services.AddSingleton<TransportVehicleService>();
builder.Services.AddSingleton<TransportBookingService>();
builder.Services.AddHttpClient<PlacesService>();
builder.Services.AddHttpClient<VotePlacesService>();
builder.Services.AddSingleton<MemoryService>();
builder.Services.AddSingleton<AchievementService>();
builder.Services.AddScoped<WeatherSuggestionService>();
builder.Services.AddScoped<ProviderDashboardService>();
builder.Services.AddSingleton<SmartJourneyPlanner.API.Services.EmailService>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();

var app = builder.Build();

// --- 8. HTTP REQUEST PIPELINE ---
if (app.Environment.IsDevelopment()) {
  app.UseSwagger();
  app.UseSwaggerUI(); 
}

// This allows browser to access 'http://localhost:5233/uploads/...' without 404/401 errors
app.UseStaticFiles();

app.UseRouting();
app.UseCors("AllowAngularApp");

// Authentication must always come before Authorization
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>("/chatHub");

app.Run();