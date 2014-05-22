
CREATE DATABASE IF NOT EXISTS gearsloth
  DEFAULT CHARACTER SET utf8
  DEFAULT COLLATE utf8_general_ci;

CREATE TABLE gearsloth.gearsloth (
  id         INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  at         DATETIME NOT NULL,
  func_name  VARCHAR(128) NOT NULL,
  payload    BLOB,
  strategy   VARCHAR(128),
  stra_opts  BLOB,
  status     TINYINT NOT NULL,
  INDEX      at (at)
) ENGINE = InnoDB;
