import _ from "lodash";

const generateCallback = ( store, type ) => ( payload, anything ) => {
  store.dispatch({
    type,
    payload,
    ...anything
  });
}

export default store => next => action => {
  if( _.isObject( action.type ) && _.isString( action.type.name ) ){
    if( action.type.pending === undefined ){
      action.type.pending = Symbol( action.name + "-pending" );
      action.type.resolved = Symbol( action.name + "-resolved" );
      action.type.rejected = Symbol( action.name + "-rejected" );
    }

    action.handler(
      generateCallback( store, action.type.pending ),
      generateCallback( store, action.type.resolve ),
      generateCallback( store, action.type.reject )
    );

  } else {
    next( action );
  }
};
