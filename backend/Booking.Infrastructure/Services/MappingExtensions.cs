using Booking.Application.DTOs.Addresses;
using Booking.Application.DTOs.Cart;
using Booking.Application.DTOs.Orders;
using Booking.Application.DTOs.Products;
using Booking.Domain.Entities;

namespace Booking.Infrastructure.Services;

internal static class MappingExtensions
{
    private static ProductVariant? DefaultVariant(this Product product) =>
        product.Variants.FirstOrDefault(x => x.IsDefault) ?? product.Variants.FirstOrDefault();

    private static InventoryRecord? DefaultInventory(this Product product)
    {
        var variant = product.DefaultVariant();
        return variant?.InventoryRecords.OrderByDescending(x => x.UpdatedAtUtc).FirstOrDefault();
    }

    public static AddressDto ToDto(this Address address) =>
        new()
        {
            Id = address.Id,
            Label = address.Label,
            RecipientName = address.RecipientName,
            Line1 = address.Line1,
            Line2 = address.Line2,
            City = address.City,
            StateOrProvince = address.StateOrProvince,
            PostalCode = address.PostalCode,
            Country = address.Country,
            PhoneNumber = address.PhoneNumber,
            IsDefaultShipping = address.IsDefaultShipping
        };

    public static ProductSummaryDto ToSummaryDto(this Product product)
    {
        var variant = product.DefaultVariant();
        var inventory = product.DefaultInventory();
        var availableStock = inventory is null ? product.StockQuantity : Math.Max(0, inventory.PiecesOnHand - inventory.PiecesReserved);

        return new ProductSummaryDto
        {
            Id = product.Id,
            Name = product.Name,
            Slug = product.Slug,
            Category = product.Category.Name,
            Brand = product.Brand,
            Status = product.Status,
            Sku = variant?.Sku,
            Price = variant?.Price ?? product.Price,
            SalePrice = variant?.SalePrice ?? product.SalePrice,
            StockQuantity = availableStock,
            QuantityOnHand = inventory?.PiecesOnHand ?? product.StockQuantity,
            QuantityReserved = inventory?.PiecesReserved ?? 0,
            QuantityAvailable = availableStock,
            LowStockThreshold = variant?.LowStockThreshold ?? 5,
            IsActive = product.IsActive,
            ImageUrl = product.Images.OrderBy(x => x.SortOrder).FirstOrDefault(x => x.IsPrimary)?.ImageUrl
                ?? product.Images.OrderBy(x => x.SortOrder).FirstOrDefault()?.ImageUrl
        };
    }

    public static ProductDetailDto ToDetailDto(this Product product)
    {
        var variant = product.DefaultVariant();
        var inventory = product.DefaultInventory();
        var imageUrl = product.Images.OrderBy(x => x.SortOrder).FirstOrDefault(x => x.IsPrimary)?.ImageUrl
            ?? product.Images.OrderBy(x => x.SortOrder).FirstOrDefault()?.ImageUrl;
        var availableStock = inventory is null ? product.StockQuantity : Math.Max(0, inventory.PiecesOnHand - inventory.PiecesReserved);

        return new ProductDetailDto
        {
            Id = product.Id,
            Name = product.Name,
            Slug = product.Slug,
            Category = product.Category.Name,
            CategoryId = product.CategoryId,
            Brand = product.Brand,
            Status = product.Status,
            Sku = variant?.Sku,
            Price = variant?.Price ?? product.Price,
            SalePrice = variant?.SalePrice ?? product.SalePrice,
            StockQuantity = availableStock,
            QuantityOnHand = inventory?.PiecesOnHand ?? product.StockQuantity,
            QuantityReserved = inventory?.PiecesReserved ?? 0,
            QuantityAvailable = availableStock,
            LowStockThreshold = variant?.LowStockThreshold ?? 5,
            IsActive = product.IsActive,
            ImageUrl = imageUrl,
            Description = product.Description,
            Images = product.Images
                .OrderBy(x => x.SortOrder)
                .Select(x => new ProductImageDto
                {
                    Id = x.Id,
                    ImageUrl = x.ImageUrl,
                    IsPrimary = x.IsPrimary,
                    SortOrder = x.SortOrder
                })
                .ToList(),
            ConcurrencyStamp = product.ConcurrencyStamp,
            Inventory = variant is null || inventory is null
                ? null
                : new InventorySnapshotDto
                {
                    ProductId = product.Id,
                    ProductVariantId = variant.Id,
                    ProductName = product.Name,
                    Category = product.Category.Name,
                    Sku = variant.Sku,
                    Color = variant.Color,
                    Size = variant.Size,
                    WarehouseCode = inventory.Warehouse.Code,
                    QtyOnHand = inventory.PiecesOnHand,
                    QtyReserved = inventory.PiecesReserved,
                    QtyAvailable = availableStock,
                    LowStockThreshold = variant.LowStockThreshold,
                    IsLowStock = availableStock <= variant.LowStockThreshold,
                    UpdatedAtUtc = inventory.UpdatedAtUtc
                }
        };
    }

