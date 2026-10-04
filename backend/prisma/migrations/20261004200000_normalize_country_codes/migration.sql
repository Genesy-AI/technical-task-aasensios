-- UK is not an ISO 3166-1 alpha-2 code; the United Kingdom is GB
UPDATE "Lead" SET "countryCode" = 'GB' WHERE "countryCode" = 'UK';

-- countryCode is optional: store missing values as NULL, not empty strings
UPDATE "Lead" SET "countryCode" = NULL WHERE TRIM("countryCode") = '';
