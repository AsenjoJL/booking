using Microsoft.EntityFrameworkCore;

namespace Booking.Infrastructure.Data;

public static class DatabaseSchemaBootstrapper
{
    public static async Task EnsureCompatibilityAsync(
        BookingDbContext dbContext,
        CancellationToken cancellationToken = default)
    {
        await dbContext.Database.EnsureCreatedAsync(cancellationToken);
        await EnsureRefreshTokensTableAsync(dbContext, cancellationToken);
        await EnsureOrderCheckoutColumnsAsync(dbContext, cancellationToken);
        await EnsurePerformanceIndexesAsync(dbContext, cancellationToken);
    }

    private static async Task EnsureRefreshTokensTableAsync(
        BookingDbContext dbContext,
        CancellationToken cancellationToken)
    {
        const string createTableSql = """
            CREATE TABLE IF NOT EXISTS "RefreshTokens" (
                "Id" uuid NOT NULL,
                "UserId" uuid NOT NULL,
                "TokenHash" character varying(128) NOT NULL,
                "FamilyId" uuid NOT NULL,
                "CreatedAtUtc" timestamp with time zone NOT NULL,
                "ExpiresAtUtc" timestamp with time zone NOT NULL,
                "RevokedAtUtc" timestamp with time zone NULL,
                "ReplacedByTokenHash" character varying(128) NULL,
                CONSTRAINT "PK_RefreshTokens" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_RefreshTokens_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
            );
            """;

        const string createTokenHashIndexSql = """
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_RefreshTokens_TokenHash"
            ON "RefreshTokens" ("TokenHash");
            """;

        const string createUserFamilyIndexSql = """
            CREATE INDEX IF NOT EXISTS "IX_RefreshTokens_UserId_FamilyId"
            ON "RefreshTokens" ("UserId", "FamilyId");
            """;

        await dbContext.Database.ExecuteSqlRawAsync(createTableSql, cancellationToken);
        await dbContext.Database.ExecuteSqlRawAsync(createTokenHashIndexSql, cancellationToken);
        await dbContext.Database.ExecuteSqlRawAsync(createUserFamilyIndexSql, cancellationToken);
    }

    private static async Task EnsureOrderCheckoutColumnsAsync(
        BookingDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var statements = new[]
        {
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "BillingAddressId" uuid NULL;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "ShippingFee" numeric(18,2) NOT NULL DEFAULT 0;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "Tax" numeric(18,2) NOT NULL DEFAULT 0;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "PaymentMethod" integer NOT NULL DEFAULT 0;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "PaymentStatus" integer NOT NULL DEFAULT 0;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "ExpiresAtUtc" timestamp with time zone NULL;
            """,
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'FK_Orders_Addresses_BillingAddressId'
                ) THEN
                    ALTER TABLE "Orders"
                    ADD CONSTRAINT "FK_Orders_Addresses_BillingAddressId"
                    FOREIGN KEY ("BillingAddressId") REFERENCES "Addresses" ("Id") ON DELETE RESTRICT;
                END IF;
            END
            $$;
            """
        };

        foreach (var statement in statements)
        {
            await dbContext.Database.ExecuteSqlRawAsync(statement, cancellationToken);
        }
    }

    private static async Task EnsurePerformanceIndexesAsync(
        BookingDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var indexStatements = new[]
        {
            """
            CREATE INDEX IF NOT EXISTS "IX_Products_IsActive_CreatedAtUtc"
            ON "Products" ("IsActive", "CreatedAtUtc");
            """,
            """
            CREATE INDEX IF NOT EXISTS "IX_Products_CategoryId_IsActive_CreatedAtUtc"
            ON "Products" ("CategoryId", "IsActive", "CreatedAtUtc");
            """,
            """
            CREATE INDEX IF NOT EXISTS "IX_ProductImages_ProductId_SortOrder"
            ON "ProductImages" ("ProductId", "SortOrder");
            """,
            """
            CREATE INDEX IF NOT EXISTS "IX_CartItems_UserId_UpdatedAtUtc"
            ON "CartItems" ("UserId", "UpdatedAtUtc");
            """,
            """
            CREATE INDEX IF NOT EXISTS "IX_Addresses_UserId_IsDefaultShipping_Label"
            ON "Addresses" ("UserId", "IsDefaultShipping", "Label");
            """,
            """
            CREATE INDEX IF NOT EXISTS "IX_Orders_UserId_CreatedAtUtc"
            ON "Orders" ("UserId", "CreatedAtUtc");
            """,
            """
            CREATE INDEX IF NOT EXISTS "IX_Orders_CreatedAtUtc"
            ON "Orders" ("CreatedAtUtc");
            """,
            """
            CREATE INDEX IF NOT EXISTS "IX_Orders_ExpiresAtUtc"
            ON "Orders" ("ExpiresAtUtc");
            """,
            """
            CREATE INDEX IF NOT EXISTS "IX_Orders_Status_PaymentStatus"
            ON "Orders" ("Status", "PaymentStatus");
            """
        };

        foreach (var statement in indexStatements)
        {
            await dbContext.Database.ExecuteSqlRawAsync(statement, cancellationToken);
        }
    }
}