    public static Booking.Application.DTOs.Categories.CategoryDto ToDto(this Category category) =>
        new()
        {
            Id = category.Id,
            Name = category.Name,
            Slug = category.Slug,
            ParentCategoryId = category.ParentCategoryId
        };

    public static CartItemDto ToDto(this CartItem item) =>
        new()
        {
            Id = item.Id,
            ProductId = item.ProductId,
            ProductVariantId = item.ProductVariantId,
            Sku = item.ProductVariant?.Sku,
            ProductName = item.Product.Name,
            UnitPrice = item.ProductVariant?.SalePrice ?? item.ProductVariant?.Price ?? item.Product.SalePrice ?? item.Product.Price,
            Quantity = item.Quantity,
            AvailableStock = item.ProductVariant?.InventoryRecords
                .Select(x => Math.Max(0, x.PiecesOnHand - x.PiecesReserved))
                .FirstOrDefault() ?? item.Product.StockQuantity,
            ImageUrl = item.Product.Images.OrderBy(x => x.SortOrder).FirstOrDefault(x => x.IsPrimary)?.ImageUrl
                ?? item.Product.Images.OrderBy(x => x.SortOrder).FirstOrDefault()?.ImageUrl,
            ConcurrencyStamp = item.ConcurrencyStamp
        };

    public static OrderDto ToDto(this Order order) =>
        new()
        {
            Id = order.Id,
            Status = order.Status.ToString(),
            PaymentMethod = order.PaymentMethod.ToString(),
            PaymentStatus = order.PaymentStatus.ToString(),
            UserId = order.UserId,
            ShippingAddressId = order.ShippingAddressId,
            BillingAddressId = order.BillingAddressId,
            GuestEmail = order.GuestEmail,
            GuestRecipientName = order.GuestRecipientName,
            ShippingAddressSnapshot = string.IsNullOrWhiteSpace(order.ShippingLine1)
                ? null
                : new AddressDtoToGuestOrderAddressAdapter(order.ShippingLabel, order.ShippingRecipientName, order.ShippingLine1, order.ShippingLine2, order.ShippingCity, order.ShippingStateOrProvince, order.ShippingPostalCode, order.ShippingCountry, order.ShippingPhoneNumber).ToDto(),
            BillingAddressSnapshot = string.IsNullOrWhiteSpace(order.BillingLine1)
                ? null
                : new AddressDtoToGuestOrderAddressAdapter(order.BillingLabel, order.BillingRecipientName, order.BillingLine1, order.BillingLine2, order.BillingCity, order.BillingStateOrProvince, order.BillingPostalCode, order.BillingCountry, order.BillingPhoneNumber).ToDto(),
            Subtotal = order.Subtotal,
            Discount = order.Discount,
            ShippingFee = order.ShippingFee,
            Tax = order.Tax,
            Total = order.Total,
            CouponCode = order.CouponCode,
            CreatedAtUtc = order.CreatedAtUtc,
            ExpiresAtUtc = order.ExpiresAtUtc,
            ConcurrencyStamp = order.ConcurrencyStamp,
            Items = order.Items
                .Select(x => new OrderItemDto
                {
                    ProductId = x.ProductId,
                    ProductVariantId = x.ProductVariantId,
                    Sku = x.Sku,
                    ProductName = x.ProductName,
                    UnitPrice = x.UnitPrice,
                    Quantity = x.Quantity,
                    LineTotal = x.LineTotal
                })
                .ToList()
        };

    private readonly record struct AddressDtoToGuestOrderAddressAdapter(
        string? Label,
        string? RecipientName,
        string? Line1,
        string? Line2,
        string? City,
        string? StateOrProvince,
        string? PostalCode,
        string? Country,
        string? PhoneNumber)
    {
        public GuestOrderAddressDto ToDto() =>
            new()
            {
                Label = Label ?? "Guest",
                RecipientName = RecipientName ?? string.Empty,
                Line1 = Line1 ?? string.Empty,
                Line2 = Line2,
                City = City ?? string.Empty,
                StateOrProvince = StateOrProvince ?? string.Empty,
                PostalCode = PostalCode ?? string.Empty,
                Country = Country ?? string.Empty,
                PhoneNumber = PhoneNumber ?? string.Empty
            };
    }
}
