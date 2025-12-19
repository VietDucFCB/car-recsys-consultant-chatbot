-- ================================================
-- Car Recommendation System - Complete Schema
-- ================================================

-- Create schemas
CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS silver;
CREATE SCHEMA IF NOT EXISTS gold;

-- ================================================
-- RAW LAYER - Direct from CSV files
-- ================================================

-- Vehicles table (main data)
CREATE TABLE IF NOT EXISTS raw.used_vehicles (
    vehicle_id TEXT PRIMARY KEY,
    stock_number TEXT,
    condition TEXT,
    title TEXT,
    brand TEXT,
    car_model TEXT,
    car_name TEXT,
    price NUMERIC,
    monthly_payment NUMERIC,
    mileage NUMERIC,
    mileage_str TEXT,
    exterior_color TEXT,
    interior_color TEXT,
    drivetrain TEXT,
    mpg TEXT,
    fuel_type TEXT,
    transmission TEXT,
    engine TEXT,
    vin TEXT UNIQUE,
    accidents_damage TEXT,
    one_owner BOOLEAN,
    personal_use_only BOOLEAN,
    warranty TEXT,
    car_rating NUMERIC,
    percentage_recommend NUMERIC,
    comfort_rating NUMERIC,
    interior_rating NUMERIC,
    performance_rating NUMERIC,
    value_rating NUMERIC,
    exterior_rating NUMERIC,
    reliability_rating NUMERIC,
    vehicle_url TEXT,
    car_review_link TEXT,
    car_link TEXT,
    source_file TEXT,
    total_images INTEGER,
    has_ratings BOOLEAN,
    data_complete BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicles_brand ON raw.used_vehicles(brand);
CREATE INDEX IF NOT EXISTS idx_vehicles_model ON raw.used_vehicles(car_model);
CREATE INDEX IF NOT EXISTS idx_vehicles_price ON raw.used_vehicles(price);
CREATE INDEX IF NOT EXISTS idx_vehicles_condition ON raw.used_vehicles(condition);
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON raw.used_vehicles(vin);

-- ================================================
-- GOLD LAYER - Application tables
-- ================================================

-- Users table
CREATE TABLE IF NOT EXISTS gold.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User interactions (for recommendations)
CREATE TABLE IF NOT EXISTS gold.user_interactions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES gold.users(id) ON DELETE CASCADE,
    vehicle_id TEXT REFERENCES raw.used_vehicles(vehicle_id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL, -- view, click, favorite, compare, contact
    session_id TEXT,
    interaction_score NUMERIC DEFAULT 1.0,
    extra_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User favorites (quick access)
CREATE TABLE IF NOT EXISTS gold.user_favorites (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES gold.users(id) ON DELETE CASCADE,
    vehicle_id TEXT REFERENCES raw.used_vehicles(vehicle_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, vehicle_id)
);

-- User searches (search history)
CREATE TABLE IF NOT EXISTS gold.user_searches (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES gold.users(id) ON DELETE CASCADE,
    search_query TEXT,
    filters JSONB,
    results_count INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for gold layer
CREATE INDEX IF NOT EXISTS idx_interactions_user ON gold.user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_vehicle ON gold.user_interactions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON gold.user_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_interactions_created ON gold.user_interactions(created_at);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON gold.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_vehicle ON gold.user_favorites(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_searches_user ON gold.user_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_searches_created ON gold.user_searches(created_at);

-- ================================================
-- VIEWS for easy querying
-- ================================================

-- View: Vehicle with ratings
CREATE OR REPLACE VIEW gold.vehicles_with_ratings AS
SELECT 
    v.*,
    ROUND(AVG(COALESCE(v.comfort_rating, v.interior_rating, v.performance_rating, v.value_rating, v.exterior_rating, v.reliability_rating)), 2) as avg_rating,
    COUNT(DISTINCT ui.id) as interaction_count,
    COUNT(DISTINCT uf.id) as favorite_count
FROM raw.used_vehicles v
LEFT JOIN gold.user_interactions ui ON v.vehicle_id = ui.vehicle_id
LEFT JOIN gold.user_favorites uf ON v.vehicle_id = uf.vehicle_id
GROUP BY v.vehicle_id;

-- View: Popular vehicles
CREATE OR REPLACE VIEW gold.popular_vehicles AS
SELECT 
    v.vehicle_id,
    v.title,
    v.brand,
    v.car_model,
    v.price,
    v.vehicle_url,
    COUNT(DISTINCT ui.id) as total_interactions,
    COUNT(DISTINCT CASE WHEN ui.interaction_type = 'favorite' THEN ui.id END) as favorites,
    COUNT(DISTINCT CASE WHEN ui.interaction_type = 'view' THEN ui.id END) as views
FROM raw.used_vehicles v
LEFT JOIN gold.user_interactions ui ON v.vehicle_id = ui.vehicle_id
GROUP BY v.vehicle_id, v.title, v.brand, v.car_model, v.price, v.vehicle_url
ORDER BY total_interactions DESC;

-- ================================================
-- Functions
-- ================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON gold.users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON gold.users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON raw.used_vehicles;
CREATE TRIGGER update_vehicles_updated_at 
    BEFORE UPDATE ON raw.used_vehicles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- Grant permissions
-- ================================================

-- Grant all permissions to admin
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA raw TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA silver TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA gold TO admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA gold TO admin;

-- Grant select on views
GRANT SELECT ON gold.vehicles_with_ratings TO admin;
GRANT SELECT ON gold.popular_vehicles TO admin;

-- ================================================
-- Sample data for testing (optional)
-- ================================================

-- Insert a test user
INSERT INTO gold.users (email, hashed_password, full_name) 
VALUES ('test@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzS0MdKJae', 'Test User')
ON CONFLICT (email) DO NOTHING;

COMMENT ON TABLE raw.used_vehicles IS 'Raw vehicle data from CSV files';
COMMENT ON TABLE gold.users IS 'Registered users';
COMMENT ON TABLE gold.user_interactions IS 'User interaction events for recommendations';
COMMENT ON TABLE gold.user_favorites IS 'User favorite vehicles';
COMMENT ON TABLE gold.user_searches IS 'User search history';
