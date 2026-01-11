CREATE TABLE IF NOT EXISTS investors (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    company_name VARCHAR(120) NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NULL,

    password_hash VARCHAR(255) NOT NULL,

    status VARCHAR(20) NOT NULL, -- PENDING, APPROVED, REJECTED
    approved_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uk_investors_email (email),
    KEY idx_investors_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS properties (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    status VARCHAR(20) NOT NULL, -- DRAFT, ACTIVE, CLOSED
    title VARCHAR(120) NOT NULL, -- required even in DRAFT

    street_1 VARCHAR(120) NULL,
    street_2 VARCHAR(120) NULL,
    city VARCHAR(80) NULL,
    state VARCHAR(40) NULL,
    zip VARCHAR(15) NULL,

    asking_price DECIMAL(12, 2) NULL,
    arv DECIMAL(12, 2) NULL,
    est_repairs DECIMAL(12, 2) NULL,

    beds INT NULL,
    baths DECIMAL(3, 1) NULL,
    living_area_sqft INT NULL,
    year_built INT NULL,
    roof_age INT NULL,
    hvac INT NULL,

    occupancy_status VARCHAR(20) NULL, -- VACANT, TENANT
    exit_strategy VARCHAR(20) NULL, -- FLIP, RENTAL
    closing_terms VARCHAR(80) NULL,

    description TEXT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_properties_status (status),
    KEY idx_properties_city_state (city, state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS property_photos (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    property_id BIGINT UNSIGNED NOT NULL,
    url TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    caption VARCHAR(120) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_photos_property
        FOREIGN KEY (property_id) REFERENCES properties(id)
        ON DELETE CASCADE,
    KEY idx_photos_property (property_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS inquiries (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    property_id BIGINT UNSIGNED NOT NULL,
    investor_id BIGINT UNSIGNED NOT NULL,

    subject VARCHAR(120) NULL,
    message_body TEXT NOT NULL,

    contact_name VARCHAR(160) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(30) NULL,

    email_status VARCHAR(20) NULL, -- SENT, FAILED (optional)
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_inquiries_property
        FOREIGN KEY (property_id) REFERENCES properties(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_inquiries_investor
        FOREIGN KEY (investor_id) REFERENCES investors(id)
        ON DELETE CASCADE,

    KEY idx_inquiries_property (property_id),
    KEY idx_inquiries_investor (investor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS property_sale_comps (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    property_id BIGINT UNSIGNED NOT NULL,

    address VARCHAR(200) NOT NULL,
    sold_price DECIMAL(12, 2) NULL,
    sold_date DATE NULL,

    beds INT NULL,
    baths DECIMAL(3, 1) NULL,
    living_area_sqft INT NULL,

    distance_miles DECIMAL(4,2) NULL,
    notes VARCHAR(255) NULL,

    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_comps_property
        FOREIGN KEY (property_id) REFERENCES properties(id)
        ON DELETE CASCADE,

    KEY idx_comps_property (property_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;