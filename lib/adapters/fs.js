var _ = require('underscore');
var async = require('async');
var fs = require('fs');
var path = require('path');
var os = require("os");
var child_process = require('child_process');

var default_fs_adapter_poll_timeout = 500; // ms

function initialize( config, callback ) {
  if ( ! db_opts.path )
    callback( new Error('You need to provide a path to store the fs adapter data') );

  // TODO make checks that we can write to the path

  callback( null, new FsAdapter( config ) );
}

function FsAdapter( config ) {
  this.path = config.db_opts.path || '/usr/lib/gearsloth/fs-adapter/';
  this.db = config.db_opts.db || os.hostname();
  this.poll_timeout = config.db_opts.poll_timeout || default_fs_adapter_poll_timeout;
}

FsAdapter.prototype.getDomains = function( callback ) {
  return callback( null, [ this.db ] );
}

FsAdapter.prototype.saveTask = function( original_task, callback) {
  this.lock_task_with_new_id( original_task, function( error, lock, task ) {
    if ( error ) {
      return callback( error );
    }

    task.id.db = this.db;

    if ( ! task.at ) {
      try {
        var after = parseInt( task.after ) || 0;
      }
      catch ( e ) {
        return callback( e );
      }
      task.at = new Date( new Date().getTime() + after * 1000 ).toString();
    }

    async.series( [
      _.bind( this.store_task_object, this, task ),
      _.bind( this.create_due_file_for_task, this, task )
    ], this.generate_result_callback_that_releases_lock( lock, callback ) );
  }.bind(this) );
};

FsAdapter.prototype.listenTask = function( runner_task_handler ) {
  this.listen_runner_task_handler = runner_task_handler;
  this.listen_loop();

  return function() {
    this.listen_runner_task_handler = null;
  }.bind(this)
};

FsAdapter.prototype.listen_loop = function() {
  if ( ! this.listen_runner_task_handler ) {
    return;
  }
  else {
    setTimeout( this.listen_loop.bind(this), this.poll_timeout );
  }

  var date = new Date();
  var dirs = [
    date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
    date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()
  ];

  this.depth_first_traverse_lesser_or_equal_dirs( path.join( this.path, 'due' ), dirs, function( leaf_dir ) {
    this.randomly_traverse_all_subdirs_for_files( leaf_dir, function( file ) {
      this.retrieve_task_object_from_file( file, this.lock_and_handle_due_task.bind(this) );
    }.bind(this) );
  }.bind(this) );
}

FsAdapter.prototype.lock_and_handle_due_task = function( task_error, original_task ) {
  if ( ! task_error ) {
    this.lock_task( original_task, function( lock_error, lock ) {
      if ( ! lock_error && this.listen_runner_task_handler ) {
        this.listen_runner_task_handler( null, original_task, this.db, { lock : lock } );
      }
    }.bind(this) );
  }
};

FsAdapter.prototype.updateListenedTask = function( modified_task, db_state, callback ) {
  async.waterfall( [
    _.bind( this.retrieve_task_object_for_task, this, modified_task ),
    _.bind( this.clear_due_file_for_task, this ),
    _.bind( this.store_task_object, this, modified_task ),
    _.bind( this.create_due_file_for_task, this, modified_task )
  ], this.generate_result_callback_that_releases_lock( db_state.lock, callback ) );
};

FsAdapter.prototype.disableListenedTask = function( task, db_state, callback ) {
  async.series( [
    _.bind( this.clear_due_file_for_task, this, task ),

    // TODO create file to "disabled" directory for inspection and add disabled key in task

  ], this.generate_result_callback_that_releases_lock( db_state.lock, callback ) );
};

FsAdapter.prototype.completeTask = function(task, callback) {
  this.lock_task_or_call_error_handler( task, callback, function( lock ) {
    async.series( [
      _.bind( this.clear_due_file_for_task, this, task ),
      _.bind( this.clear_task_file_for_task, this, task ),
    ], this.generate_result_callback_that_releases_lock( lock, callback ) );
  }.bind(this) );
};

/**
 * Helper functions
 */

FsAdapter.prototype.generate_id = function() {
  var pool = "0123456789abdcefghijklmnoqrstuvwxyz".split();
  var id = _.map( pool, function() { pool[ Math.floor( Math.random() * pool.length ) ] } );
  return id.join();
}

FsAdapter.prototype.mkdirp = function( dir, callback ) {

  // TODO make this.. umm.. windows compatible? :D

  child_process.execFile( '/usr/bin/mkdir', [ '-p', dir ], { timeout : 100 }, callback )
}

FsAdapter.prototype.lock_task_with_new_id = function( task, callback, failure_count ) {
  failure_count = failure_count || 0;

  // TODO should we create a deep copy on the first run?

  task.id = { id : this.generate_id() };

  var current_lock = null;

  async.waterfall( [
    _.bind( this.lock_task, this, task ),
    function( lock, cb ) {
      current_lock = lock;
      cb();
    },
    _.bind( this.retrieve_task_object_for_task, this, task ),
  ], function( error, content ) {
    if ( error || content != "" ) {
      this.release_lock( current_lock, function() {
        if ( failure_count > 99 ) {
          return callback( new Error("Could not find and lock a unique id file") );
        }
        else {
          return this.lock_new_task( task, callback, failure_count + 1 )
        }
      }.bind(this) );
    }
    else {
      callback( null, current_lock, task )
    }
  }.bind(this) );
}


FsAdapter.prototype.lock_task = function( task, callback ) {
  this.lock_task_or_call_error_handler( task, callback, function( lock ) { callback( null, lock ) } );
};

