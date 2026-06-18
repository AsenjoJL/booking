using Booking.Application.DTOs.Addresses;
using Booking.Application.DTOs.Cart;
using Booking.Application.DTOs.Orders;
using Booking.Application.DTOs.Products;
using Booking.Domain.Entities;

namespace Booking.Infrastructure.Services;

internal static class MappingExtensions
{
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

    public static ProductSummaryDto ToSummaryDto(this Product product) =>
        new()
        {
            Id = product.Id,
            Name = product.Name,
            Slug = product.Slug,
            Category = product.Category.Name,
            Price = product.Price,
            SalePrice = product.SalePrice,
            StockQuantity = product.StockQuantity,
            IsActive = product.IsActive,
            ImageUrl = product.Images.OrderBy(x => x.SortOrder).FirstOrDefault(x => x.IsPrimary)?.ImageUrl
                ?? product.Images.OrderBy(x => x.SortOrder).FirstOrDefault()?.ImageUrl
        };

    public static ProductDetailDto ToDetailDto(this Product product) =>
        new()
        {
            Id = product.Id,
            Name = product.Name,
            Slug = product.Slug,
            Category = product.Category.Name,
            CategoryId = product.CategoryId,
            Price = product.Price,
            SalePrice = product.SalePrice,
            StockQuantity = product.StockQuantity,
            IsActive = product.IsActive,
            ImageUrl = product.Images.OrderBy(x => x.SortOrder).FirstOrDefault(x => x.IsPrimary)?.ImageUrl
                ?? product.Images.OrderBy(x => x.SortOrder).FirstOrDefault()?.ImageUrl,
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
            ConcurrencyStamp = product.ConcurrencyStamp
        };

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
            ProductName = item.Product.Name,
            UnitPrice = item.Product.SalePrice ?? item.Product.Price,
            Quantity = item.Quantity,
            AvailableStock = item.Product.StockQuantity,
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
            ShippingAddressId = order.ShippingAddressId,
            BillingAddressId = order.BillingAddressId,
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
                    ProductName = x.ProductName,
                    UnitPrice = x.UnitPrice,
                    Quantity = x.Quantity,
                    LineTotal = x.LineTotal
                })
                .ToList()
        };
}
