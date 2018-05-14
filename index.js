import _ from "lodash";

const callbackTable = {};

const generateCallback = ( store, type ) => {
  //假定用户不会替换store，提高性能
  var callback = callbackTable[type];
  if( callback ){
    return callback;
  }
  return callbackTable[type] = ( payload, anything ) => {
    store.dispatch({
      type,
      payload,
      ...anything
    });
  }
}

export default store => next => action => {

  if( _.isObject( action.type ) && _.isString( action.type.name ) ){
    if( action.type.pending === undefined ){
      action.type.pending = Symbol( action.type.name + "-pending" );
      action.type.resolved = Symbol( action.type.name + "-resolved" );
      action.type.rejected = Symbol( action.type.name + "-rejected" );
    }

    action.handler(
      generateCallback( store, action.type.pending ),
      generateCallback( store, action.type.resolved ),
      generateCallback( store, action.type.rejected )
    );

  } else {
    next( action );
  }
};