FsAdapter.prototype.lock_task_or_call_error_handler = function( task, error_handler, callback ) {

  // TODO remove lock files that are older than 15 seconds to defend against previous crashes

  var lock = { id : this.generate_id(), file : path.join( this.path, 'lock', task.id.id ) };

  fs.writeFile( lock.file, lock.id, { encoding : 'utf8', flag : 'wx' }, function( error ) {
    if ( error ) {
      return error_handler( error );
    }
    return callback( lock )
  } );
}

FsAdapter.prototype.release_lock = function( lock, callback ) {
  if ( ! lock ) {
    return callback();
  }
  async.waterfall( [
    _.partial( this.read_possibly_missing_file, lock.file ),
    function( content, cb ) {
      if ( content == lock.id ) {
        cb( null );
      }
      else {
        cb( new Error("Tried to release foreign lock") );
      }
    },
    _.partial( fs.unlink, lock.file )
  ], callback );
}

FsAdapter.prototype.read_possibly_missing_file = function( file, callback ) {
  fs.exists( file, function( exists ) {
    if ( exists ) {
      return fs.readFile( file, { encoding : 'utf8' }, callback );
    }
    else {
      return callback( null, "" );
    }
  } );
}

FsAdapter.prototype.retrieve_task_object_for_task = function( task, callback ) {
  var file = this.return_task_file_for_task( task );
  this.retrieve_task_object_from_file( file, callback );
}

FsAdapter.prototype.retrieve_task_object_from_file = function( task, callback ) {
  var file = this.return_task_file_for_task( task );
  this.read_possibly_missing_file( file, function( content ) {
    if ( error ) {
      return callback( error );
    }
    if ( content == "" ) {
      return callback( new Error( "Could not find task from file" ) );
    }
    try {
      var task = JSON.parse( content );
    }
    catch ( e ) {
      return callback( e );
    }

    callback( null, task );
  } );
}

FsAdapter.prototype.store_task_object = function( task, callback ) {
  try {
    var payload = JSON.stringify( task );
  }
  catch ( e ) {
    callback( new Error('Could not stringify passed in task object: ' + e ) );
  }

  this.store_task_string_for_task( task, payload, callback );
}

FsAdapter.prototype.store_task_string_for_task = function( task, string, callback ) {
  var file = this.return_task_file_for_task( task );

  async.series( [
    _.partial( FsAdapter.mkdirp, path.dirname( file ) ),
    _.partial( fs.writeFile, file, string, { encoding : 'utf8' } ),
  ], callback );
}

FsAdapter.prototype.create_due_file_for_task = function( task, callback ) {
  var file = this.return_due_file_for_task( task );

  async.series( [
    _.partial( FsAdapter.mkdirp, path.dirname( file ) ),
    _.partial( fs.writeFile, file, "", { encoding : 'utf8' } ),
  ], callback );
}

FsAdapter.prototype.clear_due_file_for_task = function( task, callback ) {
  var file = this.return_due_file_for_task( task );
  fs.unlink( file, callback );
}

FsAdapter.prototype.clear_task_file_for_task = function( task, callback ) {
  var file = this.return_task_file_for_task( task );
  fs.unlink( file, callback );
}

FsAdapter.prototype.return_task_file_for_task = function( task ) {
  var id_match = /(..){6}(.*)/.match( task.id.id );

  var task_dir = path.join( this.path, 'task', path.join.apply( null, id_match.splice(1,6) ) );

  return path.join( task_dir, task.id.id );
}

FsAdapter.prototype.return_due_file_for_task = function( task ) {
  var date = new Date( task.at );
  var date_path = path.join(
    date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
    date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()
  );

  var id_match = /(..){3}(.*)/.match( task.id.id );

  var due_dir = path.join( this.path, 'due', date_path, path.join.apply( null, id_match.splice(1,3) ) );

  return path.join( due_dir, task.id.id );
}

FsAdapter.prototype.depth_first_traverse_lesser_or_equal_dirs = function( start_path, remaining_dirs, leaf_callback ) {
  if ( remaining_dirs.length < 1 ) {
    return leaf_callback( start_path );
  }
  var next_remaining_dirs = remaining_dirs.slice(0);
  var current_dir = next_remaining_dirst.shift();

  fs.stat( start_path, function( error, stats ) {
    if ( ! error && stats.isDirectory() ) {
      fs.readdir( start_path, function( error, files ) {
        if ( ! error ) {

          // TODO sort files to smallest first before descending

          _.each( files, function( file ) {
            try {
              if ( parseInt( file ) <= parseInt( current_dir ) ) {
                FsAdapter.depth_first_traverse_lesser_or_equal_dirs( path.join( start_path, file ), next_remaining_dirs, leaf_callback );
              }
            }
            catch ( e ) {
              // TODO maybe log something if directories can't be parsed to int
            }
          } );
        }
      } );
    }
  } );
};

FsAdapter.prototype.randomly_traverse_all_subdirs_for_files = function( start_path, file_callback ) {
  fs.stat( start_path, function( error, stats ) {
    if ( ! error ) {
      if ( stats.isDirectory() ) {
        fs.readdir( start_path, function( error, files ) {
          if ( ! error ) {
            _.each( files, function( file ) {
              FsAdapter.randomly_traverse_all_subdirs_for_files( path.join( start_path, file ), file_callback );
            } );
          }
        } );
      }
      else if ( stats.isFile() ) {
        return file_callback( current_file );
      }
    }
  } );
};

FsAdapter.prototype.generate_result_callback_that_releases_lock = function( lock, callback ) {
  return function( error ) {
    this.release_lock( lock, function() {
      if ( callback ) {
        callback( error );
      }
    } );
  }.bind( this );
};

exports.initialize = initialize;
