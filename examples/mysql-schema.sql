
CREATE DATABASE IF NOT EXISTS gearsloth
  DEFAULT CHARACTER SET utf8
  DEFAULT COLLATE utf8_general_ci;

CREATE TABLE gearsloth.gearsloth (
  id         INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  at         DATETIME,
  task       TEXT, -- FIXME Upgrade to LONGTEXT before production
  INDEX      at (at)
) ENGINE = InnoDB;

CREATE TABLE gearsloth.gearsloth_disabled (
  id         INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  at         DATETIME,
  task       TEXT, -- FIXME Upgrade to LONGTEXT before production
  INDEX      at (at)
) ENGINE = InnoDB;
