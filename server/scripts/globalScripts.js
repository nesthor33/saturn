const jwt = require('jsonwebtoken');
const gVariables = require('./../enviromentVariables/globalVariables');

function verifyToken(token) {

  try {
    jwt.verify(token, gVariables.jwt.key);
    return true;
  } catch (error) {
    return false;
  }
}
function verifyJustSave(ctx) {
  if (ctx.req.method == 'PATCH' || ctx.req.method == 'POST' || ctx.req.method == 'PUT') {
    let token = ctx.req.headers.access_token;
    if (token == undefined) {
      return {
        message: 'No hay token',
        code: 401
      }
    }
    let verification = verifyToken(token);
    if (verification) {
      return {
        message: 'si tiene permiso',
        code: 200
      }
    }
    return {
      message: 'No tiene permiso',
      code: 401
    }
  }
  return {
    message: 'si tiene permiso',
    code: 200
  }
}
function verifyTotalAccess(ctx) {
  let token = ctx.req.headers.access_token;
  if (token == undefined) {
    return {
      message: 'No hay token',
      code: 401
    }
  }
  let verification = verifyToken(token);
  if (verification) {
    return {
      message: 'si tiene permiso',
      code: 200
    }
  }
  return {
    message: 'No tiene permiso',
    code: 401
  }
}

function getUserData(token) {
  let userData;
  try {
    userData = jwt.verify(token, gVariables.jwt.key);
  } catch (error) {
    return false;
  }
  return userData.resp;
}

function disableMethods(model) {
  model.disableRemoteMethodByName('deleteByID');
  model.disableRemoteMethodByName('updateAll');
  model.disableRemoteMethodByName('createChangeStream');
  model.disableRemoteMethodByName('replaceOrCreate');
  model.disableRemoteMethodByName('replaceById');
  model.disableRemoteMethodByName('upsertWithWhere');

  model.disableRemoteMethodByName('deleteById');

  model.disableRemoteMethodByName('exists');
  model.disableRemoteMethodByName('count');
  model.disableRemoteMethodByName('findOne');
}

module.exports = {
  verifyJustSave,
  verifyTotalAccess,
  getUserData,
  disableMethods
};


