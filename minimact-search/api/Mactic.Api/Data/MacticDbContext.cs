using Microsoft.EntityFrameworkCore;
using Mactic.Api.Models.Community;
using Pgvector.EntityFrameworkCore;

namespace Mactic.Api.Data;

public class MacticDbContext : DbContext
{
    public MacticDbContext(DbContextOptions<MacticDbContext> options)
        : base(options)
    {
    }

    // Community tables
    public DbSet<Developer> Developers => Set<Developer>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectDependency> ProjectDependencies => Set<ProjectDependency>();
    public DbSet<ProjectUsage> ProjectUsages => Set<ProjectUsage>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<DeveloperConnection> DeveloperConnections => Set<DeveloperConnection>();
    public DbSet<Badge> Badges => Set<Badge>();
    public DbSet<DeveloperBadge> DeveloperBadges => Set<DeveloperBadge>();
    public DbSet<ActivityEvent> ActivityEvents => Set<ActivityEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Enable pgvector extension
        modelBuilder.HasPostgresExtension("vector");

        // Developer
        modelBuilder.Entity<Developer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Username).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.Reputation);
            entity.HasIndex(e => e.LastActiveAt);

            // PostgreSQL JSON column for Skills array
            entity.Property(e => e.Skills)
                .HasColumnType("jsonb");
        });

        // Project
        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Url).IsUnique();
            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.LastUpdatedAt);
            entity.HasIndex(e => e.IsTrending);
            entity.HasIndex(e => e.IsFeatured);

            // PostgreSQL JSON column for Tags array
            entity.Property(e => e.Tags)
                .HasColumnType("jsonb");

            // pgvector column for embeddings (1536 dimensions for OpenAI embeddings)
            entity.Property(e => e.Embedding)
                .HasColumnType("vector(1536)");

            // Relationship with Developer
            entity.HasOne(e => e.Developer)
                .WithMany(d => d.Projects)
                .HasForeignKey(e => e.DeveloperId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Project Dependency
        modelBuilder.Entity<ProjectDependency>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasOne(e => e.DependentProject)
                .WithMany(p => p.Dependencies)
                .HasForeignKey(e => e.DependentProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.DependencyProject)
                .WithMany(p => p.DependentProjects)
                .HasForeignKey(e => e.DependencyProjectId)
                .OnDelete(DeleteBehavior.Restrict); // Prevent cascading deletes

            // Unique constraint: can't have duplicate dependencies
            entity.HasIndex(e => new { e.DependentProjectId, e.DependencyProjectId }).IsUnique();
        });

        // Project Usage
        modelBuilder.Entity<ProjectUsage>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasOne(e => e.Project)
                .WithMany(p => p.Usages)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Developer)
                .WithMany()
                .HasForeignKey(e => e.DeveloperId)
                .OnDelete(DeleteBehavior.Cascade);

            // Unique constraint: developer can't use same project twice
            entity.HasIndex(e => new { e.ProjectId, e.DeveloperId }).IsUnique();
        });

        // Review
        modelBuilder.Entity<Review>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.CreatedAt);

            entity.HasOne(e => e.Project)
                .WithMany(p => p.Reviews)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Reviewer)
                .WithMany(d => d.ReviewsGiven)
                .HasForeignKey(e => e.ReviewerId)
                .OnDelete(DeleteBehavior.Cascade);

            // Unique constraint: developer can only review a project once
            entity.HasIndex(e => new { e.ProjectId, e.ReviewerId }).IsUnique();
        });

        // Developer Connection
        modelBuilder.Entity<DeveloperConnection>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasOne<Developer>()
                .WithMany()
                .HasForeignKey(e => e.FollowerId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne<Developer>()
                .WithMany(d => d.Connections)
                .HasForeignKey(e => e.FollowingId)
                .OnDelete(DeleteBehavior.Restrict); // Prevent cascading deletes

            // Unique constraint: can't follow same person twice
            entity.HasIndex(e => new { e.FollowerId, e.FollowingId }).IsUnique();
        });

        // Badge
        modelBuilder.Entity<Badge>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Name).IsUnique();
        });

        // Developer Badge (junction table)
        modelBuilder.Entity<DeveloperBadge>(entity =>
        {
            entity.HasKey(e => new { e.DeveloperId, e.BadgeId });

            entity.HasOne(e => e.Developer)
                .WithMany()
                .HasForeignKey(e => e.DeveloperId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Badge)
                .WithMany(b => b.DeveloperBadges)
                .HasForeignKey(e => e.BadgeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Activity Event
        modelBuilder.Entity<ActivityEvent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.EventType);
            entity.HasIndex(e => e.DeveloperId);
            entity.HasIndex(e => e.ProjectId);

            // PostgreSQL JSON column for EventData
            entity.Property(e => e.EventData)
                .HasColumnType("jsonb");

            entity.HasOne(e => e.Developer)
                .WithMany()
                .HasForeignKey(e => e.DeveloperId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Project)
                .WithMany()
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
