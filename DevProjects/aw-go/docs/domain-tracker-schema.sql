-- =====================================================
-- Domain Tracker Tables
-- For the Admin Domain Checker Tool
-- 
-- Final schema approved by Greg - January 2026
-- Tables will be created in 'cron' databases on both platforms
-- =====================================================

-- Main table: Current state of each domain
CREATE TABLE domain_tracker (
    id BIGINT unsigned AUTO_INCREMENT PRIMARY KEY,
    domain_name VARCHAR(255) NOT NULL,
    status varchar(20) DEFAULT 'shutdown',
    account_id INT DEFAULT NULL COMMENT 'FK to account table if matched',
    is_active TINYINT(1) DEFAULT 0,
    
    -- Key dates
    last_checked_at DATETIME DEFAULT NULL COMMENT 'When we last ran a check on this domain',
    shutdown_at DATETIME DEFAULT NULL COMMENT 'When the domain was marked as shutdown',
    
    -- Flexible storage for extra info we might need later
    metadata JSON DEFAULT NULL COMMENT 'Extra info: account_email, plan_type, match_source, etc.',
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE KEY unique_domain (domain_name),
    INDEX idx_status (status),
    INDEX idx_last_checked (last_checked_at)
);


-- History table: Track changes over time
CREATE TABLE domain_tracker_history (
    id BIGINT unsigned AUTO_INCREMENT PRIMARY KEY,
    domain_tracker_id BIGINT unsigned NOT NULL COMMENT 'FK to domain_tracker.id',
    domain_name VARCHAR(255) NOT NULL COMMENT 'Denormalized for easier querying',
    
    -- Snapshot of state at this point in time
    old_status varchar(20) DEFAULT NULL,
    new_status varchar(20) DEFAULT NULL,
    account_id INT DEFAULT NULL,
    is_active TINYINT(1) DEFAULT NULL,
    
    -- What triggered this history entry
    change_type varchar(20) DEFAULT 'check',
    change_notes TEXT DEFAULT NULL COMMENT 'Optional notes about the change',
    
    -- Metadata snapshot (optional)
    metadata JSON DEFAULT NULL,
    
    -- When this happened
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_domain_tracker_id (domain_tracker_id),
    INDEX idx_domain_name (domain_name),
    INDEX idx_created_at (created_at),
    INDEX idx_new_status (new_status)
);


-- =====================================================
-- DESIGN NOTES (from Greg)
-- =====================================================
-- 
-- 1. Platform column removed - use $GLOBALS['product'] instead
--    since each platform has its own database
--
-- 2. BIGINT unsigned for primary keys - industry standard
--
-- 3. varchar(20) instead of ENUM for status fields
--    - Easier to add new statuses without ALTER TABLE
--
-- 4. No foreign key constraints
--    - Prevents database locking issues at scale
--    - Handle cascading deletes in application code instead
--
-- 5. JSON type for metadata
--    - Flexible storage for extra data without adding columns
--    - Works with PHP's json_encode()
--
-- =====================================================


-- =====================================================
-- EXAMPLE QUERIES (for reference)
-- =====================================================

-- When was a domain shut down?
-- SELECT shutdown_at FROM domain_tracker WHERE domain_name = 'example.com';

-- When was it last checked?
-- SELECT last_checked_at FROM domain_tracker WHERE domain_name = 'example.com';

-- Full history of a domain
-- SELECT * FROM domain_tracker_history WHERE domain_name = 'example.com' ORDER BY created_at DESC;

-- When did status change from keep to shutdown?
-- SELECT * FROM domain_tracker_history 
-- WHERE domain_name = 'example.com' AND old_status = 'keep' AND new_status = 'shutdown';

-- All domains shut down this month
-- SELECT * FROM domain_tracker WHERE status = 'shutdown' AND shutdown_at >= '2026-01-01';


-- =====================================================
-- STATUS VALUES
-- =====================================================
-- 'keep'              - Active account, keep with auto-renewal
-- 'shutdown'          - Inactive or cancelled account, safe to shutdown or let expire (default)


-- =====================================================
-- EXAMPLE METADATA JSON STRUCTURE
-- =====================================================
-- {
--   "account_email": "customer@example.com",
--   "account_name": "Jane Doe",
--   "billable_status": "paying",
--   "plan_type": "Pro",
--   "match_source": "account_domain table",
--   "message": "Active paying customer - keep domain with auto-renewal",
--   "slack_source_date": "2026-01-22",
--   "namebright_renewal_date": "2026-02-15",
--   "checked_by": "colin"
-- }
