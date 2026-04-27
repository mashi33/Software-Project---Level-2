using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using MongoDB.Bson;
using MongoDB.Driver.GridFS;
using SmartJourneyPlanner.Hubs;
using SmartJourneyPlanner.Models;
using SmartJourneyPlanner.Services;
using System;
using System.Threading.Tasks;

namespace SmartJourneyPlanner.Controllers
{
  // DTO used to receive file upload data from the client (fixes Swagger multipart form issue)
  public class FileUploadDto
  {
    public IFormFile File { get; set; } = null!;               
    public string User { get; set; } = "Guest User";           
    public string TripId { get; set; } = string.Empty;         
  }

  // Handles all API requests related to file uploads and downloads (PDF files only)
  [Route("api/[controller]")]
  [ApiController]
  public class FileController : ControllerBase
  {
    private readonly FileStorageService _fileStorage;      
    private readonly CommentsService _commentsService;     
    private readonly IHubContext<ChatHub> _hubContext;    

    private const long MaxFileSize = 20 * 1024 * 1024;    // Maximum allowed file size: 20 MB

    // Injects the required services via dependency injection
    public FileController(
        FileStorageService fileStorage,
        CommentsService commentsService,
        IHubContext<ChatHub> hubContext)
    {
      _fileStorage = fileStorage;
      _commentsService = commentsService;
      _hubContext = hubContext;
    }

    // POST api/file/upload
    // Validates and uploads a PDF file, saves a message record, and notifies the trip group in real time
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload([FromForm] FileUploadDto dto)
    {
      // Reject the request if no file was provided
      if (dto.File == null || dto.File.Length == 0)
        return BadRequest("No file provided.");

      // Only PDF files are accepted
      if (dto.File.ContentType != "application/pdf")
        return BadRequest("Only PDF files are allowed.");

      // Reject files larger than 20 MB
      if (dto.File.Length > MaxFileSize)
        return BadRequest("File size must not exceed 20 MB.");

      // Trip ID is required to route the file message to the correct group
      if (string.IsNullOrEmpty(dto.TripId))
        return BadRequest("Trip ID is required.");

      try
      {
        // 1. Store file in GridFS
        using var stream = dto.File.OpenReadStream();
        var fileId = await _fileStorage.UploadAsync(stream, dto.File.FileName);

        // 2. Save message record to MongoDB
        var comment = new CommentItem
        {
          TripId = dto.TripId,
          User = dto.User,
          Text = string.Empty,
          MessageType = "pdf",
          FileId = fileId,
          FileName = dto.File.FileName,
          FileSize = dto.File.Length,
          CreatedAt = DateTime.UtcNow
        };

        await _commentsService.CreateAsync(comment);

        // 3. Broadcast to specific Trip Group via SignalR (not to all clients)
        await _hubContext.Clients.Group(dto.TripId).SendAsync("ReceiveComment", comment);

        return Ok(new { fileId, messageId = comment.Id });
      }
      catch (Exception ex)
      {
        Console.WriteLine($"[FileController] Upload error: {ex.Message}");
        return StatusCode(500, "File upload failed.");
      }
    }

    // GET api/file/download/{fileId}
    // Downloads a PDF file from GridFS by its file ID as an attachment
    [HttpGet("download/{fileId}")]
    public async Task<IActionResult> Download(string fileId)
    {
      try
      {
        // Validate that the provided ID is a valid MongoDB ObjectId
        if (!ObjectId.TryParse(fileId, out var objectId))
        {
          return BadRequest("Invalid file ID format.");
        }

        var stream = await _fileStorage.DownloadAsync(fileId);

        if (stream == null)
        {
          return NotFound("File stream is null.");
        }

        // Try to get the original filename from the GridFS stream metadata
        string fileName = "download.pdf";
        if (stream is GridFSDownloadStream<ObjectId> gridStream)
        {
          fileName = gridStream.FileInfo.Filename;
        }

        return File(stream, "application/pdf", fileName);
      }
      catch (GridFSFileNotFoundException)
      {
        return NotFound("File not found in MongoDB GridFS.");
      }
      catch (Exception)
      {
        return NotFound("File not found.");
      }
    }

    // GET api/file/view/{fileId}
    // Streams a PDF file from GridFS for inline viewing in the browser (no download prompt)
    [HttpGet("view/{fileId}")]
    public async Task<IActionResult> ViewFile(string fileId)
    {
      try
      {
        // Validate the file ID format before attempting to fetch
        if (!ObjectId.TryParse(fileId, out _)) return BadRequest("Invalid ID");

        var stream = await _fileStorage.DownloadAsync(fileId);
        if (stream == null) return NotFound();

        return File(stream, "application/pdf");
      }
      catch (Exception) { return NotFound(); }
    }
  }
}