redux-fetch-thunk
===

基于fetch设计的redux中间件

用途
===

处理异步动作

优势
===

+ type定义为Symbol变量导出,相比于String常量,更容易减少bug发生几率.
+ 快捷编写数据处理逻辑，减少代码编写量
+ 利用缓存进行速度优化

用法
===
0. 假定一个redux动作组的文件结构如下:
  + actionTypes.js
  + actions.js
  + reducer.js

1. 首先编写actionTypes.js文件，这里定义动作类型

  > 定义同步动作省去

  定义异步动作
  ```js
  export const __asyncActionType__ = {
    name: "name"
  }
  ```
  要点:
  + 异步动作类型定义为一个Object
  + 对象有一个字段name,存放动作的展示名称
  + 多个动作的name**可以相同**

2. 再编写actions.js，这里定义动作生成函数

  > 定义同步动作省去

  ```js
    import {
      __asyncActionTypeName__ //首先引入刚刚定义的类型
    } from "./actionTypes";

    // 接收参数自定义
    // 返回一个Object
    export const asyncAction = ( arg1, arg2, ..., argN ) => ({
      type: __asyncActionType__,
      handler( pending, resolve, reject ){
        pending( payload, others );
        fetch( request )
          .then( response => response.json() )
          .then( json => resolve( json ) )
          .catch( err => reject( err ) )
      }
    });
  ```

  要点:
  + 动作生成器可以接受自定义的任何参数并使用
  + 返回的Object有一个type字段和一个handler
  + type就是刚才定义的type
  + handler是一个函数，接受三个参数，分别是pending，resolve和reject
  + 这三个函数会帮助你派发三个动作，表示异步流程(这里是fetch)的三个状态改变
  + 这三个函数的第一个参数都会被当做payload处理，第二个参数会被展开到被派发动作中

3.编写reducer.js，这里定义处理器

  ```js
    import {
      __asyncActionType__ //首先引入刚刚定义的类型
    } from "./actionTypes";

    export default ( state = defaultState, { type, payload, ...others } ) => {

      switch( type ){
        /*略去其他代码*/

        case __asyncActionType__.pending:
          // 异步动作正在处理
          break;
        case __asyncActionType__.resolved:
          // payload === resolve的第一个参数json
          // others === resolve的第二个参数
          // 异步动作成功
          break;
        case __asyncActionType__.rejected:
          // 异步动作失败
          break;
      }
    }
  ```
  要点:
  + 使用.pending,.resolved,.rejected来对应pending,resolve,reject函数

完整实例
===

actionTypes.js

```js
export const __getAuth__ = {
  name: "getAuth"
};

export const __createAuth__ = {
  name: "createAuth"
};

export const __logout__ = Symbol("Auth/logout");
export const __edit__ = Symbol("Auth/edit");

```

actions.js

```js
// @flow
import {
  __edit__,
  __logout__,
  __createAuth__,
  __getAuth__
} from "./actionTypes";

import getAuthGraphQL from "./getAuth";
import createAuthGraphQL from "./createAuth";

export const logout = () => ({
  type: __logout__
});

var p = false;
export const createAuth = ( certification, password ) => ({
  type: __createAuth__,
  handler( pending, resolve, reject ){
    if( p ){
      return;
    }
    p = true;
    pending({ certification, password });
    fetch( "/graphql", {
      method: "post",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify({
        query: createAuthGraphQL,
        variables: {
          certification,
          password
        }
      })
    })
    .then( response => {
      if( response.ok ){
        return response.json();
      }
      throw "network";
    })
    .then( json => {
      if( json.errors ){
        throw json.errors[0].message;
      }
      resolve( json.data.createAuth );
      p = false;
    })
    .catch( reason => {
      reject( reason );
      p = false;
    })
  }
});

export const getAuth = ( certification, password ) => ({
  type: __getAuth__,
  handler( pending, resolve, reject ){
    if( p ){
      return;
    }
    p = true;
    pending({ certification, password });
    fetch( "/graphql", {
      method: "post",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify({
        query: getAuthGraphQL,
        variables: {
          certification,
          password
        }
      })
    })
    .then( response => {
      if( response.ok ){
        return response.json();
      }
      throw "network";
    })
    .then( json => {
      if( json.errors ){
        throw json.errors[0].message;
      } else {
        resolve( json.data.authorize );
        p = false;
      }
    })
    .catch( reason => {
      reject( reason );
      p = false;
    });
  }
});

```

reducer.js

```js
import {
  __logout__,
  __createAuth__,
  __getAuth__
} from "./actionTypes";

import { Map as ImmutableMap, List as ImmutableList } from "immutable";

export default ( state = new ImmutableMap({
  certification: "",
  password: "",
  authorized: false,
  token: "",
  authorizing: false,
  authorizedAt: null,
  permission: {
    allowed: ["readPublic"],
    banned: [""]
  },
  reason: ""
}), { type, payload, id } ) => {
  switch( type ){
    case __logout__: {
      return state.merge({
        authorized: false,
        token: ""
      });
    }

    case __createAuth__.pending:
    case __getAuth__.pending: {
      let { certification, password } = payload;
      return state.merge({
        reason: "",
        authorizing: true,
        authorized: false,
        certification,
        password
      });
    }

    case __createAuth__.resolved:
    case __getAuth__.resolved: {
      let { permission, token } = payload;
      return state.merge({
        permission,
        token,
        authorizing: false,
        authorized: true,
        authorizedAt: Date.now()
      });
    }

    case __createAuth__.rejected:
    case __getAuth__.rejected: {
      return state.merge({
        reason: payload,
        authorizing: false
      });
    }

    default: {
      return state;
    }
  }
};

```

附录
===

createAuth.graphql

```graphql
mutation createAuth( $certification: String!, $password: String! ){
  createAuth( certification: $certification, password: $password ){
    permission {
      allowed
      banned
    },
    token
  }
}

```

getAuth.graphql

```graphql
query authorize( $certification: String!, $password: String! ){
  authorize( certification: $certification, password: $password ){
    permission {
      allowed
      banned
    },
    token
  }
}

```
