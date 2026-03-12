-- Add new account types to the enum
ALTER TYPE personal_account_type ADD VALUE IF NOT EXISTS 'private_investment';
ALTER TYPE personal_account_type ADD VALUE IF NOT EXISTS 'insurance';
