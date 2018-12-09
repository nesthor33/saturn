'use strict';

module.exports = function (Grupo) {

  const randomstring = require("randomstring");
  const app = require('../../server/server');
  const jwt = require('jsonwebtoken');
  const gVariables = require('./../../server/enviromentVariables/globalVariables');
  const gScripts = require('../../server/scripts/globalScripts');
  gScripts.disableMethods(Grupo);

  Grupo.beforeRemote('**', function (ctx, unused, next) {
    const verification = gScripts.verifyTotalAccess(ctx);
    if (verification.code == 200) {
      return next();
    }
    return next(verification);
  });

  Grupo.beforeRemote('postCreateGroup', function (ctx, unused, next) {
    try {
      let userData = jwt.verify(ctx.req.headers.access_token, gVariables.jwt.key);
      ctx.args.data.userId = userData.resp.id;
    } catch (error) {
      let message = new Error('must be logged in to update');
      message.code = 400;
      next(message);
    }
    next();
  });

  Grupo.afterRemote('postCreateGroup', function (ctx, unused, next) {
    try {
      let userData = jwt.verify(ctx.req.headers.access_token, gVariables.jwt.key);
      ctx.args.data.userId = userData.resp.id;
    } catch (error) {
      let message = new Error('must be logged in to update');
      message.code = 400;
      next(message);
    }
    next();
  });
  Grupo.postCreateGroup = (data, cb) => {
    let groupCode = randomstring.generate(6);
    data.nombre += '-' + groupCode;
    Grupo.count(
      {
        nombre: data.nombre
      }, function (err, count) {
        if (count == 0) {
          Grupo.create(data, function (err, resp) {
            if (err) {
              console.log(err);
              return cb(err);
            }
            app.models.usuario_grupo.create(
              {
                id_usuario: data.userId,
                id_grupo: resp.id,
                tipo_usuario: 'admin',
                pendiente: false
              }, function (err, respUser) {
                if (err) {
                  console.log(err);
                  return cb(err);
                }
                return cb(null, resp);
              });
          });
        } else {
          return cb(null, {
            code: 500,
            message: 'Ups...ocurrió un error, intente nuevamente'
          });
        }
      }
    );
  };

  Grupo.remoteMethod('postCreateGroup', {
    accepts: { arg: 'data', type: 'object', required: true, },
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'post',
    },
  });

  Grupo.getMembers = (id_grupo, req, cb) => {
    var userData = gScripts.getUserData(req.headers.access_token);
    Grupo.findOne({
      where: {
        activo: true,
        id: id_grupo
      },
      include: [
        {
          relation: 'usuario_grupos_pendientes',
          scope: {
            where: {
              activo: true,
              pendiente: true
            },
            include: {
              relation: 'usuarios'
            }
          }
        },
        {
          relation: 'usuario_grupos',
          scope: {
            where: {
              activo: true,
              pendiente: false
            },
            include: {
              relation: 'usuarios'
            }
          }
        }
      ]
    }
      , function (err, resp) {
        if (err) {
          return cb(err);
        }
        resp.userId = userData.id;
        return cb(null, resp);
      }
    );
  };

  Grupo.remoteMethod('getMembers', {
    accepts: [
      { arg: 'id_grupo', type: 'number', required: true, },
      { arg: 'req', type: 'object', http: { source: 'req' } },
    ],
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'get',
    },
  });

  Grupo.postEditName = (data, cb) => {
    let groupCode = randomstring.generate(6);
    data.nombre += '-' + groupCode;
    Grupo.upsert(data, function (err, resp) {
      if (err) {
        return cb(err);
      }
      return cb(null, resp);
    });
  };

  Grupo.remoteMethod('postEditName', {
    accepts: { arg: 'data', type: 'object', required: true, },
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'post',
    },
  });

};


