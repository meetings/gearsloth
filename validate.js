var jsonschema = require('jsonschema');

/**
 * This file describes the exact format of the JSON configuration file that can
 * be passed to gearslothd as a configuration file or with a --conf command
 * line option. `.dbopt` field is a freeform object whose format depends
 * on the database adapter used.
 */

// this crap jsonchema module doesn't accept nested schemas...
// fucking piece of shit
var servers_schema = {
  "id": "/servers",
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "host": {
        "type": "string"
      },
      "port": {
        "oneOf": [{
          "type": "integer",
          "minimum": 0
        }, {
          "type": "string",
          "pattern": "^[0-9]+$"
        }]
      }
    }
  }
}

var conf_schema = {
  "id": "/conf",
  "type": "object",
  "properties": {
    "mode": {
      "enum": [ "worker", "client", "both", undefined ]
    },
    "db": {
      "type": "string",
      "minLength": 1
    },
    "dbopt": {
      "type": "object"
    },
    "servers": {
      "$ref": "/servers"
    }
  }
}

var validator = new jsonschema.Validator();
validator.addSchema(servers_schema);

function validate(json, schema) {
  var v = validator.validate(json, schema);
  return v.errors.length === 0;
}

function validateJsonConf(json) {
  return validate(json, conf_schema);
}

function validateServers(json) {
  return validate(json, servers_schema);
}

// export api
exports.validate = validate;
exports.validateJsonConf = validateJsonConf;
exports.validateServers = validateServers;
