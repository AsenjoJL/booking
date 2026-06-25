using Booking.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Booking.Infrastructure.Data;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(
        BookingDbContext dbContext,
        UserManager<User> userManager,
        RoleManager<IdentityRole<Guid>> roleManager,
        CancellationToken cancellationToken = default)
    {
        foreach (var role in new[] { "Admin", "Customer" })
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole<Guid>(role));
            }
        }

        // ── One-time migration: replace old non-clothing categories ──
        var oldSlugs = new HashSet<string> { "home", "workspace", "travel", "apparel" };
        var existingCategories = await dbContext.Categories.ToListAsync(cancellationToken);
        var hasOldCategories = existingCategories.Any(c => oldSlugs.Contains(c.Slug));

        if (hasOldCategories)
        {
            // Define the new clothing categories
            var newCategoryDefs = new[]
            {
                (Name: "Tops", Slug: "tops"),
                (Name: "Bottoms", Slug: "bottoms"),
                (Name: "Dresses", Slug: "dresses"),
                (Name: "Outerwear", Slug: "outerwear"),
                (Name: "Accessories", Slug: "accessories"),
            };

            // Create new categories that don't already exist
            foreach (var def in newCategoryDefs)
            {
                if (!existingCategories.Any(c => c.Slug == def.Slug))
                {
                    dbContext.Categories.Add(new Category { Name = def.Name, Slug = def.Slug });
                }
            }
            await dbContext.SaveChangesAsync(cancellationToken);

            // Reload to get IDs
            var allCategories = await dbContext.Categories.ToListAsync(cancellationToken);
            var topsId = allCategories.First(c => c.Slug == "tops").Id;

            // Reassign products from old categories to "Tops" as a safe default
            var oldCategoryIds = allCategories
                .Where(c => oldSlugs.Contains(c.Slug))
                .Select(c => c.Id)
                .ToHashSet();

            var productsToReassign = await dbContext.Products
                .Where(p => oldCategoryIds.Contains(p.CategoryId))
                .ToListAsync(cancellationToken);

            foreach (var product in productsToReassign)
            {
                product.CategoryId = topsId;
            }

            // Remove old categories
            var categoriesToRemove = allCategories.Where(c => oldSlugs.Contains(c.Slug)).ToList();
            dbContext.Categories.RemoveRange(categoriesToRemove);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        if (!await dbContext.Categories.AnyAsync(cancellationToken))
        {
            var tops = new Category { Name = "Tops", Slug = "tops" };
            var bottoms = new Category { Name = "Bottoms", Slug = "bottoms" };
            var dresses = new Category { Name = "Dresses", Slug = "dresses" };
            var outerwear = new Category { Name = "Outerwear", Slug = "outerwear" };
            var accessories = new Category { Name = "Accessories", Slug = "accessories" };

            dbContext.Categories.AddRange(tops, bottoms, dresses, outerwear, accessories);

            dbContext.Products.AddRange(
                new Product
                {
                    Name = "Oversized Cotton Tee",
                    Slug = "oversized-cotton-tee",
                    Description = "Relaxed-fit heavyweight cotton tee with dropped shoulders and ribbed crew neck.",
                    Price = 680m,
                    StockQuantity = 45,
                    Status = "Active",
                    Category = tops
                },
                new Product
                {
                    Name = "Slim Fit Chinos",
                    Slug = "slim-fit-chinos",
                    Description = "Stretch cotton chinos with a tapered leg and clean front for everyday versatility.",
                    Price = 1280m,
                    StockQuantity = 32,
                    Status = "Active",
                    Category = bottoms
                },
                new Product
                {
                    Name = "Wrap Midi Dress",
                    Slug = "wrap-midi-dress",
                    Description = "Elegant wrap silhouette in fluid fabric with adjustable waist tie and midi length.",
                    Price = 1950m,
                    StockQuantity = 18,
                    Status = "Active",
                    Category = dresses
                },
                new Product
                {
                    Name = "Wool Blend Overcoat",
                    Slug = "wool-blend-overcoat",
                    Description = "Structured single-breasted overcoat in a warm wool blend with notch lapels.",
                    Price = 3450m,
                    StockQuantity = 12,
                    Status = "Active",
                    Category = outerwear
                });

            dbContext.Coupons.Add(new Coupon
            {
                Code = "WELCOME10",
                DiscountAmount = 10m,
                IsActive = true,
                ExpiresAtUtc = DateTime.UtcNow.AddYears(1)
            });

            await dbContext.SaveChangesAsync(cancellationToken);
        }


        await EnsureUserAsync(dbContext, userManager, "admin@booking.local", "Admin123!", "Store", "Admin", "Admin");
        await EnsureUserAsync(dbContext, userManager, "customer@booking.local", "Customer123!", "Demo", "Customer", "Customer");
    }

    private static async Task EnsureUserAsync(
        BookingDbContext dbContext,
        UserManager<User> userManager,
        string email,
        string password,
        string firstName,
        string lastName,
        string role)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user is not null)
        {
            if (!user.LockoutEnabled)
            {
                user.LockoutEnabled = true;
                await userManager.UpdateAsync(user);
            }

            return;
        }

        user = new User
        {
            UserName = email,
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            EmailConfirmed = true,
            LockoutEnabled = true
        };

        var result = await userManager.CreateAsync(user, password);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(x => x.Description)));
        }

        await userManager.AddToRoleAsync(user, role);

        if (role == "Customer")
        {
            dbContext.Addresses.Add(new Address
            {
                UserId = user.Id,
                Label = "Home",
                RecipientName = $"{firstName} {lastName}",
                Line1 = "123 Market Street",
                City = "Manila",
                StateOrProvince = "Metro Manila",
                PostalCode = "1000",
                Country = "Philippines",
                PhoneNumber = "+63 900 000 0000",
                IsDefaultShipping = true
            });

            await dbContext.SaveChangesAsync();
        }
    }
}
