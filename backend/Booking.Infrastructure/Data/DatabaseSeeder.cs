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

        if (!await dbContext.Categories.AnyAsync(cancellationToken))
        {
            var apparel = new Category { Name = "Apparel", Slug = "apparel" };
            var home = new Category { Name = "Home", Slug = "home" };
            var workspace = new Category { Name = "Workspace", Slug = "workspace" };
            var travel = new Category { Name = "Travel", Slug = "travel" };

            dbContext.Categories.AddRange(apparel, home, workspace, travel);

            dbContext.Products.AddRange(
                new Product
                {
                    Name = "Linen Utility Jacket",
                    Slug = "linen-utility-jacket",
                    Description = "Breathable everyday outerwear with durable pocket construction.",
                    Price = 128m,
                    StockQuantity = 18,
                    Category = apparel
                },
                new Product
                {
                    Name = "Ceramic Pour-Over Set",
                    Slug = "ceramic-pour-over-set",
                    Description = "Compact brewing set with reusable filter and ribbed server.",
                    Price = 74m,
                    StockQuantity = 32,
                    Category = home
                },
                new Product
                {
                    Name = "Modular Desk Lamp",
                    Slug = "modular-desk-lamp",
                    Description = "Weighted base task light with warm dimming and low glare shade.",
                    Price = 96m,
                    StockQuantity = 11,
                    Category = workspace
                },
                new Product
                {
                    Name = "Trail Daypack 18L",
                    Slug = "trail-daypack-18l",
                    Description = "Weather-resistant everyday pack with fast-access exterior pockets.",
                    Price = 142m,
                    StockQuantity = 24,
                    Category = travel
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
