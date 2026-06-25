using Booking.Domain.Entities;
using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Booking.Infrastructure.Data;

public sealed class BookingDbContext :
    IdentityDbContext<User, IdentityRole<Guid>, Guid>,
    IDataProtectionKeyContext
{
    public BookingDbContext(DbContextOptions<BookingDbContext> options) : base(options)
    {
    }

    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<InventoryRecord> InventoryRecords => Set<InventoryRecord>();
    public DbSet<InventoryMovement> InventoryMovements => Set<InventoryMovement>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Address> Addresses => Set<Address>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Coupon> Coupons => Set<Coupon>();
    public DbSet<OrderNotificationLog> OrderNotificationLogs => Set<OrderNotificationLog>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<User>(entity =>
        {
            entity.Property(x => x.FirstName).HasMaxLength(100);
            entity.Property(x => x.LastName).HasMaxLength(100);
        });

        builder.Entity<Category>(entity =>
        {
            entity.HasIndex(x => x.Slug).IsUnique();
            entity.Property(x => x.Name).HasMaxLength(120);
            entity.Property(x => x.Slug).HasMaxLength(140);
            entity.HasOne(x => x.ParentCategory)
                .WithMany(x => x.Children)
                .HasForeignKey(x => x.ParentCategoryId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Product>(entity =>
        {
            entity.HasIndex(x => x.Slug).IsUnique();
            entity.HasIndex(x => new { x.IsActive, x.CreatedAtUtc });
            entity.HasIndex(x => new { x.CategoryId, x.IsActive, x.CreatedAtUtc });
            entity.HasIndex(x => new { x.IsDeleted, x.IsActive, x.CreatedAtUtc });
            entity.HasIndex(x => x.Brand);
            entity.Property(x => x.Name).HasMaxLength(200);
            entity.Property(x => x.Slug).HasMaxLength(220);
            entity.Property(x => x.Brand).HasMaxLength(120);
            entity.Property(x => x.Status).HasMaxLength(40);
            entity.Property(x => x.Price).HasPrecision(18, 2);
            entity.Property(x => x.SalePrice).HasPrecision(18, 2);
            entity.Property(x => x.DeletedAtUtc);
            entity.Property(x => x.ConcurrencyStamp).IsConcurrencyToken().HasMaxLength(32);
        });

        builder.Entity<ProductVariant>(entity =>
        {
            entity.HasIndex(x => x.Sku).IsUnique();
            entity.HasIndex(x => new { x.ProductId, x.IsDefault });
            entity.Property(x => x.Sku).HasMaxLength(100);
            entity.Property(x => x.Color).HasMaxLength(80);
            entity.Property(x => x.Size).HasMaxLength(50);
            entity.Property(x => x.Weight).HasPrecision(12, 3);
            entity.Property(x => x.Model).HasMaxLength(100);
            entity.Property(x => x.PackageType).HasMaxLength(100);
            entity.Property(x => x.Price).HasPrecision(18, 2);
            entity.Property(x => x.SalePrice).HasPrecision(18, 2);
            entity.Property(x => x.Status).HasMaxLength(40);
            entity.Property(x => x.ConcurrencyStamp).IsConcurrencyToken().HasMaxLength(32);
        });

        builder.Entity<ProductImage>(entity =>
        {
            entity.HasIndex(x => new { x.ProductId, x.SortOrder });
            entity.Property(x => x.ImageUrl).HasMaxLength(2048);
        });

        builder.Entity<Warehouse>(entity =>
        {
            entity.HasIndex(x => x.Code).IsUnique();
            entity.Property(x => x.Name).HasMaxLength(150);
            entity.Property(x => x.Code).HasMaxLength(50);
        });

        builder.Entity<InventoryRecord>(entity =>
        {
            entity.HasIndex(x => new { x.WarehouseId, x.ProductVariantId }).IsUnique();
            entity.HasIndex(x => new { x.ProductVariantId, x.UpdatedAtUtc });
            entity.Property(x => x.ConcurrencyStamp).IsConcurrencyToken().HasMaxLength(32);
        });

        builder.Entity<InventoryMovement>(entity =>
        {
            entity.HasIndex(x => new { x.ProductVariantId, x.CreatedAtUtc });
            entity.HasIndex(x => new { x.ReferenceType, x.ReferenceId });
            entity.Property(x => x.MovementType).HasMaxLength(40);
            entity.Property(x => x.ReferenceType).HasMaxLength(60);
        });

        builder.Entity<CartItem>(entity =>
        {
            entity.HasIndex(x => new { x.UserId, x.ProductId }).IsUnique();
            entity.HasIndex(x => new { x.UserId, x.UpdatedAtUtc });
            entity.Property(x => x.ConcurrencyStamp).IsConcurrencyToken().HasMaxLength(32);
        });

        builder.Entity<Address>(entity =>
        {
            entity.HasIndex(x => new { x.UserId, x.IsDefaultShipping, x.Label });
            entity.Property(x => x.Label).HasMaxLength(80);
            entity.Property(x => x.RecipientName).HasMaxLength(200);
            entity.Property(x => x.Line1).HasMaxLength(180);
            entity.Property(x => x.Line2).HasMaxLength(180);
            entity.Property(x => x.City).HasMaxLength(100);
            entity.Property(x => x.StateOrProvince).HasMaxLength(100);
            entity.Property(x => x.PostalCode).HasMaxLength(30);
            entity.Property(x => x.Country).HasMaxLength(80);
            entity.Property(x => x.PhoneNumber).HasMaxLength(30);
        });

        builder.Entity<RefreshToken>(entity =>
        {
            entity.HasIndex(x => x.TokenHash).IsUnique();
            entity.HasIndex(x => new { x.UserId, x.FamilyId });
            entity.Property(x => x.TokenHash).HasMaxLength(128);
            entity.Property(x => x.ReplacedByTokenHash).HasMaxLength(128);
            entity.HasOne(x => x.User)
                .WithMany(x => x.RefreshTokens)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Coupon>(entity =>
        {
            entity.HasIndex(x => x.Code).IsUnique();
            entity.Property(x => x.Code).HasMaxLength(50);
            entity.Property(x => x.DiscountAmount).HasPrecision(18, 2);
        });

        builder.Entity<Order>(entity =>
        {
            entity.HasIndex(x => new { x.UserId, x.IdempotencyKey }).IsUnique();
            entity.HasIndex(x => new { x.GuestEmail, x.IdempotencyKey });
            entity.HasIndex(x => new { x.UserId, x.CreatedAtUtc });
            entity.HasIndex(x => x.CreatedAtUtc);
            entity.HasIndex(x => x.ExpiresAtUtc);
            entity.HasIndex(x => new { x.Status, x.PaymentStatus });
            entity.Property(x => x.GuestEmail).HasMaxLength(256);
            entity.Property(x => x.GuestRecipientName).HasMaxLength(200);
            entity.Property(x => x.GuestPhoneNumber).HasMaxLength(30);
            entity.Property(x => x.ShippingLabel).HasMaxLength(80);
            entity.Property(x => x.ShippingRecipientName).HasMaxLength(200);
            entity.Property(x => x.ShippingLine1).HasMaxLength(180);
            entity.Property(x => x.ShippingLine2).HasMaxLength(180);
            entity.Property(x => x.ShippingCity).HasMaxLength(100);
            entity.Property(x => x.ShippingStateOrProvince).HasMaxLength(100);
            entity.Property(x => x.ShippingPostalCode).HasMaxLength(30);
            entity.Property(x => x.ShippingCountry).HasMaxLength(80);
            entity.Property(x => x.ShippingPhoneNumber).HasMaxLength(30);
            entity.Property(x => x.BillingLabel).HasMaxLength(80);
            entity.Property(x => x.BillingRecipientName).HasMaxLength(200);
            entity.Property(x => x.BillingLine1).HasMaxLength(180);
            entity.Property(x => x.BillingLine2).HasMaxLength(180);
            entity.Property(x => x.BillingCity).HasMaxLength(100);
            entity.Property(x => x.BillingStateOrProvince).HasMaxLength(100);
            entity.Property(x => x.BillingPostalCode).HasMaxLength(30);
            entity.Property(x => x.BillingCountry).HasMaxLength(80);
            entity.Property(x => x.BillingPhoneNumber).HasMaxLength(30);
            entity.Property(x => x.Subtotal).HasPrecision(18, 2);
            entity.Property(x => x.Discount).HasPrecision(18, 2);
            entity.Property(x => x.ShippingFee).HasPrecision(18, 2);
            entity.Property(x => x.Tax).HasPrecision(18, 2);
            entity.Property(x => x.Total).HasPrecision(18, 2);
            entity.Property(x => x.CouponCode).HasMaxLength(50);
            entity.Property(x => x.IdempotencyKey).HasMaxLength(80);
            entity.Property(x => x.ConcurrencyStamp).IsConcurrencyToken().HasMaxLength(32);
            entity.HasOne(x => x.ShippingAddress)
                .WithMany()
                .HasForeignKey(x => x.ShippingAddressId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.BillingAddress)
                .WithMany()
                .HasForeignKey(x => x.BillingAddressId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<OrderItem>(entity =>
        {
            entity.Property(x => x.Sku).HasMaxLength(100);
            entity.Property(x => x.ProductName).HasMaxLength(200);
            entity.Property(x => x.UnitPrice).HasPrecision(18, 2);
            entity.Property(x => x.LineTotal).HasPrecision(18, 2);
        });
    }
}
