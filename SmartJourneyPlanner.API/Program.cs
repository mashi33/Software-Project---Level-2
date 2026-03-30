using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SmartJourneyPlanner.API.Models;       // ✅ Needed for MongoDBSettings
using SmartJourneyPlanner.API.Services;     // ✅ Needed for BudgetService
using SmartJourneyPlanner.Hubs;
using SmartJourneyPlanner.Interfaces;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// ==========================================================
// 1. DATABASE SETTINGS
// ==========================================================

// ✅ Configure MongoDB Settings (reads from appsettings.json "MongoDBSettings" section)
builder.Services.Configure<MongoDBSettings>(
    builder.Configuration.GetSection("MongoDBSettings"));

// ✅ Configure Database Settings (reads from appsettings.json "DatabaseSettings" section)
var dbSettingsSection = builder.Configuration.GetSection("DatabaseSettings");
builder.Services.Configure<DatabaseSettings>(dbSettingsSection);

var connectionString = dbSettingsSection["ConnectionString"];
var databaseName = dbSettingsSection["DatabaseName"];

Console.WriteLine("================================================");
Console.WriteLine($"SERVER STARTING...");
Console.WriteLine($"TARGET CONNECTION: {connectionString}");
Console.WriteLine($"TARGET DATABASE: {databaseName}");
Console.WriteLine("================================================");

// ✅ Register MongoDB Client as Singleton
builder.Services.AddSingleton<IMongoClient>(sp =>
{
    return new MongoClient(connectionString);
});

// ==========================================================
// 2. SIGNALR CONFIGURATION
// ==========================================================

builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
})
.AddJsonProtocol(options =>
{
    options.PayloadSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});

// ==========================================================
// 3. CONTROLLERS & JSON SETTINGS
// ==========================================================

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

// ==========================================================
// 4. CORS SETUP
// ==========================================================

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp", policy =>
    {
        policy.WithOrigins("http://localhost:4200") // Angular App URL
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()                   // ✅ SignalR සඳහා අත්‍යවශ්‍ය
              .WithExposedHeaders("Content-Disposition", "Access-Control-Allow-Origin"); // ✅ PDF download සඳහා
    });
});

// ==========================================================
// 5. SERVICES REGISTRATION
// ==========================================================

// ✅ Budget Service (from SmartJourneyPlanner.API)
builder.Services.AddSingleton<BudgetService>();

// ✅ Discussion & Comment Services
builder.Services.AddSingleton<DiscussionsService>();
builder.Services.AddSingleton<CommentsService>();

// ✅ Route Service
builder.Services.AddScoped<IRouteService, RouteService>();

// ==========================================================
// 6. SWAGGER & HTTP CLIENT
// ==========================================================

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();

/*
// ✅ JWT Authentication (Uncomment when needed)
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
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
        };
    });
*/

// ==========================================================
// 7. BUILD THE APP
// ==========================================================

var app = builder.Build();

// ==========================================================
// 8. MIDDLEWARE PIPELINE
// ==========================================================

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ✅ Middleware පිළිවෙල: Routing -> CORS -> Auth -> Controllers
app.UseRouting();

app.UseCors("AllowAngularApp"); // ✅ CORS මෙතැන තිබීම අනිවාර්යයි (Authorization ට කලින්)

//app.UseHttpsRedirection(); // (Uncomment in Production)

app.UseAuthorization();

app.MapControllers();

// ✅ SignalR Hub Endpoint
app.MapHub<ChatHub>("/chatHub");

app.Run();