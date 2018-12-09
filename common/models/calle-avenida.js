'use strict';

module.exports = function (Calleavenida) {

  const gVariables = require('./../../server/enviromentVariables/globalVariables');
  const gScripts = require('../../server/scripts/globalScripts');
  gScripts.disableMethods(Calleavenida);

  Calleavenida.beforeRemote('userDashboard', function (ctx, unused, next) {
    const verification = gScripts.verifyJustSave(ctx);
    if (verification.code == 200) {
      return next();
    }
    return next(verification);
  });

  Calleavenida.getCalles = (cb) => {
    var sql = `select '(' || zona.nombre || ') ' || calle_avenida.nombre as nombre, calle_avenida.id
              from calle_avenida
              join zona on calle_avenida.id_zona = zona.id
              where zona.activo = true and calle_avenida.activo = true
              order by zona.nombre, calle_avenida.nombre`;
    var ds = Calleavenida.dataSource;
    ds.connector.query(sql, [], function (err, resp) {
      return cb(null, resp);
    });
  };

  Calleavenida.remoteMethod('getCalles', {
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'get',
    },
  });

  Calleavenida.gender = (cb) => {
    var sql = `select count( * ) as number, genero as label from paciente where activo = true and genero = 'Masculino'
              group by genero
              union
              select count( * ) as numbe, genero as label from paciente where activo = true and genero = 'Femenino'
              group by genero`;
    var ds = Calleavenida.dataSource;
    ds.connector.query(sql, [], function (err, resp) {
      if (resp.length == 0) {
        return cb(null, []);
      } else {
        resp[0].label = 'Hombres';
        resp[1].label = 'Mujeres';
        return cb(null, resp);
      }
    });
  };

  Calleavenida.remoteMethod('gender', {
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'get',
    },
  });

  Calleavenida.age = (cb) => {
    var sql = `Select date_part('year',age(fecha_nacimiento)) as x, count(*) as y from paciente
              where paciente.activo = true
              group by x
              order by x `;
    var ds = Calleavenida.dataSource;
    ds.connector.query(sql, [], function (err, resp) {
      if (resp.length == 0) {
        return cb(null, []);
      } else {
        let labels = [];
        let numbers = [];
        resp.forEach(element => {
          labels.push(element.x);
          numbers.push(parseInt(element.y));
        });
        let data = {
          labels: labels,
          numbers: numbers,
        }
        return cb(null, data);
      }
    });
  };

  Calleavenida.remoteMethod('age', {
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'get',
    },
  });

  Calleavenida.missing = (cb) => {
    var sql = `Select * from (Select count(*),EXTRACT (MONTH FROM fecha_perdida) as mes from alerta_perdida
              where activo = true and fecha_perdida >  CURRENT_DATE - INTERVAL '6 months'
              group by mes) as resultado`;
    var ds = Calleavenida.dataSource;
    ds.connector.query(sql, [], function (err, resp) {
      if (resp.length == 0) {
        return cb(null, []);
      } else {
        let labels = [];
        let numbers = [];
        let month = '';
        resp.forEach(element => {
          month = getMonth(element.mes);
          labels.push(month);
          numbers.push(parseInt(element.count));
        });
        let data = {
          labels: labels,
          numbers: numbers,
        }
        return cb(null, data);
      }
    });
  };

  Calleavenida.remoteMethod('missing', {
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'get',
    },
  });

  Calleavenida.solved = (cb) => {
    var sql = `select count( * ) as number, resuelto as label from alerta_perdida where activo = true and resuelto = true
              group by resuelto
              union
              select count( * ) as number, resuelto as label from alerta_perdida where activo = true and resuelto = false
              group by resuelto`;
    var ds = Calleavenida.dataSource;
    ds.connector.query(sql, [], function (err, resp) {
      if (resp.length == 0) {
        return cb(null, []);
      } else {
        for (let i = 0; i < resp.length; i++) {
          if (resp[i].label == false) {
            resp[i].label = 'No resueltos';
          } else {
            resp[i].label = 'Resueltos';
          }

        }
        return cb(null, resp);
      }
    });
  };

  Calleavenida.remoteMethod('solved', {
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'get',
    },
  });

  Calleavenida.zone = (cb) => {
    var sql = `Select zona.nombre, count(*) from zona
              join calle_avenida on calle_avenida.id_zona = zona.id
              join alerta_perdida on calle_avenida.id = alerta_perdida.id_calle
              group by zona.nombre`;
    var ds = Calleavenida.dataSource;
    ds.connector.query(sql, [], function (err, resp) {
      if (resp.length == 0) {
        return cb(null, []);
      } else {
        let labels = [];
        let numbers = [];
        resp.forEach(element => {
          labels.push(element.nombre);
          numbers.push(parseInt(element.count));
        });
        let data = {
          labels: labels,
          numbers: numbers,
        }
        return cb(null, data);
      }
    });
  };

  Calleavenida.remoteMethod('zone', {
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'get',
    },
  });

  Calleavenida.list = (cb) => {
    var sql = `Select paciente.apellido_paterno || ' ' || paciente.apellido_materno || ' ' || paciente.nombre as fullName ,
              calle_avenida.nombre as nombreCalle, alerta_perdida.fecha_perdida
              from paciente
              join alerta_perdida on paciente.id = alerta_perdida.id_paciente
              join calle_avenida on calle_avenida.id = alerta_perdida.id_calle
              where alerta_perdida.resuelto = false`;
    var ds = Calleavenida.dataSource;
    ds.connector.query(sql, [], function (err, resp) {
      return cb(null, resp);
    });
  };

  Calleavenida.remoteMethod('list', {
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'get',
    },
  });

  Calleavenida.userDashboard = (req, cb) => {
    var userData = gScripts.getUserData(req.headers.access_token);
    var sql;
    var sql2 = 'select id_grupo from usuario_grupo where id_usuario = $1 and pendiente = false'
    var where = '';
    var ds = Calleavenida.dataSource;
    ds.connector.query(sql2, [userData.id], function (err, resp) {
      resp.forEach(element => {
        where += "id = " + element.id_grupo + " or ";
      });
      if (where != '') {
        where = where.slice(0, -3);
        sql = `Select * from (Select '1.-grupos' as label, count(*) from usuario_grupo
                where pendiente = true and activo = true and ` + where + `
                Union
                Select '2.-desaparecidos' as label, count(*) from  alerta_perdida
                join paciente on alerta_perdida.id_paciente = paciente.id
                join grupo on paciente.id_grupo = grupo.id
                join usuario_grupo on usuario_grupo.id_grupo = grupo.id
                where alerta_perdida.activo = true and usuario_grupo.pendiente = false
                and alerta_perdida.resuelto = false and grupo.activo = true
                and paciente.activo = false and usuario_grupo.activo = true
                and usuario_grupo.id_usuario = $1
                Union
                Select '3.-avisos' as label, count(*) from aviso_encuentro
                join alerta_perdida on aviso_encuentro.id_alerta_perdida = alerta_perdida.id
                join paciente on alerta_perdida.id_paciente = paciente.id
                join grupo on paciente.id_grupo = grupo.id
                join usuario_grupo on usuario_grupo.id_grupo = grupo.id
                where aviso_encuentro.activo = true and alerta_perdida.activo = true
                and usuario_grupo.pendiente = false and paciente.activo = true
                and grupo.activo = true and usuario_grupo.activo = true
                and alerta_perdida.resuelto = false and usuario_grupo.id_usuario = $1
                Union
                Select '4.-desaparecidos_hoy' as label, count(*) from alerta_perdida
                where resuelto = false and activo = true and date(fecha_perdida) = DATE 'today') as resp
                order by label`;
      } else {
        sql = `Select * from (Select '1.-grupos' as label, 0 as count
                Union
                Select '2.-desaparecidos' as label, count(*) from  alerta_perdida
                join paciente on alerta_perdida.id_paciente = paciente.id
                join grupo on paciente.id_grupo = grupo.id
                join usuario_grupo on usuario_grupo.id_grupo = grupo.id
                where alerta_perdida.activo = true and usuario_grupo.pendiente = false
                and alerta_perdida.resuelto = false and grupo.activo = true
                and paciente.activo = false and usuario_grupo.activo = true
                and usuario_grupo.id_usuario = $1
                Union
                Select '3.-avisos' as label, count(*) from aviso_encuentro
                join alerta_perdida on aviso_encuentro.id_alerta_perdida = alerta_perdida.id
                join paciente on alerta_perdida.id_paciente = paciente.id
                join grupo on paciente.id_grupo = grupo.id
                join usuario_grupo on usuario_grupo.id_grupo = grupo.id
                where aviso_encuentro.activo = true and alerta_perdida.activo = true
                and usuario_grupo.pendiente = false and paciente.activo = true
                and grupo.activo = true and usuario_grupo.activo = true
                and alerta_perdida.resuelto = false and usuario_grupo.id_usuario = $1
                Union
                Select '4.-desaparecidos_hoy' as label, count(*) from alerta_perdida
                where resuelto = false and activo = true and date(fecha_perdida) = DATE 'today') as resp
                order by label`;
      }
      ds.connector.query(sql, [userData.id], function (err, resp) {
        return cb(null, resp);
      });
    })

  };

  Calleavenida.remoteMethod('userDashboard', {
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

  function getMonth(number) {
    let month = '';
    switch (number) {
      case 1:
        month = 'Enero';
        break;
      case 2:
        month = 'Febrero';
        break;
      case 3:
        month = 'Marzo';
        break;
      case 4:
        month = 'Abril';
        break;
      case 5:
        month = 'Mayo';
        break;
      case 6:
        month = 'Junio';
        break;
      case 7:
        month = 'Julio';
        break;
      case 8:
        month = 'Agosto';
        break;
      case 9:
        month = 'Septiembre';
        break;
      case 10:
        month = 'Octubre';
        break;
      case 11:
        month = 'Noviembre';
        break;
      case 12:
        month = 'Diciembre';
        break;
    }
    return month;
  }

};
