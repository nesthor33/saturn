'use strict';

module.exports = function (Usuariogrupo) {

  const app = require('../../server/server');
  const jwt = require('jsonwebtoken');
  const gVariables = require('./../../server/enviromentVariables/globalVariables');
  const gScripts = require('../../server/scripts/globalScripts');
  gScripts.disableMethods(Usuariogrupo);

  Usuariogrupo.beforeRemote('**', function (ctx, unused, next) {
    const verification = gScripts.verifyTotalAccess(ctx);
    if (verification.code == 200) {
      return next();
    }
    return next(verification);
  });

  Usuariogrupo.beforeRemote('postRequest', function (ctx, unused, next) {
    try {
      let userData = jwt.verify(ctx.req.headers.access_token, gVariables.jwt.key);
      ctx.args.data.userId = userData.resp.id;
    } catch (error) {
      let message = new Error('token invalido');
      message.code = 400;
      return next(message);
    }
    return next();
  });

  Usuariogrupo.getGrupoUsuario = (req, cb) => {
    var userData = gScripts.getUserData(req.headers.access_token);
    var sql2 = 'select id_grupo from usuario_grupo where id_usuario = $1 and pendiente = false'
    var ds = Usuariogrupo.dataSource;
    var where = '';
    ds.connector.query(sql2, [userData.id], function (err, resp) {
      resp.forEach(element => {
        where += "grps.id = " + element.id_grupo + " or ";
      });
      if (where != '') {
        where = where.slice(0, -3);
        var sql = `Select * from (
          select grupo.nombre, grupo.id, count(case usuario_grupo.pendiente when true then 1 else null end) as pendiente,
          count(case usuario_grupo.pendiente when false then 1 else null end) as confirmado
          from usuario_grupo
          join grupo ON usuario_grupo.id_grupo = grupo.id
          where usuario_grupo.activo = true
          and grupo.activo = true
          group by grupo.nombre, grupo.id) as grps
          where ` + where;
        ds.connector.query(sql, [], function (err, resp) {
          return cb(null, resp);
        });
      } else {
        return cb(null, []);
      }
    });

  };

  Usuariogrupo.remoteMethod('getGrupoUsuario', {
    accepts: {
      arg: 'req',
      type: 'object',
      http: {
        source: 'req'
      }
    },
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'get',
    },
  });

  Usuariogrupo.postRequest = (data, cb) => {
    app.models.grupo.findOne({
      where: {
        activo: true,
        nombre: data.nombre
      }
    }, function (err, resp) {
      if (err) {
        return cb(err);
      }
      if (!isEmpty(resp)) {
        Usuariogrupo.findOne({
          where: {
            id_usuario: data.userId,
            id_grupo: resp.id
          }
        }, function (err, respGrp) {
          if (isEmpty(respGrp)) {
            app.models.usuario_grupo.findOne({
              where: {
                id_grupo: resp.id,
                tipo_usuario: 'admin'
              }
            }, function (err, respUser) {
              app.models.notificacion.create({
                id_usuario: respUser.id_usuario,
                mensaje: 'Un usuario quiere ser parte del grupo ' + data.nombre,
                url: '/keeper/groups',
                icono: 'fa-user-plus'
              });
            });
            Usuariogrupo.create({
              id_usuario: data.userId,
              id_grupo: resp.id,
              tipo_usuario: 'miembro',
              pendiente: true
            }, function (err, createGrp) {
              if (err) {
                return cb(null, err);
              }
              return cb(null, createGrp);
            });
          } else {
            return cb(null, respGrp);
          }
        });
      } else {
        return cb(null, resp);
      }
    });
  };

  Usuariogrupo.remoteMethod('postRequest', {
    accepts: {
      arg: 'data',
      type: 'object',
      required: true,
    },
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'post',
    },
  });

  Usuariogrupo.getPatientsUser = (req, cb) => {
    var userData = gScripts.getUserData(req.headers.access_token);
    var sql = `select paciente.*, paciente.apellido_paterno || ' ' || paciente.apellido_materno || ' ' || paciente.nombre as fullName, usuario_grupo.tipo_usuario
              from usuario_grupo
              join grupo ON usuario_grupo.id_grupo = grupo.id
              join paciente ON grupo.id = paciente.id_grupo
              where usuario_grupo.activo = true and usuario_grupo.pendiente = false
              and grupo.activo = true and paciente.activo = true and usuario_grupo.id_usuario = $1`;
    var ds = Usuariogrupo.dataSource;
    ds.connector.query(sql, [userData.id], function (err, resp) {
      return cb(null, resp);
    });
  };

  Usuariogrupo.remoteMethod('getPatientsUser', {
    accepts: {
      arg: 'req',
      type: 'object',
      http: {
        source: 'req'
      }
    },
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'get',
    },
  });

  function isEmpty(obj) {
    for (var key in obj) {
      if (obj.hasOwnProperty(key))
        return false;
    }
    return true;
  }

};
