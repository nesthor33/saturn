'use strict';

module.exports = function (Paciente) {

  const base64Img = require('base64-img');
  const QRCode = require('qrcode');
  const gScripts = require('../../server/scripts/globalScripts');
  const randomstring = require("randomstring");

  gScripts.disableMethods(Paciente);

  Paciente.beforeRemote('**', function (ctx, unused, next) {
    if (!(ctx.req.baseUrl = '/api/paciente/postSampleSingle' && ctx.req.method == 'POST') && !(ctx.req.baseUrl = '/api/paciente/getLostPatients' && ctx.req.method == 'GET') && !(ctx.req.baseUrl = '/api/paciente/getContactsPatient' && ctx.req.method == 'GET')) {
      const verification = gScripts.verifyTotalAccess(ctx);
      if (verification.code == 200) {
        return next();
      }
      return next(verification);
    } else {
      return next();
    }
  });

  Paciente.postPatient = (req, cb) => {
    let nombreImg = req.body.personal.nombre + '-' + req.body.personal.apellido_paterno + '-' + req.body.personal.apellido_materno;
    base64Img.img(req.body.picture.picture, './../frontend/src/assets/patientsPhotos', nombreImg, function (err, filepath) {
      let fotoName = filepath.split('.');
      req.body.personal.foto += '.' + fotoName[fotoName.length - 1];
      Paciente.create(req.body.personal, function (err, respPct) {
        return cb(null, respPct);
      });
    });
  };

  Paciente.remoteMethod('postPatient', {
    accepts: { arg: 'req', type: 'object', http: { source: 'req' } },
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'post',
    },
  });

  Paciente.patchPatient = (req, cb) => {
    if (req.body.picture !== undefined) {
      let nombreImg = req.body.personal.nombre + '-' + req.body.personal.apellido_paterno + '-' + req.body.personal.apellido_materno;
      base64Img.img(req.body.picture, './../frontend/src/assets/patientsPhotos', nombreImg, function (err, filepath) {
        let fotoName = filepath.split('.');
        req.body.personal.foto = 'assets/patientsPhotos/' + nombreImg + '.' + fotoName[fotoName.length - 1];
        Paciente.upsert(req.body.personal, function (err, resp) {
          return cb(null, resp);
        });
      });
    } else {
      Paciente.upsert(req.body.personal, function (err, resp) {
        return cb(null, resp);
      });
    }
  };

  Paciente.remoteMethod('patchPatient', {
    accepts: { arg: 'req', type: 'object', http: { source: 'req' } },
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'patch',
    },
  });

  Paciente.getQR = (id, cb) => {
    Paciente.findOne(
      {
        where: {
          id: id
        }
      }, function (err, resp) {
        var sql = `Select paciente.*, usuario.nombre as usu_nom, usuario.apellido_paterno as usu_pat,
                    usuario.celular as usu_cel
                    from usuario
                    join usuario_grupo ON usuario.id = usuario_grupo.id_usuario
                    join grupo ON usuario_grupo.id_grupo = grupo.id
                    join paciente ON grupo.id = paciente.id_grupo
                    where usuario_grupo.activo = true and usuario_grupo.pendiente = false
                    and grupo.activo = true and paciente.activo = true and paciente.id = $1
                    limit 3`;
        var ds = Paciente.dataSource;
        ds.connector.query(sql, [id], function (err, respData) {
          let msg = 'Hola, me llamo ' + resp.nombre + ' ' + resp.apellido_paterno + ', y tengo Alzheimer, si me encuetro perdido por favor contáctate con: ';
          respData.forEach(element => {
            msg += element.usu_nom + ' ' + element.usu_pat + ' al celular ' + element.usu_cel + ', '
          });
          msg += 'Gracias!'
          QRCode.toDataURL(msg, function (err, url) {
            return cb(null, url);
          });
        });
      });
  };

  Paciente.remoteMethod('getQR', {
    accepts: { arg: 'id', type: 'number', required: true, },
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'get',
    },
  });

  Paciente.getLostPatients = (req, cb) => {
    var sql = `Select paciente.apellido_paterno || ' ' || paciente.apellido_materno || ' ' || paciente.nombre as fullName,
                alerta_perdida.fecha_perdida, calle_avenida.nombre as nomCalle, alerta_perdida.id as id_perdida,
                paciente.id as id_paciente, paciente.*
                from paciente
                Join alerta_perdida ON paciente.id = alerta_perdida.id_paciente
                Join calle_avenida ON calle_avenida.id = alerta_perdida.id_calle
                Where paciente.activo = true and alerta_perdida.activo = true and alerta_perdida.resuelto = false`;
    var ds = Paciente.dataSource;
    ds.connector.query(sql, [], function (err, resp) {
      return cb(null, resp);
    });
  };

  Paciente.remoteMethod('getLostPatients', {
    accepts: { arg: 'req', type: 'object', http: { source: 'req' } },
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'get',
    },
  });

  Paciente.getLostPatientsUser = (req, cb) => {
    var userData = gScripts.getUserData(req.headers.access_token);
    var ds = Paciente.dataSource;
    var whereClause = '';
    var sql = `Select usuario_grupo.id_grupo from usuario_grupo
              Join grupo ON usuario_grupo.id_grupo = grupo.id
              where id_usuario = $1 and grupo.activo = true
              and usuario_grupo.activo = true and usuario_grupo.pendiente = false `;
    ds.connector.query(sql, [userData.id], function (err, respUser) {
      respUser.forEach(element => {
        whereClause += 'paciente.id_grupo = ' + element.id_grupo + ' OR ';
      });
      if (whereClause != '') {
        whereClause = whereClause.slice(0, -3);
        var sql2 = `Select paciente.apellido_paterno || ' ' || paciente.apellido_materno || ' ' || paciente.nombre as fullName,
                    alerta_perdida.id as id_perdida, paciente.id as id_paciente,
                    (select count(*) from aviso_encuentro where id_alerta_perdida = alerta_perdida.id) as avisos from paciente
                    Join alerta_perdida ON paciente.id = alerta_perdida.id_paciente
                    Where paciente.activo = true and alerta_perdida.activo = true
                    and alerta_perdida.resuelto = false and (` + whereClause + `)`;
        ds.connector.query(sql2, [], function (err, resp) {
          return cb(null, resp);
        });
      } else {
        return cb(null, []);
      }
    });
  };

  Paciente.remoteMethod('getLostPatientsUser', {
    accepts: { arg: 'req', type: 'object', http: { source: 'req' } },
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'get',
    },
  });

  Paciente.getPatientData = (req, id, cb) => {
    var userData = gScripts.getUserData(req.headers.access_token);
    var sql = `select paciente.*
              from usuario_grupo
              join grupo ON usuario_grupo.id_grupo = grupo.id
              join paciente ON grupo.id = paciente.id_grupo
              where usuario_grupo.activo = true and usuario_grupo.pendiente = false
              and grupo.activo = true and paciente.activo = true and paciente.id = $1 and usuario_grupo.id_usuario = $2`;
    var ds = Paciente.dataSource;
    ds.connector.query(sql, [id, userData.id], function (err, resp) {
      return cb(null, resp);
    });
  };

  Paciente.remoteMethod('getPatientData', {
    accepts: [
      { arg: 'req', type: 'object', http: { source: 'req' } },
      { arg: 'id', type: 'number', required: true, }
    ],
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'get',
    },
  });

  Paciente.getContactsPatient = (id, cb) => {
    var sql = `select usuario.*, paciente.apellido_paterno || ' ' || paciente.apellido_materno || ' ' || paciente.nombre as fullName,
              paciente.genero, paciente.nacionalidad, paciente.fecha_nacimiento, paciente.foto,
              alerta_perdida.fecha_perdida, alerta_perdida.caracteristicas_paciente, calle_avenida.nombre as nombre_calle
              from usuario
              join usuario_grupo ON usuario.id = usuario_grupo.id_usuario
              join grupo ON usuario_grupo.id_grupo = grupo.id
              join paciente ON grupo.id = paciente.id_grupo
              join alerta_perdida ON alerta_perdida.id_paciente = paciente.id
              join calle_avenida ON alerta_perdida.id_calle = calle_avenida.id
              where usuario.activo = true and usuario_grupo.activo = true and usuario_grupo.pendiente = false
              and grupo.activo = true and paciente.activo = true and paciente.id = $1 and alerta_perdida.resuelto = false`;
    var ds = Paciente.dataSource;
    ds.connector.query(sql, [id], function (err, resp) {
      return cb(null, resp);
    });
  };

  Paciente.remoteMethod('getContactsPatient', {
    accepts: [
      { arg: 'id', type: 'number', required: true, }
    ],
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'get',
    },
  });

  Paciente.postPictures = (req, cb) => {
    for (let i = 0; i < req.body.photos.length; i++) {
      base64Img.imgSync(req.body.photos[i], './Recognition/samples', 'nes.' + (i + 1));
    }
    var myPythonScriptPath = './Recognition/photoRecognizer.py';
    var spawn = require("child_process").spawn;
    var process = spawn('python', [myPythonScriptPath, req.body.id_patient]);
    process.stdout.on('data', function (data) {
      console.log(data.toString());
    });
    process.stderr.on('data', function (data) {
      console.log(data.toString());
    })
    Paciente.upsert({ id: req.body.id_patient, rec_facial: true }, function (err, resp) {
      return cb(null, 'listo');
    });
  };

  Paciente.remoteMethod('postPictures', {
    accepts: { arg: 'req', type: 'object', http: { source: 'req' } },
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'post',
    },
  });

  Paciente.postSample = (req, cb) => {
    let code = randomstring.generate(6);
    base64Img.imgSync(req.body.image, './Recognition/pictures', code);
    var myPythonScriptPath = './Recognition/recogPicture.py';
    var spawn = require("child_process").spawn;
    var process = spawn('python', [myPythonScriptPath, code + '.jpg']);
    process.stdout.on('data', function (data) {
      var sql = `Select paciente.apellido_paterno || ' ' || paciente.apellido_materno || ' ' || paciente.nombre as Nombre,                paciente.foto,
              usuario.apellido_paterno || ' ' || usuario.apellido_materno || ' ' || usuario.nombre as NombreUsuario,
              '(Calle/avenida ' || calle_avenida.nombre || ')' || usuario.detalle_direccion as dirección,
              usuario.telefono as teléfono, usuario.celular, usuario.email, 'Edad: ' || date_part('year',age(paciente.fecha_nacimiento)) as subtext
                    from paciente
              join grupo on grupo.id = paciente.id_grupo
              join usuario_grupo on grupo.id = usuario_grupo.id_grupo
              join usuario on usuario_grupo.id_usuario = usuario.id
              join calle_avenida on usuario.id_calle = calle_avenida.id
              where paciente.id = $1
              and paciente.activo = true and usuario_grupo.activo = true and usuario_grupo.pendiente = false`;
      var ds = Paciente.dataSource;
      ds.connector.query(sql, [data.toString()], function (err, resp) {
        return cb(null, resp);
      });
    });
    process.stderr.on('data', function (data) {
      return cb(null, data.toString());
    })
  };

  Paciente.remoteMethod('postSample', {
    accepts: { arg: 'req', type: 'object', http: { source: 'req' } },
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'post',
    },
  });

  Paciente.postSampleSingle = (req, cb) => {
    let code = randomstring.generate(6);
    base64Img.imgSync(req.body.image, './Recognition/pictures', code);
    var myPythonScriptPath = './Recognition/recogPicture.py';
    var spawn = require("child_process").spawn;
    var process = spawn('python', [myPythonScriptPath, code + '.jpg']);
    process.stdout.on('data', function (data) {
      return cb(null, data.toString());
    });
  };

  Paciente.remoteMethod('postSampleSingle', {
    accepts: { arg: 'req', type: 'object', http: { source: 'req' } },
    returns: {
      type: 'array',
      root: true,
    },
    http: {
      verb: 'post',
    },
  });

};
