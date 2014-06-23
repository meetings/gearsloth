## Configuration

Gearslothd daemon by default reads a JSON configuration file gearsloth.json from
the current directory. The daemon also accepts the following command line
configuration options:

`./bin/gearslothd [options] [hostname[:port]]`

* `-i, --injector`: Run the daemon as injector.
* `-r, --runner`: Run the daemon as runner.
* `-c, --controller`: Run the daemon as default controller.
* `-e, --ejector`: Run the daemon as ejector.
* `--controllername`: Controller module name. Can also be specified in the config file.
* `--db`: Database module name. Can also be specified in the config file.
* `-f, --file=FILENAME`: Define the JSON configuration file. By default
  `gearsloth.json` in the currenct directory will be used. Options specified
  in this file are overwritten by any options defined by command line options.
* `    --conf=JSON`: Provide a JSON formatted configuration object on the
  command line. Any options defined by this object are overwritten by other
  command line options.
* `    --db=NAME`: Database adapter to be used by the daemon. By default `sqlite`
  is used.
* `    --dbopt=JSON`: Provide a JSON formatted freefirn configuration object for
  the database adapter.
* `    --servers=JSON`: Provide a JSON formatted gearman server list array.
  The server list will be overwritten by a hostname given as a positional
  command line parameter.

The daemon runs in all modes if no modes are specified. Any mode set in the
command line arguments overrides all mode settings in the configuration file.

### Configuration object formats

The configuration file consists of a single JSON object. The following fields
are interpreted:

* `.injector {Boolean}`: If true, run as injector.
* `.runner {Boolean}`: If true, run as runner.
* `.controller {Boolean}`: If true, run as default controller.
* `.ejector {Boolean}`: If true, run as ejector.
* `.db {String}`: Database adapter name.
* `.dbopt {Object}`: A freeform object that may be interpreted by the database
  adapter.
* `.servers {[Object]}`: A list of gearman servers that are connected to. The
  servers may contain fields `.host` and `.port`. If only one the fields is
  specified, a default value is used. The default gearman server is
  `localhost:4730`.
* `.db {String}`: Database module name.
* `.controllername {String}:` Controller module name.

### Example configuration

#### `gearsloth.json`

    {
      "db": "sqlite",
      "servers": [{ "host": "meetin.gs" }]
    }

    > ./bin/gearsloth -ire --dbopt='{"db_name": "in-memory"}'

Runs a daemon in injector, runner and ejector modes using an in-memory
sqlite database and connecting to a single gearman server running on
`meetin.gs:4730`.
