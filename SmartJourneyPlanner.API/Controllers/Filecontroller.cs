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

    private const long MaxFileSize = 20 * 1024 * 1024; // 20 MB

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
      if (dto.File == null || dto.File.Length == 0)
        return BadRequest("No file provided.");

      if (dto.File.ContentType != "application/pdf")
        return BadRequest("Only PDF files are allowed.");

      if (dto.File.Length > MaxFileSize)
        return BadRequest("File size must not exceed 20 MB.");

      if (string.IsNullOrEmpty(dto.TripId))
        return BadRequest("Trip ID is required.");

      try
      {
        using var stream = dto.File.OpenReadStream();
        var fileId = await _fileStorage.UploadAsync(stream, dto.File.FileName);

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

        // Broadcast to the specific trip group only, not all connected clients
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
        if (!ObjectId.TryParse(fileId, out var objectId))
          return BadRequest("Invalid file ID format.");

        var stream = await _fileStorage.DownloadAsync(fileId);
        if (stream == null)
          return NotFound("File stream is null.");

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
        if (!ObjectId.TryParse(fileId, out _))
          return BadRequest("Invalid ID");

        var stream = await _fileStorage.DownloadAsync(fileId);
        if (stream == null)
          return NotFound();

        return File(stream, "application/pdf");
      }
      catch (Exception)
      {
        return NotFound();
      }
    }
  }
}