using System.Text.Json;

namespace Mactic.Api.Services;

/// <summary>
/// Service for generating embeddings using OpenAI API
/// </summary>
public class EmbeddingService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly ILogger<EmbeddingService> _logger;

    public EmbeddingService(HttpClient httpClient, IConfiguration configuration, ILogger<EmbeddingService> logger)
    {
        _httpClient = httpClient;
        _apiKey = configuration["OpenAI:ApiKey"] ?? throw new Exception("OpenAI:ApiKey not configured");
        _logger = logger;
    }

    /// <summary>
    /// Generate embedding for given text using OpenAI's text-embedding-3-small model
    /// Returns 1536-dimensional vector
    /// </summary>
    public async Task<float[]?> GenerateEmbeddingAsync(string text)
    {
        try
        {
            var request = new
            {
                input = text,
                model = "text-embedding-3-small" // 1536 dimensions, $0.02/1M tokens
            };

            var content = new StringContent(
                JsonSerializer.Serialize(request),
                System.Text.Encoding.UTF8,
                "application/json"
            );

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_apiKey}");

            var response = await _httpClient.PostAsync(
                "https://api.openai.com/v1/embeddings",
                content
            );

            response.EnsureSuccessStatusCode();

            var responseBody = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<OpenAIEmbeddingResponse>(responseBody);

            if (result?.Data == null || result.Data.Count == 0)
            {
                _logger.LogWarning("OpenAI returned no embeddings");
                return null;
            }

            return result.Data[0].Embedding;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate embedding");
            return null;
        }
    }

    /// <summary>
    /// Calculate cosine similarity between two vectors
    /// Returns value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
    /// </summary>
    public double CosineSimilarity(float[] a, float[] b)
    {
        if (a.Length != b.Length)
        {
            throw new ArgumentException("Vectors must have same length");
        }

        double dotProduct = 0;
        double magnitudeA = 0;
        double magnitudeB = 0;

        for (int i = 0; i < a.Length; i++)
        {
            dotProduct += a[i] * b[i];
            magnitudeA += a[i] * a[i];
            magnitudeB += b[i] * b[i];
        }

        magnitudeA = Math.Sqrt(magnitudeA);
        magnitudeB = Math.Sqrt(magnitudeB);

        if (magnitudeA == 0 || magnitudeB == 0)
        {
            return 0;
        }

        return dotProduct / (magnitudeA * magnitudeB);
    }

    // OpenAI API response models
    private class OpenAIEmbeddingResponse
    {
        public required List<OpenAIEmbeddingData> Data { get; set; }
        public required OpenAIUsage Usage { get; set; }
    }

    private class OpenAIEmbeddingData
    {
        public required float[] Embedding { get; set; }
    }

    private class OpenAIUsage
    {
        public int Prompt_Tokens { get; set; }
        public int Total_Tokens { get; set; }
    }
}
