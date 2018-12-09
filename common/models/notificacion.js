'use strict';

module.exports = function (Notificacion) {

  const gVariables = require('./../../server/enviromentVariables/globalVariables');
  const gScripts = require('../../server/scripts/globalScripts');
  gScripts.disableMethods(Notificacion);

  Notificacion.beforeRemote('**', function (ctx, unused, next) {
    const verification = gScripts.verifyTotalAccess(ctx);
    if (verification.code == 200) {
      return next();
    }
    return next(verification);
  });

  Notificacion.getNotifications = (req, cb) => {
    var userData = gScripts.getUserData(req.headers.access_token);
    Notificacion.find({
      where: {
        id_usuario: userData.id,
        activo: true
      }
    }, function (err, resp) {
      return cb(null, resp);
    });
  };

  Notificacion.remoteMethod('getNotifications', {
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

  Notificacion.patientFind = (req, cb) => {
    var userData = gScripts.getUserData(req.headers.access_token);
    let rows = '';
    var sql = `Select * from usuario_grupo where id_grupo = (
        Select id_grupo from paciente where id = (
          Select id_paciente from alerta_perdida where id = $1
        )
      )
      and activo = true and pendiente = false`;
    var ds = Notificacion.dataSource;
    ds.connector.query(sql, [req.body.id_perdida], (err, resUsers) => {
      var sql2 = `Select paciente.apellido_paterno || ' ' || paciente.nombre as fullname
       from paciente where id = (
        Select id_paciente from alerta_perdida where id =  $1)`;
      ds.connector.query(sql2, [req.body.id_perdida], (err, resPatient) => {
        resUsers.forEach(element => {
          if (element.id_usuario != userData.id) {
            rows += "(" + element.id_usuario + ",'Se encontró a " + resPatient[0].fullname + "!', '/keeper/missing', 'fa-smile-beam', true, '$now'),";
          }
        });
        if (rows != '') {
          rows = rows.slice(0, -1)
          let sql3 = `Insert Into notificacion ("id_usuario", "mensaje", "url", "icono", "activo", "fecha") values ` + rows;
          ds.connector.query(sql3, [], function (err, resTotal) {
            return cb(null, resTotal);
          });
        }
      });
    });

  };

  Notificacion.remoteMethod('patientFind', {
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
      verb: 'post',
    },
  });
};
