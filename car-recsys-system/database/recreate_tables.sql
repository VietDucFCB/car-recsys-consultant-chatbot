-- ================================================
-- DROP AND RECREATE ALL TABLES WITH CORRECT STRUCTURE
-- ================================================

-- Drop existing tables in correct order (foreign keys first)
DROP TABLE IF EXISTS raw.seller_vehicle_relationships CASCADE;
DROP TABLE IF EXISTS raw.vehicle_images CASCADE;
DROP TABLE IF EXISTS raw.vehicle_features CASCADE;
DROP TABLE IF EXISTS raw.reviews_ratings CASCADE;
DROP TABLE IF EXISTS raw.sellers CASCADE;
DROP TABLE IF EXISTS raw.new_vehicles CASCADE;

-- Keep used_vehicles as is (already has data)

-- ================================================
-- NEW VEHICLES (same structure as used_vehicles)
-- ================================================
CREATE TABLE raw.new_vehicles (
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
    one_owner TEXT,
    personal_use_only TEXT,
    warranty NUMERIC,
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
    created_at TIMESTAMP DEFAULT NOW()
);

-- ================================================
-- SELLERS (22 columns based on actual CSV)
-- ================================================
CREATE TABLE raw.sellers (
    seller_key TEXT PRIMARY KEY,
    seller_name TEXT,
    seller_link TEXT,
    phone_new TEXT,
    phone_used TEXT,
    phone_service TEXT,
    destination TEXT,
    sales_hours TEXT,
    service_hours TEXT,
    hours_monday TEXT,
    hours_tuesday TEXT,
    hours_wednesday TEXT,
    hours_thursday TEXT,
    hours_friday TEXT,
    hours_saturday TEXT,
    hours_sunday TEXT,
    seller_rating NUMERIC,
    seller_rating_count NUMERIC,
    description TEXT,
    total_images INTEGER,
    images_json TEXT,
    source_file TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ================================================
-- REVIEWS & RATINGS (17 columns based on actual CSV)
-- ================================================
CREATE TABLE raw.reviews_ratings (
    id SERIAL PRIMARY KEY,
    vehicle_id TEXT,
    condition TEXT,
    car_model TEXT,
    car_name TEXT,
    title TEXT,
    overall_rating NUMERIC,
    review_time TEXT,
    user_name TEXT,
    user_location TEXT,
    review_text TEXT,
    comfort_rating NUMERIC,
    interior_rating TEXT,
    performance_rating TEXT,
    value_rating TEXT,
    exterior_rating NUMERIC,
    reliability_rating TEXT,
    source_file TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ================================================
-- VEHICLE FEATURES (6 columns)
-- ================================================
CREATE TABLE raw.vehicle_features (
    id SERIAL PRIMARY KEY,
    vehicle_id TEXT,
    condition TEXT,
    title TEXT,
    feature_category TEXT,
    feature_name TEXT,
    source_file TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ================================================
-- VEHICLE IMAGES (7 columns)
-- ================================================
CREATE TABLE raw.vehicle_images (
    id SERIAL PRIMARY KEY,
    vehicle_id TEXT,
    condition TEXT,
    title TEXT,
    image_order INTEGER,
    image_url TEXT,
    total_images INTEGER,
    source_file TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ================================================
-- SELLER VEHICLE RELATIONSHIPS (9 columns)
-- ================================================
CREATE TABLE raw.seller_vehicle_relationships (
    id SERIAL PRIMARY KEY,
    vehicle_id TEXT,
    seller_key TEXT,
    condition TEXT,
    title TEXT,
    seller_name TEXT,
    price NUMERIC,
    stock_number TEXT,
    vehicle_url TEXT,
    source_file TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ================================================
-- CREATE INDEXES
-- ================================================
CREATE INDEX idx_new_vehicles_brand ON raw.new_vehicles(brand);
CREATE INDEX idx_new_vehicles_model ON raw.new_vehicles(car_model);
CREATE INDEX idx_new_vehicles_price ON raw.new_vehicles(price);
CREATE INDEX idx_new_vehicles_condition ON raw.new_vehicles(condition);

CREATE INDEX idx_sellers_name ON raw.sellers(seller_name);
CREATE INDEX idx_sellers_rating ON raw.sellers(seller_rating);

CREATE INDEX idx_reviews_vehicle ON raw.reviews_ratings(vehicle_id);
CREATE INDEX idx_reviews_rating ON raw.reviews_ratings(overall_rating);

CREATE INDEX idx_features_vehicle ON raw.vehicle_features(vehicle_id);
CREATE INDEX idx_features_category ON raw.vehicle_features(feature_category);

CREATE INDEX idx_images_vehicle ON raw.vehicle_images(vehicle_id);
CREATE INDEX idx_images_order ON raw.vehicle_images(image_order);

CREATE INDEX idx_seller_rel_vehicle ON raw.seller_vehicle_relationships(vehicle_id);
CREATE INDEX idx_seller_rel_seller ON raw.seller_vehicle_relationships(seller_key);

-- ================================================
-- GRANT PERMISSIONS
-- ================================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA raw TO admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA raw TO admin;

-- Show created tables
\dt raw.*
