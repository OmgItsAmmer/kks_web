-- Migration: Create missing enum types for OrderStatus and SeverityLevel
-- Run this SQL directly in your Supabase SQL editor or via psql

-- Create OrderStatus enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN
        CREATE TYPE "OrderStatus" AS ENUM (
            'pending',
            'ready',
            'confirmed',
            'cancelled',
            'delivered',
            'processing',
            'completed'
        );
    END IF;
END $$;

-- Create SeverityLevel enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SeverityLevel') THEN
        CREATE TYPE "SeverityLevel" AS ENUM (
            'info',
            'warning',
            'error',
            'critical'
        );
    END IF;
END $$;

-- Verify enums were created
SELECT typname FROM pg_type WHERE typname IN ('OrderStatus', 'SeverityLevel');
