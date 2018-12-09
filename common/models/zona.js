'use strict';

module.exports = function (Zona) {

  const gScripts = require('../../server/scripts/globalScripts');
  gScripts.disableMethods(Zona);

  Zona.getUsersZone = function (req, cb) {
    var sql = `Select usuario.apellido_paterno || ' ' || usuario.apellido_materno || ' ' || usuario.nombre as Nombre,
              '(Calle/avenida ' || calle_avenida.nombre || ')' || usuario.detalle_direccion as dirección,
              usuario.telefono as teléfono, usuario.celular, usuario.email, 'Celular: ' || usuario.celular as subtext
              from usuario
              join calle_avenida on usuario.id_calle = calle_avenida.id
              where calle_avenida.id_zona = $1 and usuario.activo = true `;
    var ds = Zona.dataSource;
    ds.connector.query(sql, [req.query.id], function (err, resp) {
      return cb(null, resp);
    });
  }

  Zona.remoteMethod('getUsersZone', {
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

  Zona.getUsersName = function (req, cb) {
    var sql = `Select usuario.apellido_paterno || ' ' || usuario.apellido_materno || ' ' || usuario.nombre as Nombre,
              '(Calle/avenida ' || calle_avenida.nombre || ')' || usuario.detalle_direccion as dirección,
              usuario.telefono as teléfono, usuario.celular, usuario.email, 'Celular: ' || usuario.celular as subtext
              from usuario
              join calle_avenida on usuario.id_calle = calle_avenida.id
              where(LOWER(usuario.nombre) like LOWER('%` + req.query.name + `%')
                    or LOWER(usuario.apellido_paterno) like LOWER('%` + req.query.name + `%')
                    or LOWER(usuario.apellido_materno) like LOWER('%` + req.query.name + `%'))
              and usuario.activo = true`;
    var ds = Zona.dataSource;
    ds.connector.query(sql, [], function (err, resp) {
      return cb(null, resp);
    });
  }

  Zona.remoteMethod('getUsersName', {
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

  Zona.getPatientsName = function (req, cb) {
    var sql = `Select paciente.apellido_paterno || ' ' || paciente.apellido_materno || ' ' || paciente.nombre as Nombre,                paciente.foto,
              usuario.apellido_paterno || ' ' || usuario.apellido_materno || ' ' || usuario.nombre as NombreUsuario,
              '(Calle/avenida ' || calle_avenida.nombre || ')' || usuario.detalle_direccion as dirección,
              usuario.telefono as teléfono, usuario.celular, usuario.email, 'Edad: ' || date_part('year',age(paciente.fecha_nacimiento)) as subtext
                    from paciente
              join grupo on grupo.id = paciente.id_grupo
              join usuario_grupo on grupo.id = usuario_grupo.id_grupo
              join usuario on usuario_grupo.id_usuario = usuario.id
              join calle_avenida on usuario.id_calle = calle_avenida.id
              where(LOWER(paciente.nombre) like LOWER('%` + req.query.name + `%')
                    or LOWER(paciente.apellido_paterno) like LOWER('%` + req.query.name + `%')
                    or LOWER(paciente.apellido_materno) like LOWER('%` + req.query.name + `%'))
              and paciente.activo = true and usuario_grupo.activo = true and usuario_grupo.pendiente = false
              order by paciente.nombre`;
    var ds = Zona.dataSource;
    ds.connector.query(sql, [], function (err, resp) {
      return cb(null, resp);
    });
  }

  Zona.remoteMethod('getPatientsName', {
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

  Zona.getPatientsCaracteristics = function (req, cb) {
    let where = '';
    for (const key in req.query) {
      if (req.query[key] != '') {
        where += key + " = '" + req.query[key] + "' and "
      }
    }
    where = where.slice(0, -4)
    var sql = `Select paciente.apellido_paterno || ' ' || paciente.apellido_materno || ' ' || paciente.nombre as Nombre,                paciente.foto,
              usuario.apellido_paterno || ' ' || usuario.apellido_materno || ' ' || usuario.nombre as NombreUsuario,
              '(Calle/avenida ' || calle_avenida.nombre || ')' || usuario.detalle_direccion as dirección,
              usuario.telefono as teléfono, usuario.celular, usuario.email, 'Edad: ' || date_part('year',age(paciente.fecha_nacimiento)) as subtext
                    from paciente
              join grupo on grupo.id = paciente.id_grupo
              join usuario_grupo on grupo.id = usuario_grupo.id_grupo
              join usuario on usuario_grupo.id_usuario = usuario.id
              join calle_avenida on usuario.id_calle = calle_avenida.id
              where(` + where + `)
              and paciente.activo = true and usuario_grupo.activo = true and usuario_grupo.pendiente = false
              order by paciente.nombre`;
    var ds = Zona.dataSource;
    ds.connector.query(sql, [], function (err, resp) {
      return cb(null, resp);
    });
  }

  Zona.remoteMethod('getPatientsCaracteristics', {
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

};
