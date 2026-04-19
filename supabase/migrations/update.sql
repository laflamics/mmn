INSERT INTO app_versions (version, description, apk_url, release_notes)
VALUES ('1.0.5', 'MMN ERP v1.0.5', 'https://github.com/laflamics/mmn/releases/download/v1.0.5/mmn-v1.0.5.apk', 'New build and features')
ON CONFLICT (version) DO UPDATE SET updated_at = CURRENT_TIMESTAMP;


INSERT INTO app_versions (version, description, apk_url, release_notes) VALUES ('1.0.5', 'MMN ERP v1.0.5', 'https://github.com/laflamics/mmn/releases/download/v1.0.5/mmn-v1.0.5.apk', 'New build with consistent signing') ON CONFLICT (version) DO UPDATE SET updated_at = CURRENT_TIMESTAMP;



INSERT INTO app_versions (version, description, apk_url, release_notes) 
VALUES ('1.0.6', 'MMN ERP v1.0.6', 'https://github.com/laflamics/mmn/releases/download/v1.0.6/mmn-v1.0.6.apk', 'Fixed signing for smooth updates')
ON CONFLICT (version) DO UPDATE SET updated_at = CURRENT_TIMESTAMP;