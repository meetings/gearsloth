
-- Mysql database adapter creates required tables.
-- Use this file to create the database and the user.
--
-- Usage:
--  1) Set a proper password to the *both* of the
--     IDENTIFIED BY clauses.
--  2) Run:
--     mysql < initialize-mysql.sql

CREATE DATABASE IF NOT EXISTS gearsloth
  DEFAULT CHARACTER SET utf8
  DEFAULT COLLATE utf8_general_ci;

GRANT ALL PRIVILEGES ON gearsloth.*
  TO 'sloth'@'%'
  IDENTIFIED BY 'password';

GRANT ALL PRIVILEGES ON gearsloth.*
  TO 'sloth'@'localhost'
  IDENTIFIED BY 'password';

FLUSH PRIVILEGES;
