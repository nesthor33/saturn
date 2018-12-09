'use strict';

module.exports = function (Avisoencuentro) {

  const gScripts = require('../../server/scripts/globalScripts');
  gScripts.disableMethods(Avisoencuentro);

  Avisoencuentro.beforeRemote('**', function (ctx, unused, next) {
    if (!(ctx.req.baseUrl = '/api/aviso_encuentro' && ctx.req.method == 'POST')) {
      const verification = gScripts.verifyTotalAccess(ctx);
      if (verification.code == 200) {
        return next();
      }
      return next(verification);
    } else {
      return next();
    }
  });

  Avisoencuentro.beforeRemote('create', function (ctx, unused, next) {
    let rows = '';
    var userData = gScripts.getUserData(ctx.req.headers.access_token);
    var sql = `Select * from usuario_grupo where id_grupo = (
        Select id_grupo from paciente where id = (
          Select id_paciente from alerta_perdida where id = $1
        )
      )
      and activo = true and pendiente = false`;
    var ds = Avisoencuentro.dataSource;
    ds.connector.query(sql, [ctx.req.body.id_alerta_perdida], (err, resUsers) => {


      var sql2 = `Select paciente.apellido_paterno || ' ' || paciente.nombre as fullname
       from paciente where id = (
        Select id_paciente from alerta_perdida where id =  $1)`;
      ds.connector.query(sql2, [ctx.req.body.id_alerta_perdida], (err, resPatient) => {
        resUsers.forEach(element => {
          if (userData == false) {
            rows += "(" + element.id_usuario + ",'Un usuario encontró a " + resPatient[0].fullname + "', '/keeper/missing', 'fa-user-slash', true, '$now'),";
          } else {
            if (element.id_usuario != userData.id) {
              rows += "(" + element.id_usuario + ",'Un usuario encontró a " + resPatient[0].fullname + "', '/keeper/missing', 'fa-user-slash', true, '$now'),";
            }
          }
        });
        if (rows != '') {
          rows = rows.slice(0, -1)
          let sql3 = `Insert Into notificacion ("id_usuario", "mensaje", "url", "icono", "activo", "fecha") values ` + rows;
          console.log(sql3);

          ds.connector.query(sql3, [], function (err, resTotal) { });
        }
      });
    });
    next();
  });

  Avisoencuentro.getFindingsPatients = (id_perdida, cb) => {
    var sql = `Select aviso_encuentro.*, calle_avenida.nombre from aviso_encuentro
                    Join calle_avenida ON aviso_encuentro.id_calle = calle_avenida.id
                    Where aviso_encuentro.activo = true and aviso_encuentro.id_alerta_perdida = $1`;
    var ds = Avisoencuentro.dataSource;
    ds.connector.query(sql, [id_perdida], function (err, resp) {
      return cb(null, resp);
    });
  };

  Avisoencuentro.remoteMethod('getFindingsPatients', {
    accepts: {
      arg: 'id_perdida',
      type: 'number',
      required: true,
    },
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'get',
    },
  });

  Avisoencuentro.returnHome = (req, cb) => {
    let rows = '';
    var userData = gScripts.getUserData(req.headers.access_token);
    //se guarda la alerta como true
    Avisoencuentro.create(req.body, function (err, resp) {
      var sql = `Select * from usuario_grupo where id_grupo = (
        Select id_grupo from paciente where id = (
          Select id_paciente from alerta_perdida where id = $1
        )
      )
      and activo = true and pendiente = false`;
      var ds = Avisoencuentro.dataSource;
      ds.connector.query(sql, [req.body.id_alerta_perdida], (err, resUsers) => {
        var sql2 = `Select paciente.apellido_paterno || ' ' || paciente.nombre as fullname
       from paciente where id = (
        Select id_paciente from alerta_perdida where id =  $1)`;
        ds.connector.query(sql2, [req.body.id_alerta_perdida], (err, resPatient) => {
          resUsers.forEach(element => {
            if (userData == false) {
              rows += "(" + element.id_usuario + ",'Se encontró a " + resPatient[0].fullname + "!', '/keeper/missing', 'fa-smile-beam', true, '$now'),";
            } else {
              if (element.id_usuario != userData.id) {
                rows += "(" + element.id_usuario + ",'Se encontró a " + resPatient[0].fullname + "!', '/keeper/missing', 'fa-smile-beam', true, '$now'),";
              }
            }
          });
          if (rows != '') {
            rows = rows.slice(0, -1)
            let sql3 = `Insert Into notificacion ("id_usuario", "mensaje", "url", "icono", "activo", "fecha") values ` + rows;
            ds.connector.query(sql3, [], function (err, resTotal) { });
          }
        });
      });
      return cb(null, resp);
    });
  };

  Avisoencuentro.remoteMethod('returnHome', {
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
