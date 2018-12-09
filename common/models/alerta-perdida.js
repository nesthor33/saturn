'use strict';

module.exports = function (Alertperdida) {

  const gScripts = require('../../server/scripts/globalScripts');
  gScripts.disableMethods(Alertperdida);

  Alertperdida.beforeRemote('**', function (ctx, unused, next) {
    const verification = gScripts.verifyJustSave(ctx);
    if (verification.code == 200) {
      return next();
    }
    return next(verification);
  });


  Alertperdida.postAlert = (data, req, cb) => {
    var userData = gScripts.getUserData(req.headers.access_token);
    let rows = '';
    Alertperdida.findOne({
      where: {
        id_paciente: data.id_paciente,
        resuelto: false,
        activo: true
      }
    }, (err, resp) => {
      if (isEmpty(resp)) {
        var sql = `Select id_usuario from usuario_grupo where id_grupo = (
                      Select id_grupo from paciente Where id = $1
                    ) and activo = true and pendiente = false`;
        var ds = Alertperdida.dataSource;
        ds.connector.query(sql, [data.id_paciente], (err, resUsers) => {
          var sql3 = `Select paciente.apellido_paterno || ' ' || paciente.nombre as fullname
                      from paciente where id =  $1`;
          ds.connector.query(sql3, [data.id_paciente], (err, resPatient) => {
            resUsers.forEach(element => {
              if (element.id_usuario != userData.id) {
                rows += "(" + element.id_usuario + ", '" + resPatient[0].fullname + " se reportó como desaparecido!', '/keeper/missing', 'fa-user-slash', true, '$now'),";
              }
            });
            if (rows != '') {
              rows = rows.slice(0, -1)
              let sql2 = `Insert Into notificacion ("id_usuario", "mensaje", "url", "icono", "activo", "fecha") values ` + rows;
              ds.connector.query(sql2, [], function (err, resUsers) { });
            }
          });
        });
        Alertperdida.create(data, function (err, respData) {
          return cb(null, respData);
        });
      } else {
        return cb(null, 'Ya existe');
      }
    });
  };

  Alertperdida.remoteMethod('postAlert', {
    accepts: [{
      arg: 'data',
      type: 'object',
      required: true,
    },
    {
      arg: 'req',
      type: 'object',
      http: {
        source: 'req'
      }
    },
    ],
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'post',
    },
  });

  function isEmpty(obj) {
    for (var key in obj) {
      if (obj.hasOwnProperty(key))
        return false;
    }
    return true;
  }

  Alertperdida.getPatientPoster = (id, cb) => {
    Alertperdida.findOne({
      where: {
        id: id
      },
      include: {
        relation: 'patients'
      }
    }, function (err, resp) {
      var sql = `Select usuario.* from grupo_paciente
                  Join grupo ON grupo.id = grupo_paciente.id_grupo
                  Join usuario_grupo ON usuario_grupo.id_grupo = grupo.id
                  Join usuario ON usuario.id = usuario_grupo.id_usuario
                  Where grupo_paciente.activo = true and grupo.activo = true and
                  usuario_grupo.activo = true and usuario.activo = true and
                  grupo_paciente.id_paciente = $1`;
      var ds = Alertperdida.dataSource;
      ds.connector.query(sql, [resp.id_paciente], function (err, respContacts) {
        resp.contacts = respContacts
        return cb(null, resp);
      });
    });
  };

  Alertperdida.remoteMethod('getPatientPoster', {
    accepts: {
      arg: 'id',
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

};
