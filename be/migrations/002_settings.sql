USE crm_enterprise;

-- Global app settings (key-value)
CREATE TABLE IF NOT EXISTS app_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO app_settings (setting_key, setting_value) VALUES
('checkin_radius_meters', '500')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- Geofence result captured at check-in time
ALTER TABLE visit_sessions
  ADD COLUMN IF NOT EXISTS distance_meters DECIMAL(10,2) NULL,
  ADD COLUMN IF NOT EXISTS within_geofence BOOLEAN NULL;

-- Make sure lead_stages has a description field for UI
ALTER TABLE lead_stages
  ADD COLUMN IF NOT EXISTS description VARCHAR(255) NULL;
