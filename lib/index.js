function Stream( head, tailPromise ) {
    if ( typeof head != 'undefined' ) {
        this.headValue = head;
    }
    if ( typeof tailPromise == 'undefined' ) {
        tailPromise = function () {
            return new Stream();
        };
    }
    this.tailPromise = tailPromise;
}

Stream.prototype = {
    empty: function() {
        return typeof this.headValue == 'undefined';
    },
    head: function() {
        if ( this.empty() ) {
            throw 'Cannot get the head of the empty stream.';
        }
        return this.headValue;
    },
    tail: function() {
        if ( this.empty() ) {
            throw 'Cannot get the tail of the empty stream.';
        }
        // TODO: memoize here
        return this.tailPromise();
    },
    item: function( n ) {
        if ( this.empty() ) {
            throw 'Cannot use item() on an empty stream.';
        }
        var s = this;
        while ( n != 0 ) {
            --n;
            try {
                s = s.tail();
            }
            catch ( e ) {
                throw 'Item index does not exist in stream.';
            }
        }
        try {
            return s.head();
        }
        catch ( e ) {
            throw 'Item index does not exist in stream.';
        }
    },
    length: function() {
        // requires finite stream
        var s = this;
        var len = 0;

        while ( !s.empty() ) {
            ++len;
            s = s.tail();
        }
        return len;
    },
    add: function( s ) {
        return this.zip( function ( x, y ) {
            return x + y;
        }, s );
    },
    zip: function( f, s ) {
        if ( this.empty() ) {
            return s;
        }
        if ( s.empty() ) {
            return this;
        }
        var self = this;
        return new Stream( f( s.head(), this.head() ), function () {
            return self.tail().zip( f, s.tail() );
        } );
    },
    map: function( f ) {
        if ( this.empty() ) {
            return this;
        }
        var self = this;
        return new Stream( f( this.head() ), function () {
            return self.tail().map( f );
        } );
    },
    reduce: function ( aggregator, initial ) {
        // requires finite stream
        if ( this.empty() ) {
            return initial;
        }
        // TODO: iterate
        return this.tail().reduce( aggregator, aggregator( initial, this.head() ) );
    },
    sum: function () {
        // requires finite stream
        return this.reduce( function ( a, b ) {
            return a + b;
        }, 0 );
    },
    walk: function( f ) {
        // requires finite stream
        this.map( function ( x ) {
            f( x );
            return x;
        } ).force();
    },
    force: function() {
        // requires finite stream
        var stream = this;
        while ( !stream.empty() ) {
            stream = stream.tail();
        }
    },
    scale: function( factor ) {
        return this.map( function ( x ) {
            return factor * x;
        } );
    },
    filter: function( f ) {
        if ( this.empty() ) {
            return this;
        }
        var h = this.head();
        var t = this.tail();
        if ( f( h ) ) {
            return new Stream( h, function () {
                return t.filter( f );
            } );
        }
        return t.filter( f );
    },
    take: function ( howmany ) {
        if ( this.empty() ) {
            return this;
        }
        if ( howmany == 0 ) {
            return new Stream();
        }
        var self = this;
        return new Stream(
            this.head(),
            function () {
                return self.tail().take( howmany - 1 );
            }
        );
    },
    drop: function( n ){
        var self = this;

        while ( n-- > 0 ) {

            if ( self.empty() ) {
                return new Stream();
            }

          self = self.tail();
        }

        // create clone/a contructor which accepts a stream?
        return new Stream( self.headValue, self.tailPromise );
    },
    member: function( x ){
        var self = this;

        while( !self.empty() ) {
            if ( self.head() == x ) {
                return true;
            }

            self = self.tail();
        }

        return false;
    },
    print: function( n ) {
        var target;
        if ( typeof n != 'undefined' ) {
            target = this.take( n );
        }
        else {
            // requires finite stream
            target = this;
        }
        target.walk( function ( x ) {
            console.log( x );
        } );
    },
    toString: function() {
        // requires finite stream
        return '[stream head: ' + this.head() + '; tail: ' + this.tail() + ']';
    }
};

Stream.makeOnes = function() {
    return new Stream( 1, Stream.makeOnes );
};
Stream.makeNaturalNumbers = function() {
    return new Stream( 1, function () {
        return Stream.makeNaturalNumbers().add( Stream.makeOnes() );
    } );
};
Stream.make = function( /* arguments */ ) {
    if ( arguments.length == 0 ) {
        return new Stream();
    }
    var restArguments = Array.prototype.slice.call( arguments, 1 );
    return new Stream( arguments[ 0 ], function () {
        return Stream.make.apply( null, restArguments );
    } );
};
Stream.range = function ( low, high ) {
    if ( typeof low == 'undefined' ) {
        low = 1;
    }
    if ( low == high ) {
        return Stream.make( low );
    }
    // if high is undefined, there won't be an upper bound
    return new Stream( low, function () {
        return Stream.range( low + 1, high );
    } );
};

module.exports = Stream;