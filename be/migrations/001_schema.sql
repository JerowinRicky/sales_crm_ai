CREATE DATABASE IF NOT EXISTS crm_enterprise CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE crm_enterprise;

CREATE TABLE IF NOT EXISTS roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  employee_id VARCHAR(50),
  department VARCHAR(100),
  territory VARCHAR(100),
  manager_id INT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL,
  login_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  company_name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(150),
  designation VARCHAR(100),
  email VARCHAR(150),
  phone VARCHAR(20),
  alternate_phone VARCHAR(20),
  industry VARCHAR(100),
  company_size VARCHAR(50),
  annual_revenue DECIMAL(15,2),
  website VARCHAR(300),
  address_line1 TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  pincode VARCHAR(20),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  assigned_to INT,
  created_by INT NOT NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS visits (
  id INT PRIMARY KEY AUTO_INCREMENT,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  customer_id INT NOT NULL,
  visit_type ENUM('check_in','check_out') NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  accuracy FLOAT,
  address TEXT,
  timestamp TIMESTAMP NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS visit_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  customer_id INT NOT NULL,
  check_in_id INT,
  check_out_id INT,
  check_in_time TIMESTAMP NULL,
  check_out_time TIMESTAMP NULL,
  duration_minutes INT,
  check_in_lat DECIMAL(10,8),
  check_in_lng DECIMAL(11,8),
  check_out_lat DECIMAL(10,8),
  check_out_lng DECIMAL(11,8),
  purpose TEXT,
  outcome TEXT,
  follow_up_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (check_in_id) REFERENCES visits(id),
  FOREIGN KEY (check_out_id) REFERENCES visits(id)
);

CREATE TABLE IF NOT EXISTS lead_stages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(7) DEFAULT '#2563eb',
  order_position INT NOT NULL,
  is_closed BOOLEAN DEFAULT FALSE,
  is_won BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS leads (
  id INT PRIMARY KEY AUTO_INCREMENT,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  title VARCHAR(300) NOT NULL,
  customer_id INT,
  contact_name VARCHAR(150),
  contact_email VARCHAR(150),
  contact_phone VARCHAR(20),
  company_name VARCHAR(200),
  source ENUM('cold_call','email','referral','website','social_media','exhibition','walk_in','other') DEFAULT 'other',
  stage_id INT NOT NULL,
  assigned_to INT,
  created_by INT NOT NULL,
  estimated_value DECIMAL(15,2),
  currency VARCHAR(10) DEFAULT 'INR',
  probability INT DEFAULT 20,
  expected_close_date DATE,
  actual_close_date DATE,
  description TEXT,
  priority ENUM('low','medium','high','critical') DEFAULT 'medium',
  is_active BOOLEAN DEFAULT TRUE,
  won_reason TEXT,
  lost_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (stage_id) REFERENCES lead_stages(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS lead_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lead_id INT NOT NULL,
  changed_by INT NOT NULL,
  field_changed VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  note TEXT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS activities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  type ENUM('call','email','meeting','demo','proposal','follow_up','note','task') NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  lead_id INT,
  customer_id INT,
  user_id INT NOT NULL,
  status ENUM('planned','completed','cancelled') DEFAULT 'planned',
  scheduled_at TIMESTAMP NULL,
  outcome TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- SEED ROLES
INSERT INTO roles (name, description) VALUES
('admin','System Administrator'),
('sales_manager','Sales Manager'),
('salesperson','Sales Representative')
ON DUPLICATE KEY UPDATE name=name;

-- SEED STAGES
INSERT INTO lead_stages (name, code, color, order_position, is_closed, is_won) VALUES
('New Lead',       'new',         '#6366f1', 1,  FALSE, FALSE),
('Contacted',      'contacted',   '#8b5cf6', 2,  FALSE, FALSE),
('Prospect',       'prospect',    '#0ea5e9', 3,  FALSE, FALSE),
('Demo Scheduled', 'demo',        '#f59e0b', 4,  FALSE, FALSE),
('Proposal Sent',  'proposal',    '#f97316', 5,  FALSE, FALSE),
('PO Raised',      'po_raised',   '#10b981', 6,  FALSE, FALSE),
('Negotiation',    'negotiation', '#ec4899', 7,  FALSE, FALSE),
('Won',            'won',         '#16a34a', 8,  TRUE,  TRUE),
('Lost',           'lost',        '#dc2626', 9,  TRUE,  FALSE),
('On Hold',        'on_hold',     '#6b7280', 10, FALSE, FALSE)
ON DUPLICATE KEY UPDATE name=name;

-- SEED ADMIN  (password = Admin@123)
INSERT INTO users (uuid,name,email,phone,password_hash,role_id,employee_id,department,is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'System Admin',
  'admin@crm.com',
  '+91-9000000000',
  '$2b$12$.gfpU0vEot2zoX8Frejp4uZP8bDCb3FJt1pGC4YcgYW/hWUmh4m9a',
  1,'EMP001','Administration',TRUE
) ON DUPLICATE KEY UPDATE email=email;
