using Microsoft.EntityFrameworkCore;

namespace Booking.Infrastructure.Data;

public static class DatabaseSchemaBootstrapper
{
    public static async Task EnsureCompatibilityAsync(
        BookingDbContext dbContext,
        CancellationToken cancellationToken = default)
    {
        var tableExists = await dbContext.Database
            .SqlQueryRaw<int>("SELECT 1 FROM pg_tables WHERE tablename = 'AspNetUsers'")
            .AnyAsync(cancellationToken);

        if (!tableExists)
        {
            var databaseCreator = dbContext.Database.GetService<Microsoft.EntityFrameworkCore.Storage.IRelationalDatabaseCreator>();
            await databaseCreator.CreateTablesAsync(cancellationToken);
        }

        await EnsureRefreshTokensTableAsync(dbContext, cancellationToken);
        await EnsureOrderCheckoutColumnsAsync(dbContext, cancellationToken);
        await EnsureProductCatalogColumnsAsync(dbContext, cancellationToken);
        await EnsureInventoryTablesAsync(dbContext, cancellationToken);
        await BackfillInventoryCompatibilityAsync(dbContext, cancellationToken);
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

    private static async Task EnsureProductCatalogColumnsAsync(
        BookingDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var statements = new[]
        {
            """
            ALTER TABLE "Products"
            ADD COLUMN IF NOT EXISTS "Brand" character varying(120) NOT NULL DEFAULT '';
            """,
            """
            ALTER TABLE "Products"
            ADD COLUMN IF NOT EXISTS "Status" character varying(40) NOT NULL DEFAULT 'Draft';
            """,
            """
            ALTER TABLE "Products"
            ADD COLUMN IF NOT EXISTS "IsDeleted" boolean NOT NULL DEFAULT FALSE;
            """,
            """
            ALTER TABLE "Products"
            ADD COLUMN IF NOT EXISTS "DeletedAtUtc" timestamp with time zone NULL;
            """,
            """
            ALTER TABLE "CartItems"
            ADD COLUMN IF NOT EXISTS "ProductVariantId" uuid NULL;
            """,
            """
            ALTER TABLE "OrderItems"
            ADD COLUMN IF NOT EXISTS "ProductVariantId" uuid NULL;
            """,
            """
            ALTER TABLE "OrderItems"
            ADD COLUMN IF NOT EXISTS "Sku" character varying(100) NULL;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "InventoryCommittedAtUtc" timestamp with time zone NULL;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "InventoryReleasedAtUtc" timestamp with time zone NULL;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "GuestEmail" character varying(256) NULL;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "GuestRecipientName" character varying(200) NULL;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "GuestPhoneNumber" character varying(30) NULL;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "ShippingLabel" character varying(80) NULL;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "ShippingRecipientName" character varying(200) NULL;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "ShippingLine1" character varying(180) NULL;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "ShippingLine2" character varying(180) NULL;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "ShippingCity" character varying(100) NULL;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "ShippingStateOrProvince" character varying(100) NULL;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "ShippingPostalCode" character varying(30) NULL;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "ShippingCountry" character varying(80) NULL;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "ShippingPhoneNumber" character varying(30) NULL;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "BillingLabel" character varying(80) NULL;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "BillingRecipientName" character varying(200) NULL;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "BillingLine1" character varying(180) NULL;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "BillingLine2" character varying(180) NULL;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "BillingCity" character varying(100) NULL;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "BillingStateOrProvince" character varying(100) NULL;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "BillingPostalCode" character varying(30) NULL;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "BillingCountry" character varying(80) NULL;
            """,
            """
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "BillingPhoneNumber" character varying(30) NULL;
            """,
            """
            ALTER TABLE "Orders"
            ALTER COLUMN "UserId" DROP NOT NULL;
            """,
            """
            ALTER TABLE "Orders"
            ALTER COLUMN "ShippingAddressId" DROP NOT NULL;
            """
        };

        foreach (var statement in statements)
        {
            await dbContext.Database.ExecuteSqlRawAsync(statement, cancellationToken);
        }
    }

    private static async Task EnsureInventoryTablesAsync(
        BookingDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var statements = new[]
        {
            """
            CREATE TABLE IF NOT EXISTS "Warehouses" (
                "Id" uuid NOT NULL,
                "Name" character varying(150) NOT NULL,
                "Code" character varying(50) NOT NULL,
                "IsActive" boolean NOT NULL,
                "CreatedAtUtc" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_Warehouses" PRIMARY KEY ("Id")
            );
            """,
            """
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_Warehouses_Code"
            ON "Warehouses" ("Code");
            """,
            """
            CREATE TABLE IF NOT EXISTS "ProductVariants" (
                "Id" uuid NOT NULL,
                "ProductId" uuid NOT NULL,
                "Sku" character varying(100) NOT NULL,
                "Color" character varying(80) NULL,
                "Size" character varying(50) NULL,
                "Weight" numeric(12,3) NULL,
                "Model" character varying(100) NULL,
                "PackageType" character varying(100) NULL,
                "Price" numeric(18,2) NOT NULL,
                "SalePrice" numeric(18,2) NULL,
                "Status" character varying(40) NOT NULL,
                "IsDefault" boolean NOT NULL,
                "LowStockThreshold" integer NOT NULL DEFAULT 5,
                "CreatedAtUtc" timestamp with time zone NOT NULL,
                "UpdatedAtUtc" timestamp with time zone NOT NULL,
                "ConcurrencyStamp" character varying(32) NOT NULL,
                CONSTRAINT "PK_ProductVariants" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_ProductVariants_Products_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Products" ("Id") ON DELETE CASCADE
            );
            """,
            """
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_ProductVariants_Sku"
            ON "ProductVariants" ("Sku");
            """,
            """
            CREATE INDEX IF NOT EXISTS "IX_ProductVariants_ProductId_IsDefault"
            ON "ProductVariants" ("ProductId", "IsDefault");
            """,
            """
            CREATE TABLE IF NOT EXISTS "InventoryRecords" (
                "Id" uuid NOT NULL,
                "ProductVariantId" uuid NOT NULL,
                "WarehouseId" uuid NOT NULL,
                "PiecesOnHand" integer NOT NULL,
                "PiecesReserved" integer NOT NULL,
                "UpdatedAtUtc" timestamp with time zone NOT NULL,
                "ConcurrencyStamp" character varying(32) NOT NULL,
                CONSTRAINT "PK_InventoryRecords" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_InventoryRecords_ProductVariants_ProductVariantId" FOREIGN KEY ("ProductVariantId") REFERENCES "ProductVariants" ("Id") ON DELETE CASCADE,
                CONSTRAINT "FK_InventoryRecords_Warehouses_WarehouseId" FOREIGN KEY ("WarehouseId") REFERENCES "Warehouses" ("Id") ON DELETE CASCADE
            );
            """,
            """
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_InventoryRecords_WarehouseId_ProductVariantId"
            ON "InventoryRecords" ("WarehouseId", "ProductVariantId");
            """,
            """
            CREATE TABLE IF NOT EXISTS "InventoryMovements" (
                "Id" uuid NOT NULL,
                "ProductVariantId" uuid NOT NULL,
                "WarehouseId" uuid NOT NULL,
                "MovementType" character varying(40) NOT NULL,
                "PiecesDelta" integer NOT NULL,
                "PiecesOnHandAfter" integer NOT NULL,
                "PiecesReservedAfter" integer NOT NULL,
                "ReferenceType" character varying(60) NULL,
                "ReferenceId" uuid NULL,
                "Note" text NULL,
                "CreatedAtUtc" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_InventoryMovements" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_InventoryMovements_ProductVariants_ProductVariantId" FOREIGN KEY ("ProductVariantId") REFERENCES "ProductVariants" ("Id") ON DELETE CASCADE,
                CONSTRAINT "FK_InventoryMovements_Warehouses_WarehouseId" FOREIGN KEY ("WarehouseId") REFERENCES "Warehouses" ("Id") ON DELETE CASCADE
            );
            """,
            """
            CREATE INDEX IF NOT EXISTS "IX_InventoryMovements_ProductVariantId_CreatedAtUtc"
            ON "InventoryMovements" ("ProductVariantId", "CreatedAtUtc");
            """,
            """
            CREATE INDEX IF NOT EXISTS "IX_InventoryMovements_ReferenceType_ReferenceId"
            ON "InventoryMovements" ("ReferenceType", "ReferenceId");
            """
        };

        foreach (var statement in statements)
        {
            await dbContext.Database.ExecuteSqlRawAsync(statement, cancellationToken);
        }
    }

    private static async Task BackfillInventoryCompatibilityAsync(
        BookingDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var statements = new[]
        {
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'InventoryRecords' AND column_name = 'QuantityOnHand'
                ) AND NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'InventoryRecords' AND column_name = 'PiecesOnHand'
                ) THEN
                    ALTER TABLE "InventoryRecords" RENAME COLUMN "QuantityOnHand" TO "PiecesOnHand";
                END IF;
            END $$;
            """,
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'InventoryRecords' AND column_name = 'QuantityReserved'
                ) AND NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'InventoryRecords' AND column_name = 'PiecesReserved'
                ) THEN
                    ALTER TABLE "InventoryRecords" RENAME COLUMN "QuantityReserved" TO "PiecesReserved";
                END IF;
            END $$;
            """,
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'InventoryMovements' AND column_name = 'QuantityDelta'
                ) AND NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'InventoryMovements' AND column_name = 'PiecesDelta'
                ) THEN
                    ALTER TABLE "InventoryMovements" RENAME COLUMN "QuantityDelta" TO "PiecesDelta";
                END IF;
            END $$;
            """,
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'InventoryMovements' AND column_name = 'QuantityOnHandAfter'
                ) AND NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'InventoryMovements' AND column_name = 'PiecesOnHandAfter'
                ) THEN
                    ALTER TABLE "InventoryMovements" RENAME COLUMN "QuantityOnHandAfter" TO "PiecesOnHandAfter";
                END IF;
            END $$;
            """,
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'InventoryMovements' AND column_name = 'QuantityReservedAfter'
                ) AND NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'InventoryMovements' AND column_name = 'PiecesReservedAfter'
                ) THEN
                    ALTER TABLE "InventoryMovements" RENAME COLUMN "QuantityReservedAfter" TO "PiecesReservedAfter";
                END IF;
            END $$;
            """,
            """
            INSERT INTO "Warehouses" ("Id", "Name", "Code", "IsActive", "CreatedAtUtc")
            SELECT gen_random_uuid(), 'Main Warehouse', 'MAIN', TRUE, now()
            WHERE NOT EXISTS (SELECT 1 FROM "Warehouses" WHERE "Code" = 'MAIN');
            """,
            """
            INSERT INTO "ProductVariants" (
                "Id", "ProductId", "Sku", "Price", "SalePrice", "Status",
                "IsDefault", "LowStockThreshold", "CreatedAtUtc", "UpdatedAtUtc", "ConcurrencyStamp"
            )
            SELECT
                gen_random_uuid(),
                p."Id",
                UPPER(LEFT(REGEXP_REPLACE(p."Slug", '[^a-zA-Z0-9]', '', 'g'), 12)) || '-' || UPPER(LEFT(REPLACE(p."Id"::text, '-', ''), 8)),
                p."Price",
                p."SalePrice",
                COALESCE(NULLIF(p."Status", ''), CASE WHEN p."IsActive" THEN 'Active' ELSE 'Draft' END),
                TRUE,
                5,
                p."CreatedAtUtc",
                now(),
                REPLACE(gen_random_uuid()::text, '-', '')
            FROM "Products" p
            WHERE NOT EXISTS (
                SELECT 1 FROM "ProductVariants" pv WHERE pv."ProductId" = p."Id" AND pv."IsDefault" = TRUE
            );
            """,
            """
            INSERT INTO "InventoryRecords" (
                "Id", "ProductVariantId", "WarehouseId", "PiecesOnHand", "PiecesReserved", "UpdatedAtUtc", "ConcurrencyStamp"
            )
            SELECT
                gen_random_uuid(),
                pv."Id",
                w."Id",
                p."StockQuantity",
                0,
                now(),
                REPLACE(gen_random_uuid()::text, '-', '')
            FROM "ProductVariants" pv
            JOIN "Products" p ON p."Id" = pv."ProductId"
            CROSS JOIN LATERAL (
                SELECT "Id"
                FROM "Warehouses"
                WHERE "Code" = 'MAIN'
                LIMIT 1
            ) w
            WHERE pv."IsDefault" = TRUE
              AND NOT EXISTS (
                  SELECT 1
                  FROM "InventoryRecords" ir
                  WHERE ir."ProductVariantId" = pv."Id" AND ir."WarehouseId" = w."Id"
              );
            """,
            """
            UPDATE "CartItems" ci
            SET "ProductVariantId" = pv."Id"
            FROM "ProductVariants" pv
            WHERE ci."ProductId" = pv."ProductId"
              AND pv."IsDefault" = TRUE
              AND ci."ProductVariantId" IS NULL;
            """,
            """
            UPDATE "OrderItems" oi
            SET
                "ProductVariantId" = pv."Id",
                "Sku" = COALESCE(oi."Sku", pv."Sku")
            FROM "ProductVariants" pv
            WHERE oi."ProductId" = pv."ProductId"
              AND pv."IsDefault" = TRUE
              AND oi."ProductVariantId" IS NULL;
            """,
            """
            UPDATE "Products" p
            SET "Status" = CASE
                WHEN p."Status" = '' AND p."IsActive" = TRUE THEN 'Active'
                WHEN p."Status" = '' AND p."IsActive" = FALSE THEN 'Draft'
                ELSE p."Status"
            END;
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
            CREATE INDEX IF NOT EXISTS "IX_Products_Name_Trgm"
            ON "Products" USING gin ("Name" gin_trgm_ops);
            """,
            """
            CREATE INDEX IF NOT EXISTS "IX_Products_Description_Trgm"
            ON "Products" USING gin ("Description" gin_trgm_ops);
            """,
            """
            CREATE INDEX IF NOT EXISTS "IX_Products_Brand"
            ON "Products" ("Brand");
            """,
            """
            CREATE INDEX IF NOT EXISTS "IX_Products_Brand_Trgm"
            ON "Products" USING gin ("Brand" gin_trgm_ops);
            """,
            """
            CREATE INDEX IF NOT EXISTS "IX_Products_CategoryId_IsActive_CreatedAtUtc"
            ON "Products" ("CategoryId", "IsActive", "CreatedAtUtc");
            """,
            """
            CREATE INDEX IF NOT EXISTS "IX_Products_IsDeleted_IsActive_CreatedAtUtc"
            ON "Products" ("IsDeleted", "IsActive", "CreatedAtUtc");
            """,
            """
            CREATE INDEX IF NOT EXISTS "IX_Categories_Slug_Trgm"
            ON "Categories" USING gin ("Slug" gin_trgm_ops);
            """,
            """
            CREATE INDEX IF NOT EXISTS "IX_ProductImages_ProductId_SortOrder"
            ON "ProductImages" ("ProductId", "SortOrder");
            """,
            """
            CREATE INDEX IF NOT EXISTS "IX_ProductVariants_ProductId_IsDefault"
            ON "ProductVariants" ("ProductId", "IsDefault");
            """,
            """
            CREATE INDEX IF NOT EXISTS "IX_ProductVariants_Sku_Trgm"
            ON "ProductVariants" USING gin ("Sku" gin_trgm_ops);
            """,
            """
            CREATE INDEX IF NOT EXISTS "IX_InventoryRecords_ProductVariantId"
            ON "InventoryRecords" ("ProductVariantId");
            """,
            """
            CREATE INDEX IF NOT EXISTS "IX_InventoryRecords_ProductVariantId_UpdatedAtUtc"
            ON "InventoryRecords" ("ProductVariantId", "UpdatedAtUtc");
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
            CREATE INDEX IF NOT EXISTS "IX_Orders_GuestEmail_IdempotencyKey"
            ON "Orders" ("GuestEmail", "IdempotencyKey");
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
