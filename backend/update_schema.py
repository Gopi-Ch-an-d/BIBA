import psycopg2
import os
from dotenv import load_dotenv

# Load credentials from backend/.env
load_dotenv('a:/biba_ci/backend/.env')
DATABASE_URL = os.getenv("SYNC_DATABASE_URL")

sql_schema = """
-- =========================
-- SCHEMAS
-- =========================
CREATE SCHEMA IF NOT EXISTS master;
CREATE SCHEMA IF NOT EXISTS intelligence;

-- =========================
-- ROLES
-- =========================
CREATE TABLE IF NOT EXISTS master.roles (
    record_id         SERIAL PRIMARY KEY,
    name              VARCHAR(100) NOT NULL,           
    code              VARCHAR(50)  UNIQUE NOT NULL,    
    description       TEXT,
    is_active         BOOLEAN DEFAULT TRUE,
    is_deleted        BOOLEAN DEFAULT FALSE,
    inserted_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_datetime  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- USERS
-- =========================
CREATE TABLE IF NOT EXISTS master.users (
    record_id         SERIAL PRIMARY KEY,
    role_id           INT REFERENCES master.roles(record_id),
    first_name        VARCHAR(100),
    last_name         VARCHAR(100),
    email             VARCHAR(255) UNIQUE NOT NULL,
    phone             VARCHAR(50),
    password_hash     TEXT,
    is_active         BOOLEAN DEFAULT TRUE,
    is_deleted        BOOLEAN DEFAULT FALSE,
    inserted_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_datetime  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- EMPLOYEES
-- =========================
CREATE TABLE IF NOT EXISTS master.employees (
    record_id         SERIAL PRIMARY KEY,
    user_id           INT UNIQUE REFERENCES master.users(record_id) ON DELETE CASCADE,
    employee_code     VARCHAR(50) UNIQUE,
    department        VARCHAR(100),
    designation       VARCHAR(100),
    joined_date       DATE,
    is_active         BOOLEAN DEFAULT TRUE,
    is_deleted        BOOLEAN DEFAULT FALSE,
    inserted_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_datetime  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- PICKLIST SYSTEM
-- =========================
CREATE TABLE IF NOT EXISTS master.picklist_type (
    record_id         SERIAL PRIMARY KEY,
    code              VARCHAR(100) UNIQUE,
    name              VARCHAR(100),
    description       TEXT,
    is_active         BOOLEAN DEFAULT TRUE,
    is_deleted        BOOLEAN DEFAULT FALSE,
    inserted_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_datetime  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master.picklist (
    record_id         SERIAL PRIMARY KEY,
    picklist_type_id  INT REFERENCES master.picklist_type(record_id),
    value             VARCHAR(100),
    display_value     VARCHAR(255),
    parent_id         INT REFERENCES master.picklist(record_id),
    order_num         INT,
    is_active         BOOLEAN DEFAULT TRUE,
    is_deleted        BOOLEAN DEFAULT FALSE,
    inserted_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_datetime  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- COMPETITORS
-- =========================
CREATE TABLE IF NOT EXISTS intelligence.competitors (
    record_id         SERIAL PRIMARY KEY,
    name              VARCHAR(100) NOT NULL,    
    code              VARCHAR(50)  UNIQUE NOT NULL,
    base_url          TEXT        NOT NULL,         
    scraper_name      VARCHAR(100),               
    is_active         BOOLEAN DEFAULT TRUE,
    is_deleted        BOOLEAN DEFAULT FALSE,
    inserted_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_datetime  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- CATEGORIES
-- =========================
CREATE TABLE IF NOT EXISTS intelligence.categories (
    record_id         SERIAL PRIMARY KEY,
    competitor_id     INT NOT NULL REFERENCES intelligence.competitors(record_id) ON DELETE CASCADE,
    name              VARCHAR(255) NOT NULL,   
    slug              VARCHAR(255),           
    url               TEXT        NOT NULL,     
    is_active         BOOLEAN DEFAULT TRUE,
    is_deleted        BOOLEAN DEFAULT FALSE,
    inserted_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_datetime  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (competitor_id, slug)
);

-- =========================
-- BESTSELLER PRODUCTS
-- =========================
CREATE TABLE IF NOT EXISTS intelligence.bestseller_products (
    record_id         SERIAL PRIMARY KEY,
    competitor_id     INT NOT NULL REFERENCES intelligence.competitors(record_id) ON DELETE CASCADE,
    category_id       INT          REFERENCES intelligence.categories(record_id)  ON DELETE SET NULL,
    sku               VARCHAR(200) NOT NULL,
    name              VARCHAR(500) NOT NULL,
    current_price     FLOAT,
    original_price    FLOAT,
    discount_pct      FLOAT,
    stock_available   BOOLEAN DEFAULT TRUE,
    image_url         TEXT NOT NULL,
    product_url       TEXT NOT NULL,
    first_seen_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active         BOOLEAN DEFAULT TRUE,
    is_deleted        BOOLEAN DEFAULT FALSE,
    UNIQUE (competitor_id, sku)
);

-- =========================
-- NEW ARRIVAL PRODUCTS
-- =========================
CREATE TABLE IF NOT EXISTS intelligence.new_arrival_products (
    record_id         SERIAL PRIMARY KEY,
    competitor_id     INT NOT NULL REFERENCES intelligence.competitors(record_id) ON DELETE CASCADE,
    category_id       INT          REFERENCES intelligence.categories(record_id)  ON DELETE SET NULL,
    sku               VARCHAR(200) NOT NULL,
    name              VARCHAR(500) NOT NULL,           
    current_price     FLOAT,
    original_price    FLOAT,
    discount_pct      FLOAT,
    stock_available   BOOLEAN DEFAULT TRUE,
    image_url         TEXT NOT NULL,
    product_url       TEXT NOT NULL,
    first_seen_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active         BOOLEAN DEFAULT TRUE,
    is_deleted        BOOLEAN DEFAULT FALSE,
    UNIQUE (competitor_id, sku)
);

-- =========================
-- PRODUCT SIZES (Inventory tracking)
-- =========================
CREATE TABLE IF NOT EXISTS intelligence.product_sizes (
    record_id         SERIAL PRIMARY KEY,
    source            VARCHAR(50) NOT NULL CHECK (source IN ('bestseller', 'new_arrival')),
    product_id        INT NOT NULL,
    size              VARCHAR(50) NOT NULL,
    quantity          INT DEFAULT 0,
    is_available      BOOLEAN DEFAULT TRUE,
    last_updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    inserted_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (source, product_id, size)
);

-- =========================
-- PRICE HISTORY (Trend analysis)
-- =========================
CREATE TABLE IF NOT EXISTS intelligence.price_history (
    record_id         SERIAL PRIMARY KEY,
    source            VARCHAR(50) NOT NULL CHECK (source IN ('bestseller', 'new_arrival')),
    product_id        INT NOT NULL,           
    competitor_id     INT REFERENCES intelligence.competitors(record_id) ON DELETE CASCADE,
    sku               VARCHAR(200),           
    price             FLOAT,
    original_price    FLOAT,
    discount_pct      FLOAT,
    stock_available   BOOLEAN,
    scraped_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    inserted_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- SCRAPE LOGS
-- =========================
CREATE TABLE IF NOT EXISTS intelligence.scrape_logs (
    record_id         SERIAL PRIMARY KEY,
    competitor_id     INT REFERENCES intelligence.competitors(record_id) ON DELETE CASCADE,
    scrape_type       VARCHAR(50) DEFAULT 'all',  
    total_products    INT,
    new_products      INT,
    updated_products  INT,
    status            VARCHAR(50),               
    message           TEXT,
    ip_address        VARCHAR(50),
    proxy_provider    VARCHAR(100),
    user_agent        TEXT,
    inserted_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- REQUEST LOGS
-- =========================
CREATE TABLE IF NOT EXISTS intelligence.request_logs (
    record_id         SERIAL PRIMARY KEY,
    competitor_id     INT REFERENCES intelligence.competitors(record_id) ON DELETE CASCADE,
    url               TEXT,
    ip_address        VARCHAR(50),
    proxy_provider    VARCHAR(100),
    user_agent        TEXT,
    response_status   INT,
    response_time_ms  INT,
    success           BOOLEAN DEFAULT TRUE,
    error_message     TEXT,
    inserted_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

def update_schema():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cur = conn.cursor()
        print("Connected to database. Executing schema update...")
        cur.execute(sql_schema)
        print("Schema update completed successfully!")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error updating schema: {e}")

if __name__ == "__main__":
    update_schema()
