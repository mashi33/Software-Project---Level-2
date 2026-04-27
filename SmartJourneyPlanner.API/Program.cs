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

var builder = WebApplication.CreateBuilder(args);

// Email Settings Configuration
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
builder.Services.AddHttpClient<PlacesService>();

// ==========================================================
// DATABASE CONFIG
// ==========================================================

// 1. Configure Settings Sections
builder.Services.Configure<MongoDBSettings>(builder.Configuration.GetSection("MongoDBSettings"));
builder.Services.Configure<DatabaseSettings>(builder.Configuration.GetSection("DatabaseSettings"));

// 2. Direct MongoDB Connection (Using your hardcoded Atlas string)
var connectionString = "";
var databaseName = "SmartJourneyDb"; 

// 3. Register the Client and Database globally
builder.Services.AddSingleton<IMongoClient>(_ => new MongoClient(connectionString));
builder.Services.AddSingleton<IMongoDatabase>(sp =>
{
    var client = sp.GetRequiredService<IMongoClient>();
    return client.GetDatabase(databaseName);
});

// ==========================================================
// JWT AUTHENTICATION
// ==========================================================

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
.AddJwtBearer(options =>
{
  options.TokenValidationParameters = new TokenValidationParameters
  {
    ValidateIssuer = true,
    ValidateAudience = true,
    ValidateLifetime = true,
    ValidateIssuerSigningKey = true,
    ValidIssuer = builder.Configuration["Jwt:Issuer"],
    ValidAudience = builder.Configuration["Jwt:Audience"],
    IssuerSigningKey = new SymmetricSecurityKey(
          Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? ""))
  };
});

// ==========================================================
// SIGNALR & CONTROLLERS
// ==========================================================

builder.Services.AddSignalR(options =>
{
  options.EnableDetailedErrors = true;
})
.AddJsonProtocol(options =>
{
  options.PayloadSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});

// Find this section in your Program.cs
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // This forces the API to send 'fullName' instead of 'FullName'
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        // This makes the API more flexible when receiving data back from Angular
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });
// ==========================================================
// CORS
// ==========================================================

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp", policy =>
    {
        policy.WithOrigins("http://localhost:4200") // Angular URL 
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// ==========================================================
// SERVICES REGISTRATION
// ==========================================================

// ✅ This ensures AdminService is available to your TransportVehiclesController
builder.Services.AddSingleton<AdminService>(); 

builder.Services.AddSingleton<BudgetService>();
builder.Services.AddSingleton<TimelineService>();
builder.Services.AddSingleton<DiscussionsService>();
builder.Services.AddSingleton<CommentsService>();
builder.Services.AddScoped<IRouteService, RouteService>();
builder.Services.AddSingleton<FileStorageService>();
builder.Services.AddSingleton<TransportVehicleService>();
builder.Services.AddSingleton<TransportBookingService>();
builder.Services.AddHttpClient<PlacesService>();
builder.Services.AddSingleton<MemoryService>();

// ==========================================================
// BUILD & MIDDLEWARE
// ==========================================================

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
  app.UseSwagger();
  app.UseSwaggerUI(); // ✅ This is the correct method
}

app.UseRouting();
app.UseCors("AllowAngularApp");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>("/chatHub");

app.Run();
