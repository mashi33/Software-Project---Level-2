using SmartJourneyPlanner.API.Models;   // ✅ 1. Add this (Needed for MongoDBSettings)
using SmartJourneyPlanner.API.Services;/


var builder = WebApplication.CreateBuilder(args);

// ==========================================================
// 1. ADD SERVICES (BEFORE BUILD)
// ==========================================================

// ✅ 2. Configure MongoDB Settings (CRITICAL FIX)
// This reads the "MongoDBSettings" section from appsettings.json
builder.Services.Configure<MongoDBSettings>(
    builder.Configuration.GetSection("MongoDBSettings"));

// A. Enable CORS (Allow Angular to talk to .NET)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp",
        policy =>
        {
            policy.WithOrigins("http://localhost:4200") // This matches your Angular port
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register the BudgetService
builder.Services.AddSingleton<BudgetService>();

// ==========================================================
// 2. BUILD THE APP
// ==========================================================
var app = builder.Build();

// ==========================================================
// 3. CONFIGURE PIPELINE (MIDDLEWARE)
// ==========================================================

// B. Activate the CORS Policy (MUST be before Authorization)
app.UseCors("AllowAngularApp");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

//app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();